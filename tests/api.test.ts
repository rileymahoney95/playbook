import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { connectDatabase } from '../server/db';
import { migrateDatabase } from '../server/migrate';
import { seedOwner } from '../server/seed';
import { createApp } from '../server/app';
import type { Routine, Run } from '../shared/types';

const url = process.env.TEST_DATABASE_URL ?? 'postgresql://playbook@127.0.0.1:55439/playbook_test';
if (!new URL(url).pathname.endsWith('_test'))
  throw new Error('Tests require a dedicated database ending in _test.');
const { db, pool } = connectDatabase(url);
const app = createApp(db, { secure: false, origin: 'http://localhost:3000', serveStatic: false });
const password = 'test-only-password-321!';
let cookie = '';
async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  session = cookie,
  extra: Record<string, string> = {},
  ip = 'test',
) {
  const response = await app(
    new Request(`http://localhost:3000${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Playbook-Request': '1',
        Cookie: session,
        ...extra,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    }),
    ip,
  );
  return {
    status: response.status,
    data: (await response.json()) as any,
    headers: response.headers,
  };
}
const sample = () => ({
  title: 'Test routine',
  description: 'Test description',
  category: 'Maintenance',
  steps: [
    {
      title: 'First step',
      instructions: 'Keep this snapshot',
      quantity: '3 reps',
      durationSeconds: 2,
      referenceUrl: 'https://example.com',
    },
    {
      title: 'Second step',
      instructions: '',
      quantity: '',
      durationSeconds: null,
      referenceUrl: '',
    },
  ],
});
async function create() {
  const result = await call('/api/routines', 'POST', sample());
  expect(result.status).toBe(201);
  return result.data.id as string;
}
async function start(id: string) {
  const result = await call(`/api/routines/${id}/runs`, 'POST');
  expect(result.status).toBe(200);
  return result.data.id as string;
}
async function getRun(id: string) {
  const result = await call(`/api/runs/${id}`);
  expect(result.status).toBe(200);
  return result.data as Run;
}

beforeAll(async () => {
  await migrateDatabase(db);
  await db.execute(sql`TRUNCATE owners, login_attempts CASCADE`);
  await seedOwner(db, password);
  const login = await call('/api/login', 'POST', { password }, '');
  expect(login.status).toBe(200);
  cookie = login.headers.get('set-cookie')!.split(';')[0];
});
afterAll(async () => {
  await pool.end();
});

describe('Playbook real-Postgres integration', () => {
  test('gates private data and issues an HttpOnly persistent cookie', async () => {
    expect((await call('/api/routines', 'GET', undefined, '')).status).toBe(401);
    expect((await call('/api/login', 'POST', { password: 'wrong' }, '')).status).toBe(401);
    const login = await call('/api/login', 'POST', { password }, '');
    expect(login.status).toBe(200);
    expect(login.headers.get('set-cookie')).toContain('HttpOnly');
    expect(login.headers.get('set-cookie')).toContain('Max-Age=2592000');
    expect(login.headers.get('cache-control')).toBe('no-store');
    expect((await call('/api/routines')).data[0].title).toBe('Morning mobility');
  });

  test('rejects cross-origin writes, missing CSRF header, and invalid payloads', async () => {
    expect(
      (await call('/api/routines', 'POST', sample(), cookie, { Origin: 'https://evil.example' }))
        .status,
    ).toBe(403);
    expect(
      (await call('/api/routines', 'POST', sample(), cookie, { 'X-Playbook-Request': '' })).status,
    ).toBe(403);
    expect((await call('/api/routines', 'POST', { ...sample(), steps: [] })).status).toBe(400);
    expect((await call('/api/routines', 'POST', { ...sample(), title: '   ' })).status).toBe(400);
    const invalid = sample();
    invalid.steps[0].referenceUrl = 'javascript:alert(1)';
    expect((await call('/api/routines', 'POST', invalid)).status).toBe(400);
    invalid.steps[0].referenceUrl = '';
    invalid.steps[0].durationSeconds = 0;
    expect((await call('/api/routines', 'POST', invalid)).status).toBe(400);
    expect((await call('/api/routines/not-a-uuid')).status).toBe(404);
  });

  test('concurrent starts return exactly one active run', async () => {
    const id = await create();
    const ids = await Promise.all(Array.from({ length: 8 }, () => start(id)));
    expect(new Set(ids).size).toBe(1);
    expect((await getRun(ids[0])).steps).toHaveLength(2);
  });

  test('persists checks across sessions and prevents stale writes', async () => {
    const id = await start(await create());
    const first = (await getRun(id)).steps[0];
    const check = await call(`/api/runs/${id}/steps/${first.id}`, 'PATCH', {
      version: first.version,
      completed: true,
    });
    expect(check.status).toBe(200);
    const login = await call('/api/login', 'POST', { password }, '');
    const anotherCookie = login.headers.get('set-cookie')!.split(';')[0];
    const onAnotherDevice = await call(`/api/runs/${id}`, 'GET', undefined, anotherCookie);
    expect(onAnotherDevice.data.steps[0].completedAt).not.toBeNull();
    expect(
      (
        await call(`/api/runs/${id}/steps/${first.id}`, 'PATCH', {
          version: first.version,
          completed: false,
        })
      ).status,
    ).toBe(409);
    expect((await getRun(id)).steps[0].completedAt).not.toBeNull();
  });

  test('edits, reorder, add and removal affect future runs but preserve snapshots', async () => {
    const id = await create();
    const runId = await start(id);
    const routine: Routine = (await call(`/api/routines/${id}`)).data;
    const input = {
      ...routine,
      title: 'Updated template',
      steps: [{ ...routine.steps[1], title: 'New first step' }],
    };
    expect((await call(`/api/routines/${id}`, 'PUT', input)).status).toBe(200);
    expect((await call(`/api/routines/${id}`, 'PUT', input)).status).toBe(409);
    const snapshot = await getRun(runId);
    expect(snapshot.title).toBe('Test routine');
    expect(snapshot.steps).toHaveLength(2);
    expect(snapshot.steps[0].instructions).toBe('Keep this snapshot');
    await call(`/api/runs/${runId}/discard`, 'POST');
    const next = await getRun(await start(id));
    expect(next.title).toBe('Updated template');
    expect(next.steps).toHaveLength(1);
    expect(next.steps[0].title).toBe('New first step');
  });

  test('timers persist start, elapsed time, pause and reset', async () => {
    const id = await start(await create());
    let step = (await getRun(id)).steps[0];
    const started = await call(`/api/runs/${id}/steps/${step.id}`, 'PATCH', {
      version: step.version,
      timerAction: 'start',
    });
    expect(started.status).toBe(200);
    expect(started.data.steps[0].timerStartedAt).not.toBeNull();
    await Bun.sleep(100);
    step = (await getRun(id)).steps[0];
    const paused = await call(`/api/runs/${id}/steps/${step.id}`, 'PATCH', {
      version: step.version,
      timerAction: 'pause',
    });
    step = paused.data.steps[0];
    expect(step.timerStartedAt).toBeNull();
    expect(step.timerRemainingMs).toBeLessThan(2000);
    expect(step.timerRemainingMs).toBeGreaterThan(0);
    const reset = await call(`/api/runs/${id}/steps/${step.id}`, 'PATCH', {
      version: step.version,
      timerAction: 'reset',
    });
    expect(reset.data.steps[0].timerRemainingMs).toBe(2000);
    const untimed = reset.data.steps[1];
    expect(
      (
        await call(`/api/runs/${id}/steps/${untimed.id}`, 'PATCH', {
          version: untimed.version,
          timerAction: 'start',
        })
      ).status,
    ).toBe(400);
  });

  test('completion requires all checks, is idempotent, and starts fresh next time', async () => {
    const routineId = await create();
    const id = await start(routineId);
    expect((await call(`/api/runs/${id}/complete`, 'POST')).status).toBe(400);
    let run = await getRun(id);
    for (const step of run.steps)
      expect(
        (
          await call(`/api/runs/${id}/steps/${step.id}`, 'PATCH', {
            version: step.version,
            completed: true,
          })
        ).status,
      ).toBe(200);
    const finished = await call(`/api/runs/${id}/complete`, 'POST');
    expect(finished.data.status).toBe('completed');
    expect((await call(`/api/runs/${id}/complete`, 'POST')).data.finishedAt).toBe(
      finished.data.finishedAt,
    );
    run = await getRun(id);
    expect(
      (
        await call(`/api/runs/${id}/steps/${run.steps[0].id}`, 'PATCH', {
          version: run.steps[0].version,
          completed: false,
        })
      ).status,
    ).toBe(409);
    const nextId = await start(routineId);
    expect(nextId).not.toBe(id);
    expect((await getRun(nextId)).completedSteps).toBe(0);
    expect(
      (await call('/api/history')).data.items.some(
        (r: Run) => r.id === id && r.status === 'completed',
      ),
    ).toBe(true);
  });

  test('archive blocks active runs and preserves discarded history', async () => {
    const routineId = await create();
    const id = await start(routineId);
    expect((await call(`/api/routines/${routineId}/archive`, 'POST')).status).toBe(409);
    expect((await call(`/api/runs/${id}/discard`, 'POST')).data.status).toBe('discarded');
    expect((await call(`/api/routines/${routineId}/archive`, 'POST')).status).toBe(200);
    expect((await call(`/api/routines/${routineId}/runs`, 'POST')).status).toBe(409);
    expect((await call('/api/routines')).data.some((r: Routine) => r.id === routineId)).toBe(false);
    expect((await getRun(id)).status).toBe('discarded');
  });

  test('records cannot be addressed through the wrong parent', async () => {
    const a = await start(await create());
    const b = await start(await create());
    const step = (await getRun(a)).steps[0];
    expect(
      (
        await call(`/api/runs/${b}/steps/${step.id}`, 'PATCH', {
          version: step.version,
          completed: true,
        })
      ).status,
    ).toBe(404);
    expect((await getRun(a)).completedSteps).toBe(0);
  });

  test('rate limits password attempts', async () => {
    for (let i = 0; i < 10; i++)
      expect(
        (await call('/api/login', 'POST', { password: 'wrong' }, '', {}, 'throttle-test')).status,
      ).toBe(401);
    expect((await call('/api/login', 'POST', { password }, '', {}, 'throttle-test')).status).toBe(
      429,
    );
  });

  test('password changes revoke old sessions and seeding never overwrites the password', async () => {
    const changed = await call('/api/password', 'POST', {
      currentPassword: password,
      newPassword: 'changed-test-password-987!',
    });
    expect(changed.status).toBe(200);
    const previous = cookie;
    cookie = changed.headers.get('set-cookie')!.split(';')[0];
    expect((await call('/api/session', 'GET', undefined, previous)).status).toBe(401);
    expect((await call('/api/session')).status).toBe(200);
    await seedOwner(db, password);
    expect(
      (
        await call(
          '/api/login',
          'POST',
          { password: 'changed-test-password-987!' },
          '',
          {},
          'new-password',
        )
      ).status,
    ).toBe(200);
    expect((await call('/api/login', 'POST', { password }, '', {}, 'new-password')).status).toBe(
      401,
    );
    await call('/api/logout', 'POST');
    expect((await call('/api/session')).status).toBe(401);
  });
});
