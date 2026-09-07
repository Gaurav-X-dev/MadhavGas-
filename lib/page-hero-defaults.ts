import seed from './page-hero-defaults.json';
import type { PageHeroesContent } from './types';

/**
 * Seed banners for the inner pages. Editable from
 * Admin → Website → Site Content → Page Headers; these values apply only
 * before the `page-heroes` singleton has been saved, and as a per-page
 * fallback for records written before a page existed.
 *
 * The data lives in `page-hero-defaults.json` so the database seed script
 * writes exactly what the app falls back to.
 */
export const pageHeroes = seed as PageHeroesContent;
