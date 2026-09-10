import { sql } from 'drizzle-orm';
import type { Database } from './db';
import { owners, routines, routineSteps } from './schema';

export async function seedOwner(db: Database, password: string | undefined) {
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(9127301)`);
    if ((await tx.select({ id: owners.id }).from(owners).limit(1)).length) return;
    if (!password || password.length < 12 || password.length > 256) {
      throw new Error('Set BOOTSTRAP_PASSWORD to a unique password of 12–256 characters before first startup.');
    }
    const [owner] = await tx.insert(owners).values({ passwordHash: await Bun.password.hash(password, { algorithm: 'argon2id' }) }).returning();
    const [routine] = await tx.insert(routines).values({
      ownerId: owner.id,
      title: 'Morning mobility',
      category: 'Mobility',
      description: 'A sample checklist to try the app. Edit these steps to match your own routine.',
    }).returning();
    await tx.insert(routineSteps).values([
      { title: 'Shoulder circles', quantity: '5 each direction', instructions: 'Replace this sample with your usual movement and cues.', durationSeconds: null },
      { title: 'Cat–cow', quantity: '6 slow reps', instructions: 'Add the instructions you like to follow.', durationSeconds: null },
      { title: 'Hip mobility — left', quantity: '', instructions: 'Use the timer, then check the step when you are done.', durationSeconds: 30 },
      { title: 'Hip mobility — right', quantity: '', instructions: 'You can pause, reset, or finish without using the timer.', durationSeconds: 30 },
      { title: 'Ankle circles', quantity: '5 each direction, each ankle', instructions: 'This is an editable starter, not a prescribed exercise program.', durationSeconds: null },
    ].map((step, position) => ({ ...step, routineId: routine.id, position })));
  });
}
