BEGIN;

-- Re-match three page banners to what each page is actually about: the
-- dispatch terminal behind Achievements, a customer kitchen behind Gallery,
-- and the account desk behind Contact. Only banners still on the previous seed
-- artwork are changed, so an administrator's own choice is preserved.

UPDATE cms_singletons
SET data = jsonb_set(
      data,
      '{achievements}',
      (data->'achievements')
        || '{"image":"/assets/industrial/industrial-hero.svg","imageAlt":"Industrial LPG storage and cylinder dispatch terminal"}'::jsonb,
      false
    ),
    updated_at = NOW()
WHERE key = 'page-heroes'
  AND data->'achievements'->>'image' = '/assets/industrial/business-support.svg';

UPDATE cms_singletons
SET data = jsonb_set(
      data,
      '{gallery}',
      (data->'gallery')
        || '{"image":"/assets/industrial/commercial-kitchen.svg","imageAlt":"Commercial kitchen line supplied with non-domestic LPG"}'::jsonb,
      false
    ),
    updated_at = NOW()
WHERE key = 'page-heroes'
  AND data->'gallery'->>'image' = '/assets/industrial/industrial-hero.svg';

UPDATE cms_singletons
SET data = jsonb_set(
      data,
      '{contact}',
      (data->'contact')
        || '{"image":"/assets/industrial/business-support.svg","imageAlt":"MBGA account team coordinating commercial LPG supply"}'::jsonb,
      false
    ),
    updated_at = NOW()
WHERE key = 'page-heroes'
  AND data->'contact'->>'image' = '/assets/industrial/commercial-kitchen.svg';

COMMIT;
