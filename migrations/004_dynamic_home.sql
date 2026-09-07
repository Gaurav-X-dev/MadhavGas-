BEGIN;

-- The homepage is now assembled from a `home-content` singleton instead of a
-- static template, so the allowed singleton keys need to include it.
ALTER TABLE cms_singletons DROP CONSTRAINT IF EXISTS cms_singletons_key_check;
ALTER TABLE cms_singletons ADD CONSTRAINT cms_singletons_key_check
  CHECK (key IN ('site-content','home-content','sustainability','local-discovery','qr-settings','agency-settings'));

-- Retarget the seeded imagery from domestic kitchen photography to the
-- commercial and industrial LPG artwork this agency actually serves.
-- Only records still pointing at the seed images are touched, so any image an
-- administrator has already uploaded is preserved.

UPDATE cms_singletons
SET data = jsonb_set(
      data,
      '{heroSlides}',
      (
        SELECT COALESCE(jsonb_agg(
          CASE
            WHEN slide->>'image' IN ('/assets/images/hero-kitchen.webp', '')
              THEN slide || '{"image":"/assets/industrial/industrial-hero.svg"}'::jsonb
            ELSE slide
          END
          ORDER BY ordinality
        ), '[]'::jsonb)
        FROM jsonb_array_elements(data->'heroSlides') WITH ORDINALITY AS t(slide, ordinality)
      ),
      false
    ),
    updated_at = NOW()
WHERE key = 'site-content' AND jsonb_typeof(data->'heroSlides') = 'array';

UPDATE cms_singletons
SET data = data
      || CASE WHEN data->>'heroImage' = '/assets/images/lpg-delivery.webp'
              THEN '{"heroImage":"/assets/industrial/bulk-delivery.svg","heroImageAlt":"Bulk LPG road tanker and commercial cylinder dispatch truck"}'::jsonb
              ELSE '{}'::jsonb END
      || CASE WHEN data->>'storyImage' = '/assets/images/lpg-safety.webp'
              THEN '{"storyImage":"/assets/industrial/industrial-safety.svg","storyImageAlt":"Technician inspecting a commercial LPG cylinder manifold"}'::jsonb
              ELSE '{}'::jsonb END,
    updated_at = NOW()
WHERE key = 'sustainability';

UPDATE cms_documents
SET data = data || '{"image":"/assets/industrial/cylinder-19kg.svg"}'::jsonb, updated_at = NOW()
WHERE resource = 'products' AND document_id = 'prod-19kg' AND data->>'image' = '/assets/images/lpg-delivery.webp';

UPDATE cms_documents
SET data = data || '{"image":"/assets/industrial/cylinder-35kg.svg"}'::jsonb, updated_at = NOW()
WHERE resource = 'products' AND document_id = 'prod-35kg' AND data->>'image' = '/assets/images/agency-support.webp';

UPDATE cms_documents
SET data = data || '{"image":"/assets/industrial/cylinder-475kg.svg"}'::jsonb, updated_at = NOW()
WHERE resource = 'products' AND document_id = 'prod-475kg' AND data->>'image' = '/assets/images/lpg-safety.webp';

UPDATE cms_documents
SET data = data || '{"url":"/assets/industrial/business-support.svg","altText":"MBGA account team coordinating commercial LPG supply","caption":"Business account support"}'::jsonb, updated_at = NOW()
WHERE resource = 'gallery' AND document_id = 'gal-1' AND data->>'url' = '/assets/images/agency-support.webp';

UPDATE cms_documents
SET data = data || '{"url":"/assets/industrial/bulk-delivery.svg","altText":"Bulk LPG tanker and cylinder dispatch truck leaving the yard","caption":"Bulk and cylinder dispatch"}'::jsonb, updated_at = NOW()
WHERE resource = 'gallery' AND document_id = 'gal-2' AND data->>'url' = '/assets/images/lpg-delivery.webp';

UPDATE cms_documents
SET data = data || '{"url":"/assets/industrial/industrial-safety.svg","altText":"Technician checking a commercial LPG manifold with a gas detector","caption":"Site safety inspection"}'::jsonb, updated_at = NOW()
WHERE resource = 'gallery' AND document_id = 'gal-3' AND data->>'url' = '/assets/images/lpg-safety.webp';

UPDATE cms_documents
SET data = data || '{"url":"/assets/industrial/cylinder-bank.svg","altText":"Twin-bank industrial LPG cylinder manifold with changeover regulator","caption":"Industrial manifold installation"}'::jsonb, updated_at = NOW()
WHERE resource = 'gallery' AND document_id = 'gal-4' AND data->>'url' = '/assets/images/lpg-delivery.webp';

UPDATE cms_documents
SET data = data || '{"url":"/assets/industrial/commercial-kitchen.svg","altText":"Commercial hotel kitchen line running on 19 kg LPG cylinders","caption":"Commercial kitchen supply"}'::jsonb, updated_at = NOW()
WHERE resource = 'gallery' AND document_id = 'gal-5' AND data->>'url' = '/assets/images/hero-kitchen.webp';

UPDATE cms_documents
SET data = data || '{"url":"/assets/industrial/industrial-plant.svg","altText":"Bulk LPG installation and cylinder bank at an industrial site","caption":"Industrial site installation"}'::jsonb, updated_at = NOW()
WHERE resource = 'gallery' AND document_id = 'gal-6' AND data->>'url' = '/assets/images/agency-support.webp';

COMMIT;
