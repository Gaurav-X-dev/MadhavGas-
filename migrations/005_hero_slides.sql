BEGIN;

-- The home page ships a hero carousel, but the original seed created only one
-- slide, leaving the arrows and dots with nowhere to go. Add the two missing
-- industrial slides — but only where the single original seed slide is still
-- the only one present, so any carousel an administrator has already built is
-- left untouched.
UPDATE cms_singletons
SET data = jsonb_set(
      data,
      '{heroSlides}',
      data->'heroSlides' || '[
        {
          "id": "hero-2",
          "title": "Bulk & Cylinder Supply, Planned Around Your Shifts",
          "subtitle": "Scheduled dispatch and cylinder exchange for manufacturing units, processing plants and large commercial kitchens.",
          "image": "/assets/industrial/industrial-plant.svg",
          "ctaText": "View LPG Products",
          "ctaLink": "/products",
          "displayOrder": 2,
          "published": true
        },
        {
          "id": "hero-3",
          "title": "Safety-Led Handling at Every Site",
          "subtitle": "Manifold installations, routine connection checks and clear handling guidance for your site team.",
          "image": "/assets/industrial/cylinder-bank.svg",
          "ctaText": "Our Safety Approach",
          "ctaLink": "/sustainability",
          "displayOrder": 3,
          "published": true
        }
      ]'::jsonb,
      false
    ),
    updated_at = NOW()
WHERE key = 'site-content'
  AND jsonb_array_length(data->'heroSlides') = 1
  AND data->'heroSlides'->0->>'id' = 'hero-1';

COMMIT;
