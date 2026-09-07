BEGIN;

-- Each inner page banner (copy plus the artwork behind the overlay) is now
-- stored instead of being fixed in the templates and stylesheet.
ALTER TABLE cms_singletons DROP CONSTRAINT IF EXISTS cms_singletons_key_check;
ALTER TABLE cms_singletons ADD CONSTRAINT cms_singletons_key_check
  CHECK (key IN ('site-content','home-content','page-heroes','sustainability','local-discovery','qr-settings','agency-settings'));

INSERT INTO cms_singletons (key, data)
VALUES ('page-heroes', '{"products":{"eyebrow":"Commercial & Industrial LPG","title":"Powering Businesses of Every Scale","description":"Reliable cylinder solutions, coordinated delivery and account-based monthly pricing for commercial and industrial customers.","image":"/assets/industrial/cylinder-bank.svg","imageAlt":"Industrial LPG cylinder manifold bank"},"journey":{"eyebrow":"Our Legacy & Growth","title":"Two Journeys. One Commitment to Reliable Energy.","description":"Explore Bharatgas brand milestones separately from the configured Madhav Bharat Gas Agency service journey.","image":"/assets/industrial/industrial-plant.svg","imageAlt":"Bulk LPG installation at an industrial site"},"achievements":{"eyebrow":"Recognition Through Service","title":"MBGA & BGA Achievements","description":"Two connected stories: MBGA''s local service progress and the strengths of the Bharatgas brand ecosystem.","image":"/assets/industrial/business-support.svg","imageAlt":"MBGA account team coordinating commercial LPG supply"},"gallery":{"eyebrow":"Inside Our Service","title":"Gallery","description":"Explore our agency, delivery standards, safety work and practical LPG video guides.","image":"/assets/industrial/industrial-hero.svg","imageAlt":"Industrial LPG storage and cylinder dispatch terminal"},"contact":{"eyebrow":"Contact MBGA","title":"Enquiries, Service & Feedback","description":"Reach our team for commercial LPG guidance, booking, account support, safety help or feedback.","image":"/assets/industrial/commercial-kitchen.svg","imageAlt":"Commercial kitchen line supplied with non-domestic LPG"}}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
