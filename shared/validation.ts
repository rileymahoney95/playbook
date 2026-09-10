import { Schema as S } from 'effect';

const requiredText = (max: number) =>
  S.String.pipe(
    S.maxLength(max),
    S.filter((s) => s.trim().length > 0),
  );
const text = (max: number) => S.String.pipe(S.maxLength(max));
const link = text(2000).pipe(
  S.filter((value) => {
    if (!value) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }),
);
export const StepSchema = S.Struct({
  id: S.optional(S.UUID),
  title: requiredText(160),
  instructions: text(4000),
  quantity: text(120),
  durationSeconds: S.NullOr(S.Number.pipe(S.int(), S.between(1, 86400))),
  referenceUrl: link,
});
export const RoutineSchema = S.Struct({
  title: requiredText(120),
  description: text(2000),
  category: requiredText(60),
  steps: S.Array(StepSchema).pipe(S.minItems(1), S.maxItems(100)),
});
export const RoutineEditSchema = S.Struct({
  ...RoutineSchema.fields,
  version: S.Number.pipe(S.int(), S.positive()),
});
export const StepUpdateSchema = S.Struct({
  version: S.Number.pipe(S.int(), S.positive()),
  completed: S.optional(S.Boolean),
  timerAction: S.optional(S.Literal('start', 'pause', 'reset')),
}).pipe(S.filter((value) => (value.completed !== undefined) !== (value.timerAction !== undefined)));
export const LoginSchema = S.Struct({ password: requiredText(256) });
export const PasswordSchema = S.Struct({
  currentPassword: requiredText(256),
  newPassword: S.String.pipe(S.minLength(12), S.maxLength(256)),
});
