import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const emptyRuntime = () => ({ users: [], creds: [], subs: [], invites: [], deviceLinks: [] });

function connectionConfig(env = process.env) {
  const connectionName = String(env.CLOUD_SQL_CONNECTION_NAME || '').trim();
  const host = String(env.DATABASE_HOST || (connectionName ? `/cloudsql/${connectionName}` : '')).trim();
  const password = String(env.DATABASE_PASSWORD || '');
  if (!host || !password) throw new Error('PostgreSQL storage requires DATABASE_HOST (or CLOUD_SQL_CONNECTION_NAME) and DATABASE_PASSWORD');
  return {
    host,
    database: String(env.DATABASE_NAME || 'origym_coach'),
    user: String(env.DATABASE_USER || 'origym_coach_app'),
    password,
    max: 5,
    idleTimeoutMillis: 30000
  };
}

const hostname = value => String(value || '').toLowerCase().split(':')[0];

export class TenantRuntimeStore {
  constructor(pool) { this.pool = pool; }

  static fromEnvironment(env = process.env) {
    return new TenantRuntimeStore(new Pool(connectionConfig(env)));
  }

  async tenantForHost(host, { baseDomain, fallbackHost, fallbackSlug } = {}) {
    const name = hostname(host);
    let slug = null;
    const suffix = baseDomain ? `.${String(baseDomain).toLowerCase()}` : '';
    if (suffix && name.endsWith(suffix)) slug = name.slice(0, -suffix.length);
    // A staging fallback is allowed only for its exact Cloud Run hostname.
    // Falling back for arbitrary hosts would make a typo or hostile Host header
    // land inside the platform tenant.
    if ((!slug || slug.includes('.')) && fallbackSlug && name === hostname(fallbackHost)) slug = fallbackSlug;
    if (!slug) return null;
    const result = await this.pool.query(
      'SELECT id, slug, name, primary_colour, status FROM organisations WHERE slug = $1 AND status = $2',
      [slug, 'active']
    );
    return result.rows[0] || null;
  }

  async load(organisationId) {
    const result = await this.pool.query(
      'SELECT runtime, session_secret, vapid FROM tenant_runtime WHERE organisation_id = $1', [organisationId]
    );
    if (result.rowCount) return result.rows[0];
    const sessionSecret = crypto.randomBytes(32).toString('hex');
    const inserted = await this.pool.query(
      `INSERT INTO tenant_runtime (organisation_id, runtime, session_secret)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (organisation_id) DO UPDATE SET organisation_id = EXCLUDED.organisation_id
       RETURNING runtime, session_secret, vapid`,
      [organisationId, JSON.stringify(emptyRuntime()), sessionSecret]
    );
    return inserted.rows[0];
  }

  async saveRuntime(organisationId, runtime) {
    await this.pool.query(
      'UPDATE tenant_runtime SET runtime = $2::jsonb, updated_at = now() WHERE organisation_id = $1',
      [organisationId, JSON.stringify(runtime)]
    );
  }

  async loadState(organisationId, userId) {
    const result = await this.pool.query(
      'SELECT state FROM tenant_state_documents WHERE organisation_id = $1 AND user_id = $2', [organisationId, userId]
    );
    return result.rows[0]?.state || null;
  }

  async loadStates(organisationId, userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return new Map();
    const result = await this.pool.query(
      'SELECT user_id, state FROM tenant_state_documents WHERE organisation_id = $1 AND user_id = ANY($2::text[])',
      [organisationId, userIds]
    );
    return new Map(result.rows.map(row => [row.user_id, row.state]));
  }

  async saveState(organisationId, userId, state) {
    const revision = Number(state?._rev) || 0;
    await this.pool.query(
      `INSERT INTO tenant_state_documents (organisation_id, user_id, revision, state)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (organisation_id, user_id) DO UPDATE
       SET revision = EXCLUDED.revision, state = EXCLUDED.state, updated_at = now()`,
      [organisationId, userId, revision, JSON.stringify(state)]
    );
  }

  // Conditional persistence is enforced by PostgreSQL, not by a process-local
  // read/then-write. That keeps two devices (or two Cloud Run instances) from
  // silently overwriting each other.
  async writeState(organisationId, userId, state, baseRevision) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        'SELECT revision, state FROM tenant_state_documents WHERE organisation_id = $1 AND user_id = $2 FOR UPDATE',
        [organisationId, userId]
      );
      const currentRevision = Number(current.rows[0]?.revision || 0);
      if (baseRevision != null && baseRevision !== currentRevision) {
        await client.query('ROLLBACK');
        return { ok: false, revision: currentRevision, state: current.rows[0]?.state || null };
      }
      const next = { ...state, _rev: currentRevision + 1 };
      await client.query(
        `INSERT INTO tenant_state_documents (organisation_id, user_id, revision, state)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (organisation_id, user_id) DO UPDATE
         SET revision = EXCLUDED.revision, state = EXCLUDED.state, updated_at = now()`,
        [organisationId, userId, next._rev, JSON.stringify(next)]
      );
      await client.query('COMMIT');
      return { ok: true, revision: next._rev, state: next };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* transaction was not open */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteState(organisationId, userId) {
    await this.pool.query('DELETE FROM tenant_state_documents WHERE organisation_id = $1 AND user_id = $2', [organisationId, userId]);
  }

  async currentLegalDocuments(organisationId) {
    const result = await this.pool.query(
      `SELECT DISTINCT ON (document_type) id, document_type, version, content, published_at
       FROM legal_documents
       WHERE organisation_id = $1 AND published_at IS NOT NULL
       ORDER BY document_type, version DESC`,
      [organisationId]
    );
    return result.rows;
  }

  async acceptCurrentLegalDocuments(organisationId, userId, documents) {
    const ids = documents.map(document => document.id);
    if (ids.length !== 2) throw new Error('Both current legal documents are required');
    await this.pool.query(
      `INSERT INTO tenant_legal_acceptances (organisation_id, user_id, legal_document_id)
       SELECT $1, $2, unnest($3::uuid[])
       ON CONFLICT DO NOTHING`,
      [organisationId, userId, ids]
    );
  }

  async close() { await this.pool.end(); }
}
