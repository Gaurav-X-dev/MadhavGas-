import seed from './site-section-defaults.json';
import type { SiteSectionsContent } from './types';

/**
 * Seed content for the sections that appear outside a single page: the
 * site-wide "How can we assist you?" panel and the gallery video hub.
 * Editable from Admin; these values apply only before the `site-sections`
 * singleton has been saved.
 */
export const siteSections = seed as SiteSectionsContent;
