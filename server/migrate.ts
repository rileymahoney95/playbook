import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import type { Database } from './db';
import { connectDatabase } from './db';

export async function migrateDatabase(db: Database) {
  // Transaction-scoped lock serializes migrations when Railway overlaps deploys.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(9127300)`);
    await migrate(tx as unknown as Database, { migrationsFolder: './drizzle' });
  });
}

if (import.meta.main) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const { db, pool } = connectDatabase(process.env.DATABASE_URL);
  try {
    await migrateDatabase(db);
    console.log('Migrations applied.');
  } finally {
    await pool.end();
  }
}
