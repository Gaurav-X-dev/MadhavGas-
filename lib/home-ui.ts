import 'server-only';
import {
  byDisplayOrder, capacityNumber, escapeHtml, escapeMultiline, galleryCard, safeHref, safeIcon,
} from './render-utils';
import type { PublicSiteData } from './site-data';
import type { HomeContent, HomeSectionKey } from './types';

/*
 * The homepage is assembled entirely from database content: section copy and
 * imagery come from the `home-content` singleton, list content comes from the
 * products / journey / achievements / gallery / sustainability records, and
 * contact details come from agency settings. Nothing on this page is fixed
 * markup, so every block can be edited, reordered or hidden from the admin
 * panel without touching code.
 */

interface AgencyLinks {
  telHref: string;
  whatsappHref: string;
  mapsHref: string;
  mailHref: string;
}

function agencyLinks(data: PublicSiteData): AgencyLinks {
  const agency = data.agencySettings;
  const whatsappDigits = (data.qrSettings.whatsappNumber || agency.whatsappNumber).replace(/\D/g, '');
  const message = data.qrSettings.defaultMessage || `Hello ${agency.agencyName}, I need non-domestic LPG assistance.`;
  const configuredMaps = data.homeContent.visit.mapsUrl?.trim();
  return {
    telHref: `tel:+${agency.phonePrimary.replace(/\D/g, '')}`,
    whatsappHref: `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`,
    mapsHref: configuredMaps && /^https?:\/\//i.test(configuredMaps)
      ? configuredMaps
      : `https://maps.google.com/?q=${encodeURIComponent(agency.officeAddress)}`,
    mailHref: `mailto:${agency.email}`,
  };
}

/** Resolves the runtime tokens an admin can pick for a quick-link destination. */
function resolveHref(value: string, links: AgencyLinks) {
  switch (value.trim()) {
    case 'tel:': return links.telHref;
    case 'whatsapp:': return links.whatsappHref;
    case 'maps:': return links.mapsHref;
    case 'email:': return links.mailHref;
    default: return safeHref(value);
  }
}

function externalAttributes(href: string) {
  return /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener"' : '';
}

function emptyState(message: string) {
  return `<div class="content-empty-state">${escapeHtml(message)}</div>`;
}

function sectionHead(eyebrow: string, title: string, lead = '', action = '') {
  const leadMarkup = lead ? `<p class="lead">${escapeHtml(lead)}</p>` : '';
  return `<div class="section-head"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h2>${escapeMultiline(title)}</h2></div>${action || leadMarkup}</div>`;
}

/* -------------------------------- Hero --------------------------------- */

function renderHero(data: PublicSiteData) {
  const agency = data.agencySettings;
  const published = byDisplayOrder(data.siteContent.heroSlides.filter((slide) => slide.published));
  const slides = published.length ? published : [{
    id: 'fallback',
    title: 'Dependable Commercial & Industrial LPG Supply',
    subtitle: data.siteContent.agencyIntro,
    image: '/assets/industrial/industrial-hero.png',
    ctaText: `Contact ${agency.agencyName}`,
    ctaLink: '/contact',
    displayOrder: 0,
    published: true,
  }];
  const trust = byDisplayOrder(data.homeContent.trustStrip.items).slice(0, 3);
  const trustRow = trust.length
    ? `<div class="trust-row">${trust.map((item) => `<span><i data-icon="${safeIcon(item.icon)}"></i>${escapeHtml(item.label)}</span>`).join('')}</div>`
    : '';

  const articles = slides.map((slide, index) => {
    const image = escapeHtml(slide.image || '/assets/industrial/industrial-hero.png');
    const heading = index === 0
      ? `<h1>${escapeMultiline(slide.title)}</h1>`
      : `<h2 class="hero-heading">${escapeMultiline(slide.title)}</h2>`;
    return `<article class="hero-slide${index === 0 ? ' is-active' : ''}" style="--slide-image:url(&quot;${image}&quot;)"${index ? ' aria-hidden="true"' : ''}>`
      + `<div class="container hero-slide-content">`
      + `<span class="eyebrow">${escapeHtml(agency.agencyName)}</span>${heading}`
      + `<p class="lead">${escapeHtml(slide.subtitle)}</p>`
      + `<div class="hero-actions">`
      + `<a class="btn btn-primary" href="${escapeHtml(safeHref(slide.ctaLink))}">${escapeHtml(slide.ctaText || 'Contact us')}</a>`
      + `<a class="btn btn-light" href="tel:+${escapeHtml(agency.phonePrimary.replace(/\D/g, ''))}"><span class="btn-icon" data-icon="phone"></span>Call Now</a>`
      + `</div>${index === 0 ? trustRow : ''}</div></article>`;
  }).join('');

  const dots = slides.map((_, index) => `<button class="slider-dot${index === 0 ? ' is-active' : ''}" type="button" role="tab" aria-label="Show slide ${index + 1}" aria-selected="${index === 0}"></button>`).join('');
  return `<section class="hero hero-slider" aria-label="LPG service highlights" tabindex="0">`
    + `<div class="hero-slides">${articles}</div>`
    + `<div class="container slider-controls"><button class="slider-arrow slider-prev" type="button" aria-label="Previous slide">&#8249;</button>`
    + `<div class="slider-dots" role="tablist" aria-label="Choose hero slide">${dots}</div>`
    + `<button class="slider-arrow slider-next" type="button" aria-label="Next slide">&#8250;</button></div></section>`;
}

/* ------------------------------ Quick links ---------------------------- */

function renderQuickLinks(content: HomeContent, links: AgencyLinks) {
  const items = byDisplayOrder(content.quickLinks.items.filter((item) => item.published));
  if (!items.length) return '';
  const cards = items.map((item) => {
    const href = resolveHref(item.href, links);
    const iconClass = safeIcon(item.icon, 'phone') === 'whatsapp' ? 'icon whatsapp-icon' : 'icon';
    return `<a class="quick-card" href="${escapeHtml(href)}"${externalAttributes(href)}>`
      + `<span class="${iconClass}" data-icon="${safeIcon(item.icon, 'phone')}"></span>`
      + `<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>`
      + `<span>${escapeHtml(item.linkText)} &rarr;</span></a>`;
  }).join('');
  return `<div class="container quick-grid home-quick-grid reveal">${cards}</div>`;
}

/* --------------------------------- QR ---------------------------------- */

function renderQr(content: HomeContent, links: AgencyLinks) {
  const qr = content.qr;
  const benefits = byDisplayOrder(qr.benefits);
  const benefitMarkup = benefits.length
    ? `<div class="booking-benefits">${benefits.map((item) => `<span><i data-icon="${safeIcon(item.icon, 'clock')}"></i>${escapeHtml(item.label)}</span>`).join('')}</div>`
    : '';
  return `<section class="section home-qr-section" id="qr-booking"><div class="container qr-booking-card home-qr-card reveal-up">`
    + `<div class="qr-booking-copy"><span class="eyebrow">${escapeHtml(qr.eyebrow)}</span><h2>${escapeMultiline(qr.title)}</h2>`
    + `<p>${escapeHtml(qr.description)}</p>${benefitMarkup}`
    + `<a class="btn btn-primary" target="_blank" rel="noopener" href="${escapeHtml(links.whatsappHref)}">${escapeHtml(qr.ctaText)}</a></div>`
    + `<div class="booking-qr-wrap"><span class="qr-brand-badge">${escapeHtml(qr.badgeText)}</span>`
    + `<img src="/api/public/qr" alt="${escapeHtml(qr.scanTitle)}" width="260" height="260" />`
    + `<strong>${escapeHtml(qr.scanTitle)}</strong><span>${escapeHtml(qr.scanSubtitle)}</span></div></div></section>`;
}

/* -------------------------------- About -------------------------------- */

function renderAbout(content: HomeContent) {
  const about = content.about;
  const checks = byDisplayOrder(about.checkItems);
  const metrics = byDisplayOrder(about.metrics);
  const checkMarkup = checks.length
    ? `<div class="check-grid">${checks.map((item) => `<div class="check-item">${escapeHtml(item.label)}</div>`).join('')}</div>`
    : '';
  const metricMarkup = metrics.length
    ? `<div class="about-metrics">${metrics.map((item) => `<div><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join('')}</div>`
    : '';
  return `<section class="section home-about-section"><div class="container about-grid home-about-grid">`
    + `<div class="image-frame home-about-image reveal-left">`
    + `<img src="${escapeHtml(about.image)}" alt="${escapeHtml(about.imageAlt)}" loading="lazy" width="900" height="650" />`
    + `<div class="image-trust-badge"><strong>${escapeHtml(about.badgeTitle)}</strong><span>${escapeHtml(about.badgeSubtitle)}</span></div></div>`
    + `<div class="home-about-copy reveal-right"><span class="eyebrow">${escapeHtml(about.eyebrow)}</span><h2>${escapeMultiline(about.title)}</h2>`
    + `<p class="lead">${escapeHtml(about.lead)}</p><p class="about-detail">${escapeHtml(about.detail)}</p>`
    + `${checkMarkup}${metricMarkup}`
    + `<a class="text-link" href="${escapeHtml(safeHref(about.ctaLink))}">${escapeHtml(about.ctaText)} <span>&rarr;</span></a></div></div></section>`;
}

/* ------------------------------- Services ------------------------------ */

function renderServices(content: HomeContent) {
  const services = content.services;
  const cards = byDisplayOrder(services.cards.filter((card) => card.published));
  const body = cards.length
    ? `<div class="feature-grid home-feature-grid stagger-group">${cards.map((card, index) => `<article class="feature-card reveal">`
      + `<b class="feature-number">${String(index + 1).padStart(2, '0')}</b>`
      + `<span class="icon" data-icon="${safeIcon(card.icon)}"></span>`
      + `<h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p>`
      + `<a href="${escapeHtml(safeHref(card.linkHref))}">${escapeHtml(card.linkText)} <span>&rarr;</span></a></article>`).join('')}</div>`
    : emptyState('Published service commitments will appear here.');
  return `<section class="features section home-services-section"><div class="container">`
    + sectionHead(services.eyebrow, services.title, services.lead) + body + `</div></section>`;
}

/* ------------------------------- Products ------------------------------ */

function renderProducts(data: PublicSiteData) {
  const settings = data.homeContent.products;
  const products = byDisplayOrder(data.products.filter((item) => !item.archived)).slice(0, settings.limit);
  const cards = products.map((product, index) => {
    const media = product.image
      ? `<div class="product-card-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" /></div>`
      : `<div class="product-cylinder cylinder-${escapeHtml(capacityNumber(product.cylinderCapacity).replace('.', ''))}" aria-hidden="true"><span></span><b>${escapeHtml(capacityNumber(product.cylinderCapacity))}</b><small>KG</small></div>`;
    return `<article class="product-card${index === 0 ? ' product-card-featured' : ''} reveal-up">`
      + `<span class="product-tag">${escapeHtml(product.availability)}</span>${media}`
      + `<div class="product-card-content"><small>${escapeHtml(product.category)}</small><h3>${escapeHtml(product.name)}</h3>`
      + `<p>${escapeHtml(product.description)}</p>`
      + `<ul>${product.features.slice(0, 2).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>`
      + `<a href="/contact">Discuss Requirement <span>&rarr;</span></a></div></article>`;
  }).join('');

  const head = `<div class="section-head products-section-head"><div><span class="eyebrow">${escapeHtml(settings.eyebrow)}</span><h2>${escapeMultiline(settings.title)}</h2></div>`
    + `<div class="products-head-copy"><p class="lead">${escapeHtml(settings.lead)}</p>`
    + `<a class="text-link" href="/products">${escapeHtml(settings.ctaText)} <span>&rarr;</span></a></div></div>`;
  const grid = cards ? `<div class="home-product-grid stagger-group">${cards}</div>` : emptyState('Published LPG products will appear here.');
  const note = `<div class="product-note"><span data-icon="shield-check"></span>`
    + `<p><strong>${escapeHtml(settings.noteTitle)}</strong> ${escapeHtml(settings.noteDescription)}</p>`
    + `<a href="/contact">${escapeHtml(settings.noteCtaText)}</a></div>`;
  return `<section class="section home-products-section"><div class="container">${head}${grid}${note}</div></section>`;
}

/* -------------------------------- Safety ------------------------------- */

function renderSafety(data: PublicSiteData) {
  const safety = data.homeContent.safety;
  const links = agencyLinks(data);
  const steps = byDisplayOrder(safety.steps);
  const list = steps.length
    ? `<ul class="safety-list premium-safety-list">${steps.map((step, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b><div><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.description)}</p></div></li>`).join('')}</ul>`
    : emptyState('Safety checklist items will appear here.');
  return `<section class="safety section home-safety-section" id="home-safety" style="--section-bg-image:url(&quot;${escapeHtml(safety.image)}&quot;)"><div class="container safety-grid">`
    + `<div class="reveal"><span class="eyebrow">${escapeHtml(safety.eyebrow)}</span><h2>${escapeMultiline(safety.title)}</h2>`
    + `<p class="lead">${escapeHtml(safety.lead)}</p>`
    + `<div class="safety-mini-proof"><span data-icon="shield-check"></span><div><strong>${escapeHtml(safety.proofTitle)}</strong><small>${escapeHtml(safety.proofSubtitle)}</small></div></div>`
    + `<a class="btn btn-light" href="${escapeHtml(safeHref(safety.ctaLink))}">${escapeHtml(safety.ctaText)}</a>`
    + `<div class="safety-help-line"><span data-icon="phone"></span><div><small>${escapeHtml(safety.helpTitle)}</small><a href="${escapeHtml(links.telHref)}">${escapeHtml(safety.helpLinkText)}</a></div></div></div>`
    + `<div class="safety-panel premium-safety-panel reveal"><div class="safety-visual">`
    + `<img class="safety-photo" src="${escapeHtml(safety.image)}" alt="${escapeHtml(safety.imageAlt)}" loading="lazy" width="1600" height="1067" />`
    + `<span class="safety-visual-badge"><i data-icon="shield-check"></i>${escapeHtml(safety.badgeText)}</span></div>`
    + `<div class="safety-content"><div class="safety-content-head"><span>${escapeHtml(safety.panelKicker)}</span>`
    + `<h3>${escapeHtml(safety.panelTitle)}</h3><p>${escapeHtml(safety.panelSubtitle)}</p></div>${list}`
    + `<div class="safety-panel-footer"><span data-icon="headphones"></span>`
    + `<p><strong>${escapeHtml(safety.footerTitle)}</strong><small>${escapeHtml(safety.footerSubtitle)}</small></p>`
    + `<a href="${escapeHtml(safeHref(safety.footerLinkHref))}">${escapeHtml(safety.footerLinkText)} &rarr;</a></div></div></div></div></section>`;
}

/* ----------------------------- Trust strip ----------------------------- */

function renderTrustStrip(content: HomeContent) {
  const items = byDisplayOrder(content.trustStrip.items);
  if (!items.length) return '';
  return `<div class="trust-strip" aria-label="Our service principles"><div class="container trust-strip-grid">`
    + items.map((item) => `<span><i data-icon="${safeIcon(item.icon)}"></i>${escapeHtml(item.label)}</span>`).join('')
    + `</div></div>`;
}

/* ------------------------------- Journey ------------------------------- */

function renderJourney(data: PublicSiteData) {
  const settings = data.homeContent.journey;
  const milestones = byDisplayOrder(data.journey.filter((item) => item.published));
  const featured = milestones.filter((item) => item.featured);
  const visible = (featured.length ? featured : milestones).slice(0, settings.limit);
  const action = `<a class="btn btn-outline" href="/journey">${escapeHtml(settings.ctaText)} &rarr;</a>`;
  const body = visible.length
    ? `<div class="preview-steps stagger-group">${visible.map((item, index) => `<article class="preview-step reveal-up">`
      + `<span>${String(index + 1).padStart(2, '0')}</span>`
      + `<b>${escapeHtml(item.brand === 'Bharatgas' ? 'Bharatgas' : 'Madhav Bharat Gas')}</b>`
      + `<i data-icon="${safeIcon(item.icon, 'flame')}"></i>`
      + `<small>${escapeHtml(item.year || item.category)}</small>`
      + `<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>`
      + `<a class="journey-read-more" href="/journey">Read more <span>&rarr;</span></a></article>`).join('')}</div>`
    : emptyState('Journey updates will appear here when published.');
  return `<section class="timeline-preview section home-journey-section"><div class="container">`
    + sectionHead(settings.eyebrow, settings.title, '', action) + body + `</div></section>`;
}

/* ----------------------------- Achievements ---------------------------- */

function renderAchievements(data: PublicSiteData) {
  const settings = data.homeContent.achievements;
  const items = data.achievements.filter((item) => item.published).slice(0, settings.limit);
  const glyphs = ['&#9733;', '&#10003;', '&#9670;', '&#10022;', '&#9673;'];
  const action = `<a class="btn btn-outline" href="/achievements">${escapeHtml(settings.ctaText)} &rarr;</a>`;
  const body = items.length
    ? `<div class="awards-grid stagger-group">${items.map((item, index) => {
      const media = item.imageUrl
        ? `<img class="award-card-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />`
        : `<div class="award-icon">${glyphs[index % glyphs.length]}</div>`;
      return `<article class="award-card reveal-up">`
        + `<span class="award-year">${escapeHtml(item.brand)}</span>${media}`
        + `<small>${escapeHtml(item.type)}</small><h3>${escapeHtml(item.title)}</h3>`
        + `<p>${escapeHtml(item.description)}</p><span class="award-label">${escapeHtml(item.year)}</span></article>`;
    }).join('')}</div>`
    : emptyState('Published achievements will appear here.');
  return `<section class="section home-achievements-section"><div class="container">`
    + `<div class="section-head"><div><span class="eyebrow">${escapeHtml(settings.eyebrow)}</span><h2>${escapeMultiline(settings.title)}</h2>`
    + `<p class="lead">${escapeHtml(settings.lead)}</p></div>${action}</div>${body}</div></section>`;
}

/* ----------------------------- Partnership ----------------------------- */

function renderPartnership(content: HomeContent) {
  const partnership = content.partnership;
  return `<section class="section partnership-section"><div class="container">`
    + sectionHead(partnership.eyebrow, partnership.title, partnership.lead)
    + `<div class="partnership-grid stagger-group">`
    + `<article class="partnership-card reveal-up"><span class="mbga-mark">MBGA</span>`
    + `<small>${escapeHtml(partnership.leftLabel)}</small><h3>${escapeHtml(partnership.leftTitle)}</h3>`
    + `<p>${escapeHtml(partnership.leftDescription)}</p></article>`
    + `<div class="supply-bridge reveal-scale"><b>${escapeHtml(partnership.bridgeTitle)}</b><span>${escapeHtml(partnership.bridgeFlow)}</span></div>`
    + `<article class="partnership-card reveal-up"><span class="bharatgas-mark"><i></i><b>Bharatgas</b></span>`
    + `<small>${escapeHtml(partnership.rightLabel)}</small><h3>${escapeHtml(partnership.rightTitle)}</h3>`
    + `<p>${escapeHtml(partnership.rightDescription)}</p></article></div></div></section>`;
}

/* ---------------------------- Sustainability --------------------------- */

function renderSustainability(data: PublicSiteData) {
  const settings = data.homeContent.sustainability;
  // The preview mirrors whatever is published on the Sustainability page, so
  // editing that page updates the homepage automatically.
  const cards = byDisplayOrder(data.sustainability.cards.filter((card) => card.published !== false)).slice(0, settings.limit);
  const points = cards.length
    ? `<div class="sustainability-points">${cards.map((card, index) => `<span><b>${String(index + 1).padStart(2, '0')}</b>${escapeHtml(card.title)}</span>`).join('')}</div>`
    : '';
  return `<section class="section sustainability-preview"><div class="container sustainability-preview-card reveal-up">`
    + `<div><span class="eyebrow">${escapeHtml(settings.eyebrow)}</span><h2>${escapeMultiline(settings.title)}</h2>`
    + `<p>${escapeHtml(settings.description || data.sustainability.heroDescription)}</p></div>${points}`
    + `<a class="btn btn-primary" href="${escapeHtml(safeHref(settings.ctaLink, '/sustainability'))}">${escapeHtml(settings.ctaText)}</a></div></section>`;
}

/* -------------------------------- Gallery ------------------------------ */

function renderGallery(data: PublicSiteData) {
  const settings = data.homeContent.gallery;
  const items = byDisplayOrder(data.gallery.filter((item) => item.status === 'Published')).slice(0, settings.limit);
  const action = `<a class="btn btn-outline" href="/gallery">${escapeHtml(settings.ctaText)} &rarr;</a>`;
  const cards = items.map((item) => galleryCard(item, true)).join('');
  const body = cards ? `<div class="gallery-grid">${cards}</div>` : emptyState('Published gallery media will appear here.');
  return `<section class="section home-gallery-section"><div class="container">`
    + sectionHead(settings.eyebrow, settings.title, '', action) + body + `</div></section>`;
}

/* --------------------------------- Visit ------------------------------- */

function renderVisit(data: PublicSiteData) {
  const settings = data.homeContent.visit;
  const agency = data.agencySettings;
  const links = agencyLinks(data);
  // "Mon to Sat: 9:00 AM â€“ 6:00 PM | Sunday: Closed" becomes one line per day
  // range, with the times emphasised. Anything unparsed is shown as written.
  const hourLines = agency.businessHours.split('|').map((part) => {
    const [label, ...rest] = part.split(':');
    const value = rest.join(':').trim();
    return value
      ? `${escapeHtml(label.trim())}<br /><strong>${escapeHtml(value)}</strong>`
      : escapeHtml(part.trim());
  }).filter(Boolean).join('<br />');
  const cards = [
    `<article><i data-icon="clock"></i><h3>Business Hours</h3><p>${hourLines || escapeHtml(agency.businessHours)}</p></article>`,
    `<article><i data-icon="phone"></i><h3>Call the Agency</h3><p>Speak with our local support team.</p><a href="${escapeHtml(links.telHref)}">${escapeHtml(agency.phonePrimary)}</a></article>`,
    `<article><i data-icon="whatsapp"></i><h3>WhatsApp Support</h3><p>Start a quick service conversation.</p><a href="${escapeHtml(links.whatsappHref)}" target="_blank" rel="noopener">Open WhatsApp</a></article>`,
    `<article><i data-icon="mail"></i><h3>Email the Agency</h3><p>Send a detailed supply requirement.</p><a href="${escapeHtml(links.mailHref)}">${escapeHtml(agency.email)}</a></article>`,
    `<article><i data-icon="map-pin"></i><h3>Get Direction</h3><p>${escapeHtml(agency.officeAddress)}</p><a href="${escapeHtml(links.mapsHref)}" target="_blank" rel="noopener">Open Map</a></article>`,
  ].join('');
  return `<section class="locator-business-section section home-visit-section"><div class="container">`
    + sectionHead(settings.eyebrow, settings.title, settings.lead)
    + `<div class="locator-detail-grid">${cards}</div></div></section>`;
}

/* ------------------------------ Assembly ------------------------------- */

const renderers: Record<HomeSectionKey, (data: PublicSiteData, links: AgencyLinks) => string> = {
  quickLinks: (data, links) => renderQuickLinks(data.homeContent, links),
  qr: (data, links) => renderQr(data.homeContent, links),
  about: (data) => renderAbout(data.homeContent),
  services: (data) => renderServices(data.homeContent),
  products: (data) => renderProducts(data),
  safety: (data) => renderSafety(data),
  trustStrip: (data) => renderTrustStrip(data.homeContent),
  journey: (data) => renderJourney(data),
  achievements: (data) => renderAchievements(data),
  partnership: (data) => renderPartnership(data.homeContent),
  sustainability: (data) => renderSustainability(data),
  gallery: (data) => renderGallery(data),
  visit: (data) => renderVisit(data),
};

/** Renders the complete homepage body from the stored content. */
export function renderHomePage(data: PublicSiteData) {
  const links = agencyLinks(data);
  const ordered = (Object.keys(renderers) as HomeSectionKey[])
    .map((key) => ({ key, section: data.homeContent[key] }))
    .filter(({ section }) => section?.published !== false)
    .sort((a, b) => (a.section?.displayOrder ?? 0) - (b.section?.displayOrder ?? 0));
  return renderHero(data) + ordered.map(({ key }) => renderers[key](data, links)).join('');
}
