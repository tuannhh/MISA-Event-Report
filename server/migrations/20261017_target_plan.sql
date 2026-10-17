ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS target_plan jsonb;
INSERT INTO schema_versions(version) VALUES(4) ON CONFLICT DO NOTHING;
