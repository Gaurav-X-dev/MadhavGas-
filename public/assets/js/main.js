// Agency Information
const agencyInfo = {
    name: "Madhav Bharat Gas Agency",
    phone: "+91 98765 43210",
    phoneLink: "+919876543210",
    alternate: "+91 98765 43211",
    whatsapp: "919876543210",
    email: "help@bharatgasagency.in",
    address: "Shop 12, Main Market Road, Sector 70, Gurugram, Haryana 122101",
    timing: "09:00 AM – 06:00 PM",
    weeklyOff: "Sunday",
};

// Local Lucide-style icon set keeps the website framework-free and offline-ready.
const iconPaths = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 7L2 7"/>',
    "map-pin":
        '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "shield-check":
        '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/><path d="m9 12 2 2 4-4"/>',
    headphones:
        '<path d="M4 14a8 8 0 0 1 16 0"/><path d="M18 19c0 1.7-1.3 3-3 3h-3"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5Z"/>',
    "message-circle":
        '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A8 8 0 1 1 21 15Z"/>',
    whatsapp:
        '<path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.5-8.4Zm-8.3 18.2h-.1c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.5 4.7Zm5.4-7.3c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.9-1.6.1-.2.1-.4 0-.6l-1-2.4c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.9 5.2 2.2.9 3 .9 4.1.8.7-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z" fill="currentColor" stroke="none"/>',
    flame: '<path d="M12 22c4.4 0 8-3.6 8-8 0-3-1.5-5.5-4-7 .2 2-1 3.2-2 3.8C14.5 6 11.5 3 8 2c.5 3-1 5-2.5 7C4.5 10.3 4 12 4 14c0 4.4 3.6 8 8 8Z"/><path d="M9 18c0-2 1.2-3.2 3-4.5 0 2 1 2.7 2 3.5 0 1.7-.9 3-2.5 3S9 19.3 9 18Z"/>',
    building2: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20V9a2 2 0 0 0-2-2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    "trending-up": '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h5.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
};

function iconMarkup(name) {
    const key = String(name || "").trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    const aliases = { shieldcheck: "shield-check", "shield-check": "shield-check", building2: "building2", trendingup: "trending-up", "trending-up": "trending-up", route: "route", flame: "flame", headphones: "headphones" };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[aliases[key] || key] || iconPaths.flame || ""}</svg>`;
}

function hydrateIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((element) => {
        element.innerHTML = iconMarkup(element.dataset.icon);
    });
}
const page = location.pathname.split("/").pop() || "index.html";

// Shared Header
function header() {
    return /* HTML */ `<div class="loader" id="loader">
            <div class="loader-inner">
                <div class="loader-cylinder" aria-hidden="true">
                    <span class="cylinder-handle"></span>
                    <span class="cylinder-valve"></span>
                    <span class="cylinder-body"><i data-icon="flame"></i></span>
                    <span class="loader-orbit"></span>
                </div>
                <strong>${agencyInfo.name}</strong
                ><small>Safe • Reliable • Convenient</small>
            </div>
        </div>
        <div class="topbar">
            <div class="container">
                <div class="topbar-group">
                    <span><i data-icon="phone"></i>${agencyInfo.phone}</span
                    ><span><i data-icon="mail"></i>${agencyInfo.email}</span>
                </div>
                <div class="topbar-group">
                    <span>Office Hours: ${agencyInfo.timing}</span>
                    <div class="text-tools" aria-label="Text size controls">
                        <button
                            type="button"
                            data-text-size="small"
                            aria-label="Decrease text size"
                        >
                            A-
                        </button>
                        <button
                            type="button"
                            data-text-size="normal"
                            aria-label="Default text size"
                        >
                            A
                        </button>
                        <button
                            type="button"
                            data-text-size="large"
                            aria-label="Increase text size"
                        >
                            A+
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <header class="site-header" id="header">
            <div class="container nav-wrap">
                <a
                    class="brand"
                    href="index.html"
                    aria-label="${agencyInfo.name} home"
                    ><span class="dual-brand-marks" aria-hidden="true"><span class="mbga-mark">MBGA</span><span class="bharatgas-mark"><i></i><b>Bharatgas</b></span></span
                    ><span class="brand-text"
                        ><strong>${agencyInfo.name}</strong
                        ><small>Authorized Bharatgas Distributor</small></span
                    ></a
                ><button
                    class="menu-toggle"
                    aria-label="Open menu"
                    aria-expanded="false"
                >
                    <span></span>
                </button>
                <nav class="nav" aria-label="Main navigation">
                    ${[
                        ["index.html", "Home"],
                        ["products.html", "Products"],
                        ["timeline.html", "Our Journey"],
                        ["sustainability.html", "Sustainability"],
                        ["gallery.html", "Gallery"],
                        ["certificates.html", "Achievements"],
                        ["contact.html", "Contact Us"],
                    ]
                        .map(
                            ([u, n]) =>
                                `<a href="${u}" class="${page === u ? "active" : ""}">${n}</a>`,
                        )
                        .join("")}<a
                        class="btn btn-primary"
                        href="tel:${agencyInfo.phoneLink}"
                        >Call Now</a
                    >
                    <div class="nav-mobile-contact">
                        <span><i data-icon="phone"></i>${agencyInfo.phone}</span
                        ><span
                            ><i data-icon="mail"></i>${agencyInfo.email}</span
                        >
                    </div>
                </nav>
                <button
                    class="nav-overlay"
                    type="button"
                    aria-label="Close navigation"
                ></button>
            </div>
            <div class="scroll-progress" aria-hidden="true"><span></span></div>
        </header>`;
}
// Shared Footer, Modal & Floating Actions
function footer() {
    return /* HTML */ `<section class="newsletter-section reveal">
            <div class="container newsletter-content">
                <div class="newsletter-copy">
                    <span class="eyebrow">Stay Informed</span>
                    <h2>Important LPG Updates, Delivered Simply.</h2>
                    <p>
                        Receive occasional agency notices, service information
                        and useful LPG safety reminders.
                    </p>
                </div>
                <form class="newsletter-form" novalidate>
                    <div class="newsletter-field">
                        <span data-icon="mail"></span>
                        <input
                            type="email"
                            name="newsletter-email"
                            placeholder="Enter your email address"
                            aria-label="Email Address"
                            required
                        />
                        <button class="btn btn-primary" type="submit">
                            Subscribe
                        </button>
                    </div>
                    <small>Only useful updates. No unnecessary emails.</small>
                    <p
                        class="newsletter-message"
                        role="status"
                        aria-live="polite"
                    ></p>
                </form>
            </div>
        </section>
        <section class="cta section-sm">
            <div class="container cta-inner">
                <div>
                    <h2>Need Non-Domestic LPG Assistance?</h2>
                    <p>Our MBGA commercial support team is ready to help.</p>
                </div>
                <div class="action-row">
                    <a class="btn btn-light" href="tel:${agencyInfo.phoneLink}"
                        >Call Now</a
                    ><a
                        class="btn btn-cta-secondary"
                        href="contact.html"
                        >Contact Agency</a
                    ><a
                        class="btn btn-light"
                        target="_blank"
                        rel="noopener"
                        href="https://wa.me/${agencyInfo.whatsapp}?text=Hello%20MBGA%2C%20I%20need%20non-domestic%20LPG%20assistance."
                        ><span data-icon="whatsapp"></span>WhatsApp</a
                    >
                </div>
            </div>
        </section>
        <section
            class="local-discovery reveal"
            aria-label="Local LPG information"
        >
            <div class="container">
                <div class="discovery-heading">
                    <span class="eyebrow">Explore & Discover</span>
                    <h2>Local LPG Information</h2>
                </div>
                <div class="discovery-grid">
                    <div class="discovery-group">
                        <button
                            class="discovery-toggle"
                            type="button"
                            aria-expanded="false"
                        >
                            <span
                                ><i data-icon="map-pin"></i>Nearby
                                Localities</span
                            ><b>+</b>
                        </button>
                        <div class="discovery-panel">
                            <div class="chip-list">
                                <a href="nearby-agency.html">Sector 70</a
                                ><a href="nearby-agency.html"
                                    >Nearby Residential Areas</a
                                >
                            </div>
                        </div>
                    </div>
                    <div class="discovery-group">
                        <button
                            class="discovery-toggle"
                            type="button"
                            aria-expanded="false"
                        >
                            <span><i data-icon="flame"></i>Categories</span
                            ><b>+</b>
                        </button>
                        <div class="discovery-panel">
                            <div class="chip-list">
                                <a href="contact.html">Gas Agency</a
                                ><a href="contact.html">LPG Service</a
                                ><a href="contact.html">Customer Support</a
                                ><a href="contact.html">LPG Safety</a>
                            </div>
                        </div>
                    </div>
                    <div class="discovery-group">
                        <button
                            class="discovery-toggle"
                            type="button"
                            aria-expanded="false"
                        >
                            <span
                                ><i data-icon="shield-check"></i>Popular LPG
                                Topics</span
                            ><b>+</b>
                        </button>
                        <div class="discovery-panel">
                            <div class="chip-list">
                                <a href="gallery.html">Cooking Gas</a
                                ><a href="contact.html">Cylinder Safety</a
                                ><a href="nearby-agency.html">Nearby Agency</a
                                ><a href="timeline.html">Customer Assistance</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <div class="legacy-footer" hidden>
            <div class="container">
                <div class="footer-grid">
                    <div>
                        <a class="brand" href="index.html"
                            ><span class="brand-mark" data-icon="flame"></span
                            ><span class="brand-text"
                                ><strong style="color:#fff"
                                    >${agencyInfo.name}</strong
                                ><small
                                    >Authorized Bharatgas Distributor</small
                                ></span
                            ></a
                        >
                        <p style="margin-top:18px">
                            Trusted non-domestic LPG distribution with safety,
                            reliability and courteous local support.
                        </p>
                    </div>
                    <div>
                        <h3>Quick Links</h3>
                        <ul>
                            <li><a href="index.html">Home</a></li>
                            <li><a href="timeline.html">Timeline</a></li>
                            <li><a href="gallery.html">Gallery</a></li>
                            <li>
                                <a href="certificates.html">Achievements</a>
                            </li>
                            <li>
                                <a href="nearby-agency.html">Nearby Agency</a>
                            </li>
                            <li><a href="contact.html">Contact Us</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3>Contact</h3>
                        <p>${agencyInfo.address}</p>
                        <p>
                            <a href="tel:${agencyInfo.phoneLink}"
                                >${agencyInfo.phone}</a
                            ><br /><a href="mailto:${agencyInfo.email}"
                                >${agencyInfo.email}</a
                            ><br /><a
                                href="https://wa.me/${agencyInfo.whatsapp}?text=Hello%20MBGA%2C%20I%20need%20support."
                                target="_blank"
                                rel="noopener"
                                >WhatsApp Support</a
                            >
                        </p>
                    </div>
                    <div>
                        <h3>Office Hours</h3>
                        <p>
                            Mon – Sat<br /><strong style="color:#fff"
                                >${agencyInfo.timing}</strong
                            >
                        </p>
                        <p>
                            Sunday<br /><strong style="color:#fff"
                                >Closed</strong
                            >
                        </p>
                    </div>
                    <aside class="footer-contact-card reveal-up">
                        <span class="eyebrow">Need Assistance?</span>
                        <h3>Talk to our agency team.</h3>
                        <a href="tel:${agencyInfo.phoneLink}"
                            ><i data-icon="phone"></i>${agencyInfo.phone}</a
                        >
                        <a class="footer-card-link" href="contact.html"
                            >Contact Agency
                            <span aria-hidden="true">&rarr;</span></a
                        >
                    </aside>
                </div>
                <div class="footer-bottom">
                    <span>© 2026 ${agencyInfo.name}. All Rights Reserved.</span
                    ><span>Designed for Safe & Reliable LPG Service</span>
                </div>
            </div>
        </div>
        <footer class="footer premium-footer" id="site-footer">
            <div class="footer-glow footer-glow-one"></div><div class="footer-glow footer-glow-two"></div>
            <div class="container">
                <div class="footer-support-bar reveal-up">
                    <div class="footer-support-copy"><span class="footer-support-icon" data-icon="headphones"></span><div><small>Dedicated LPG Helpdesk</small><strong>Need quick assistance?</strong></div></div>
                    <div class="footer-support-actions"><a href="tel:${agencyInfo.phoneLink}"><span data-icon="phone"></span>${agencyInfo.phone}</a><a class="footer-whatsapp" target="_blank" rel="noopener" href="https://wa.me/${agencyInfo.whatsapp}?text=Hello%20MBGA%2C%20I%20need%20non-domestic%20LPG%20assistance."><span data-icon="whatsapp"></span>WhatsApp MBGA</a></div>
                </div>
                <div class="footer-grid premium-footer-grid">
                    <div class="footer-about">
                        <a class="brand footer-brand" href="index.html"><span class="dual-brand-marks" aria-hidden="true"><span class="mbga-mark">MBGA</span><span class="bharatgas-mark"><i></i><b>Bharatgas</b></span></span><span class="brand-text"><strong>${agencyInfo.name}</strong><small>Authorized Bharatgas Distributor</small></span></a>
                        <p>Safe cylinder delivery, dependable non-domestic LPG supply and responsive local service from MBGA, backed by the Bharatgas brand.</p>
                        <div class="footer-badges"><span><i data-icon="shield-check"></i>Safety First</span><span><i data-icon="clock"></i>On-Time Support</span></div>
                        <a class="footer-mini-qr" target="_blank" rel="noopener" href="https://wa.me/${agencyInfo.whatsapp}?text=Hello%20MBGA%2C%20I%20want%20to%20book%20non-domestic%20LPG." aria-label="Scan or open MBGA LPG booking">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;format=svg&amp;data=https%3A%2F%2Fwa.me%2F${agencyInfo.whatsapp}%3Ftext%3DHello%2520MBGA%252C%2520I%2520want%2520to%2520book%2520non-domestic%2520LPG." alt="MBGA LPG booking QR code" width="104" height="104" loading="lazy" />
                            <span><small>Quick Booking</small><strong>Scan QR to Book LPG</strong><b>Open on WhatsApp →</b></span>
                        </a>
                    </div>
                    <div class="footer-column"><h3>Explore</h3><ul><li><a href="index.html">Home</a></li><li><a href="products.html">LPG Products</a></li><li><a href="timeline.html">Our Journey</a></li><li><a href="sustainability.html">Sustainability</a></li><li><a href="gallery.html">Photo & Video Gallery</a></li><li><a href="certificates.html">MBGA & BGA Achievements</a></li><li><a href="contact.html">Contact & Feedback</a></li></ul></div>
                    <div class="footer-column"><h3>Business LPG Support</h3><ul><li><a href="products.html">Commercial Cylinders</a></li><li><a href="contact.html">Supply Enquiry</a></li><li><a href="gallery.html">Safety Guidance</a></li><li><a href="index.html#qr-booking">QR Booking</a></li><li><a href="contact.html#feedback">Share Feedback</a></li></ul></div>
                    <div class="footer-column footer-contact-list"><h3>Contact Agency</h3><a href="https://maps.google.com/?q=${encodeURIComponent(agencyInfo.address)}" target="_blank" rel="noopener"><i data-icon="map-pin"></i><span>${agencyInfo.address}</span></a><a href="tel:${agencyInfo.phoneLink}"><i data-icon="phone"></i><span>${agencyInfo.phone}<small>Call our helpdesk</small></span></a><a href="mailto:${agencyInfo.email}"><i data-icon="mail"></i><span>${agencyInfo.email}<small>Email support</small></span></a></div>
                    <aside class="footer-hours-card reveal-scale"><span class="eyebrow">We Are Available</span><h3>Agency Hours</h3><div><span>Monday – Saturday</span><strong>${agencyInfo.timing}</strong></div><div><span>Sunday</span><strong>Closed</strong></div><a class="footer-card-link" href="contact.html">Get in Touch <span aria-hidden="true">→</span></a></aside>
                </div>
                <div class="footer-bottom premium-footer-bottom"><span>© 2026 ${agencyInfo.name}. All Rights Reserved.</span><div><a href="contact.html">Privacy</a><a href="contact.html">Terms</a><span>Built around safety, trust and service.</span></div></div>
            </div>
        </footer>
        <div class="float-actions">
            <a
                class="float-btn float-call"
                href="tel:${agencyInfo.phoneLink}"
                aria-label="Call agency"
                ><span data-icon="phone"></span
                ><span class="action-tooltip">Call agency</span></a
            ><a
                class="float-btn float-wa"
                target="_blank"
                rel="noopener"
                href="https://wa.me/${agencyInfo.whatsapp}?text=Hello%20MBGA%2C%20I%20need%20non-domestic%20LPG%20assistance."
                aria-label="WhatsApp agency"
                ><span data-icon="whatsapp"></span
                ><span class="action-tooltip">Chat on WhatsApp</span></a
            >
        </div>
        <button class="back-top" aria-label="Back to top"><span>↑</span></button>
        <div class="mobile-bar">
            <a href="tel:${agencyInfo.phoneLink}"
                ><span data-icon="phone"></span>Call</a
            ><a
                target="_blank"
                rel="noopener"
                href="https://wa.me/${agencyInfo.whatsapp}?text=Hello%20MBGA%2C%20I%20need%20non-domestic%20LPG%20assistance."
                ><span data-icon="whatsapp"></span>WhatsApp</a
            ><a
                target="_blank"
                rel="noopener"
                href="https://maps.google.com/?q=${encodeURIComponent(
                    agencyInfo.address,
                )}"
                ><span data-icon="map-pin"></span>Directions</a
            >
        </div>
        <div class="toast" role="status" aria-live="polite"></div>
        <div
            class="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
        >
            <div class="modal-dialog">
                <button class="modal-close" aria-label="Close preview">×</button
                ><button
                    class="modal-nav modal-prev"
                    aria-label="Previous image"
                >
                    ‹</button
                ><img
                    src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                    alt=""
                />
                <h3 class="modal-title"></h3>
                <div class="modal-counter" aria-live="polite"></div>
                <button class="modal-nav modal-next" aria-label="Next image">
                    ›
                </button>
            </div>
        </div>`;
}

// Shared Locator-Style Agency Introduction
function agencyIntroduction() {
    return /* HTML */ `<section
        class="locator-intro-section"
        aria-label="Agency information and enquiries"
    >
        <div class="container locator-intro-grid">
            <article class="locator-agency-card reveal-up">
                <div class="locator-card-heading">
                    <span class="dual-brand-marks" aria-hidden="true"><span class="mbga-mark">MBGA</span><span class="bharatgas-mark"><i></i><b>Bharatgas</b></span></span>
                    <div>
                        <span class="locator-kicker"
                            >Your Local LPG Partner</span
                        >
                        <h2>${agencyInfo.name}</h2>
                    </div>
                </div>
                <ul class="locator-info-list">
                    <li>
                        <i data-icon="map-pin"></i
                        ><span
                            ><strong>Agency Address</strong
                            >${agencyInfo.address}</span
                        >
                    </li>
                    <li>
                        <i data-icon="phone"></i
                        ><span
                            ><strong>Call the Agency</strong
                            ><a href="tel:${agencyInfo.phoneLink}"
                                >${agencyInfo.phone}</a
                            ></span
                        >
                    </li>
                    <li>
                        <i data-icon="clock"></i
                        ><span
                            ><strong>Business Hours</strong>Mon &ndash; Sat,
                            ${agencyInfo.timing}</span
                        ><b class="open-status">Open Today</b>
                    </li>
                </ul>
                <div class="locator-card-actions">
                    <a
                        class="btn btn-primary"
                        href="tel:${agencyInfo.phoneLink}"
                        ><i data-icon="phone"></i>Call</a
                    >
                    <a
                        class="btn btn-outline"
                        target="_blank"
                        rel="noopener"
                        href="https://maps.google.com/?q=${encodeURIComponent(
                            agencyInfo.address,
                        )}"
                        ><i data-icon="map-pin"></i>Direction</a
                    >
                </div>
            </article>
            <div class="locator-enquiry reveal-up">
                <div class="locator-section-title">
                    <span>Get in touch</span>
                    <h2>How can we assist you?</h2>
                    <p>
                        Choose the type of assistance you need and connect with
                        our agency team.
                    </p>
                </div>
                <div class="enquiry-option-grid">
                    <a class="enquiry-option" href="contact.html"
                        ><span class="enquiry-icon" data-icon="flame"></span>
                        <div>
                            <small>Business Support</small>
                            <h3>Non-Domestic LPG Assistance</h3>
                            <span>Get in Touch &rarr;</span>
                        </div></a
                    >
                    <a class="enquiry-option" href="contact.html"
                        ><span
                            class="enquiry-icon"
                            data-icon="headphones"
                        ></span>
                        <div>
                            <small>Service Enquiry</small>
                            <h3>MBGA Supply Chain Guidance</h3>
                            <span>Contact Agency &rarr;</span>
                        </div></a
                    >
                </div>
                <div class="locator-service-note">
                    <i data-icon="shield-check"></i
                    ><span
                        ><strong>Safety-led assistance</strong>Clear information
                        from your local agency team.</span
                    ><a href="contact.html">Contact Us</a>
                </div>
            </div>
        </div>
    </section>`;
}
// Shared Components
document.querySelector("#site-top").innerHTML = header();
document.querySelector("#site-bottom").innerHTML = footer();
const introAnchor =
    page === "timeline.html"
        ? document.querySelector(".journey-brand-section")
        : document.querySelector("main > .hero, main > .page-hero");
if (introAnchor) {
    introAnchor.insertAdjacentHTML("afterend", agencyIntroduction());
}
document
    .querySelector("#site-bottom")
    .insertBefore(
        document.querySelector(".cta"),
        document.querySelector(".newsletter-section"),
    );
hydrateIcons();
if (location.hash) {
    setTimeout(() => {
        document.querySelector(location.hash)?.scrollIntoView({
            block: "start",
        });
    }, 900);
}

// Locator Page Shell & Text Accessibility
document.body.classList.add(`page-${page.replace(".html", "")}`);
document
    .querySelectorAll("main > .section")
    .forEach((section) => section.classList.add("locator-content-section"));
const textSizeValues = { small: "15px", normal: "16px", large: "17px" };
document.querySelectorAll("[data-text-size]").forEach((button) => {
    button.addEventListener("click", () => {
        const selectedSize = button.dataset.textSize;
        document.documentElement.style.fontSize = textSizeValues[selectedSize];
        document
            .querySelectorAll("[data-text-size]")
            .forEach((item) =>
                item.setAttribute(
                    "aria-pressed",
                    String(item.dataset.textSize === selectedSize),
                ),
            );
    });
});
// Page Loader
window.addEventListener("load", () =>
    setTimeout(
        () => document.querySelector("#loader").classList.add("hidden"),
        350,
    ),
);
// Mobile Navigation
const menu = document.querySelector(".menu-toggle"),
    nav = document.querySelector(".nav"),
    navOverlay = document.querySelector(".nav-overlay");

function setMenu(open) {
    nav.classList.toggle("open", open);
    navOverlay.classList.toggle("open", open);
    menu.classList.toggle("active", open);
    menu.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
}

menu.addEventListener("click", () => {
    setMenu(!nav.classList.contains("open"));
});
navOverlay.addEventListener("click", () => setMenu(false));
nav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => setMenu(false)),
);
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
        setMenu(false);
        menu.focus();
    }
});

// Accessible Hero Slider
const heroSlider = document.querySelector(".hero-slider");
if (heroSlider) {
    const slides = [...heroSlider.querySelectorAll(".hero-slide")];
    const dots = [...heroSlider.querySelectorAll(".slider-dot")];
    let activeSlide = 0;
    let autoPlay;
    let touchStartX = 0;

    const showSlide = (index) => {
        activeSlide = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            const active = slideIndex === activeSlide;
            slide.classList.toggle("is-active", active);
            slide.setAttribute("aria-hidden", String(!active));
        });
        dots.forEach((dot, dotIndex) => {
            const active = dotIndex === activeSlide;
            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-selected", String(active));
        });
    };
    const stopAutoPlay = () => clearInterval(autoPlay);
    const startAutoPlay = () => {
        stopAutoPlay();
        autoPlay = setInterval(() => showSlide(activeSlide + 1), 5500);
    };
    const moveSlide = (direction) => {
        showSlide(activeSlide + direction);
        startAutoPlay();
    };

    heroSlider.querySelector(".slider-prev").onclick = () => moveSlide(-1);
    heroSlider.querySelector(".slider-next").onclick = () => moveSlide(1);
    dots.forEach((dot, index) => {
        dot.onclick = () => {
            showSlide(index);
            startAutoPlay();
        };
    });
    heroSlider.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") moveSlide(-1);
        if (event.key === "ArrowRight") moveSlide(1);
    });
    heroSlider.addEventListener("pointerenter", stopAutoPlay);
    heroSlider.addEventListener("pointerleave", startAutoPlay);
    heroSlider.addEventListener("focusin", stopAutoPlay);
    heroSlider.addEventListener("focusout", startAutoPlay);
    heroSlider.addEventListener(
        "touchstart",
        (event) => {
            touchStartX = event.changedTouches[0].clientX;
        },
        { passive: true },
    );
    heroSlider.addEventListener(
        "touchend",
        (event) => {
            const distance = event.changedTouches[0].clientX - touchStartX;
            if (Math.abs(distance) > 45) moveSlide(distance > 0 ? -1 : 1);
        },
        { passive: true },
    );
    startAutoPlay();
}
// Sticky Header & Back to Top
window.addEventListener("scroll", () => {
    document
        .querySelector("#header")
        .classList.toggle("scrolled", scrollY > 15);
    document.querySelector(".back-top").classList.toggle("show", scrollY > 450);
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const progress = scrollable > 0 ? (scrollY / scrollable) * 100 : 0;
    document.querySelector(".scroll-progress span").style.width =
        `${Math.min(progress, 100)}%`;
    document
        .querySelector(".back-top")
        .style.setProperty(
            "--scroll-fill",
            `${Math.min(progress, 100) * 3.6}deg`,
        );
});
document.querySelector(".back-top").onclick = () =>
    scrollTo({ top: 0, behavior: "smooth" });
// Scroll Reveal
const observer = new IntersectionObserver(
    (entries) =>
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        }),
    { threshold: 0.12 },
);
document
    .querySelectorAll(
        ".reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale",
    )
    .forEach((el) => observer.observe(el));

// Timeline Progress & Milestone Activation
const timeline = document.querySelector("[data-timeline]");
if (timeline) {
    const timelineItems = [...timeline.querySelectorAll(".timeline-item")];
    const updateTimeline = () => {
        const bounds = timeline.getBoundingClientRect();
        const progress = Math.max(
            0,
            Math.min(1, (innerHeight * 0.64 - bounds.top) / bounds.height),
        );
        timeline.querySelector(".timeline-progress span").style.height =
            `${progress * 100}%`;
        timelineItems.forEach((item) => {
            const active =
                item.getBoundingClientRect().top < innerHeight * 0.72;
            item.classList.toggle("is-active", active);
        });
    };
    addEventListener("scroll", updateTimeline, { passive: true });
    updateTimeline();
}

// Local Discovery Accordions
document.querySelectorAll(".discovery-toggle").forEach((toggle, index) => {
    const panel = toggle.nextElementSibling;
    panel.id = `discovery-panel-${index + 1}`;
    toggle.setAttribute("aria-controls", panel.id);
    toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(open));
        toggle.closest(".discovery-group").classList.toggle("open", open);
    });
});
// Gallery Filters
const filterButtons = document.querySelectorAll(".filter");
const galleryItems = [
    ...document.querySelectorAll(".gallery-item[data-category]"),
];
filterButtons.forEach((filterButton) =>
    filterButton.addEventListener("click", () => {
        filterButtons.forEach((button) => button.classList.remove("active"));
        filterButton.classList.add("active");
        const galleryGrid = filterButton
            .closest(".container")
            .querySelector(".gallery-grid");
        galleryGrid.classList.add("is-filtering");
        setTimeout(() => {
            galleryItems.forEach((item) =>
                item.classList.toggle(
                    "hidden",
                    filterButton.dataset.filter !== "all" &&
                        item.dataset.category !== filterButton.dataset.filter,
                ),
            );
            galleryGrid.classList.remove("is-filtering");
        }, 160);
    }),
);

// Nearby Agency Search & Selection
const agencySearch = document.querySelector("#agency-search");
if (agencySearch) {
    const agencyCards = [...document.querySelectorAll(".agency-card")];
    const locatorCount = document.querySelector(".locator-count");
    agencySearch.addEventListener("input", () => {
        const term = agencySearch.value.trim().toLowerCase();
        let visible = 0;
        agencyCards.forEach((card) => {
            const match = card.textContent.toLowerCase().includes(term);
            card.hidden = !match;
            if (match) visible += 1;
        });
        locatorCount.textContent = `${visible} demo location${visible === 1 ? "" : "s"}`;
    });
    agencyCards.forEach((card) =>
        card.addEventListener("click", () => {
            agencyCards.forEach((item) => item.classList.remove("active"));
            card.classList.add("active");
        }),
    );
}
// Gallery & Certificate Lightbox
const modal = document.querySelector(".modal"),
    modalImg = modal.querySelector("img"),
    modalTitle = modal.querySelector(".modal-title");
let lightboxItems = [],
    current = 0,
    lastFocusedElement;
function openModal(items, index) {
    if (!modal.classList.contains("open")) {
        lastFocusedElement = document.activeElement;
    }
    lightboxItems = items;
    current = index;
    const item = items[index];
    const image = item.querySelector("img");
    modalImg.src = image.src;
    modalImg.alt = image.alt;
    modalTitle.textContent = item.dataset.title || image.alt;
    modal.querySelector(".modal-counter").textContent =
        `${index + 1} / ${items.length}`;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal-close").focus();
}
function moveModal(direction) {
    current =
        (current + direction + lightboxItems.length) % lightboxItems.length;
    openModal(lightboxItems, current);
}
document.querySelectorAll("[data-lightbox]").forEach((el) =>
    el.addEventListener("click", () => {
        const group = [
            ...document.querySelectorAll(
                `[data-lightbox="${el.dataset.lightbox}"]`,
            ),
        ].filter((item) => !item.classList.contains("hidden"));
        openModal(group, group.indexOf(el));
    }),
);
modal.querySelector(".modal-close").onclick = () => {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    lastFocusedElement?.focus();
};
modal.querySelector(".modal-prev").onclick = () => moveModal(-1);
modal.querySelector(".modal-next").onclick = () => moveModal(1);
modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.querySelector(".modal-close").click();
});
let modalTouchStartX = 0;
modal.addEventListener(
    "touchstart",
    (event) => {
        modalTouchStartX = event.changedTouches[0].clientX;
    },
    { passive: true },
);
modal.addEventListener(
    "touchend",
    (event) => {
        const distance = event.changedTouches[0].clientX - modalTouchStartX;
        if (Math.abs(distance) > 45 && lightboxItems.length > 1) {
            moveModal(distance > 0 ? -1 : 1);
        }
    },
    { passive: true },
);
document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") modal.querySelector(".modal-close").click();
    if (e.key === "ArrowLeft") moveModal(-1);
    if (e.key === "ArrowRight") moveModal(1);
});
// Contact Form Validation
document.querySelectorAll(".newsletter-form").forEach((newsletterForm) => {
    newsletterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = newsletterForm.querySelector('input[type="email"]');
        const message = newsletterForm.querySelector(".newsletter-message");
        const valid = /^\S+@\S+\.\S+$/.test(input.value.trim());

        newsletterForm.classList.toggle("is-error", !valid);
        newsletterForm.classList.toggle("is-success", valid);
        message.textContent = valid
            ? "Demo subscription validated successfully. No data was sent."
            : "Please enter a valid email address.";
        if (valid) newsletterForm.reset();
    });
});

// Contact Form Validation
const form = document.querySelector("#contact-form");
if (form) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        let valid = true;
        form.querySelectorAll("[required]").forEach((field) => {
            const error = field.closest(".field").querySelector(".error");
            let errorMessage = "";
            if (!field.value.trim()) errorMessage = "This field is required.";
            else if (
                field.name === "phone" &&
                !/^[+\d][\d\s-]{8,14}$/.test(field.value)
            )
                errorMessage = "Enter a valid phone number.";
            else if (
                field.type === "email" &&
                !/^\S+@\S+\.\S+$/.test(field.value)
            )
                errorMessage = "Enter a valid email address.";
            error.textContent = errorMessage;
            if (errorMessage) valid = false;
        });
        const toast = document.querySelector(".toast");
        const submitButton = form.querySelector('button[type="submit"]');
        const originalLabel = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.classList.add("is-loading");
        submitButton.textContent = "Validating...";
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.classList.remove("is-loading");
            submitButton.textContent = originalLabel;
        }, 650);
        toast.textContent = valid
            ? "Thank you! This demo form is validated. Please call or email us to submit your enquiry."
            : "Please review the highlighted fields.";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 4500);
        if (valid) form.reset();
    });
}
