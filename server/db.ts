import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export function connectDatabase(connectionString: string) {
  const pool = new Pool({ connectionString, max: 8, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
  pool.on('error', () => console.error('Database connection error'));
  const db = drizzle(pool, { schema });
  return { db, pool };
}
export type Database = ReturnType<typeof connectDatabase>['db'];
