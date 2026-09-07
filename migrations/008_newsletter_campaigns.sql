BEGIN;

-- Newsletter campaigns: the subscriber list existed but there was no way to
-- actually send anything to it. Each send is recorded here so the admin can see
-- what went out, when, and how many addresses it reached.
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(180) NOT NULL,
  heading VARCHAR(180) NOT NULL,
  introduction VARCHAR(1000) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  cta_label VARCHAR(120) NOT NULL DEFAULT '',
  cta_url VARCHAR(2048) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS newsletter_campaigns_created_idx ON newsletter_campaigns(created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_campaigns_status_check') THEN
    ALTER TABLE newsletter_campaigns ADD CONSTRAINT newsletter_campaigns_status_check
      CHECK (status IN ('Draft','Sending','Sent','Failed'));
  END IF;
END $$;

COMMIT;
