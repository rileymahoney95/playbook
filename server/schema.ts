import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const owners = pgTable(
  'owners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    singleton: integer('singleton').notNull().default(1).unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [check('owner_singleton', sql`${t.singleton} = 1`)],
);

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    expiresAt: time('expires_at').notNull(),
  },
  (t) => [index('sessions_expiry_idx').on(t.expiresAt)],
);

export const loginAttempts = pgTable('login_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(1),
  expiresAt: time('expires_at').notNull(),
});

export const routines = pgTable(
  'routines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull().default('General'),
    version: integer('version').notNull().default(1),
    archivedAt: time('archived_at'),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
  },
  (t) => [index('routines_owner_idx').on(t.ownerId)],
);

const stepFields = () => ({
  title: text('title').notNull(),
  instructions: text('instructions').notNull().default(''),
  quantity: text('quantity').notNull().default(''),
  durationSeconds: integer('duration_seconds'),
  referenceUrl: text('reference_url').notNull().default(''),
  position: integer('position').notNull(),
});

export const routineSteps = pgTable(
  'routine_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routineId: uuid('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    ...stepFields(),
  },
  (t) => [
    uniqueIndex('routine_steps_order_idx').on(t.routineId, t.position),
    check(
      'routine_step_duration',
      sql`${t.durationSeconds} IS NULL OR ${t.durationSeconds} BETWEEN 1 AND 86400`,
    ),
  ],
);

export const runs = pgTable(
  'runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id),
    routineId: uuid('routine_id')
      .notNull()
      .references(() => routines.id),
    routineVersion: integer('routine_version').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    status: text('status', { enum: ['active', 'completed', 'discarded'] })
      .notNull()
      .default('active'),
    startedAt: time('started_at').notNull().defaultNow(),
    finishedAt: time('finished_at'),
  },
  (t) => [
    uniqueIndex('one_active_run_per_routine')
      .on(t.routineId)
      .where(sql`${t.status} = 'active'`),
    index('runs_owner_history_idx').on(t.ownerId, t.finishedAt),
    check('run_status', sql`${t.status} IN ('active', 'completed', 'discarded')`),
  ],
);

export const runSteps = pgTable(
  'run_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    ...stepFields(),
    completedAt: time('completed_at'),
    timerRemainingMs: integer('timer_remaining_ms').notNull().default(0),
    timerStartedAt: time('timer_started_at'),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('run_steps_order_idx').on(t.runId, t.position),
    check(
      'run_step_duration',
      sql`${t.durationSeconds} IS NULL OR ${t.durationSeconds} BETWEEN 1 AND 86400`,
    ),
    check('timer_nonnegative', sql`${t.timerRemainingMs} >= 0`),
  ],
);
