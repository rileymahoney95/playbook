import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from './db';
import { AppError, requireValue, task } from './errors';
import { routines, routineSteps, runs, runSteps } from './schema';
import type { RoutineInput, TimerAction } from '../shared/types';

type QueryDb = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>;
const conflict = () =>
  new AppError({
    status: 409,
    message: 'This changed on another device. Reload the saved version before trying again.',
  });
const counts = {
  stepCount: sql<number>`count(${runSteps.id})::int`,
  completedSteps: sql<number>`count(${runSteps.completedAt})::int`,
};
const runFields = {
  id: runs.id,
  routineId: runs.routineId,
  title: runs.title,
  description: runs.description,
  category: runs.category,
  status: runs.status,
  startedAt: runs.startedAt,
  finishedAt: runs.finishedAt,
};
function stepValues(input: RoutineInput) {
  return input.steps.map((step, position) => ({
    title: step.title.trim(),
    instructions: step.instructions.trim(),
    quantity: step.quantity.trim(),
    durationSeconds: step.durationSeconds,
    referenceUrl: step.referenceUrl.trim(),
    position,
  }));
}

async function runDetail(db: QueryDb, ownerId: string, id: string) {
  const [run] = await db
    .select(runFields)
    .from(runs)
    .where(and(eq(runs.id, id), eq(runs.ownerId, ownerId)));
  const found = requireValue(run);
  const steps = await db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, id))
    .orderBy(asc(runSteps.position));
  return {
    ...found,
    steps,
    stepCount: steps.length,
    completedSteps: steps.filter((s) => s.completedAt).length,
    serverNow: Date.now(),
  };
}

export function createPlaybook(db: Database) {
  return {
    listRoutines: (ownerId: string) =>
      task(async () => {
        const templates = await db
          .select({
            id: routines.id,
            title: routines.title,
            description: routines.description,
            category: routines.category,
            stepCount: sql<number>`(select count(*)::int from routine_steps where routine_id = "routines"."id")`,
            activeRunId: sql<
              string | null
            >`(select id from runs where routine_id = "routines"."id" and status = 'active')`,
            lastCompletedAt: sql<
              string | null
            >`(select max(finished_at) from runs where routine_id = "routines"."id" and status = 'completed')`,
            completedSteps: sql<number>`(select count(*)::int from run_steps s join runs r on r.id = s.run_id where r.routine_id = "routines"."id" and r.status = 'active' and s.completed_at is not null)`,
            activeStepCount: sql<number>`(select count(*)::int from run_steps s join runs r on r.id = s.run_id where r.routine_id = "routines"."id" and r.status = 'active')`,
          })
          .from(routines)
          .where(and(eq(routines.ownerId, ownerId), isNull(routines.archivedAt)))
          .orderBy(asc(routines.createdAt));
        return templates;
      }),
    getRoutine: (ownerId: string, id: string) =>
      task(() =>
        db.transaction(async (tx) => {
          // Read the template and its steps from one consistent snapshot, even during edits.
          const [routine] = await tx
            .select()
            .from(routines)
            .where(and(eq(routines.id, id), eq(routines.ownerId, ownerId)))
            .for('share');
          const found = requireValue(routine);
          const steps = await tx
            .select()
            .from(routineSteps)
            .where(eq(routineSteps.routineId, id))
            .orderBy(asc(routineSteps.position));
          const [active] = await tx
            .select({ id: runs.id })
            .from(runs)
            .where(and(eq(runs.routineId, id), eq(runs.status, 'active')));
          return { ...found, steps, activeRunId: active?.id ?? null };
        }),
      ),
    createRoutine: (ownerId: string, input: RoutineInput) =>
      task(() =>
        db.transaction(async (tx) => {
          const [routine] = await tx
            .insert(routines)
            .values({
              ownerId,
              title: input.title.trim(),
              description: input.description.trim(),
              category: input.category.trim(),
            })
            .returning();
          await tx
            .insert(routineSteps)
            .values(stepValues(input).map((step) => ({ ...step, routineId: routine.id })));
          return { id: routine.id };
        }),
      ),
    editRoutine: (ownerId: string, id: string, input: RoutineInput & { version: number }) =>
      task(() =>
        db.transaction(async (tx) => {
          const [routine] = await tx
            .select()
            .from(routines)
            .where(and(eq(routines.id, id), eq(routines.ownerId, ownerId)))
            .for('update');
          const found = requireValue(routine);
          if (found.archivedAt)
            throw new AppError({ status: 409, message: 'This routine is archived.' });
          if (found.version !== input.version) throw conflict();
          await tx
            .update(routines)
            .set({
              title: input.title.trim(),
              description: input.description.trim(),
              category: input.category.trim(),
              version: found.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(routines.id, id));
          // Run steps are independent snapshots; replacing template steps cannot alter runs.
          await tx.delete(routineSteps).where(eq(routineSteps.routineId, id));
          await tx
            .insert(routineSteps)
            .values(stepValues(input).map((step) => ({ ...step, routineId: id })));
          return { id };
        }),
      ),
    archiveRoutine: (ownerId: string, id: string) =>
      task(() =>
        db.transaction(async (tx) => {
          const [routine] = await tx
            .select()
            .from(routines)
            .where(and(eq(routines.id, id), eq(routines.ownerId, ownerId)))
            .for('update');
          requireValue(routine);
          const [active] = await tx
            .select()
            .from(runs)
            .where(and(eq(runs.routineId, id), eq(runs.status, 'active')));
          if (active)
            throw new AppError({
              status: 409,
              message: 'Finish or discard the active run before archiving this routine.',
            });
          await tx
            .update(routines)
            .set({ archivedAt: new Date(), updatedAt: new Date() })
            .where(eq(routines.id, id));
          return { ok: true };
        }),
      ),
    startRun: (ownerId: string, routineId: string) =>
      task(() =>
        db.transaction(async (tx) => {
          const [routine] = await tx
            .select()
            .from(routines)
            .where(and(eq(routines.id, routineId), eq(routines.ownerId, ownerId)))
            .for('update');
          const found = requireValue(routine);
          if (found.archivedAt)
            throw new AppError({ status: 409, message: 'This routine is archived.' });
          const [existing] = await tx
            .select()
            .from(runs)
            .where(and(eq(runs.routineId, routineId), eq(runs.status, 'active')));
          if (existing) return { id: existing.id };
          const steps = await tx
            .select()
            .from(routineSteps)
            .where(eq(routineSteps.routineId, routineId))
            .orderBy(asc(routineSteps.position));
          if (!steps.length)
            throw new AppError({ status: 400, message: 'Add at least one step first.' });
          const [run] = await tx
            .insert(runs)
            .values({
              ownerId,
              routineId,
              routineVersion: found.version,
              title: found.title,
              description: found.description,
              category: found.category,
            })
            .returning();
          await tx.insert(runSteps).values(
            steps.map(({ id: _id, routineId: _routineId, ...step }) => ({
              ...step,
              runId: run.id,
              timerRemainingMs: (step.durationSeconds ?? 0) * 1000,
            })),
          );
          return { id: run.id };
        }),
      ),
    getRun: (ownerId: string, id: string) =>
      task(() =>
        db.transaction(async (tx) => {
          // Step mutations and finishing both lock this parent row.
          requireValue(
            (
              await tx
                .select({ id: runs.id })
                .from(runs)
                .where(and(eq(runs.id, id), eq(runs.ownerId, ownerId)))
                .for('share')
            )[0],
          );
          return runDetail(tx, ownerId, id);
        }),
      ),
    updateStep: (
      ownerId: string,
      runId: string,
      stepId: string,
      input: { version: number; completed?: boolean; timerAction?: TimerAction },
    ) =>
      task(() =>
        db.transaction(async (tx) => {
          const [run] = await tx
            .select()
            .from(runs)
            .where(and(eq(runs.id, runId), eq(runs.ownerId, ownerId)))
            .for('update');
          if (requireValue(run).status !== 'active')
            throw new AppError({ status: 409, message: 'This run has already ended.' });
          const [step] = await tx
            .select()
            .from(runSteps)
            .where(and(eq(runSteps.id, stepId), eq(runSteps.runId, runId)));
          const found = requireValue(step);
          if (found.version !== input.version) throw conflict();
          const now = new Date();
          const remaining = Math.max(
            0,
            found.timerRemainingMs -
              (found.timerStartedAt ? now.getTime() - found.timerStartedAt.getTime() : 0),
          );
          const update: Partial<typeof runSteps.$inferInsert> = { version: found.version + 1 };
          if (input.completed !== undefined) {
            update.completedAt = input.completed ? now : null;
            if (input.completed) {
              update.timerRemainingMs = remaining;
              update.timerStartedAt = null;
            }
          }
          if (input.timerAction) {
            if (!found.durationSeconds)
              throw new AppError({ status: 400, message: 'This step has no timer.' });
            if (found.completedAt)
              throw new AppError({
                status: 400,
                message: 'Uncheck this step before using its timer.',
              });
            if (input.timerAction === 'start') {
              if (found.timerStartedAt && remaining > 0) return runDetail(tx, ownerId, runId);
              update.timerRemainingMs = remaining || found.durationSeconds * 1000;
              update.timerStartedAt = now;
            } else if (input.timerAction === 'pause') {
              update.timerRemainingMs = remaining;
              update.timerStartedAt = null;
            } else {
              update.timerRemainingMs = found.durationSeconds * 1000;
              update.timerStartedAt = null;
            }
          }
          await tx.update(runSteps).set(update).where(eq(runSteps.id, stepId));
          return runDetail(tx, ownerId, runId);
        }),
      ),
    endRun: (ownerId: string, id: string, status: 'completed' | 'discarded') =>
      task(() =>
        db.transaction(async (tx) => {
          const [run] = await tx
            .select()
            .from(runs)
            .where(and(eq(runs.id, id), eq(runs.ownerId, ownerId)))
            .for('update');
          const found = requireValue(run);
          if (found.status === status) return runDetail(tx, ownerId, id);
          if (found.status !== 'active')
            throw new AppError({ status: 409, message: 'This run has already ended.' });
          const steps = await tx.select().from(runSteps).where(eq(runSteps.runId, id));
          if (status === 'completed' && (!steps.length || steps.some((s) => !s.completedAt)))
            throw new AppError({ status: 400, message: 'Check every step before finishing.' });
          const now = new Date();
          for (const step of steps.filter((s) => s.timerStartedAt)) {
            await tx
              .update(runSteps)
              .set({
                timerRemainingMs: Math.max(
                  0,
                  step.timerRemainingMs - (now.getTime() - step.timerStartedAt!.getTime()),
                ),
                timerStartedAt: null,
                version: step.version + 1,
              })
              .where(eq(runSteps.id, step.id));
          }
          await tx.update(runs).set({ status, finishedAt: now }).where(eq(runs.id, id));
          return runDetail(tx, ownerId, id);
        }),
      ),
    history: (ownerId: string, offset: number) =>
      task(async () => {
        const items = await db
          .select({ ...runFields, ...counts })
          .from(runs)
          .leftJoin(runSteps, eq(runSteps.runId, runs.id))
          .where(and(eq(runs.ownerId, ownerId), sql`${runs.status} <> 'active'`))
          .groupBy(runs.id)
          .orderBy(desc(runs.finishedAt), desc(runs.id))
          .limit(26)
          .offset(offset);
        return { items: items.slice(0, 25), hasMore: items.length > 25 };
      }),
  };
}
