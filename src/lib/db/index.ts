import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/**
 * Drizzle client type. All repositories accept this type.
 * When DATABASE_TYPE=postgresql at runtime, the underlying driver is postgres-js
 * but is cast to this type — the query API is compatible for our usage patterns.
 */
export type DbClient = BetterSQLite3Database<typeof schema>;

let _db: DbClient | null = null;

/**
 * Returns the singleton Drizzle database client.
 * On first call, creates the connection based on DATABASE_TYPE env var.
 * Subsequent calls return the cached instance.
 */
export function getDb(): DbClient {
  if (_db) return _db;

  const dbType = process.env.DATABASE_TYPE;
  const dbUrl = process.env.DATABASE_URL ?? 'file:./data/pdp-tracker.db';

  if (dbType === 'postgresql') {
    // Dynamic require to avoid bundling the postgres driver in environments
    // that only use SQLite (e.g. dev, test). TypeScript cast is intentional —
    // the query API is compatible with our schema operations.
    const postgres = require('postgres');
    const { drizzle: drizzlePg } = require('drizzle-orm/postgres-js');
    const client = postgres(dbUrl, { max: 10, idle_timeout: 30 });
    _db = drizzlePg(client, { schema }) as unknown as DbClient;
  } else {
    const dbPath = resolve(dbUrl.replace('file:', ''));
    mkdirSync(dirname(dbPath), { recursive: true });
    const Database = require('better-sqlite3');
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    const sqlite = new Database(dbPath);
    // Enable WAL mode for better concurrent read performance
    sqlite.pragma('journal_mode = WAL');
    _db = drizzle(sqlite, { schema });
  }

  return _db;
}
