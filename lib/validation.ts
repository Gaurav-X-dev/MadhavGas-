import { z } from 'zod';

const noMarkup = (value: string) => !/[<>]/.test(value);
const id = z.string().trim().min(1).max(160).refine(noMarkup, 'HTML markup is not allowed');
const shortText = z.string().trim().min(1).max(160).refine(noMarkup, 'HTML markup is not allowed');
const optionalShortText = z.string().trim().max(160).refine(noMarkup, 'HTML markup is not allowed');
const longText = z.string().trim().max(5000).refine(noMarkup, 'HTML markup is not allowed');
const phone = z.string().trim().regex(/^\+?[0-9][0-9\s()-]{7,19}$/, 'Enter a valid phone number');
const optionalEmail = z.union([z.literal(''), z.email().max(255)]);
const relativeOrUrl = z.string().trim().max(2048).refine((value) => {
  if (value === '') return true;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Use a local path or a secure HTTP(S) URL');
const displayOrder = z.coerce.number().int().min(0).max(100000);

const product = z.object({ id, name: shortText, slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160), category: z.enum(['Commercial', 'Industrial', 'Specialty']), cylinderCapacity: shortText, description: z.string().trim().min(10).max(3000), features: z.array(z.string().trim().min(1).max(240)).max(20), image: relativeOrUrl, availability: z.enum(['In Stock', 'Limited', 'Out of Stock']), displayOrder, archived: z.boolean() }).strict();
const booking = z.object({ id, customerName: shortText, businessName: optionalShortText.optional(), email: optionalEmail, phone, cylinderType: shortText, quantity: z.coerce.number().int().min(1).max(10000), deliveryArea: shortText, source: z.enum(['Website', 'QR', 'WhatsApp']), date: z.string().trim().min(1).max(80), status: z.enum(['New', 'Confirmed', 'Processing', 'Delivered', 'Cancelled']), notes: z.array(z.string().trim().max(1000)).max(100) }).strict();
const enquiry = z.object({ id, customerName: shortText, email: optionalEmail, phone, enquiryType: shortText, subject: shortText, message: z.string().trim().min(10).max(5000), assignedStaff: z.string().trim().max(160), status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']), priority: z.enum(['Low', 'Medium', 'High', 'Urgent']), internalNotes: z.array(z.string().trim().max(1000)).max(100), date: z.string().trim().min(1).max(80) }).strict();
const feedback = z.object({ id, customerName: shortText, email: optionalEmail, phone, rating: z.coerce.number().int().min(1).max(5), message: z.string().trim().min(10).max(5000), status: z.enum(['New', 'Reviewed', 'Resolved']), reply: z.string().trim().max(5000).optional(), date: z.string().trim().min(1).max(80), type: z.enum(['Feedback', 'Complaint']) }).strict();
const gallery = z.object({ id, type: z.enum(['Image', 'Video']), url: relativeOrUrl.refine(Boolean, 'Media URL is required'), thumbnailUrl: relativeOrUrl.optional().default(''), category: shortText, altText: z.string().trim().min(3).max(300), caption: shortText, displayOrder, status: z.enum(['Published', 'Draft']) }).strict().superRefine((value, context) => {
  // A video tile shows its poster frame, so without one the card renders blank.
  if (value.type === 'Video' && !value.thumbnailUrl) {
    context.addIssue({ code: 'custom', path: ['thumbnailUrl'], message: 'Upload a thumbnail image so the video tile is not blank' });
  }
});
export const journeySchema = z.object({ id, year: optionalShortText, category: shortText, title: shortText, description: z.string().trim().min(10).max(3000), brand: z.enum(['MBGA', 'Bharatgas']), icon: z.string().trim().min(1).max(80), imageUrl: relativeOrUrl, imageAlt: z.string().trim().max(300).refine(noMarkup, 'HTML markup is not allowed'), displayOrder, published: z.boolean(), featured: z.boolean() }).strict().superRefine((value, context) => {
  if (value.imageUrl && value.imageAlt.length < 3) context.addIssue({ code: 'custom', path: ['imageAlt'], message: 'Image alt text is required when an image is selected' });
});
export const achievementSchema = z.object({ id, type: z.enum(['Award', 'Milestone', 'Recognition', 'Certificate']), title: shortText, description: z.string().trim().min(10).max(3000), year: shortText, brand: shortText, imageUrl: relativeOrUrl, published: z.boolean() }).strict();
const user = z.object({ id, name: shortText, email: z.email().max(255), role: z.enum(['Super Admin', 'Editor', 'Support Staff', 'Viewer']), active: z.boolean(), lastActive: z.string().max(100).optional(), password: z.string().min(8).max(128).optional() }).strict();

export const productSchema = product;
export const gallerySchema = gallery;
export const collectionSchemas: Record<string, z.ZodType> = { products: productSchema, bookings: booking, enquiries: enquiry, feedback, gallery: gallerySchema, journey: journeySchema, achievements: achievementSchema, users: user };

export const heroSlideSchema = z.object({ id, title: shortText, subtitle: z.string().trim().min(10).max(1000).refine(noMarkup, 'HTML markup is not allowed'), image: relativeOrUrl.refine(Boolean, 'Upload a JPG, PNG or WebP image'), ctaText: shortText, ctaLink: relativeOrUrl.refine(Boolean, 'CTA link is required'), displayOrder, published: z.boolean() }).strict();
export const siteContentSchema = z.object({ agencyIntro: z.string().trim().min(20).max(3000).refine(noMarkup, 'HTML markup is not allowed'), phonePrimary: phone, phoneSecondary: phone, email: z.email().max(255), officeAddress: z.string().trim().min(10).max(500).refine(noMarkup, 'HTML markup is not allowed'), businessHours: shortText, whatsappNumber: phone, seoTitle: z.string().trim().min(10).max(160).refine(noMarkup, 'HTML markup is not allowed'), seoDescription: z.string().trim().min(20).max(320).refine(noMarkup, 'HTML markup is not allowed'), bharatgasLogoUrl: relativeOrUrl.refine(Boolean, 'Upload the Bharatgas logo'), bharatgasLogoAlt: z.string().trim().min(3).max(160).refine(noMarkup, 'HTML markup is not allowed'), mbgaLogoUrl: relativeOrUrl.refine(Boolean, 'Upload the MBGA logo'), mbgaLogoAlt: z.string().trim().min(3).max(160).refine(noMarkup, 'HTML markup is not allowed'), heroSlides: z.array(heroSlideSchema).min(1).max(10) }).strict();
export const sustainabilityCardSchema = z.object({ id, title: shortText, description: z.string().trim().min(10).max(2000), icon: z.string().trim().min(1).max(80), imageUrl: relativeOrUrl, imageAlt: z.string().trim().max(300).refine(noMarkup, 'HTML markup is not allowed'), displayOrder, published: z.boolean() }).strict().superRefine((value, context) => {
  if (value.imageUrl && value.imageAlt.length < 3) context.addIssue({ code: 'custom', path: ['imageAlt'], message: 'Image alt text is required when an image is selected' });
});
const chainStep = z.object({ id, step: z.coerce.number().int().min(1).max(100), title: shortText, description: z.string().trim().min(3).max(1000) }).strict();
export const sustainabilitySchema = z.object({ heroTitle: shortText, heroDescription: z.string().trim().min(20).max(1000).refine(noMarkup, 'HTML markup is not allowed'), heroImage: relativeOrUrl.refine(Boolean, 'Hero image is required'), heroImageAlt: z.string().trim().min(3).max(300).refine(noMarkup, 'HTML markup is not allowed'), storyTitle: shortText, storyDescription: z.string().trim().min(20).max(3000).refine(noMarkup, 'HTML markup is not allowed'), storyImage: relativeOrUrl.refine(Boolean, 'Story image is required'), storyImageAlt: z.string().trim().min(3).max(300).refine(noMarkup, 'HTML markup is not allowed'), storyPoints: z.array(z.string().trim().min(3).max(240).refine(noMarkup, 'HTML markup is not allowed')).min(1).max(10), cards: z.array(sustainabilityCardSchema).max(20), routePlanning: longText, reusableCycle: longText, digitalAssistance: longText, supplyChainSteps: z.array(chainStep).max(30) }).strict();
/* ----------------------------- Home page ------------------------------- */

// Quick links accept the runtime tokens `tel:`, `whatsapp:` and `maps:`, which are
// resolved from the saved agency contact details when the page is rendered.
const quickLinkHref = z.string().trim().max(2048).refine((value) => {
  if (['tel:', 'whatsapp:', 'maps:', 'email:'].includes(value)) return true;
  if (/^\/(?!\/)/.test(value)) return true;
  if (/^(tel:|mailto:)[^\s<>"']+$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Use tel:, whatsapp:, maps:, email:, a local path or a secure HTTP(S) URL');

const multilineShortText = z.string().trim().min(1).max(300).refine(noMarkup, 'HTML markup is not allowed');
const sectionLead = z.string().trim().min(1).max(1200).refine(noMarkup, 'HTML markup is not allowed');
const sectionLimit = z.coerce.number().int().min(1).max(24);
const homeSectionBase = { published: z.boolean(), displayOrder };

const homeQuickLink = z.object({ id, icon: shortText, title: shortText, description: sectionLead, linkText: shortText, href: quickLinkHref, displayOrder, published: z.boolean() }).strict();
const homeFeatureCard = z.object({ id, icon: shortText, title: shortText, description: sectionLead, linkText: shortText, linkHref: relativeOrUrl, displayOrder, published: z.boolean() }).strict();
const homeBadgeItem = z.object({ id, icon: shortText, label: shortText, displayOrder }).strict();
const homeMetric = z.object({ id, value: shortText, label: shortText, displayOrder }).strict();
const homeCheckItem = z.object({ id, label: shortText, displayOrder }).strict();
const homeSafetyStep = z.object({ id, title: shortText, description: sectionLead, displayOrder }).strict();

export const homeContentSchema = z.object({
  quickLinks: z.object({ ...homeSectionBase, items: z.array(homeQuickLink).max(8) }).strict(),
  qr: z.object({
    ...homeSectionBase, eyebrow: shortText, title: multilineShortText, description: sectionLead,
    ctaText: shortText, badgeText: shortText, scanTitle: shortText, scanSubtitle: shortText,
    benefits: z.array(homeBadgeItem).max(6),
  }).strict(),
  about: z.object({
    ...homeSectionBase, eyebrow: shortText, title: multilineShortText, lead: sectionLead, detail: sectionLead,
    image: relativeOrUrl.refine(Boolean, 'An about-section image is required'),
    imageAlt: z.string().trim().min(3).max(300).refine(noMarkup, 'HTML markup is not allowed'),
    badgeTitle: shortText, badgeSubtitle: shortText,
    checkItems: z.array(homeCheckItem).max(8), metrics: z.array(homeMetric).max(6),
    ctaText: shortText, ctaLink: relativeOrUrl.refine(Boolean, 'CTA link is required'),
  }).strict(),
  services: z.object({ ...homeSectionBase, eyebrow: shortText, title: multilineShortText, lead: sectionLead, cards: z.array(homeFeatureCard).max(8) }).strict(),
  products: z.object({
    ...homeSectionBase, eyebrow: shortText, title: multilineShortText, lead: sectionLead, ctaText: shortText,
    limit: sectionLimit, noteTitle: shortText, noteDescription: sectionLead, noteCtaText: shortText,
  }).strict(),
  safety: z.object({
    ...homeSectionBase, eyebrow: shortText, title: multilineShortText, lead: sectionLead,
    image: relativeOrUrl.refine(Boolean, 'A safety-section image is required'),
    imageAlt: z.string().trim().min(3).max(300).refine(noMarkup, 'HTML markup is not allowed'),
    badgeText: shortText, proofTitle: shortText, proofSubtitle: shortText,
    ctaText: shortText, ctaLink: relativeOrUrl.refine(Boolean, 'CTA link is required'),
    helpTitle: shortText, helpLinkText: shortText,
    panelKicker: shortText, panelTitle: shortText, panelSubtitle: sectionLead,
    steps: z.array(homeSafetyStep).max(10),
    footerTitle: shortText, footerSubtitle: shortText, footerLinkText: shortText,
    footerLinkHref: relativeOrUrl.refine(Boolean, 'Footer link is required'),
  }).strict(),
  trustStrip: z.object({ ...homeSectionBase, items: z.array(homeBadgeItem).max(8) }).strict(),
  journey: z.object({ ...homeSectionBase, eyebrow: shortText, title: multilineShortText, ctaText: shortText, limit: sectionLimit }).strict(),
  achievements: z.object({ ...homeSectionBase, eyebrow: shortText, title: multilineShortText, lead: sectionLead, ctaText: shortText, limit: sectionLimit }).strict(),
  partnership: z.object({
    ...homeSectionBase, eyebrow: shortText, title: multilineShortText, lead: sectionLead,
    leftLabel: shortText, leftTitle: shortText, leftDescription: sectionLead,
    bridgeTitle: shortText, bridgeFlow: shortText,
    rightLabel: shortText, rightTitle: shortText, rightDescription: sectionLead,
  }).strict(),
  sustainability: z.object({
    ...homeSectionBase, eyebrow: shortText, title: multilineShortText, description: sectionLead,
    ctaText: shortText, ctaLink: relativeOrUrl.refine(Boolean, 'CTA link is required'), limit: sectionLimit,
  }).strict(),
  gallery: z.object({ ...homeSectionBase, eyebrow: shortText, title: multilineShortText, ctaText: shortText, limit: sectionLimit }).strict(),
  visit: z.object({ ...homeSectionBase, eyebrow: shortText, title: multilineShortText, lead: sectionLead, mapsUrl: relativeOrUrl }).strict(),
}).strict();

/* -------------------------- Site-wide sections --------------------------- */

const assistOption = z.object({
  id, icon: shortText, kicker: shortText, title: shortText,
  linkText: shortText, href: relativeOrUrl.refine(Boolean, 'Destination is required'), displayOrder,
}).strict();

const videoHubItem = z.object({
  id, title: shortText, category: shortText, duration: optionalShortText,
  url: relativeOrUrl.refine(Boolean, 'Video link is required'),
  thumbnailUrl: relativeOrUrl.refine(Boolean, 'A thumbnail is required so the tile is not blank'),
  displayOrder,
}).strict();

export const siteSectionsSchema = z.object({
  assist: z.object({
    published: z.boolean(),
    partnerKicker: shortText, kicker: shortText, title: multilineShortText, description: sectionLead,
    options: z.array(assistOption).max(6),
    noteTitle: shortText, noteText: sectionLead, noteLinkText: shortText,
    noteHref: relativeOrUrl.refine(Boolean, 'Destination is required'),
  }).strict(),
  videoHub: z.object({
    published: z.boolean(),
    eyebrow: shortText, title: multilineShortText, lead: sectionLead, countLabel: shortText,
    featuredEmbedUrl: relativeOrUrl.refine(Boolean, 'A featured video link is required'),
    featuredKicker: shortText, featuredTitle: shortText, featuredDescription: sectionLead,
    playlistKicker: shortText, playlistTitle: shortText,
    items: z.array(videoHubItem).max(12),
    channelLinkText: optionalShortText, channelUrl: relativeOrUrl,
  }).strict(),
}).strict();

const navigationItem = z.object({
  id, label: shortText, href: relativeOrUrl.refine(Boolean, 'Destination is required'),
  displayOrder, published: z.boolean(),
}).strict();
const footerBadge = z.object({ id, icon: shortText, label: shortText, displayOrder }).strict();

export const siteChromeSchema = z.object({
  loaderKicker: shortText,
  loaderTagline: shortText,
  hoursLabel: shortText,
  callButtonText: shortText,
  navigation: z.array(navigationItem).min(1).max(12),
  newsletter: z.object({
    published: z.boolean(), eyebrow: shortText, title: multilineShortText,
    description: sectionLead, placeholder: shortText, submitText: shortText,
    noteText: sectionLead, invalidEmailText: sectionLead, pendingText: shortText,
    successText: sectionLead, errorText: sectionLead,
  }).strict(),
  cta: z.object({
    published: z.boolean(), title: multilineShortText, description: sectionLead,
    callText: shortText, contactText: shortText, whatsappText: shortText,
    whatsappMessage: sectionLead,
  }).strict(),
  footer: z.object({
    supportKicker: shortText, supportTitle: shortText, whatsappText: shortText,
    aboutText: sectionLead, badges: z.array(footerBadge).max(6),
    qrKicker: shortText, qrTitle: shortText, qrLinkText: shortText,
    exploreTitle: shortText, businessTitle: shortText, contactTitle: shortText,
    phoneHint: shortText, emailHint: shortText, availabilityEyebrow: shortText,
    hoursTitle: shortText, weekdaysLabel: shortText, closedLabel: shortText,
    contactButtonText: shortText, copyrightText: shortText, closingText: shortText,
  }).strict(),
  discovery: z.object({
    eyebrow: shortText, localitiesLabel: shortText, categoriesLabel: shortText,
    topicsLabel: shortText, emptyText: shortText,
  }).strict(),
}).strict();

/* ---------------------------- Page headers ------------------------------ */

const pageHero = z.object({
  eyebrow: shortText,
  title: multilineShortText,
  description: sectionLead,
  image: relativeOrUrl.refine(Boolean, 'A background image is required'),
  imageAlt: z.string().trim().min(3).max(300).refine(noMarkup, 'HTML markup is not allowed'),
}).strict();

export const pageHeroesSchema = z.object({
  products: pageHero,
  journey: pageHero,
  achievements: pageHero,
  gallery: pageHero,
  contact: pageHero,
}).strict();

const discoveryItem = z.object({ id, label: shortText, href: relativeOrUrl.refine(Boolean, 'Destination is required'), displayOrder, active: z.boolean() }).strict();
export const localDiscoverySchema = z.object({ heading: shortText, description: z.string().trim().min(20).max(1000).refine(noMarkup, 'HTML markup is not allowed'), localities: z.array(discoveryItem).max(50), categories: z.array(discoveryItem).max(50), topics: z.array(discoveryItem).max(50) }).strict();
const qrSettings = z.object({ whatsappNumber: phone, defaultMessage: z.string().trim().min(5).max(2000), bookingUrl: relativeOrUrl }).strict();
export const agencySettingsSchema = z.object({ agencyName: shortText, tagline: z.string().trim().min(5).max(300).refine(noMarkup, 'HTML markup is not allowed'), phonePrimary: phone, phoneSecondary: phone, email: z.email().max(255), officeAddress: z.string().trim().min(10).max(500).refine(noMarkup, 'HTML markup is not allowed'), businessHours: shortText, whatsappNumber: phone, facebook: relativeOrUrl, instagram: relativeOrUrl, linkedin: relativeOrUrl, twitter: relativeOrUrl, notifyNewBookings: z.boolean(), notifyNewEnquiries: z.boolean(), notifyNewFeedback: z.boolean(), notifyLowStock: z.boolean(), emailTemplateBooking: longText, emailTemplateEnquiry: longText, emailTemplateFeedback: longText }).strict();

const contactFormTypeSchema = z.object({ id: z.enum(['enquiry', 'booking', 'feedback']), label: shortText, enabled: z.boolean(), displayOrder }).strict();
export const contactSettingsSchema = z.object({
  eyebrow: shortText, title: multilineShortText, description: sectionLead,
  callButtonText: shortText, emailButtonText: shortText, submitButtonText: shortText,
  statusText: sectionLead, unavailableText: shortText,
  formTypes: z.array(contactFormTypeSchema).min(1).max(3),
}).strict();

export const singletonSchemas: Record<string, z.ZodType> = { 'site-content': siteContentSchema, 'home-content': homeContentSchema, 'page-heroes': pageHeroesSchema, 'site-sections': siteSectionsSchema, 'site-chrome': siteChromeSchema, sustainability: sustainabilitySchema, 'local-discovery': localDiscoverySchema, 'qr-settings': qrSettings, 'agency-settings': agencySettingsSchema, 'contact-settings': contactSettingsSchema };

export function validationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return 'The submitted data is invalid.';
  const path = issue.path.map(String);
  if (path[0] === 'heroSlides') {
    const slide = Number(path[1]) + 1;
    const field = path[2] === 'image' ? 'image' : path[2] === 'ctaLink' ? 'CTA link' : path[2] || 'content';
    return `Slide ${Number.isFinite(slide) ? slide : ''} ${field} is invalid. ${issue.message}.`.replace('  ', ' ');
  }
  const labels: Record<string, string> = {
    bharatgasLogoUrl: 'Bharatgas logo', bharatgasLogoAlt: 'Bharatgas logo alt text',
    mbgaLogoUrl: 'MBGA logo', mbgaLogoAlt: 'MBGA logo alt text',
    bookingUrl: 'Booking URL', whatsappNumber: 'WhatsApp number',
  };
  const label = labels[path.at(-1) || ''] || String(path.at(-1) || 'Submitted data').replace(/([a-z])([A-Z])/g, '$1 $2');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${issue.message}`;
}

const publicCommon = {
  name: z.string().trim().min(2).max(120),
  email: optionalEmail.optional().default(''),
  phone,
  website: z.string().max(200).optional(),
};

export const publicSubmissionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('enquiry'), ...publicCommon, subject: z.string().trim().min(3).max(160), message: z.string().trim().min(10).max(3000) }).strict(),
  z.object({ type: z.literal('feedback'), ...publicCommon, rating: z.coerce.number().int().min(1).max(5), message: z.string().trim().min(10).max(3000) }).strict(),
  z.object({ type: z.literal('booking'), ...publicCommon, businessName: optionalShortText.optional().default(''), cylinderType: shortText, quantity: z.coerce.number().int().min(1).max(1000), deliveryArea: shortText, message: z.string().trim().max(2000).optional().default('') }).strict(),
]);

export const newsletterCampaignSchema = z.object({
  subject: z.string().trim().min(3).max(180).refine(noMarkup, 'HTML markup is not allowed'),
  heading: z.string().trim().min(3).max(180).refine(noMarkup, 'HTML markup is not allowed'),
  introduction: z.string().trim().min(10).max(1000).refine(noMarkup, 'HTML markup is not allowed'),
  body: z.string().trim().max(6000).refine(noMarkup, 'HTML markup is not allowed').optional().default(''),
  ctaLabel: z.string().trim().max(120).refine(noMarkup, 'HTML markup is not allowed').optional().default(''),
  ctaUrl: z.union([z.literal(''), z.url().max(2048)]).optional().default(''),
  testRecipient: z.union([z.literal(''), z.email().max(255)]).optional().default(''),
}).strict().superRefine((value, context) => {
  if (value.ctaLabel && !value.ctaUrl) context.addIssue({ code: 'custom', path: ['ctaUrl'], message: 'Add the button link, or clear the button label' });
  if (value.ctaUrl && !value.ctaLabel) context.addIssue({ code: 'custom', path: ['ctaLabel'], message: 'Add the button label, or clear the button link' });
});

export const newsletterSchema = z.object({ email: z.email().max(255), website: z.string().max(200).optional() }).strict();
export const newsletterAdminUpdateSchema = z.object({ id: z.uuid(), active: z.boolean() }).strict();
export const emailTestSchema = z.object({ recipient: z.email().max(255) }).strict();
