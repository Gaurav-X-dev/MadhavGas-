CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_unique_idx ON admin_users(LOWER(email));
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS email_delivery_logs_status_idx ON email_delivery_logs(status, created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cms_documents_resource_check') THEN
    ALTER TABLE cms_documents ADD CONSTRAINT cms_documents_resource_check
      CHECK (resource IN ('products','bookings','enquiries','feedback','gallery','journey','achievements','users','activity'));
  END IF;
  ALTER TABLE cms_singletons DROP CONSTRAINT IF EXISTS cms_singletons_key_check;
  ALTER TABLE cms_singletons ADD CONSTRAINT cms_singletons_key_check
    CHECK (key IN (
      'site-content','home-content','page-heroes','site-sections','site-chrome',
      'sustainability','local-discovery','qr-settings','agency-settings','contact-settings'
    ));
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_email_normalized_check') THEN
    ALTER TABLE newsletter_subscribers ADD CONSTRAINT newsletter_email_normalized_check
      CHECK (email = LOWER(email) AND POSITION('@' IN email) > 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'public_request_type_check') THEN
    ALTER TABLE public_request_events ADD CONSTRAINT public_request_type_check
      CHECK (request_type IN ('booking','enquiry','feedback','newsletter'));
  END IF;
END $$;
