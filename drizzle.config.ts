import type { Config } from 'drizzle-kit';

const isPg = process.env.DATABASE_TYPE === 'postgresql';

const config: Config = isPg
  ? {
      schema: './src/lib/db/schema.ts',
      out: './src/lib/db/migrations',
      driver: 'pg',
      dbCredentials: { connectionString: process.env.DATABASE_URL! },
    }
  : {
      schema: './src/lib/db/schema.ts',
      out: './src/lib/db/migrations',
      driver: 'better-sqlite',
      dbCredentials: {
        url: (process.env.DATABASE_URL ?? 'file:./data/pdp-tracker.db').replace('file:', ''),
      },
    };

export default config;
