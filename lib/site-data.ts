import { getCollection, getSingleton } from './resources';
import type {
  Achievement, AgencySettings, GalleryItem, HomeContent, JourneyMilestone, Product,
  LocalDiscoveryContent, PageHeroesContent, QrSettings, SiteChromeContent, SiteContent, SiteSectionsContent, SustainabilityContent, ContactSettings,
} from './types';
import { homeContent as fallbackHome } from './home-defaults';
import { pageHeroes as fallbackHeroes } from './page-hero-defaults';
import { siteSections as fallbackSections } from './site-section-defaults';
import { siteChrome as fallbackChrome } from './site-chrome-defaults';
import {
  agencySettings as fallbackAgency,
  localDiscoveryContent as fallbackDiscovery,
  qrSettings as fallbackQr,
  siteContent as fallbackSite,
  sustainabilityContent as fallbackSustainability,
  fallbackContactSettings,
} from './mock-data';

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
    siteContent: siteContent ?? fallbackSite,
    homeContent: mergeHomeContent(homeContent),
    pageHeroes: mergePageHeroes(pageHeroes),
    siteSections: mergeSiteSections(siteSections),
    siteChrome: mergeSiteChrome(siteChrome),
    sustainability: sustainability ?? fallbackSustainability,
    localDiscovery: localDiscovery ?? fallbackDiscovery,
    qrSettings: qrSettings ?? fallbackQr,
    agencySettings: agencySettings ?? fallbackAgency,
    contactSettings: contactSettings ? { ...fallbackContactSettings, ...contactSettings } : fallbackContactSettings,
  };
}

function mergeSiteChrome(stored: SiteChromeContent | null): SiteChromeContent {
  if (!stored || typeof stored !== 'object') return fallbackChrome;
  return {
    ...fallbackChrome,
    ...stored,
    newsletter: { ...fallbackChrome.newsletter, ...stored.newsletter },
    cta: { ...fallbackChrome.cta, ...stored.cta },
    footer: { ...fallbackChrome.footer, ...stored.footer },
    discovery: { ...fallbackChrome.discovery, ...stored.discovery },
    navigation: Array.isArray(stored.navigation) ? stored.navigation : fallbackChrome.navigation,
  };
}

/**
 * Older saved records predate newer homepage sections, so each section falls
 * back to its seed values field by field rather than failing to render.
 */
function mergeHomeContent(stored: HomeContent | null): HomeContent {
  if (!stored || typeof stored !== 'object') return fallbackHome;
  const merged: Record<string, unknown> = { ...fallbackHome };
  for (const key of Object.keys(fallbackHome) as Array<keyof HomeContent>) {
    const section = (stored as unknown as Record<string, unknown>)[key];
    merged[key] = section && typeof section === 'object'
      ? { ...(fallbackHome[key] as object), ...(section as object) }
      : fallbackHome[key];
  }
  return merged as unknown as HomeContent;
}

/** Falls back page by page, so a record saved before a page existed still renders. */
function mergePageHeroes(stored: PageHeroesContent | null): PageHeroesContent {
  if (!stored || typeof stored !== 'object') return fallbackHeroes;
  const merged: Record<string, unknown> = { ...fallbackHeroes };
  for (const key of Object.keys(fallbackHeroes) as Array<keyof PageHeroesContent>) {
    const hero = (stored as unknown as Record<string, unknown>)[key];
    merged[key] = hero && typeof hero === 'object'
      ? { ...fallbackHeroes[key], ...(hero as object) }
      : fallbackHeroes[key];
  }
  return merged as unknown as PageHeroesContent;
}

/** Falls back section by section for records saved before a section existed. */
function mergeSiteSections(stored: SiteSectionsContent | null): SiteSectionsContent {
  if (!stored || typeof stored !== 'object') return fallbackSections;
  const merged: Record<string, unknown> = { ...fallbackSections };
  for (const key of Object.keys(fallbackSections) as Array<keyof SiteSectionsContent>) {
    const section = (stored as unknown as Record<string, unknown>)[key];
    merged[key] = section && typeof section === 'object'
      ? { ...fallbackSections[key], ...(section as object) }
      : fallbackSections[key];
  }
  return merged as unknown as SiteSectionsContent;
}

export function whatsappUrl(qr: QrSettings, agency: AgencySettings) {
  const phone = (qr.whatsappNumber || agency.whatsappNumber).replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(qr.defaultMessage)}`;
}
