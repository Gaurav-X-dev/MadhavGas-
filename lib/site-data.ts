import { getCollection, getSingleton } from './resources';
import type {
  Achievement,
  AgencySettings,
  ContactSettings,
  GalleryItem,
  HomeContent,
  JourneyMilestone,
  LocalDiscoveryContent,
  PageHeroesContent,
  Product,
  QrSettings,
  SiteChromeContent,
  SiteContent,
  SiteSectionsContent,
  SustainabilityContent,
} from './types';

export interface PublicSiteData {
  products: Product[];
  journey: JourneyMilestone[];
  achievements: Achievement[];
  gallery: GalleryItem[];
  siteContent: SiteContent;
  homeContent: HomeContent;
  pageHeroes: PageHeroesContent;
  siteSections: SiteSectionsContent;
  siteChrome: SiteChromeContent;
  sustainability: SustainabilityContent;
  localDiscovery: LocalDiscoveryContent;
  qrSettings: QrSettings;
  agencySettings: AgencySettings;
  contactSettings: ContactSettings;
}

export async function getPublicSiteData(): Promise<PublicSiteData> {
  const [products, journey, achievements, gallery, siteContent, homeContent, pageHeroes, siteSections, siteChrome, sustainability, localDiscovery, qrSettings, agencySettings, contactSettings] = await Promise.all([
    getCollection<Product>('products'),
    getCollection<JourneyMilestone>('journey'),
    getCollection<Achievement>('achievements'),
    getCollection<GalleryItem>('gallery'),
    getSingleton<SiteContent>('site-content'),
    getSingleton<HomeContent>('home-content'),
    getSingleton<PageHeroesContent>('page-heroes'),
    getSingleton<SiteSectionsContent>('site-sections'),
    getSingleton<SiteChromeContent>('site-chrome'),
    getSingleton<SustainabilityContent>('sustainability'),
    getSingleton<LocalDiscoveryContent>('local-discovery'),
    getSingleton<QrSettings>('qr-settings'),
    getSingleton<AgencySettings>('agency-settings'),
    getSingleton<ContactSettings>('contact-settings'),
  ]);

  return {
    products,
    journey,
    achievements,
    gallery,
    siteContent: siteContent ?? emptySiteContent,
    homeContent: homeContent ?? emptyHomeContent,
    pageHeroes: pageHeroes ?? emptyPageHeroes,
    siteSections: siteSections ?? emptySiteSections,
    siteChrome: siteChrome ?? emptySiteChrome,
    sustainability: sustainability ?? emptySustainability,
    localDiscovery: localDiscovery ?? emptyLocalDiscovery,
    qrSettings: qrSettings ?? emptyQrSettings,
    agencySettings: agencySettings ?? emptyAgencySettings,
    contactSettings: contactSettings ?? emptyContactSettings,
  };
}

const emptySection = { published: false, displayOrder: 0 };

const emptySiteContent: SiteContent = {
  agencyIntro: '',
  phonePrimary: '',
  phoneSecondary: '',
  email: '',
  officeAddress: '',
  businessHours: '',
  whatsappNumber: '',
  seoTitle: '',
  seoDescription: '',
  bharatgasLogoUrl: '',
  bharatgasLogoAlt: '',
  mbgaLogoUrl: '',
  mbgaLogoAlt: '',
  faviconUrl: '',
  faviconAlt: '',
  heroSlides: [],
};

const emptyHomeContent: HomeContent = {
  quickLinks: { ...emptySection, items: [] },
  qr: { ...emptySection, eyebrow: '', title: '', description: '', ctaText: '', badgeText: '', scanTitle: '', scanSubtitle: '', benefits: [] },
  about: { ...emptySection, eyebrow: '', title: '', lead: '', detail: '', image: '', imageAlt: '', badgeTitle: '', badgeSubtitle: '', checkItems: [], metrics: [], ctaText: '', ctaLink: '' },
  services: { ...emptySection, eyebrow: '', title: '', lead: '', cards: [] },
  products: { ...emptySection, eyebrow: '', title: '', lead: '', ctaText: '', limit: 0, noteTitle: '', noteDescription: '', noteCtaText: '' },
  safety: { ...emptySection, eyebrow: '', title: '', lead: '', image: '', imageAlt: '', badgeText: '', proofTitle: '', proofSubtitle: '', ctaText: '', ctaLink: '', helpTitle: '', helpLinkText: '', panelKicker: '', panelTitle: '', panelSubtitle: '', steps: [], footerTitle: '', footerSubtitle: '', footerLinkText: '', footerLinkHref: '' },
  trustStrip: { ...emptySection, items: [] },
  journey: { ...emptySection, eyebrow: '', title: '', ctaText: '', limit: 0 },
  achievements: { ...emptySection, eyebrow: '', title: '', lead: '', ctaText: '', limit: 0 },
  partnership: { ...emptySection, eyebrow: '', title: '', lead: '', leftLabel: '', leftTitle: '', leftDescription: '', bridgeTitle: '', bridgeFlow: '', rightLabel: '', rightTitle: '', rightDescription: '' },
  sustainability: { ...emptySection, eyebrow: '', title: '', description: '', ctaText: '', ctaLink: '', limit: 0 },
  gallery: { ...emptySection, eyebrow: '', title: '', ctaText: '', limit: 0 },
  visit: { ...emptySection, eyebrow: '', title: '', lead: '', mapsUrl: '' },
};

const emptyHero = { eyebrow: '', title: '', description: '', image: '', imageAlt: '' };
const emptyPageHeroes: PageHeroesContent = {
  products: emptyHero,
  journey: emptyHero,
  achievements: emptyHero,
  gallery: emptyHero,
  contact: emptyHero,
};

const emptySiteSections: SiteSectionsContent = {
  assist: { published: false, partnerKicker: '', kicker: '', title: '', description: '', options: [], noteTitle: '', noteText: '', noteLinkText: '', noteHref: '' },
  videoHub: { published: false, eyebrow: '', title: '', lead: '', countLabel: '', featuredEmbedUrl: '', featuredKicker: '', featuredTitle: '', featuredDescription: '', playlistKicker: '', playlistTitle: '', items: [], channelLinkText: '', channelUrl: '' },
};

const emptySiteChrome: SiteChromeContent = {
  loaderKicker: '',
  loaderTagline: '',
  hoursLabel: '',
  callButtonText: '',
  navigation: [],
  newsletter: { published: false, eyebrow: '', title: '', description: '', placeholder: '', submitText: '', noteText: '', invalidEmailText: '', pendingText: '', successText: '', errorText: '' },
  cta: { published: false, title: '', description: '', callText: '', contactText: '', whatsappText: '', whatsappMessage: '' },
  footer: { supportKicker: '', supportTitle: '', whatsappText: '', aboutText: '', badges: [], qrKicker: '', qrTitle: '', qrLinkText: '', exploreTitle: '', businessTitle: '', contactTitle: '', phoneHint: '', emailHint: '', availabilityEyebrow: '', hoursTitle: '', weekdaysLabel: '', closedLabel: '', contactButtonText: '', copyrightText: '', closingText: '' },
  discovery: { eyebrow: '', localitiesLabel: '', categoriesLabel: '', topicsLabel: '', emptyText: '' },
};

const emptySustainability: SustainabilityContent = {
  heroTitle: '',
  heroDescription: '',
  heroImage: '',
  heroImageAlt: '',
  storyTitle: '',
  storyDescription: '',
  storyImage: '',
  storyImageAlt: '',
  storyPoints: [],
  cards: [],
  routePlanning: '',
  reusableCycle: '',
  digitalAssistance: '',
  supplyChainSteps: [],
};

const emptyLocalDiscovery: LocalDiscoveryContent = {
  heading: '',
  description: '',
  localities: [],
  categories: [],
  topics: [],
};

const emptyQrSettings: QrSettings = {
  whatsappNumber: '',
  defaultMessage: '',
  bookingUrl: '',
};

const emptyAgencySettings: AgencySettings = {
  agencyName: '',
  tagline: '',
  phonePrimary: '',
  phoneSecondary: '',
  email: '',
  officeAddress: '',
  mapEmbedUrl: '',
  businessHours: '',
  whatsappNumber: '',
  facebook: '',
  instagram: '',
  linkedin: '',
  twitter: '',
  notifyNewBookings: false,
  notifyNewEnquiries: false,
  notifyNewFeedback: false,
  notifyLowStock: false,
  emailTemplateBooking: '',
  emailTemplateEnquiry: '',
  emailTemplateFeedback: '',
};

const emptyContactSettings: ContactSettings = {
  eyebrow: '',
  title: '',
  description: '',
  callButtonText: '',
  emailButtonText: '',
  submitButtonText: '',
  statusText: '',
  unavailableText: '',
  formTypes: [],
};

export function whatsappUrl(qr: QrSettings, agency: AgencySettings) {
  const phone = (qr.whatsappNumber || agency.whatsappNumber).replace(/\D/g, '');
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(qr.defaultMessage)}` : '#';
}
