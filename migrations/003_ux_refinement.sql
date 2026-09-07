BEGIN;

ALTER TABLE cms_singletons DROP CONSTRAINT IF EXISTS cms_singletons_key_check;
ALTER TABLE cms_singletons ADD CONSTRAINT cms_singletons_key_check
  CHECK (key IN ('site-content','sustainability','local-discovery','qr-settings','agency-settings'));

UPDATE cms_documents
SET data = jsonb_set(data, '{brand}', '"MBGA"'::jsonb, true), updated_at = NOW()
WHERE resource = 'journey' AND data->>'brand' = 'Shared';

INSERT INTO cms_singletons (key, data)
VALUES (
  'local-discovery',
  '{
    "heading":"Local LPG Information",
    "description":"Useful service references based on the agency location and the LPG assistance currently offered by MBGA.",
    "localities":[
      {"id":"loc-sector-70","label":"Sector 70","href":"/contact","displayOrder":1,"active":true},
      {"id":"loc-gurugram","label":"Gurugram","href":"/contact","displayOrder":2,"active":true}
    ],
    "categories":[
      {"id":"cat-commercial","label":"Commercial LPG","href":"/products","displayOrder":1,"active":true},
      {"id":"cat-industrial","label":"Industrial LPG","href":"/products","displayOrder":2,"active":true},
      {"id":"cat-cylinder","label":"Cylinder Supply","href":"/products","displayOrder":3,"active":true}
    ],
    "topics":[
      {"id":"topic-safety","label":"LPG Safety","href":"/sustainability","displayOrder":1,"active":true},
      {"id":"topic-booking","label":"Booking Assistance","href":"/contact","displayOrder":2,"active":true},
      {"id":"topic-support","label":"Customer Assistance","href":"/contact","displayOrder":3,"active":true}
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

UPDATE cms_singletons
SET data = (
  jsonb_build_object(
    'heroTitle', 'Responsible Operations. Safer Communities.',
    'heroDescription', 'Practical LPG handling, planned service routines and clear customer guidance support responsible day-to-day operations.',
    'heroImage', '/assets/images/lpg-delivery.webp',
    'heroImageAlt', 'Organized LPG cylinder delivery and handling operation',
    'storyTitle', 'Responsible service in every cylinder cycle',
    'storyDescription', 'MBGA focuses on the operational practices it can directly support: planned dispatch, safe handling guidance, organized cylinder exchange and responsive local assistance.',
    'storyImage', '/assets/images/lpg-safety.webp',
    'storyImageAlt', 'LPG safety check and customer handling guidance',
    'storyPoints', '["Coordinate filled-cylinder delivery and empty-cylinder return.","Share practical LPG handling and safety guidance.","Plan service requirements to reduce avoidable emergency trips."]'::jsonb
  ) || data || jsonb_build_object(
    'cards', COALESCE((
      SELECT jsonb_agg(
        card || jsonb_build_object(
          'imageUrl', COALESCE(card->>'imageUrl', ''),
          'imageAlt', COALESCE(card->>'imageAlt', ''),
          'published', COALESCE((card->>'published')::boolean, true)
        )
        ORDER BY COALESCE((card->>'displayOrder')::int, 0)
      )
      FROM jsonb_array_elements(COALESCE(data->'cards', '[]'::jsonb)) AS card
    ), '[]'::jsonb)
  )
), updated_at = NOW()
WHERE key = 'sustainability';

COMMIT;
