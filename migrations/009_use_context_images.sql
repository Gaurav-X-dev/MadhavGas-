BEGIN;

-- Product artwork now shows where each cylinder size is actually used rather
-- than the cylinder on its own: a 19 kg feeding a restaurant range, a 35 kg
-- bank behind a canteen line, and a 47.5 kg manifold feeding a plant furnace.
-- Only rows still pointing at the previous seed artwork are touched, so an
-- image an administrator has chosen is left alone.

UPDATE cms_documents
SET data = data || '{"image":"/assets/industrial/use-restaurant.svg"}'::jsonb, updated_at = NOW()
WHERE resource = 'products' AND data->>'image' = '/assets/industrial/cylinder-19kg.svg';

UPDATE cms_documents
SET data = data || '{"image":"/assets/industrial/use-canteen.svg"}'::jsonb, updated_at = NOW()
WHERE resource = 'products' AND data->>'image' = '/assets/industrial/cylinder-35kg.svg';

UPDATE cms_documents
SET data = data || '{"image":"/assets/industrial/use-industrial.svg"}'::jsonb, updated_at = NOW()
WHERE resource = 'products' AND data->>'image' = '/assets/industrial/cylinder-475kg.svg';

-- MBGA also supplies small shops and stalls, so the gallery gains that segment.
INSERT INTO cms_documents (resource, document_id, data, sort_order)
VALUES (
  'gallery',
  'gal-7',
  '{
    "id":"gal-7",
    "type":"Image",
    "url":"/assets/industrial/use-small-shop.svg",
    "thumbnailUrl":"",
    "category":"Commercial",
    "altText":"Tea and snacks stall running a burner from a 5 kg commercial LPG cylinder",
    "caption":"Small shop and stall supply",
    "displayOrder":7,
    "status":"Published"
  }'::jsonb,
  7
)
ON CONFLICT (resource, document_id) DO NOTHING;

COMMIT;
