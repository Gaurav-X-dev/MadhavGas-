import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadLocalEnv } from './env.mjs';

loadLocalEnv();

if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI is missing');
if (!process.env.ADMIN_EMAIL?.trim()) throw new Error('ADMIN_EMAIL is missing');
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
  throw new Error('ADMIN_PASSWORD must be at least 8 characters');
}

const { Client } = pg;
function failConnection(error) {
  if (error?.code === '28P01') {
    console.error('[DATABASE] PostgreSQL rejected the username/password in DATABASE_URI.');
    console.error('[DATABASE] Correct the password in the deployment environment, then run npm run db:check.');
  } else if (error?.code === 'ECONNREFUSED') {
    console.error('[DATABASE] PostgreSQL is not reachable. Start the service and verify the configured host/port.');
  } else {
    console.error(`[DATABASE] ${error instanceof Error ? error.message : 'Unable to connect.'}`);
  }
  process.exit(1);
}

const configuredUrl = new URL(process.env.DATABASE_URI);
const databaseName = configuredUrl.pathname.slice(1);
let client = new Client({ connectionString: process.env.DATABASE_URI });
try {
  await client.connect();
} catch (error) {
  if (error?.code !== '3D000') failConnection(error);

  // Local PostgreSQL may need the target DB created. Managed providers normally
  // provision it beforehand, so their maintenance database is never touched.
  const maintenanceUrl = new URL(configuredUrl);
  maintenanceUrl.pathname = '/postgres';
  const maintenance = new Client({ connectionString: maintenanceUrl.toString() });
  try {
    await maintenance.connect();
    const safeName = databaseName.replace(/"/g, '""');
    await maintenance.query(`CREATE DATABASE "${safeName}"`);
    console.log(`Created database ${databaseName}`);
  } catch (maintenanceError) {
    failConnection(maintenanceError);
  } finally {
    await maintenance.end().catch(() => undefined);
  }
  client = new Client({ connectionString: process.env.DATABASE_URI });
  try {
    await client.connect();
  } catch (retryError) {
    failConnection(retryError);
  }
}

await client.query(`
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'Super Admin',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS cms_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(50) NOT NULL,
    document_id VARCHAR(160) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(resource, document_id)
  );
  CREATE INDEX IF NOT EXISTS cms_documents_resource_idx ON cms_documents(resource, sort_order);

  CREATE TABLE IF NOT EXISTS cms_singletons (
    key VARCHAR(80) PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(30) NOT NULL,
    reference_no VARCHAR(40) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'New',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS submissions_type_date_idx ON submissions(type, created_at DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS newsletter_email_unique_idx ON submissions (LOWER(data->>'email')) WHERE type = 'newsletter';

  CREATE TABLE IF NOT EXISTS auth_attempts (
    id BIGSERIAL PRIMARY KEY,
    ip VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    succeeded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS auth_attempts_lookup_idx ON auth_attempts(ip, email, created_at DESC);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    resource VARCHAR(50),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_check') THEN
      ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('Super Admin','Editor','Support Staff','Viewer'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_type_check') THEN
      ALTER TABLE submissions ADD CONSTRAINT submissions_type_check CHECK (type IN ('enquiry','feedback','booking','newsletter'));
    END IF;
  END $$;
`);

// Repair settings written by an early API version as { data: { ...actual settings } }.
await client.query(`
  UPDATE cms_singletons
  SET data = data->'data', updated_at = NOW()
  WHERE jsonb_typeof(data->'data') = 'object'
    AND (SELECT COUNT(*) FROM jsonb_object_keys(data)) = 1
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(180) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);
const migrationDirectory = path.join(process.cwd(), 'migrations');
const migrationFiles = (await fs.readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();
for (const name of migrationFiles) {
  const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
  if (applied.rowCount) continue;
  const sql = await fs.readFile(path.join(migrationDirectory, name), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    await client.query('COMMIT');
    console.log(`Applied migration ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const passwordHash = await bcrypt.hash(adminPassword, 12);
await client.query(
  `INSERT INTO admin_users (name, email, password_hash, role)
   VALUES ('MBGA Administrator', $1, $2, 'Super Admin')
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = TRUE, updated_at = NOW()`,
  [adminEmail, passwordHash],
);

const agencySettings = {
  agencyName: 'Madhav Bharat Gas Agency',
  tagline: 'Authorized Bharatgas Distributor — Commercial & Industrial LPG',
  phonePrimary: '+91 98765 43210',
  phoneSecondary: '+91 98765 43211',
  email: 'help@bharatgasagency.in',
  officeAddress: 'Shop 12, Main Market Road, Sector 70, Gurugram, Haryana 122101',
  businessHours: 'Monday to Saturday: 9:00 AM – 6:00 PM | Sunday: Closed',
  whatsappNumber: '919876543210',
  facebook: '', instagram: '', linkedin: '', twitter: '',
  notifyNewBookings: true, notifyNewEnquiries: true, notifyNewFeedback: true, notifyLowStock: false,
  emailTemplateBooking: 'Dear {{customer_name}}, your booking {{booking_id}} has been received.',
  emailTemplateEnquiry: 'Dear {{customer_name}}, we have received your enquiry {{enquiry_id}}.',
  emailTemplateFeedback: 'Dear {{customer_name}}, thank you for your feedback.'
};
const qrSettings = {
  whatsappNumber: '919876543210',
  defaultMessage: 'Hello MBGA, I want to book non-domestic LPG.\nBusiness name: ____\nCylinder size: ____\nQuantity: ____\nArea: ____',
  bookingUrl: ''
};
const siteContent = {
  agencyIntro: 'Madhav Bharat Gas Agency provides dependable non-domestic LPG supply, cylinder exchange coordination and responsive support to businesses in Gurugram.',
  phonePrimary: agencySettings.phonePrimary,
  phoneSecondary: agencySettings.phoneSecondary,
  email: agencySettings.email,
  officeAddress: agencySettings.officeAddress,
  businessHours: agencySettings.businessHours,
  whatsappNumber: agencySettings.whatsappNumber,
  seoTitle: 'Madhav Bharat Gas Agency | Commercial & Industrial LPG',
  seoDescription: 'Authorized Bharatgas distributor for dependable non-domestic LPG assistance in Gurugram.',
  bharatgasLogoUrl: '/assets/brands/bharatgas-logo.svg',
  bharatgasLogoAlt: 'Bharatgas logo',
  mbgaLogoUrl: '/assets/brands/mbga-logo.svg',
  mbgaLogoAlt: 'Madhav Bharat Gas Agency logo',
  heroSlides: [
    { id: 'hero-1', title: 'Dependable LPG Supply for Your Business', subtitle: 'Authorized Bharatgas non-domestic LPG supply with local MBGA support.', image: '/assets/industrial/industrial-hero.png', ctaText: 'Contact MBGA', ctaLink: '/contact', displayOrder: 1, published: true },
    { id: 'hero-2', title: 'Bulk & Cylinder Supply, Planned Around Your Shifts', subtitle: 'Scheduled dispatch and cylinder exchange for manufacturing units, processing plants and large commercial kitchens.', image: '/assets/industrial/industrial-plant.png', ctaText: 'View LPG Products', ctaLink: '/products', displayOrder: 2, published: true },
    { id: 'hero-3', title: 'Safety-Led Handling at Every Site', subtitle: 'Manifold installations, routine connection checks and clear handling guidance for your site team.', image: '/assets/industrial/cylinder-bank.png', ctaText: 'Our Safety Approach', ctaLink: '/sustainability', displayOrder: 3, published: true }
  ]
};
const sustainability = {
  heroTitle: 'Responsible Operations. Safer Communities.',
  heroDescription: 'Practical LPG handling, planned service routines and clear customer guidance support responsible day-to-day operations.',
  heroImage: '/assets/industrial/bulk-delivery.png',
  heroImageAlt: 'Bulk LPG road tanker and commercial cylinder dispatch truck',
  storyTitle: 'Responsible service in every cylinder cycle',
  storyDescription: 'MBGA focuses on the operational practices it can directly support: planned dispatch, safe handling guidance, organized cylinder exchange and responsive local assistance.',
  storyImage: '/assets/industrial/industrial-safety.png',
  storyImageAlt: 'Technician inspecting a commercial LPG cylinder manifold',
  storyPoints: [
    'Coordinate filled-cylinder delivery and empty-cylinder return.',
    'Share practical LPG handling and safety guidance.',
    'Plan service requirements to reduce avoidable emergency trips.'
  ],
  cards: [
    { id: 'sus-1', title: 'Route-Optimized Delivery', description: 'Planned delivery routes reduce travel and support dependable service.', icon: 'Route', imageUrl: '', imageAlt: '', displayOrder: 1, published: true },
    { id: 'sus-2', title: 'Reusable Cylinder Cycle', description: 'Cylinders are inspected, refilled and responsibly returned to circulation.', icon: 'Recycle', imageUrl: '', imageAlt: '', displayOrder: 2, published: true },
    { id: 'sus-3', title: 'Digital Assistance', description: 'QR and WhatsApp assistance reduce paperwork and simplify customer support.', icon: 'MonitorSmartphone', imageUrl: '', imageAlt: '', displayOrder: 3, published: true },
    { id: 'sus-4', title: 'Safety Awareness', description: 'Clear customer guidance supports disciplined cylinder placement, connection checks and everyday LPG handling.', icon: 'ShieldCheck', imageUrl: '', imageAlt: '', displayOrder: 4, published: true }
  ],
  routePlanning: 'Delivery routes are planned around customer zones and required capacity.',
  reusableCycle: 'Cylinder exchange and empty returns are coordinated as part of each supply cycle.',
  digitalAssistance: 'Customers can start a pre-filled WhatsApp enquiry by scanning the MBGA booking QR.',
  supplyChainSteps: [
    { id: 'sc-1', step: 1, title: 'Enquiry', description: 'Share the business requirement.' },
    { id: 'sc-2', step: 2, title: 'Confirmation', description: 'The MBGA team confirms availability and schedule.' },
    { id: 'sc-3', step: 3, title: 'Dispatch', description: 'Inspected cylinders are prepared for delivery.' },
    { id: 'sc-4', step: 4, title: 'Exchange', description: 'Delivery and empty-cylinder return are coordinated.' }
  ]
};
const localDiscovery = {
  heading: 'Local LPG Information',
  description: 'Useful service references based on the agency location and the LPG assistance currently offered by MBGA.',
  localities: [
    { id: 'loc-sector-70', label: 'Sector 70', href: '/contact', displayOrder: 1, active: true },
    { id: 'loc-gurugram', label: 'Gurugram', href: '/contact', displayOrder: 2, active: true }
  ],
  categories: [
    { id: 'cat-commercial', label: 'Commercial LPG', href: '/products', displayOrder: 1, active: true },
    { id: 'cat-industrial', label: 'Industrial LPG', href: '/products', displayOrder: 2, active: true },
    { id: 'cat-cylinder', label: 'Cylinder Supply', href: '/products', displayOrder: 3, active: true }
  ],
  topics: [
    { id: 'topic-safety', label: 'LPG Safety', href: '/sustainability', displayOrder: 1, active: true },
    { id: 'topic-booking', label: 'Booking Assistance', href: '/contact', displayOrder: 2, active: true },
    { id: 'topic-support', label: 'Customer Assistance', href: '/contact', displayOrder: 3, active: true }
  ]
};

// Homepage content is shared with the app so the seed and the runtime
// fallback can never drift apart.
const homeContent = JSON.parse(await fs.readFile(path.join(process.cwd(), 'lib', 'home-defaults.json'), 'utf8'));
const pageHeroes = JSON.parse(await fs.readFile(path.join(process.cwd(), 'lib', 'page-hero-defaults.json'), 'utf8'));
const siteSections = JSON.parse(await fs.readFile(path.join(process.cwd(), 'lib', 'site-section-defaults.json'), 'utf8'));
const siteChrome = JSON.parse(await fs.readFile(path.join(process.cwd(), 'lib', 'site-chrome-defaults.json'), 'utf8'));
const contactSettings = {
  eyebrow: 'Contact, Booking & Feedback',
  title: 'Send Your Request Securely',
  description: 'Choose the request type. The form is validated and saved to the MBGA admin panel before any email notification is attempted.',
  callButtonText: 'Call Agency',
  emailButtonText: 'Send Email',
  submitButtonText: 'Submit to MBGA',
  statusText: 'Your request will be securely saved and shared with the MBGA support team.',
  unavailableText: 'Form currently unavailable',
  formTypes: [
    { id: 'enquiry', label: 'LPG Enquiry', enabled: true, displayOrder: 1 },
    { id: 'booking', label: 'Commercial Cylinder Booking', enabled: true, displayOrder: 2 },
    { id: 'feedback', label: 'Feedback or Complaint', enabled: true, displayOrder: 3 },
  ],
};

for (const [key, value] of Object.entries({ 'agency-settings': agencySettings, 'qr-settings': qrSettings, 'site-content': siteContent, 'home-content': homeContent, 'page-heroes': pageHeroes, 'site-sections': siteSections, 'site-chrome': siteChrome, sustainability, 'local-discovery': localDiscovery, 'contact-settings': contactSettings })) {
  await client.query(
    `INSERT INTO cms_singletons (key, data) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
    [key, JSON.stringify(value)],
  );
}

const collections = {
  products: [
    { id: 'prod-19kg', name: '19 kg Commercial LPG Cylinder', slug: '19kg-commercial-lpg', category: 'Commercial', cylinderCapacity: '19 kg', description: 'Reliable LPG for restaurants, hotels, caterers and commercial kitchens.', features: ['ISI-marked cylinder', 'Tamper-proof seal', 'Planned delivery support'], image: '/assets/industrial/use-restaurant.png', availability: 'In Stock', displayOrder: 1, archived: false },
    { id: 'prod-35kg', name: '35 kg Commercial LPG Cylinder', slug: '35kg-commercial-lpg', category: 'Commercial', cylinderCapacity: '35 kg', description: 'Higher capacity solution for busy kitchens and growing businesses.', features: ['Higher capacity', 'Fewer refill cycles', 'Business supply support'], image: '/assets/industrial/use-canteen.png', availability: 'In Stock', displayOrder: 2, archived: false },
    { id: 'prod-475kg', name: '47.5 kg Industrial LPG Cylinder', slug: '47-5kg-industrial-lpg', category: 'Industrial', cylinderCapacity: '47.5 kg', description: 'Industrial LPG support for manufacturing and process-heating requirements.', features: ['Industrial application', 'Requirement-led supply', 'Safety-first handling'], image: '/assets/industrial/use-industrial.png', availability: 'Limited', displayOrder: 3, archived: false }
  ],
  journey: [
    { id: 'jrn-1', year: 'Foundation', category: 'Agency Service', title: 'Madhav Bharat Gas Agency', description: 'MBGA serves local non-domestic LPG customers as an authorized Bharatgas distributor.', brand: 'MBGA', icon: 'Building2', imageUrl: '', imageAlt: '', displayOrder: 1, published: true, featured: true },
    { id: 'jrn-2', year: 'Service Development', category: 'Customer Success', title: 'Business Supply Support', description: 'Commercial assistance connects restaurants, caterers and industrial customers with local support.', brand: 'MBGA', icon: 'TrendingUp', imageUrl: '', imageAlt: '', displayOrder: 2, published: true, featured: false },
    { id: 'jrn-3', year: 'Current Service', category: 'Brand Network', title: 'MBGA and Bharatgas', description: 'Local coordination is backed by the established Bharatgas product ecosystem.', brand: 'Bharatgas', icon: 'Flame', imageUrl: '', imageAlt: '', displayOrder: 3, published: true, featured: true }
  ],
  achievements: [
    { id: 'ach-1', type: 'Recognition', title: 'Authorized Bharatgas Distributor', description: 'Local non-domestic LPG support connected to the Bharatgas network.', year: 'MBGA', brand: 'Bharatgas', imageUrl: '/assets/certificates/certificate.svg', published: true },
    { id: 'ach-2', type: 'Milestone', title: 'Single-Window Business Support', description: 'Enquiry, requirement review and service assistance through one local team.', year: 'MBGA', brand: 'MBGA', imageUrl: '', published: true }
  ],
  gallery: [
    { id: 'gal-1', type: 'Image', url: '/assets/industrial/business-support.png', thumbnailUrl: '', category: 'Agency', altText: 'MBGA account team coordinating commercial LPG supply', caption: 'Business account support', displayOrder: 1, status: 'Published' },
    { id: 'gal-2', type: 'Image', url: '/assets/industrial/bulk-delivery.png', thumbnailUrl: '', category: 'Delivery', altText: 'Bulk LPG tanker and cylinder dispatch truck leaving the yard', caption: 'Bulk and cylinder dispatch', displayOrder: 2, status: 'Published' },
    { id: 'gal-3', type: 'Image', url: '/assets/industrial/industrial-safety.png', thumbnailUrl: '', category: 'Safety', altText: 'Technician checking a commercial LPG manifold with a gas detector', caption: 'Site safety inspection', displayOrder: 3, status: 'Published' },
    { id: 'gal-4', type: 'Image', url: '/assets/industrial/cylinder-bank.png', thumbnailUrl: '', category: 'LPG Service', altText: 'Twin-bank industrial LPG cylinder manifold with changeover regulator', caption: 'Industrial manifold installation', displayOrder: 4, status: 'Published' },
    { id: 'gal-5', type: 'Image', url: '/assets/industrial/commercial-kitchen.png', thumbnailUrl: '', category: 'Commercial', altText: 'Commercial hotel kitchen line running on 19 kg LPG cylinders', caption: 'Commercial kitchen supply', displayOrder: 5, status: 'Published' },
    { id: 'gal-6', type: 'Image', url: '/assets/industrial/industrial-plant.png', thumbnailUrl: '', category: 'Industrial', altText: 'Bulk LPG installation and cylinder bank at an industrial site', caption: 'Industrial site installation', displayOrder: 6, status: 'Published' },
    { id: 'gal-7', type: 'Image', url: '/assets/industrial/use-small-shop.png', thumbnailUrl: '', category: 'Commercial', altText: 'Tea and snacks stall running a burner from a 5 kg commercial LPG cylinder', caption: 'Small shop and stall supply', displayOrder: 7, status: 'Published' }
  ], bookings: [], enquiries: [], feedback: [], users: [], activity: []
};

for (const [resource, items] of Object.entries(collections)) {
  for (const [index, item] of items.entries()) {
    await client.query(
      `INSERT INTO cms_documents (resource, document_id, data, sort_order)
       VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (resource, document_id) DO UPDATE SET data = EXCLUDED.data, sort_order = EXCLUDED.sort_order`,
      [resource, item.id, JSON.stringify(item), item.displayOrder ?? index],
    );
  }
}

await client.end();
console.log(`Database ready. Admin login: ${adminEmail}`);
