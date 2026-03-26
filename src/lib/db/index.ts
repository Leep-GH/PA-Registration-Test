import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type DbClient = PostgresJsDatabase<typeof schema>;

let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (_db) return _db;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(dbUrl, { max: 10, idle_timeout: 30 });
  _db = drizzle(client, { schema });

  return _db;
}
