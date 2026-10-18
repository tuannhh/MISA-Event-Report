-- Add a global admin role without promoting existing event-scoped admins.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM schema_versions WHERE version=6) THEN
  ALTER TABLE users DROP CONSTRAINT users_global_role_check;
  ALTER TABLE users ADD CONSTRAINT users_global_role_check CHECK(global_role IN ('viewer','admin','super_admin'));
  INSERT INTO schema_versions(version) VALUES(6);
 END IF;
END $$;
