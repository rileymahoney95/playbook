import { Effect, Schema } from 'effect';
import { sql } from 'drizzle-orm';
import { resolve } from 'node:path';
import type { Database } from './db';
import { createAuth } from './auth';
import { createPlaybook } from './playbook';
import { AppError, task } from './errors';
import { LoginSchema, PasswordSchema, RoutineSchema, RoutineEditSchema, StepUpdateSchema } from '../shared/validation';

function body<A, I>(request: Request, schema: Schema.Schema<A, I>) {
  return Effect.gen(function* () {
    const value = yield* Effect.tryPromise({ try: () => request.json(), catch: () => new AppError({ status: 400, message: 'Invalid JSON request.' }) });
    return yield* Schema.decodeUnknown(schema)(value).pipe(Effect.mapError(() => new AppError({ status: 400, message: 'Check your input. A routine needs a name, category, and 1–100 named steps; links must use http or https and timers must be 1–86,400 seconds.' })));
  });
}

export function createApp(db: Database, options: { secure: boolean; origin: string; serveStatic?: boolean }) {
  const auth = createAuth(db, options.secure);
  const playbook = createPlaybook(db);
  const json = (value: unknown, status = 200, cookie?: string) => Response.json(value, { status, headers: cookie ? { 'Set-Cookie': cookie } : undefined });
  const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
  const route = (request: Request, ip: string): Effect.Effect<Response, AppError> => Effect.gen(function* () {
    const { pathname, searchParams } = new URL(request.url);
    const method = request.method;
    if (pathname === '/health' && method === 'GET') {
      yield* task(() => db.execute(sql`select 1`));
      return json({ status: 'ok' });
    }
    if (!['GET', 'HEAD'].includes(method)) {
      const origin = request.headers.get('origin');
      const allowed = origin === options.origin || (!options.secure && origin === 'http://127.0.0.1:5173') || (!options.secure && origin === 'http://localhost:5173');
      if ((origin && !allowed) || request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('x-playbook-request') !== '1') {
        return yield* Effect.fail(new AppError({ status: 403, message: 'Request origin is not allowed.' }));
      }
      if (!request.headers.get('content-type')?.startsWith('application/json')) return yield* Effect.fail(new AppError({ status: 415, message: 'Use an application/json request.' }));
    }
    if (pathname === '/api/login' && method === 'POST') {
      const { password } = yield* body(request, LoginSchema);
      const cookie = yield* auth.login(password, ip);
      return json({ authenticated: true }, 200, cookie);
    }
    if (pathname === '/api/logout' && method === 'POST') return json({ ok: true }, 200, yield* auth.logout(request));
    if (pathname.startsWith('/api/')) {
      const ownerId = yield* auth.authenticate(request);
      if (pathname === '/api/session' && method === 'GET') return json({ authenticated: true });
      if (pathname === '/api/password' && method === 'POST') {
        const input = yield* body(request, PasswordSchema);
        return json({ ok: true }, 200, yield* auth.changePassword(ownerId, input.currentPassword, input.newPassword, ip));
      }
      if (pathname === '/api/routines' && method === 'GET') return json(yield* playbook.listRoutines(ownerId));
      if (pathname === '/api/routines' && method === 'POST') {
        const input = yield* body(request, RoutineSchema);
        return json(yield* playbook.createRoutine(ownerId, { ...input, steps: [...input.steps] }), 201);
      }
      let match = pathname.match(new RegExp(`^/api/routines/(${uuid})$`));
      if (match && method === 'GET') return json(yield* playbook.getRoutine(ownerId, match[1]));
      if (match && method === 'PUT') {
        const input = yield* body(request, RoutineEditSchema);
        return json(yield* playbook.editRoutine(ownerId, match[1], { ...input, steps: [...input.steps] }));
      }
      match = pathname.match(new RegExp(`^/api/routines/(${uuid})/archive$`));
      if (match && method === 'POST') return json(yield* playbook.archiveRoutine(ownerId, match[1]));
      match = pathname.match(new RegExp(`^/api/routines/(${uuid})/runs$`));
      if (match && method === 'POST') return json(yield* playbook.startRun(ownerId, match[1]));
      match = pathname.match(new RegExp(`^/api/runs/(${uuid})$`));
      if (match && method === 'GET') return json(yield* playbook.getRun(ownerId, match[1]));
      match = pathname.match(new RegExp(`^/api/runs/(${uuid})/steps/(${uuid})$`));
      if (match && method === 'PATCH') return json(yield* playbook.updateStep(ownerId, match[1], match[2], yield* body(request, StepUpdateSchema)));
      match = pathname.match(new RegExp(`^/api/runs/(${uuid})/(complete|discard)$`));
      if (match && method === 'POST') return json(yield* playbook.endRun(ownerId, match[1], match[2] === 'complete' ? 'completed' : 'discarded'));
      if (pathname === '/api/history' && method === 'GET') {
        const offset = Number(searchParams.get('offset') ?? 0);
        if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000) return yield* Effect.fail(new AppError({ status: 400, message: 'Invalid history page.' }));
        return json(yield* playbook.history(ownerId, offset));
      }
      return yield* Effect.fail(new AppError({ status: 404, message: 'Not found.' }));
    }
    if (options.serveStatic !== false && (method === 'GET' || method === 'HEAD')) {
      return yield* task(async () => {
        const root = resolve('dist');
        const path = resolve(root, '.' + decodeURIComponent(pathname));
        if (path.startsWith(root + '/') && await Bun.file(path).exists()) {
          return new Response(method === 'HEAD' ? null : Bun.file(path), { headers: { 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'Content-Type': Bun.file(path).type } });
        }
        if (pathname.includes('.')) return new Response('Not found', { status: 404 });
        const index = Bun.file(resolve(root, 'index.html'));
        if (await index.exists()) return new Response(method === 'HEAD' ? null : index, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        return new Response('Run bun run build, or use the Vite development server on port 5173.', { status: 503 });
      });
    }
    return new Response('Not found', { status: 404 });
  });

  return async (request: Request, ip = 'unknown') => {
    const response = await Effect.runPromise(route(request, ip).pipe(
      Effect.catchAll(error => Effect.succeed(json({ error: error.message }, error.status))),
      Effect.catchAllCause(() => { console.error('Unhandled request failure'); return Effect.succeed(json({ error: 'Something went wrong. Please try again.' }, 500)); }),
    ));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (!new URL(request.url).pathname.startsWith('/assets/')) response.headers.set('Cache-Control', 'no-store');
    if (options.secure) {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000');
      response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    }
    return response;
  };
}
