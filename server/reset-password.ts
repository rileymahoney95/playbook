import { eq } from 'drizzle-orm';
import { connectDatabase } from './db';
import { owners, sessions } from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
const { db, pool } = connectDatabase(process.env.DATABASE_URL);

// Read without echoing; never take a password through arguments or shell history.
async function secret(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData); process.stdout.write('\n'); };
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') { finish(); reject(new Error('Cancelled.')); return; }
        if (character === '\r' || character === '\n') { finish(); resolve(value); return; }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else if (character >= ' ') value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}
try {
  const password = await secret('New password (12–256 characters): ');
  if (password.length < 12 || password.length > 256) throw new Error('Password must have 12–256 characters.');
  if (password !== await secret('Confirm password: ')) throw new Error('Passwords do not match.');
  const passwordHash = await Bun.password.hash(password, { algorithm: 'argon2id' });
  await db.transaction(async tx => {
    const [owner] = await tx.select().from(owners).limit(1).for('update');
    if (!owner) throw new Error('No owner exists yet. Start the application first.');
    await tx.update(owners).set({ passwordHash }).where(eq(owners.id, owner.id));
    await tx.delete(sessions).where(eq(sessions.ownerId, owner.id));
  });
  console.log('Password updated; all sessions revoked.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Password reset failed.');
  process.exitCode = 1;
} finally { await pool.end(); }
