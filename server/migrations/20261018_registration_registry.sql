-- Additive v5. Existing snapshots remain immutable; registry is backfilled under the event lock.
CREATE TABLE IF NOT EXISTS event_sources (
 id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id), source_key text NOT NULL,
 label text NOT NULL, kind text NOT NULL, mode text NOT NULL DEFAULT 'auto', config jsonb NOT NULL DEFAULT '{}',
 target_plan jsonb, enabled boolean NOT NULL DEFAULT false, synced_at timestamptz, error text,
 UNIQUE(event_id,source_key)
);
ALTER TABLE event_sources ADD COLUMN IF NOT EXISTS target_updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS event_sources_due ON event_sources(event_id) WHERE enabled;
CREATE TABLE IF NOT EXISTS registrations (
 id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id), legacy_id text,
 data jsonb NOT NULL, overrides jsonb NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registrations_event ON registrations(event_id);
CREATE TABLE IF NOT EXISTS source_records (
 source_id uuid NOT NULL REFERENCES event_sources(id), record_key text NOT NULL,
 registration_id uuid NOT NULL REFERENCES registrations(id), PRIMARY KEY(source_id,record_key)
);
CREATE TABLE IF NOT EXISTS contact_logs (
 id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id), registration_id uuid NOT NULL REFERENCES registrations(id),
 user_id uuid NOT NULL REFERENCES users(id), channel text NOT NULL, called boolean NOT NULL,
 response text NOT NULL, note text NOT NULL DEFAULT '', follow_up_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_logs_registration ON contact_logs(registration_id,created_at DESC);
CREATE TABLE IF NOT EXISTS staff_assignments (
 event_id uuid NOT NULL REFERENCES events(id), code text NOT NULL, user_id uuid NOT NULL REFERENCES users(id),
 PRIMARY KEY(event_id,code)
);
CREATE TABLE IF NOT EXISTS import_conflicts (
 id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id), source_id uuid NOT NULL REFERENCES event_sources(id),
 record_key text NOT NULL, data jsonb NOT NULL, candidates jsonb NOT NULL, reason text NOT NULL,
 resolved_at timestamptz, resolved_by uuid REFERENCES users(id), UNIQUE(source_id,record_key)
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS registry_initialized boolean NOT NULL DEFAULT false;
INSERT INTO schema_versions(version) VALUES(5) ON CONFLICT DO NOTHING;
