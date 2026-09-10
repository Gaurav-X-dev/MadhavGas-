import 'server-only';
import type { GalleryItem } from './types';

/** Escapes a value for interpolation into server-rendered HTML. */
export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** Escapes text but keeps admin-authored line breaks as `<br />`. */
export function escapeMultiline(value: unknown) {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

/** Extracts the daily opening window from a free-form business-hours string. */
export function agencyTime(value: string) {
  const match = value.match(/(?:Monday|Mon)[^:]*:\s*(.+?)(?:\||$)/i);
  return match?.[1]?.trim() || value;
}

/** The icon names the public runtime script can actually draw. */
const iconNames = new Set([
  'flame', 'headphones', 'shield-check', 'mail', 'map-pin', 'clock', 'phone',
  'whatsapp', 'message-circle', 'building2', 'trending-up', 'route',
]);

const iconAliases: Record<string, string> = {
  building2: 'building2',
  factory: 'shield-check',
  trendingup: 'trending-up',
  monitorsmartphone: 'mail',
  smartphone: 'mail',
  route: 'route',
  recycle: 'shield-check',
  gauge: 'clock',
  award: 'shield-check',
  truck: 'map-pin',
  users: 'headphones',
  messagecircle: 'message-circle',
  mappin: 'map-pin',
  shieldcheck: 'shield-check',
};

/** Maps an admin-selected icon name onto one the public runtime can render. */
export function safeIcon(value: string, fallback = 'shield-check') {
  const direct = String(value || '').toLowerCase();
  if (iconNames.has(direct)) return direct;
  return iconAliases[direct.replaceAll('-', '').replaceAll(' ', '')] || fallback;
}

/** Pulls the leading number out of a capacity label such as "47.5 kg". */
export function capacityNumber(value: string) {
  return value.match(/[\d.]+/)?.[0] || value.slice(0, 5);
}

/** Only same-origin paths and http(s) URLs are allowed in rendered markup. */
export function safeHref(value: string, fallback = '/contact') {
  const candidate = String(value || '').trim();
  if (/^\/(?!\/)/.test(candidate)) return candidate;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (/^(tel:|mailto:)[^\s<>"']+$/i.test(candidate)) return candidate;
  return fallback;
}

/** Sorts any list of records that carries a numeric `displayOrder`. */
export function byDisplayOrder<T extends { displayOrder: number }>(items: readonly T[]) {
  return [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

/** True when the URL points at a video file this site serves and can play inline. */
export function isPlayableVideo(url: string) {
  return /^\/uploads\/[\w.-]+\.(mp4|webm)$/i.test(String(url || '').trim());
}

/**
 * Renders one gallery tile.
 *
 * Images open in the lightbox on the gallery page and link through to it from
 * the home preview. Videos always show their uploaded thumbnail with a play
 * badge: an uploaded file opens in the video lightbox, while an external link
 * (YouTube and similar) opens in a new tab.
 */
export function galleryCard(item: GalleryItem, home = false) {
  const category = escapeHtml(item.category.toLowerCase());
  const caption = `<span class="gallery-caption">${escapeHtml(item.caption)}</span>`;

  if (item.type === 'Video') {
    const poster = item.thumbnailUrl || '';
    const media = poster
      ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(item.altText)}" loading="lazy" />`
      : '<span class="gallery-video-placeholder" aria-hidden="true"></span>';
    const badge = '<span class="gallery-play" aria-hidden="true"></span>';
    if (home) {
      return `<a class="gallery-item gallery-item-video reveal" href="/gallery">${media}${badge}${caption}</a>`;
    }
    if (isPlayableVideo(item.url)) {
      return `<button class="gallery-item gallery-item-video" type="button" data-category="${category}" data-lightbox="gallery" data-video="${escapeHtml(item.url)}" data-title="${escapeHtml(item.caption)}"${poster ? ` data-poster="${escapeHtml(poster)}"` : ''}>${media}${badge}${caption}</button>`;
    }
    return `<a class="gallery-item gallery-item-video" data-category="${category}" href="${escapeHtml(safeHref(item.url, '/gallery'))}" target="_blank" rel="noopener">${media}${badge}${caption}</a>`;
  }

  const image = `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.altText)}" loading="lazy" />`;
  if (home) return `<a class="gallery-item reveal" href="/gallery">${image}${caption}</a>`;
  return `<button class="gallery-item" type="button" data-category="${category}" data-lightbox="gallery" data-title="${escapeHtml(item.caption)}">${image}${caption}</button>`;
}
