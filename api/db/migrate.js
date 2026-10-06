import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

function configFromEnvironment(env = process.env) {
  const connectionName = String(env.CLOUD_SQL_CONNECTION_NAME || '').trim();
  const host = String(env.DATABASE_HOST || (connectionName ? `/cloudsql/${connectionName}` : '')).trim();
  const database = String(env.DATABASE_NAME || 'origym_coach').trim();
  const user = String(env.DATABASE_USER || 'origym_coach_app').trim();
  const password = String(env.DATABASE_PASSWORD || '');
  if (!host || !password) throw new Error('DATABASE_HOST (or CLOUD_SQL_CONNECTION_NAME) and DATABASE_PASSWORD are required');
  return { host, database, user, password };
}

async function migrations() {
  const names = (await fs.readdir(migrationsDir)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  return Promise.all(names.map(async name => ({ name, sql: await fs.readFile(path.join(migrationsDir, name), 'utf8') })));
}

export async function migrate(env = process.env) {
  const client = new Client(configFromEnvironment(env));
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(row => row.name));
    for (const migration of await migrations()) {
      if (applied.has(migration.name)) continue;
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
        await client.query('COMMIT');
        console.log(`Applied ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

