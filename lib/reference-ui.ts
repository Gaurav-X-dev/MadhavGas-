import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { renderHomePage } from './home-ui';
import { agencyTime, capacityNumber, escapeHtml, escapeMultiline, galleryCard, safeHref, safeIcon } from './render-utils';
import type { PublicSiteData } from './site-data';
import type { PageHeroKey } from './types';

export type ReferencePage = 'index' | 'products' | 'timeline' | 'certificates' | 'sustainability' | 'gallery' | 'contact';

/*
 * Inner pages are still rendered from the reference templates in
 * `templates/reference`, with their content sections spliced in from the
 * database. 'index' is the exception: the home page is built entirely from
 * stored content by `home-ui.ts` and has no template file.
 */

// The templates still link to each other by their original filenames.
const routeMap: Record<string, string> = {
  'index.html': '/',
  'products.html': '/products',
  'timeline.html': '/journey',
  'certificates.html': '/achievements',
  'sustainability.html': '/sustainability',
  'gallery.html': '/gallery',
  'contact.html': '/contact',
  'nearby-agency.html': '/contact',
};

function replaceAgency(html: string, data: PublicSiteData) {
  const agency = data.agencySettings;
  const phoneDigits = agency.phonePrimary.replace(/\D/g, '');
  const alternateDigits = agency.phoneSecondary.replace(/\D/g, '');
  const whatsappDigits = (data.qrSettings.whatsappNumber || agency.whatsappNumber).replace(/\D/g, '');
  const replacements: Array<[string, string]> = [
    ['+919876543210', `+${phoneDigits}`],
    ['919876543210', whatsappDigits],
    ['+919876543211', `+${alternateDigits}`],
    ['+91 98765 43210', escapeHtml(agency.phonePrimary)],
    ['+91 98765 43211', escapeHtml(agency.phoneSecondary)],
    ['help@bharatgasagency.in', escapeHtml(agency.email)],
    ['Shop 12, Main Market Road, Sector 70, Gurugram, Haryana 122101', escapeHtml(agency.officeAddress)],
    ['09:00 AM &ndash; 06:00 PM', escapeHtml(agencyTime(agency.businessHours))],
    ['09:00 AM – 06:00 PM', escapeHtml(agencyTime(agency.businessHours))],
  ];
  for (const [from, to] of replacements) html = html.replaceAll(from, to);
  html = html.replaceAll('Madhav Bharat Gas Agency', escapeHtml(agency.agencyName));
  return html;
}

function rewriteLinks(html: string) {
  for (const [legacy, route] of Object.entries(routeMap)) {
    html = html.replaceAll(`href="${legacy}`, `href="${route}`);
  }
  return html;
}

function replaceSection(html: string, classToken: string, section: string) {
  const token = classToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<section(?=[^>]*class="[^"]*\\b${token}\\b[^"]*")[^>]*>[\\s\\S]*?<\\/section>`, 'i');
  return html.replace(pattern, section);
}

function replaceSectionById(html: string, id: string, section: string) {
  const token = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<section(?=[^>]*id="${token}")[^>]*>[\\s\\S]*?<\\/section>`, 'i');
  return html.replace(pattern, section);
}

function replaceContactMap(html: string, section: string) {
  const pattern = /<section class="section-sm">\s*<div class="container">\s*<div class="map">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/i;
  return html.replace(pattern, section);
}

function replaceContactInfoCards(html: string, section: string) {
  const pattern = /<section class="section-sm">\s*<div class="container info-grid">[\s\S]*?<\/div>\s*<\/section>/i;
  return html.replace(pattern, section);
}

function renderProductsSection(data: PublicSiteData, home = false) {
  const products = [...data.products].filter((item) => !item.archived).sort((a, b) => a.displayOrder - b.displayOrder);
  if (home) {
    const cards = products.slice(0, 3).map((product, index) => `<article class="product-card${index === 0 ? ' product-card-featured' : ''} reveal-up"><span class="product-tag">${escapeHtml(product.availability)}</span>${product.image ? `<div class="product-card-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" /></div>` : `<div class="product-cylinder cylinder-${capacityNumber(product.cylinderCapacity).replace('.', '')}" aria-hidden="true"><span></span><b>${escapeHtml(capacityNumber(product.cylinderCapacity))}</b><small>KG</small></div>`}<div class="product-card-content"><small>${escapeHtml(product.category)}</small><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><ul>${product.features.slice(0, 2).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul><a href="/contact">Discuss Requirement <span>&rarr;</span></a></div></article>`).join('');
    return `<section class="section home-products-section"><div class="container"><div class="section-head products-section-head"><div><span class="eyebrow">Commercial LPG Range</span><h2>The Right Cylinder for Every Business</h2></div><div class="products-head-copy"><p class="lead">Flexible LPG solutions for restaurants, retail kitchens and demanding industrial operations.</p><a class="text-link" href="/products">Explore All Products <span>&rarr;</span></a></div></div>${cards ? `<div class="home-product-grid stagger-group">${cards}</div>` : '<div class="content-empty-state">Published LPG products will appear here.</div>'}<div class="product-note"><span data-icon="shield-check"></span><p><strong>Business-specific pricing</strong> Monthly rates are shared according to volume, payment terms and delivery requirements.</p><a href="/contact">Get a Custom Quote</a></div></div></section>`;
  }
  const cards = products.map((product) => `<article class="catalog-product reveal-up"><div class="catalog-product-visual"><span class="product-pill">${escapeHtml(product.category)}</span>${product.image ? `<img class="catalog-product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />` : `<div class="product-cylinder cylinder-${capacityNumber(product.cylinderCapacity).replace('.', '')}"><span></span><b>${escapeHtml(capacityNumber(product.cylinderCapacity))}</b><small>KG</small></div>`}</div><div class="catalog-product-copy"><small>${escapeHtml(product.availability)}</small><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><div class="product-specs"><span><b>${escapeHtml(product.cylinderCapacity)}</b>Capacity</span><span><b>${escapeHtml(product.category)}</b>Customer segment</span><span><b>${escapeHtml(product.availability)}</b>Availability</span></div><ul>${product.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul><a class="btn btn-primary" href="/contact">Request Quote</a></div></article>`).join('');
  return `<section class="section products-catalog-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Cylinder Portfolio</span><h2>Choose by Usage & Capacity</h2></div><p class="lead">Our team helps identify an appropriate cylinder format based on consumption, operating setup and delivery frequency.</p></div>${cards ? `<div class="products-catalog-grid stagger-group">${cards}</div>` : '<div class="content-empty-state">No LPG products are currently published.</div>'}</div></section>`;
}

function renderJourneySection(data: PublicSiteData, home = false) {
  const milestones = [...data.journey]
    .filter((item) => item.published)
    .map((item) => ({ ...item, brand: item.brand === 'Bharatgas' ? 'Bharatgas' as const : 'MBGA' as const }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  if (home) {
    const featured = milestones.filter((item) => item.featured);
    const visible = (featured.length ? featured : milestones).slice(0, 4);
  return `<section class="timeline-preview section home-journey-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Our Legacy &amp; Growth</span><h2>Two Journeys. One Reliable Service Relationship.</h2></div><a class="btn btn-outline" href="/journey">Explore Both Journeys &rarr;</a></div>${visible.length ? `<div class="preview-steps stagger-group">${visible.map((item, index) => `<article class="preview-step reveal-up"><span>${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(item.brand === 'MBGA' ? 'Madhav Bharat Gas' : 'Bharatgas')}</b><i data-icon="${safeIcon(item.icon, 'flame')}"></i><small>${escapeHtml(item.year || item.category)}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><a class="journey-read-more" href="/journey">Read more <span>&rarr;</span></a></article>`).join('')}</div>` : '<div class="content-empty-state">Journey updates will appear here when published.</div>'}</div></section>`;
  }
  const tracks = [
    { key: 'Bharatgas', label: 'Bharatgas Journey', copy: 'Published milestones configured for the Bharatgas brand story and product ecosystem.' },
    { key: 'MBGA', label: 'Madhav Bharat Gas Journey', copy: 'Published milestones configured for MBGA local service, support and agency growth.' },
  ] as const;
  const renderTrack = (track: typeof tracks[number], trackIndex: number) => {
    const items = milestones.filter((item) => item.brand === track.key);
    return `<section class="journey-track-panel${trackIndex === 0 ? ' is-active' : ''}" id="journey-panel-${track.key.toLowerCase()}" role="tabpanel" aria-labelledby="journey-tab-${track.key.toLowerCase()}" data-journey-panel="${track.key}"${trackIndex ? ' hidden' : ''}><div class="journey-track-heading"><div><span class="journey-track-kicker">${escapeHtml(track.label)}</span><h3>${escapeHtml(track.label)}</h3></div><p>${escapeHtml(track.copy)}</p></div>${items.length ? `<div class="journey-timeline" data-timeline><div class="timeline-progress" aria-hidden="true"><span></span></div>${items.map((item, index) => `<article class="timeline-item ${index % 2 ? 'reveal-right' : 'reveal-left'}"><div class="timeline-node"><i data-icon="${safeIcon(item.icon)}"></i></div><div class="timeline-card">${item.imageUrl ? `<img class="timeline-card-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy" />` : ''}<span class="timeline-index">Step ${String(index + 1).padStart(2, '0')}</span><span class="timeline-badge">${escapeHtml(item.year || item.category)}</span><small class="timeline-category">${escapeHtml(item.category)}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div></article>`).join('')}</div>` : `<div class="content-empty-state">No ${escapeHtml(track.label)} milestones are published yet.</div>`}</section>`;
  };
  return `<section class="section journey-section"><div class="container"><div class="section-head timeline-intro"><div><span class="eyebrow">Our Legacy &amp; Growth</span><h2>Two Journeys. One Commitment to Reliable Energy.</h2></div><p class="lead">Explore the configured Bharatgas brand milestones separately from Madhav Bharat Gas Agency's local service journey.</p></div><div class="journey-selector-shell"><div class="journey-tabs" role="tablist" aria-label="Choose a journey">${tracks.map((track, index) => `<button id="journey-tab-${track.key.toLowerCase()}" type="button" role="tab" aria-controls="journey-panel-${track.key.toLowerCase()}" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}" class="journey-tab${index === 0 ? ' is-active' : ''}" data-journey-tab="${track.key}"><span>${index === 0 ? 'BGA' : 'MBGA'}</span>${escapeHtml(track.label)}</button>`).join('')}</div>${tracks.map(renderTrack).join('')}</div></div></section>`;
}

function renderAchievementsSection(data: PublicSiteData) {
  const items = data.achievements.filter((item) => item.published);
  const glyphs = ['&#9733;', '&#10003;', '&#9670;', '&#10022;', '&#9673;'];
  return `<section class="section achievements-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Shared Progress</span><h2>Achievements Across MBGA &amp; Bharatgas</h2></div><p class="lead">Published entries document factual service progress and brand relationships without implying unverified awards.</p></div>${items.length ? `<div class="awards-grid stagger-group">${items.map((item, index) => `<article class="award-card reveal-up"><span class="award-year">${escapeHtml(item.brand)}</span>${item.imageUrl ? `<img class="award-card-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />` : `<div class="award-icon">${glyphs[index % glyphs.length]}</div>`}<small>${escapeHtml(item.type)}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><span class="award-label">${escapeHtml(item.year)}</span></article>`).join('')}</div>` : '<div class="content-empty-state">No achievements are currently published.</div>'}</div></section>`;
}

function renderLegacySustainabilitySection(data: PublicSiteData) {
  const cards = [...data.sustainability.cards].sort((a, b) => a.displayOrder - b.displayOrder);
  const steps = [...data.sustainability.supplyChainSteps].sort((a, b) => a.step - b.step);
  return `<section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Our Approach</span><h2>Responsibility at Every Stage</h2></div><p class="lead">Editable operational practices focused on factual, practical service improvements.</p></div>${cards.length ? `<div class="sustainability-grid stagger-group">${cards.map((card, index) => `<article class="sustainability-card reveal-up"><b>${String(index + 1).padStart(2, '0')}</b><span data-icon="${safeIcon(card.icon, 'map-pin')}"></span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></article>`).join('')}</div>` : '<div class="content-empty-state">Sustainability practices will appear here when configured.</div>'}<div class="sustainability-detail-grid"><article><span class="eyebrow">Route Planning</span><p>${escapeHtml(data.sustainability.routePlanning)}</p></article><article><span class="eyebrow">Reusable Cylinder Cycle</span><p>${escapeHtml(data.sustainability.reusableCycle)}</p></article><article><span class="eyebrow">Digital Assistance</span><p>${escapeHtml(data.sustainability.digitalAssistance)}</p></article></div>${steps.length ? `<div class="sustainability-chain"><span class="eyebrow">MBGA Supply Chain</span><div class="chain-flow" aria-label="MBGA supply chain flow">${steps.map((step, index) => `${index ? '<i aria-hidden="true">→</i>' : ''}<span><b>${String(step.step).padStart(2, '0')}</b>${escapeHtml(step.title)}<small>${escapeHtml(step.description)}</small></span>`).join('')}</div></div>` : ''}</div></section>`;
}

function renderSustainabilityHero(data: PublicSiteData) {
  const content = data.sustainability;
  return `<section class="page-hero sustainability-hero" style="--page-hero-image:url(&quot;${escapeHtml(content.heroImage)}&quot;)"><div class="container sustainability-hero-grid"><div class="sustainability-hero-copy"><div class="breadcrumb"><a href="/">Home</a> / Sustainability</div><span class="eyebrow">Responsible LPG Operations</span><h1>${escapeHtml(content.heroTitle)}</h1><p class="lead">${escapeHtml(content.heroDescription)}</p></div><figure class="sustainability-hero-visual"><img src="${escapeHtml(content.heroImage)}" alt="${escapeHtml(content.heroImageAlt)}" /><figcaption><b>Practical responsibility</b><span>Safety, efficiency and local service discipline.</span></figcaption></figure></div></section>`;
}

function renderSustainabilitySection(data: PublicSiteData) {
  const content = data.sustainability;
  if (!content.heroTitle || !content.storyTitle) return renderLegacySustainabilitySection(data);
  const cards = [...content.cards].filter((item) => item.published).sort((a, b) => a.displayOrder - b.displayOrder);
  const steps = [...content.supplyChainSteps].sort((a, b) => a.step - b.step);
  return `<section class="section sustainability-practices"><div class="container"><div class="section-head"><div><span class="eyebrow">Our Operating Approach</span><h2>Responsibility at Every Stage</h2></div><p class="lead">Factual, editable practices focused on handling discipline, service efficiency and customer awareness.</p></div>${cards.length ? `<div class="sustainability-grid stagger-group">${cards.map((card, index) => `<article class="sustainability-card reveal-up">${card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.imageAlt)}" loading="lazy" />` : ''}<div class="sustainability-card-top"><b>${String(index + 1).padStart(2, '0')}</b><span data-icon="${safeIcon(card.icon, 'shield-check')}"></span></div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></article>`).join('')}</div>` : '<div class="content-empty-state">Sustainability practices will appear here when configured.</div>'}</div></section><section class="section sustainability-story-section"><div class="container sustainability-story-grid"><figure class="sustainability-story-image reveal-left"><img src="${escapeHtml(content.storyImage)}" alt="${escapeHtml(content.storyImageAlt)}" loading="lazy" /></figure><div class="sustainability-story-copy reveal-right"><span class="eyebrow">Responsible Service</span><h2>${escapeHtml(content.storyTitle)}</h2><p>${escapeHtml(content.storyDescription)}</p><ul>${content.storyPoints.map((point) => `<li><i data-icon="shield-check"></i>${escapeHtml(point)}</li>`).join('')}</ul></div></div></section><section class="section sustainability-operations"><div class="container"><div class="sustainability-detail-grid"><article><span data-icon="map-pin"></span><div><small>Operational Efficiency</small><h3>Route Planning</h3><p>${escapeHtml(content.routePlanning)}</p></div></article><article><span data-icon="shield-check"></span><div><small>Responsible Handling</small><h3>Reusable Cylinder Cycle</h3><p>${escapeHtml(content.reusableCycle)}</p></div></article><article><span data-icon="mail"></span><div><small>Customer Assistance</small><h3>Digital Support</h3><p>${escapeHtml(content.digitalAssistance)}</p></div></article></div>${steps.length ? `<div class="sustainability-chain"><div class="sustainability-chain-heading"><span class="eyebrow">MBGA Service Cycle</span><h2>A disciplined path from enquiry to exchange.</h2></div><div class="chain-flow" aria-label="MBGA supply chain flow">${steps.map((step, index) => `${index ? '<i aria-hidden="true">&rarr;</i>' : ''}<span><b>${String(step.step).padStart(2, '0')}</b>${escapeHtml(step.title)}<small>${escapeHtml(step.description)}</small></span>`).join('')}</div></div>` : ''}</div></section>`;
}

function renderGallerySection(data: PublicSiteData, home = false) {
  const items = [...data.gallery].filter((item) => item.status === 'Published').sort((a, b) => a.displayOrder - b.displayOrder);
  const displayed = home ? items.slice(0, 3) : items;
  const cards = displayed.map((item) => galleryCard(item, home)).join('');
  if (home) return `<section class="section home-gallery-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Agency Moments</span><h2>Real People. Responsible Service.</h2></div><a class="btn btn-outline" href="/gallery">View Full Gallery &rarr;</a></div>${cards ? `<div class="gallery-grid">${cards}</div>` : '<div class="content-empty-state">Published gallery media will appear here.</div>'}</div></section>`;
  return `<section class="section"><div class="container">${items.length ? `<div class="filters" aria-label="Gallery filters"><button class="filter active" data-filter="all">All</button>${[...new Set(items.map((item) => item.category.toLowerCase()))].map((category) => `<button class="filter" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}</div><div class="gallery-grid">${cards}</div>` : '<div class="content-empty-state">No gallery media is currently published.</div>'}</div></section>`;
}

function renderContactForm(data: PublicSiteData) {
  const contact = data.contactSettings;
  const products = [...data.products].filter((item) => !item.archived).sort((a, b) => a.displayOrder - b.displayOrder);
  const productOptions = products.length
    ? products.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} · ${escapeHtml(item.cylinderCapacity)}</option>`).join('')
    : '<option value="Commercial LPG requirement">Commercial LPG requirement</option>';

  const enabledTypes = (data.contactSettings?.formTypes || []).filter((f) => f.enabled).sort((a, b) => a.displayOrder - b.displayOrder);
  const requestTypeOptions = enabledTypes.length
    ? enabledTypes.map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.label)}</option>`).join('')
    : `<option value="">${escapeHtml(contact.unavailableText)}</option>`;

  const active = enabledTypes[0]?.id;

  const phoneLink = `+${data.agencySettings.phonePrimary.replace(/\D/g, '')}`;
  return `<section class="section" id="feedback"><div class="container contact-grid"><div><span class="eyebrow">${escapeHtml(contact.eyebrow)}</span><h2>${escapeHtml(contact.title)}</h2><p class="lead">${escapeHtml(contact.description)}</p><div class="contact-mini-actions"><a class="btn btn-primary" href="tel:${escapeHtml(phoneLink)}">${escapeHtml(contact.callButtonText)}</a><a class="btn btn-outline" href="mailto:${escapeHtml(data.agencySettings.email)}">${escapeHtml(contact.emailButtonText)}</a></div></div><form class="form-card" id="contact-form" novalidate><div class="field"><label for="request-type">Request type</label><select id="request-type" name="type" required${!enabledTypes.length ? ' disabled' : ''}>${requestTypeOptions}</select><span class="error"></span></div><div class="field-grid"><div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" maxlength="120" required /><span class="error"></span></div><div class="field"><label for="phone">Phone number</label><input id="phone" name="phone" inputmode="tel" autocomplete="tel" maxlength="20" required /><span class="error"></span></div></div><div class="field"><label for="email">Email <small>(optional)</small></label><input id="email" type="email" name="email" autocomplete="email" maxlength="255" /><span class="error"></span></div><div data-kind-panel="enquiry"${active !== 'enquiry' ? ' hidden' : ''}><div class="field"><label for="subject">Enquiry subject</label><input id="subject" name="subject" maxlength="160"${active === 'enquiry' ? ' required' : ' disabled'} /><span class="error"></span></div><div class="field"><label for="enquiry-message">Enquiry details</label><textarea id="enquiry-message" name="enquiryMessage" rows="5" minlength="10" maxlength="3000"${active === 'enquiry' ? ' required' : ' disabled'}></textarea><span class="error"></span></div></div><div data-kind-panel="booking"${active !== 'booking' ? ' hidden' : ''}><div class="field"><label for="business-name">Business name <small>(optional)</small></label><input id="business-name" name="businessName" maxlength="160"${active === 'booking' ? '' : ' disabled'} /><span class="error"></span></div><div class="field"><label for="cylinder-type">Cylinder / service</label><select id="cylinder-type" name="cylinderType"${active === 'booking' ? ' required' : ' disabled'}><option value="">Select a product</option>${productOptions}</select><span class="error"></span></div><div class="field-grid"><div class="field"><label for="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min="1" max="1000" step="1"${active === 'booking' ? ' required' : ' disabled'} /><span class="error"></span></div><div class="field"><label for="delivery-area">Delivery area</label><input id="delivery-area" name="deliveryArea" maxlength="160"${active === 'booking' ? ' required' : ' disabled'} /><span class="error"></span></div></div><div class="field"><label for="booking-message">Booking notes <small>(optional)</small></label><textarea id="booking-message" name="bookingMessage" rows="4" maxlength="2000"${active === 'booking' ? '' : ' disabled'}></textarea><span class="error"></span></div></div><div data-kind-panel="feedback"${active !== 'feedback' ? ' hidden' : ''}><div class="field"><label for="rating">Rating</label><select id="rating" name="rating"${active === 'feedback' ? ' required' : ' disabled'}><option value="">Select rating</option><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Satisfactory</option><option value="2">2 · Needs improvement</option><option value="1">1 · Poor</option></select><span class="error"></span></div><div class="field"><label for="feedback-message">Feedback / complaint</label><textarea id="feedback-message" name="feedbackMessage" rows="5" minlength="10" maxlength="3000"${active === 'feedback' ? ' required' : ' disabled'}></textarea><span class="error"></span></div></div><div hidden aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off" /></div><button class="btn btn-primary" type="submit"${!enabledTypes.length ? ' disabled' : ''}>${escapeHtml(contact.submitButtonText)}</button><p class="form-note" role="status" aria-live="polite">${escapeHtml(contact.statusText)}</p></form></div></section>`;
}

function renderContactInfoCards(data: PublicSiteData) {
  const agency = data.agencySettings;
  const phone = agency.phonePrimary.replace(/\D/g, '');
  const alternate = agency.phoneSecondary.replace(/\D/g, '');
  const whatsapp = (data.qrSettings.whatsappNumber || agency.whatsappNumber).replace(/\D/g, '');
  const directions = `https://maps.google.com/?q=${encodeURIComponent(agency.officeAddress)}`;
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(data.qrSettings.defaultMessage || `Hello ${agency.agencyName}`)}` : '#';
  return `<section class="section-sm contact-info-section"><div class="container info-grid">`
    + `<article class="info-card"><span class="icon" data-icon="map-pin"></span><h3>Visit the Agency</h3><p>${escapeHtml(agency.officeAddress)}</p><a href="${escapeHtml(directions)}" target="_blank" rel="noopener">Open directions</a></article>`
    + `<article class="info-card"><span class="icon" data-icon="phone"></span><h3>Call Us</h3><p><a href="tel:+${escapeHtml(phone)}">${escapeHtml(agency.phonePrimary)}</a>${alternate ? `<br />Alternate: <a href="tel:+${escapeHtml(alternate)}">${escapeHtml(agency.phoneSecondary)}</a>` : ''}</p></article>`
    + `<article class="info-card"><span class="icon" data-icon="clock"></span><h3>Office Timing</h3><p>${escapeHtml(agencyTime(agency.businessHours))}<br />Weekly Off: Sunday</p></article>`
    + `<article class="info-card"><span class="icon" data-icon="message-circle"></span><h3>WhatsApp Support</h3><p><a href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener">Chat with our local team</a></p></article>`
    + `<article class="info-card"><span class="icon" data-icon="mail"></span><h3>Email Us</h3><p><a href="mailto:${escapeHtml(agency.email)}">${escapeHtml(agency.email)}</a></p></article>`
    + `</div></section>`;
}

function googleMapsEmbedSource(value: string | undefined, address: string) {
  const configured = (value || '').trim();
  const source = configured.match(/\bsrc=["']([^"']+)["']/i)?.[1] || configured;
  if (source) {
    try {
      const url = new URL(source);
      if ((url.protocol === 'https:' || url.protocol === 'http:') && /(^|\.)google\.[a-z.]+$/i.test(url.hostname) && url.pathname.startsWith('/maps')) return url.toString();
    } catch {
      // Fall back to the address-based map embed below.
    }
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

function renderContactMap(data: PublicSiteData) {
  const agency = data.agencySettings;
  const address = agency.officeAddress;
  const directions = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  const fallback = `https://www.openstreetmap.org/export/embed.html?bbox=76.7%2C28.0%2C77.4%2C28.7&layer=mapnik&marker=28.3892%2C76.8839`;
  return `<section class="section-sm contact-map-section"><div class="container"><div class="map contact-map"><iframe class="contact-map-fallback" title="${escapeHtml(`${agency.agencyName} location map`)}" src="${escapeHtml(fallback)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="map-card"><h3>${escapeHtml(agency.agencyName)}</h3><p>${escapeHtml(address)}</p><a class="btn btn-primary" target="_blank" rel="noopener" href="${escapeHtml(directions)}">Get Directions</a></div></div></div></section>`;
}

/* Page banners are stored per page, so the copy and the background artwork
   behind the navy overlay are both editable without touching a template. */
const heroKeyForPage: Partial<Record<ReferencePage, PageHeroKey>> = {
  products: 'products',
  timeline: 'journey',
  certificates: 'achievements',
  gallery: 'gallery',
  contact: 'contact',
};

const heroExtraClass: Record<PageHeroKey, string> = {
  products: ' products-page-hero',
  journey: ' timeline-hero',
  achievements: ' achievements-hero',
  gallery: '',
  contact: '',
};

const heroBreadcrumb: Record<PageHeroKey, string> = {
  products: 'Products',
  journey: 'Our Journey',
  achievements: 'Achievements',
  gallery: 'Gallery',
  contact: 'Contact & Feedback',
};

function renderPageHero(key: PageHeroKey, data: PublicSiteData) {
  const hero = data.pageHeroes[key];
  const image = escapeHtml(hero.image);
  return `<section class="page-hero${heroExtraClass[key]}" style="--page-hero-image:url(&quot;${image}&quot;)" role="img" aria-label="${escapeHtml(hero.imageAlt)}">`
    + `<div class="container">`
    + `<div class="breadcrumb"><a href="/">Home</a> / ${escapeHtml(heroBreadcrumb[key])}</div>`
    + `<span class="eyebrow">${escapeHtml(hero.eyebrow)}</span>`
    + `<h1>${escapeMultiline(hero.title)}</h1>`
    + `<p class="lead">${escapeHtml(hero.description)}</p>`
    + `</div></section>`;
}

/* The gallery video hub: a featured embed plus a playlist of links, all stored
   so topics can be added or retired without touching the template. */
function renderVideoHub(data: PublicSiteData) {
  const hub = data.siteSections.videoHub;
  if (!hub.published) return '';
  const items = [...hub.items].sort((a, b) => a.displayOrder - b.displayOrder);
  const playlist = items.map((item) => `<a href="${escapeHtml(safeHref(item.url, '/gallery'))}" target="_blank" rel="noopener">`
    + `<span class="video-thumb"><img src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" /><i>&#9654;</i></span>`
    + `<span><small>${escapeHtml(item.category)}${item.duration ? ` &bull; ${escapeHtml(item.duration)}` : ''}</small>`
    + `<strong>${escapeHtml(item.title)}</strong></span></a>`).join('');
  const channelLink = hub.channelLinkText && hub.channelUrl
    ? `<a class="video-channel-link" href="${escapeHtml(safeHref(hub.channelUrl, '/gallery'))}" target="_blank" rel="noopener">${escapeHtml(hub.channelLinkText)} <span>&rarr;</span></a>`
    : '';
  const count = String(items.length + 1).padStart(2, '0');
  return `<section class="section video-gallery-section" id="video-hub"><div class="container">`
    + `<div class="section-head video-section-head"><div>`
    + `<span class="eyebrow">${escapeHtml(hub.eyebrow)}</span><h2>${escapeMultiline(hub.title)}</h2>`
    + `<p class="lead">${escapeHtml(hub.lead)}</p></div>`
    + `<span class="video-count"><b>${count}</b> ${escapeHtml(hub.countLabel)}</span></div>`
    + `<div class="video-showcase"><article class="featured-video reveal-left"><div class="video-frame">`
    + `<iframe src="${escapeHtml(safeHref(hub.featuredEmbedUrl, 'https://www.youtube.com'))}" title="${escapeHtml(hub.featuredTitle)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
    + `</div><div class="video-meta"><span>${escapeHtml(hub.featuredKicker)}</span>`
    + `<h3>${escapeHtml(hub.featuredTitle)}</h3><p>${escapeHtml(hub.featuredDescription)}</p></div></article>`
    + `<aside class="video-playlist reveal-right">`
    + `<div class="playlist-heading"><span data-icon="shield-check"></span><div><small>${escapeHtml(hub.playlistKicker)}</small><h3>${escapeHtml(hub.playlistTitle)}</h3></div></div>`
    + `${playlist}${channelLink}</aside></div></div></section>`;
}

function applyDynamicSections(page: ReferencePage, html: string, data: PublicSiteData) {
  const heroKey = heroKeyForPage[page];
  if (heroKey) html = replaceSection(html, 'page-hero', renderPageHero(heroKey, data));
  if (page === 'products') html = replaceSection(html, 'products-catalog-section', renderProductsSection(data));
  if (page === 'timeline') html = replaceSection(html, 'journey-section', renderJourneySection(data));
  if (page === 'certificates') html = replaceSection(html, 'achievements-section', renderAchievementsSection(data));
  if (page === 'sustainability') {
    html = replaceSection(html, 'sustainability-hero', renderSustainabilityHero(data));
    html = replaceSection(html, 'section', renderSustainabilitySection(data));
    html = replaceSection(html, 'sustainability-chain-section', '');
  }
  if (page === 'gallery') {
    html = replaceSection(html, 'section', renderGallerySection(data));
    html = replaceSection(html, 'video-gallery-section', renderVideoHub(data));
  }
  if (page === 'contact') {
    html = replaceContactInfoCards(html, renderContactInfoCards(data));
    html = replaceSectionById(html, 'feedback', renderContactForm(data));
    html = replaceContactMap(html, renderContactMap(data));
  }
  return html;
}

export function getReferencePage(page: ReferencePage, data: PublicSiteData) {
  // The homepage is fully database-driven and has no static template.
  if (page === 'index') return renderHomePage(data);
  const file = path.join(process.cwd(), 'templates', 'reference', `${page}.html`);
  const source = fs.readFileSync(file, 'utf8');
  const main = source.match(/<main>([\s\S]*?)<\/main>/i);
  if (!main) throw new Error(`Reference template ${page} is missing its main element`);
  let html = main[1];
  html = html
    .replaceAll('src="assets/', 'src="/assets/')
    .replaceAll('href="assets/', 'href="/assets/')
    .replaceAll('url(&quot;../images/', 'url(&quot;/assets/images/')
    .replace(/src="https:\/\/api\.qrserver\.com\/[^"\n]+"/g, 'src="/api/public/qr"')
    .replaceAll('This form validates your enquiry locally. For immediate service, please call the agency directly.', 'Submit your enquiry or feedback securely. For immediate assistance, call the agency directly.')
    .replaceAll('Frontend demo only—this form does not transmit data to a server.', 'Your enquiry is securely saved and shared with the MBGA support team.')
    .replaceAll('Frontend demo only—this form does not transmit data to a server.', 'Your enquiry is securely saved and shared with the MBGA support team.');
  html = replaceAgency(html, data);
  html = applyDynamicSections(page, html, data);
  html = rewriteLinks(html);
  return html;
}

export function agencyRuntimeData(data: PublicSiteData) {
  const agency = data.agencySettings;
  return {
    name: agency.agencyName,
    tagline: agency.tagline,
    phone: agency.phonePrimary,
    phoneLink: `+${agency.phonePrimary.replace(/\D/g, '')}`,
    alternate: agency.phoneSecondary,
    whatsapp: (data.qrSettings.whatsappNumber || agency.whatsappNumber).replace(/\D/g, ''),
    email: agency.email,
    address: agency.officeAddress,
    timing: agencyTime(agency.businessHours),
    weeklyOff: 'Sunday',
    bharatgasLogo: data.siteContent.bharatgasLogoUrl,
    bharatgasLogoAlt: data.siteContent.bharatgasLogoAlt,
    mbgaLogo: data.siteContent.mbgaLogoUrl,
    mbgaLogoAlt: data.siteContent.mbgaLogoAlt,
    localDiscovery: data.localDiscovery,
    assist: data.siteSections.assist,
    chrome: data.siteChrome,
    contactSettings: data.contactSettings,
    qrMessage: data.qrSettings.defaultMessage,
  };
}
