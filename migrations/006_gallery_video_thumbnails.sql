BEGIN;

-- Gallery items can now be uploaded video files, and a video tile shows a
-- poster frame before it plays. Existing records predate the field, and the
-- gallery schema is strict, so every row needs it before the next admin save.
UPDATE cms_documents
SET data = data || '{"thumbnailUrl":""}'::jsonb, updated_at = NOW()
WHERE resource = 'gallery' AND NOT (data ? 'thumbnailUrl');

COMMIT;
