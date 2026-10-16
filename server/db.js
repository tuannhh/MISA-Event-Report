import pg from 'pg';
import {allocateEventSlug} from './event-slug.js';
export const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max: 10});
export async function transaction(fn) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const result = await fn(c); await c.query('COMMIT'); return result; }
  catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
export async function migrate() {
  await transaction(async c => {
    await c.query('SELECT pg_advisory_xact_lock(847201)');
    await c.query(`
CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password text NOT NULL, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions(token text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS events(id uuid PRIMARY KEY, name text NOT NULL, event_date date, settings jsonb NOT NULL, active_snapshot_id uuid, source jsonb, sync_error text, synced_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS members(event_id uuid REFERENCES events(id), user_id uuid REFERENCES users(id), role text NOT NULL CHECK(role IN ('owner','editor','viewer')), PRIMARY KEY(event_id,user_id));
CREATE TABLE IF NOT EXISTS snapshots(id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id), label text NOT NULL, rows jsonb NOT NULL, quality jsonb NOT NULL, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS snapshots_event ON snapshots(event_id,created_at DESC);
CREATE TABLE IF NOT EXISTS imports(id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id), user_id uuid NOT NULL REFERENCES users(id), label text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS invitations(token text PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id), email text NOT NULL, role text NOT NULL CHECK(role IN ('viewer','editor')), expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id bigserial PRIMARY KEY, event_id uuid REFERENCES events(id), user_id uuid REFERENCES users(id), action text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS audit_event ON audit(event_id,created_at DESC);
CREATE TABLE IF NOT EXISTS schema_versions(version integer PRIMARY KEY, applied_at timestamptz DEFAULT now());
INSERT INTO schema_versions(version) VALUES(1) ON CONFLICT DO NOTHING;
`);
    // Schema v2: stable, unique browser URLs. Existing IDs and snapshots are unchanged.
    await c.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS slug text');
    const {rows:missingSlugs}=await c.query('SELECT id,name FROM events WHERE slug IS NULL ORDER BY id');
    for(const event of missingSlugs){
      const slug=await allocateEventSlug(c,event.name);
      await c.query('UPDATE events SET slug=$1 WHERE id=$2',[slug,event.id]);
    }
    await c.query('ALTER TABLE events ALTER COLUMN slug SET NOT NULL');
    await c.query('CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON events(slug)');
    await c.query('INSERT INTO schema_versions(version) VALUES(2) ON CONFLICT DO NOTHING');
    const {rowCount:hasV3}=await c.query('SELECT 1 FROM schema_versions WHERE version=3');
    if(!hasV3){await c.query(`
      ALTER TABLE users ADD COLUMN global_role text NOT NULL DEFAULT 'viewer' CHECK(global_role IN ('viewer','super_admin'));
      ALTER TABLE users ADD COLUMN must_change_password boolean NOT NULL DEFAULT true;
      ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true;
      ALTER TABLE events ADD COLUMN mode text NOT NULL DEFAULT 'hybrid' CHECK(mode IN ('online','offline','hybrid'));
      ALTER TABLE members DROP CONSTRAINT members_role_check;
      UPDATE members SET role='admin' WHERE role='owner';
      DELETE FROM members WHERE role='viewer';
      ALTER TABLE members ADD CONSTRAINT members_role_check CHECK(role IN ('admin','editor'));
      DELETE FROM invitations;
      DELETE FROM sessions;
      INSERT INTO schema_versions(version) VALUES(3);
    `);}

  });
}
export async function audit(c,eventId,userId,action,detail={}) {await c.query('INSERT INTO audit(event_id,user_id,action,detail) VALUES($1,$2,$3,$4)',[eventId,userId,action,JSON.stringify(detail)]);}
