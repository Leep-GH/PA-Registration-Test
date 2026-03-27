import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigrations() {
  const client = postgres(dbUrl);

  try {
    // Read all migration files
    const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');

    // Get list of migration files (excluding meta)
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migrations to run');
      return;
    }

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Running migration: ${file}`);
      try {
        // Split by statement-breakpoint and execute each statement
        const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);
        for (const statement of statements) {
          try {
            await client.unsafe(statement);
          } catch (err: any) {
            // Skip "already exists" errors for idempotency
            if (err.code === '42P07' || (err.message && err.message.includes('already exists'))) {
              console.log(`  ℹ ${file} already applied (skipped)`);
              continue;
            }
            throw err;
          }
        }
        console.log(`✓ ${file} applied`);
      } catch (err) {
        console.error(`✗ Error applying ${file}:`, err);
        throw err;
      }
    }

    console.log('\n✓ All migrations applied successfully');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
