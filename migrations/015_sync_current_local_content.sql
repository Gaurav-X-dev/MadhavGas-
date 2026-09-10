-- This migration is intentionally disabled.
--
-- It previously synced local seed content into production by overwriting
-- cms_singletons and replacing cms_documents for achievements, gallery,
-- journey, and products. That is unsafe for a live admin-managed site because
-- deploying code must never replace content entered through the admin panel.
--
-- Keep this file present as a no-op so existing migration order remains stable.
SELECT 1;
