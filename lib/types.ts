export type BookingStatus =
  | 'New'
  | 'Confirmed'
  | 'Processing'
  | 'Delivered'
  | 'Cancelled';
export type BookingSource = 'Website' | 'QR' | 'WhatsApp';

export interface Booking {
  id: string;
  customerName: string;
  businessName?: string;
  email: string;
  phone: string;
  cylinderType: string;
  quantity: number;
  deliveryArea: string;
  source: BookingSource;
  date: string;
  status: BookingStatus;
  notes: string[];
}

export type EnquiryStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type EnquiryPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Enquiry {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  enquiryType: string;
  subject: string;
  message: string;
  assignedStaff: string;
  status: EnquiryStatus;
  priority: EnquiryPriority;
  internalNotes: string[];
  date: string;
}

export type FeedbackStatus = 'New' | 'Reviewed' | 'Resolved';

export interface Feedback {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  rating: number;
  message: string;
  status: FeedbackStatus;
  reply?: string;
  date: string;
  type: 'Feedback' | 'Complaint';
}

export type ProductCategory = 'Commercial' | 'Industrial' | 'Specialty';
export type ProductAvailability = 'In Stock' | 'Limited' | 'Out of Stock';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  cylinderCapacity: string;
  description: string;
  features: string[];
  image: string;
  availability: ProductAvailability;
  displayOrder: number;
  archived: boolean;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  displayOrder: number;
  published: boolean;
}

export interface SiteContent {
  agencyIntro: string;
  phonePrimary: string;
  phoneSecondary: string;
  email: string;
  officeAddress: string;
  businessHours: string;
  whatsappNumber: string;
  seoTitle: string;
  seoDescription: string;
  bharatgasLogoUrl: string;
  bharatgasLogoAlt: string;
  mbgaLogoUrl: string;
  mbgaLogoAlt: string;
  faviconUrl?: string;
  faviconAlt?: string;
  heroSlides: HeroSlide[];
}

/* ---------------------------------------------------------------------------
 * Home page content
 *
 * Every homepage section is stored here so the public page is assembled from
 * the database instead of a fixed template. Each section carries `published`
 * (show or hide it) and `displayOrder` (where it sits on the page).
 * ------------------------------------------------------------------------ */

export interface HomeSectionBase {
  published: boolean;
  displayOrder: number;
}

export interface HomeQuickLink {
  id: string;
  icon: string;
  title: string;
  description: string;
  linkText: string;
  href: string;
  displayOrder: number;
  published: boolean;
}

export interface HomeFeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
  displayOrder: number;
  published: boolean;
}

export interface HomeBadgeItem {
  id: string;
  icon: string;
  label: string;
  displayOrder: number;
}

export interface HomeMetric {
  id: string;
  value: string;
  label: string;
  displayOrder: number;
}

export interface HomeCheckItem {
  id: string;
  label: string;
  displayOrder: number;
}

export interface HomeSafetyStep {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
}

export interface HomeQuickLinksSection extends HomeSectionBase {
  items: HomeQuickLink[];
}

export interface HomeQrSection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  badgeText: string;
  scanTitle: string;
  scanSubtitle: string;
  benefits: HomeBadgeItem[];
}

export interface HomeAboutSection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  lead: string;
  detail: string;
  image: string;
  imageAlt: string;
  badgeTitle: string;
  badgeSubtitle: string;
  checkItems: HomeCheckItem[];
  metrics: HomeMetric[];
  ctaText: string;
  ctaLink: string;
}

export interface HomeServicesSection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  lead: string;
  cards: HomeFeatureCard[];
}

export interface HomeProductsSection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  lead: string;
  ctaText: string;
  limit: number;
  noteTitle: string;
  noteDescription: string;
  noteCtaText: string;
}

export interface HomeSafetySection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  lead: string;
  image: string;
  imageAlt: string;
  badgeText: string;
  proofTitle: string;
  proofSubtitle: string;
  ctaText: string;
  ctaLink: string;
  helpTitle: string;
  helpLinkText: string;
  panelKicker: string;
  panelTitle: string;
  panelSubtitle: string;
  steps: HomeSafetyStep[];
  footerTitle: string;
  footerSubtitle: string;
  footerLinkText: string;
  footerLinkHref: string;
}

export interface HomeTrustStripSection extends HomeSectionBase {
  items: HomeBadgeItem[];
}

export interface HomeJourneySection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  ctaText: string;
  limit: number;
}

export interface HomeAchievementsSection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  lead: string;
  ctaText: string;
  limit: number;
}

export interface HomePartnershipSection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  lead: string;
  leftLabel: string;
  leftTitle: string;
  leftDescription: string;
  bridgeTitle: string;
  bridgeFlow: string;
  rightLabel: string;
  rightTitle: string;
  rightDescription: string;
}

export interface HomeSustainabilitySection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  limit: number;
}

export interface HomeGallerySection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  ctaText: string;
  limit: number;
}

export interface HomeVisitSection extends HomeSectionBase {
  eyebrow: string;
  title: string;
  lead: string;
  mapsUrl: string;
}

export interface HomeContent {
  quickLinks: HomeQuickLinksSection;
  qr: HomeQrSection;
  about: HomeAboutSection;
  services: HomeServicesSection;
  products: HomeProductsSection;
  safety: HomeSafetySection;
  trustStrip: HomeTrustStripSection;
  journey: HomeJourneySection;
  achievements: HomeAchievementsSection;
  partnership: HomePartnershipSection;
  sustainability: HomeSustainabilitySection;
  gallery: HomeGallerySection;
  visit: HomeVisitSection;
}

export type HomeSectionKey = keyof HomeContent;

/* ---------------------------------------------------------------------------
 * Page headers
 *
 * The banner at the top of each inner page. Copy and background artwork are
 * stored per page so they can be changed without touching the templates.
 * ------------------------------------------------------------------------ */

export interface PageHero {
  eyebrow: string;
  title: string;
  description: string;
  /** Background artwork shown behind the navy overlay. */
  image: string;
  imageAlt: string;
}

export interface PageHeroesContent {
  products: PageHero;
  journey: PageHero;
  achievements: PageHero;
  gallery: PageHero;
  contact: PageHero;
}

export type PageHeroKey = keyof PageHeroesContent;

/* ---------------------------------------------------------------------------
 * Site-wide sections
 *
 * `assist` is the "How can we assist you?" panel the runtime injects on every
 * page; `videoHub` is the video section on the gallery page. Both used to be
 * fixed markup.
 * ------------------------------------------------------------------------ */

export interface AssistOption {
  id: string;
  icon: string;
  kicker: string;
  title: string;
  linkText: string;
  href: string;
  displayOrder: number;
}

export interface SiteAssistSection {
  published: boolean;
  partnerKicker: string;
  kicker: string;
  title: string;
  description: string;
  options: AssistOption[];
  noteTitle: string;
  noteText: string;
  noteLinkText: string;
  noteHref: string;
}

export interface VideoHubItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  url: string;
  thumbnailUrl: string;
  displayOrder: number;
}

export interface VideoHubSection {
  published: boolean;
  eyebrow: string;
  title: string;
  lead: string;
  countLabel: string;
  featuredEmbedUrl: string;
  featuredKicker: string;
  featuredTitle: string;
  featuredDescription: string;
  playlistKicker: string;
  playlistTitle: string;
  items: VideoHubItem[];
  channelLinkText: string;
  channelUrl: string;
}

export interface SiteSectionsContent {
  assist: SiteAssistSection;
  videoHub: VideoHubSection;
}

export interface SiteNavigationItem {
  id: string;
  label: string;
  href: string;
  displayOrder: number;
  published: boolean;
}

export interface SiteFooterBadge {
  id: string;
  icon: string;
  label: string;
  displayOrder: number;
}

/** Shared public-site copy rendered by the browser runtime on every page. */
export interface SiteChromeContent {
  loaderKicker: string;
  loaderTagline: string;
  hoursLabel: string;
  callButtonText: string;
  navigation: SiteNavigationItem[];
  newsletter: {
    published: boolean;
    eyebrow: string;
    title: string;
    description: string;
    placeholder: string;
    submitText: string;
    noteText: string;
    invalidEmailText: string;
    pendingText: string;
    successText: string;
    errorText: string;
  };
  cta: {
    published: boolean;
    title: string;
    description: string;
    callText: string;
    contactText: string;
    whatsappText: string;
    whatsappMessage: string;
  };
  footer: {
    supportKicker: string;
    supportTitle: string;
    whatsappText: string;
    aboutText: string;
    badges: SiteFooterBadge[];
    qrKicker: string;
    qrTitle: string;
    qrLinkText: string;
    exploreTitle: string;
    businessTitle: string;
    contactTitle: string;
    phoneHint: string;
    emailHint: string;
    availabilityEyebrow: string;
    hoursTitle: string;
    weekdaysLabel: string;
    closedLabel: string;
    contactButtonText: string;
    copyrightText: string;
    closingText: string;
  };
  discovery: {
    eyebrow: string;
    localitiesLabel: string;
    categoriesLabel: string;
    topicsLabel: string;
    emptyText: string;
  };
}

export type GalleryItemType = 'Image' | 'Video';
export type GalleryStatus = 'Published' | 'Draft';

export interface GalleryItem {
  id: string;
  type: GalleryItemType;
  /** Image source, uploaded video file, or an external video link. */
  url: string;
  /** Poster frame for a video item; unused for images. */
  thumbnailUrl: string;
  category: string;
  altText: string;
  caption: string;
  displayOrder: number;
  status: GalleryStatus;
}

export type JourneyBrand = 'MBGA' | 'Bharatgas';

export interface JourneyMilestone {
  id: string;
  year: string;
  category: string;
  title: string;
  description: string;
  brand: JourneyBrand;
  icon: string;
  imageUrl: string;
  imageAlt: string;
  displayOrder: number;
  published: boolean;
  featured: boolean;
}

export type AchievementType = 'Award' | 'Milestone' | 'Recognition' | 'Certificate';

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  year: string;
  brand: string;
  imageUrl: string;
  published: boolean;
}

export interface SustainabilityCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  imageAlt: string;
  displayOrder: number;
  published: boolean;
}

export interface SupplyChainStep {
  id: string;
  step: number;
  title: string;
  description: string;
}

export interface SustainabilityContent {
  heroTitle: string;
  heroDescription: string;
  heroImage: string;
  heroImageAlt: string;
  storyTitle: string;
  storyDescription: string;
  storyImage: string;
  storyImageAlt: string;
  storyPoints: string[];
  cards: SustainabilityCard[];
  routePlanning: string;
  reusableCycle: string;
  digitalAssistance: string;
  supplyChainSteps: SupplyChainStep[];
}

export type LocalDiscoveryGroup = 'localities' | 'categories' | 'topics';

export interface LocalDiscoveryItem {
  id: string;
  label: string;
  href: string;
  displayOrder: number;
  active: boolean;
}

export interface LocalDiscoveryContent {
  heading: string;
  description: string;
  localities: LocalDiscoveryItem[];
  categories: LocalDiscoveryItem[];
  topics: LocalDiscoveryItem[];
}

export type UserRole = 'Super Admin' | 'Editor' | 'Support Staff' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastActive: string;
  password?: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'booking' | 'enquiry' | 'feedback' | 'product' | 'content' | 'user';
}

export interface QrSettings {
  whatsappNumber: string;
  defaultMessage: string;
  bookingUrl: string;
}

export interface AgencySettings {
  agencyName: string;
  tagline: string;
  phonePrimary: string;
  phoneSecondary: string;
  email: string;
  officeAddress: string;
  businessHours: string;
  whatsappNumber: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  notifyNewBookings: boolean;
  notifyNewEnquiries: boolean;
  notifyNewFeedback: boolean;
  notifyLowStock: boolean;
  emailTemplateBooking: string;
  emailTemplateEnquiry: string;
  emailTemplateFeedback: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  active: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
  lastMailStatus: 'Not sent' | 'Sent' | 'Failed' | 'Skipped';
}

export interface EmailServiceStatus {
  configured: boolean;
  missing: string[];
  fromAddress: string | null;
  adminNotificationAddress: string | null;
}

export interface ContactFormType {
  id: 'enquiry' | 'booking' | 'feedback';
  label: string;
  enabled: boolean;
  displayOrder: number;
}

export interface ContactSettings {
  eyebrow: string;
  title: string;
  description: string;
  callButtonText: string;
  emailButtonText: string;
  submitButtonText: string;
  statusText: string;
  unavailableText: string;
  formTypes: ContactFormType[];
}
