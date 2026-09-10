import { Effect } from 'effect';
import { connectDatabase } from './db';
import { migrateDatabase } from './migrate';
import { seedOwner } from './seed';
import { createApp } from './app';
import { task } from './errors';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const secure = process.env.NODE_ENV === 'production';
const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
if (secure && !origin.startsWith('https://')) throw new Error('APP_ORIGIN must be the public HTTPS origin in production.');
if (new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must be an origin without a path or trailing slash.');
const { db, pool } = connectDatabase(process.env.DATABASE_URL);

await Effect.runPromise(Effect.gen(function* () {
  yield* task(() => migrateDatabase(db));
  yield* task(() => seedOwner(db, process.env.BOOTSTRAP_PASSWORD));
}));

const app = createApp(db, { secure, origin });
const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: '0.0.0.0',
  maxRequestBodySize: 512 * 1024,
  idleTimeout: 30,
  fetch(request, server) {
    // Railway sets X-Real-IP at its edge. Do not trust client-supplied X-Forwarded-For.
    const ip = secure ? (request.headers.get('x-real-ip') ?? 'railway') : (server.requestIP(request)?.address ?? 'local');
    return app(request, ip);
  },
});
console.log(`Playbook listening on port ${server.port}`);
let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  await server.stop();
  await pool.end();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
