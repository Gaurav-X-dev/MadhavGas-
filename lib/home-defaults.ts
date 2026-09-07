import seed from './home-defaults.json';
import type { HomeContent } from './types';

/**
 * Seed content for the homepage. Every value is editable from
 * Admin → Home Page; these defaults only apply before the `home-content`
 * singleton has been saved (and as a per-field fallback for records written
 * before a section existed).
 *
 * The data lives in `home-defaults.json` so the database seed script
 * (`scripts/setup-db.mjs`) writes exactly what the app falls back to.
 */
export const homeContent = seed as HomeContent;
