BEGIN;

-- Keep the bottling-plant loader heading editable for existing installations.
UPDATE cms_singletons
SET data = jsonb_set(
      data,
      '{loaderKicker}',
      to_jsonb('Bharatgas Bottling & Supply'::text),
      true
    ),
    updated_at = NOW()
WHERE key = 'site-chrome'
  AND NOT (data ? 'loaderKicker');

COMMIT;
