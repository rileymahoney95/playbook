import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { Effect } from 'effect';
import type { Database } from './db';
import { loginAttempts, owners, sessions } from './schema';
import { AppError, task } from './errors';

const SESSION_SECONDS = 60 * 60 * 24 * 30;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const cookieName = (secure: boolean) => secure ? '__Host-playbook' : 'playbook';

export function createAuth(db: Database, secure: boolean) {
  const cookie = (token: string, maxAge = SESSION_SECONDS) =>
    `${cookieName(secure)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  const tokenFrom = (request: Request) => request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName(secure)}=`))?.split('=')[1];
  const createSession = async (ownerId: string, executor: Pick<Database, 'insert'> = db) => {
    const token = randomBytes(32).toString('base64url');
    await executor.insert(sessions).values({ tokenHash: hash(token), ownerId, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
    return cookie(token);
  };

  const authenticate = (request: Request) => Effect.gen(function* () {
    const token = tokenFrom(request);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return yield* Effect.fail(new AppError({ status: 401, message: 'Please sign in.' }));
    const [session] = yield* task(() => db.select().from(sessions).where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date()))).limit(1));
    if (!session) return yield* Effect.fail(new AppError({ status: 401, message: 'Your session expired. Please sign in again.' }));
    return session.ownerId;
  });

  const throttle = (ip: string) => task(async () => {
    const window = Math.floor(Date.now() / 600_000);
    const key = hash(`${ip}:${window}`);
    const [attempt] = await db.insert(loginAttempts).values({ key, expiresAt: new Date((window + 1) * 600_000) })
      .onConflictDoUpdate({ target: loginAttempts.key, set: { count: sql`${loginAttempts.count} + 1` } }).returning();
    if (attempt.count > 10) throw new AppError({ status: 429, message: 'Too many attempts. Please wait 10 minutes and try again.' });
  });

  return {
    authenticate,
    login: (password: string, ip: string) => Effect.gen(function* () {
      yield* throttle(ip);
      const [owner] = yield* task(() => db.select().from(owners).limit(1));
      const valid = owner && (yield* task(() => Bun.password.verify(password, owner.passwordHash)));
      if (!valid) return yield* Effect.fail(new AppError({ status: 401, message: 'Incorrect password.' }));
      // Hold the owner lock through session creation so a concurrent password change
      // cannot be followed by a newly issued session using the old password.
      return yield* task(() => db.transaction(async tx => {
        const [current] = await tx.select().from(owners).where(eq(owners.id, owner.id)).for('update');
        if (current.passwordHash !== owner.passwordHash) throw new AppError({ status: 401, message: 'Password changed. Please sign in again.' });
        const token = randomBytes(32).toString('base64url');
        await tx.insert(sessions).values({ tokenHash: hash(token), ownerId: owner.id, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
        await tx.delete(sessions).where(lt(sessions.expiresAt, new Date()));
        await tx.delete(loginAttempts).where(lt(loginAttempts.expiresAt, new Date()));
        return cookie(token);
      }));
    }),
    logout: (request: Request) => task(async () => {
      const token = tokenFrom(request);
      if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hash(token)));
      return cookie('', 0);
    }),
    changePassword: (ownerId: string, currentPassword: string, newPassword: string, ip: string) => Effect.gen(function* () {
      yield* throttle(ip);
      const passwordHash = yield* task(() => Bun.password.hash(newPassword, { algorithm: 'argon2id' }));
      return yield* task(() => db.transaction(async tx => {
        const [owner] = await tx.select().from(owners).where(eq(owners.id, ownerId)).for('update');
        if (!owner || !await Bun.password.verify(currentPassword, owner.passwordHash)) throw new AppError({ status: 400, message: 'Current password is incorrect.' });
        await tx.update(owners).set({ passwordHash }).where(eq(owners.id, ownerId));
        await tx.delete(sessions).where(eq(sessions.ownerId, ownerId));
        return createSession(ownerId, tx);
      }));
    }),
  };
}
