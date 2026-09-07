CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token_hash CHAR(64) NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  last_mail_status VARCHAR(20) NOT NULL DEFAULT 'Not sent',
  last_mail_error VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_date_idx
  ON newsletter_subscribers(active, subscribed_at DESC);

CREATE TABLE IF NOT EXISTS public_request_events (
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(80) NOT NULL,
  request_type VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS public_request_events_lookup_idx
  ON public_request_events(ip, request_type, created_at DESC);

CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id BIGSERIAL PRIMARY KEY,
  submission_reference VARCHAR(40),
  message_type VARCHAR(60) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  safe_error VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_delivery_logs_reference_idx
  ON email_delivery_logs(submission_reference, created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_mail_status_check') THEN
    ALTER TABLE newsletter_subscribers
      ADD CONSTRAINT newsletter_mail_status_check
      CHECK (last_mail_status IN ('Not sent','Sent','Failed','Skipped'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_delivery_status_check') THEN
    ALTER TABLE email_delivery_logs
      ADD CONSTRAINT email_delivery_status_check
      CHECK (status IN ('Sent','Failed','Skipped'));
  END IF;
END $$;

UPDATE cms_singletons
SET data = (data - 'logoUrl') || jsonb_build_object(
  'bharatgasLogoUrl', COALESCE(NULLIF(data->>'bharatgasLogoUrl', ''), '/assets/brands/bharatgas-logo.svg'),
  'bharatgasLogoAlt', COALESCE(NULLIF(data->>'bharatgasLogoAlt', ''), 'Bharatgas logo'),
  'mbgaLogoUrl', COALESCE(NULLIF(data->>'mbgaLogoUrl', ''), NULLIF(data->>'logoUrl', ''), '/assets/brands/mbga-logo.svg'),
  'mbgaLogoAlt', COALESCE(NULLIF(data->>'mbgaLogoAlt', ''), 'Madhav Bharat Gas Agency logo')
), updated_at = NOW()
WHERE key = 'site-content';

UPDATE cms_documents
SET data = data || jsonb_build_object(
  'category', COALESCE(NULLIF(data->>'category', ''),
    CASE data->>'brand' WHEN 'Bharatgas' THEN 'Brand Network' WHEN 'MBGA' THEN 'Agency Service' ELSE 'Customer Success' END),
  'imageUrl', COALESCE(data->>'imageUrl', ''),
  'imageAlt', COALESCE(data->>'imageAlt', ''),
  'published', COALESCE((data->>'published')::boolean, TRUE),
  'featured', COALESCE((data->>'featured')::boolean, FALSE)
), updated_at = NOW()
WHERE resource = 'journey';

UPDATE cms_documents
SET data = data || jsonb_build_object('email', COALESCE(data->>'email', '')), updated_at = NOW()
WHERE resource = 'bookings';

INSERT INTO newsletter_subscribers (
  email, active, unsubscribe_token_hash, subscribed_at, created_at, updated_at
)
SELECT
  LOWER(data->>'email'), TRUE,
  encode(digest(LOWER(data->>'email') || gen_random_uuid()::text, 'sha256'), 'hex'),
  created_at, created_at, NOW()
FROM submissions
WHERE type = 'newsletter' AND COALESCE(data->>'email', '') <> ''
ON CONFLICT (email) DO NOTHING;
