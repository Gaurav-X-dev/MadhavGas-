BEGIN;

-- Shared navigation/footer copy and contact form settings are first-class CMS
-- singletons. Rebuilding the constraint also repairs databases created before
-- contact-settings was added to the setup seed.
ALTER TABLE cms_singletons DROP CONSTRAINT IF EXISTS cms_singletons_key_check;
ALTER TABLE cms_singletons ADD CONSTRAINT cms_singletons_key_check
  CHECK (key IN (
    'site-content','home-content','page-heroes','site-sections','site-chrome',
    'sustainability','local-discovery','qr-settings','agency-settings','contact-settings'
  ));

INSERT INTO cms_singletons (key, data)
VALUES
  ('site-chrome', '{"loaderTagline":"Safe • Reliable • Convenient","hoursLabel":"Office Hours","callButtonText":"Call Now","navigation":[{"id":"nav-home","label":"Home","href":"/","displayOrder":1,"published":true},{"id":"nav-products","label":"Products","href":"/products","displayOrder":2,"published":true},{"id":"nav-journey","label":"Our Journey","href":"/journey","displayOrder":3,"published":true},{"id":"nav-sustainability","label":"Sustainability","href":"/sustainability","displayOrder":4,"published":true},{"id":"nav-gallery","label":"Gallery","href":"/gallery","displayOrder":5,"published":true},{"id":"nav-achievements","label":"Achievements","href":"/achievements","displayOrder":6,"published":true},{"id":"nav-contact","label":"Contact Us","href":"/contact","displayOrder":7,"published":true}],"newsletter":{"published":true,"eyebrow":"Stay Informed","title":"Important LPG Updates, Delivered Simply.","description":"Receive occasional agency notices, service information and useful LPG safety reminders.","placeholder":"Enter your email address","submitText":"Subscribe","noteText":"Only useful updates. No unnecessary emails.","invalidEmailText":"Please enter a valid email address.","pendingText":"Subscribing...","successText":"You are subscribed to MBGA updates.","errorText":"We could not subscribe you right now. Please try again."},"cta":{"published":true,"title":"Need Non-Domestic LPG Assistance?","description":"Our MBGA commercial support team is ready to help.","callText":"Call Now","contactText":"Contact Agency","whatsappText":"WhatsApp","whatsappMessage":"Hello MBGA, I need non-domestic LPG assistance."},"footer":{"supportKicker":"Dedicated LPG Helpdesk","supportTitle":"Need quick assistance?","whatsappText":"WhatsApp MBGA","aboutText":"Safe cylinder delivery, dependable non-domestic LPG supply and responsive local service from MBGA, backed by the Bharatgas brand.","badges":[{"id":"badge-safety","icon":"shield-check","label":"Safety First","displayOrder":1},{"id":"badge-support","icon":"clock","label":"On-Time Support","displayOrder":2}],"qrKicker":"Quick Booking","qrTitle":"Scan QR to Book LPG","qrLinkText":"Open on WhatsApp →","exploreTitle":"Explore","businessTitle":"Business LPG Support","contactTitle":"Contact Agency","phoneHint":"Call our helpdesk","emailHint":"Email support","availabilityEyebrow":"We Are Available","hoursTitle":"Agency Hours","weekdaysLabel":"Monday – Saturday","closedLabel":"Closed","contactButtonText":"Get in Touch","copyrightText":"All Rights Reserved.","closingText":"Built around safety, trust and service."},"discovery":{"eyebrow":"Explore & Discover","localitiesLabel":"Nearby Localities","categoriesLabel":"LPG Categories","topicsLabel":"Popular LPG Topics","emptyText":"No active references configured."}}'::jsonb),
  ('contact-settings', '{"eyebrow":"Contact, Booking & Feedback","title":"Send Your Request Securely","description":"Choose the request type. The form is validated and saved to the MBGA admin panel before any email notification is attempted.","callButtonText":"Call Agency","emailButtonText":"Send Email","submitButtonText":"Submit to MBGA","statusText":"Your request will be securely saved and shared with the MBGA support team.","unavailableText":"Form currently unavailable","formTypes":[{"id":"enquiry","label":"LPG Enquiry","enabled":true,"displayOrder":1},{"id":"booking","label":"Commercial Cylinder Booking","enabled":true,"displayOrder":2},{"id":"feedback","label":"Feedback or Complaint","enabled":true,"displayOrder":3}]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Preserve existing form-type choices while supplying new editable copy.
UPDATE cms_singletons
SET data = '{"eyebrow":"Contact, Booking & Feedback","title":"Send Your Request Securely","description":"Choose the request type. The form is validated and saved to the MBGA admin panel before any email notification is attempted.","callButtonText":"Call Agency","emailButtonText":"Send Email","submitButtonText":"Submit to MBGA","statusText":"Your request will be securely saved and shared with the MBGA support team.","unavailableText":"Form currently unavailable"}'::jsonb || data,
    updated_at = NOW()
WHERE key = 'contact-settings';

COMMIT;
