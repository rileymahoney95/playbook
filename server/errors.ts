import { Data, Effect } from 'effect';

export class AppError extends Data.TaggedError('AppError')<{
  status: number;
  message: string;
}> {}

export function task<A>(work: () => Promise<A>) {
  return Effect.tryPromise({
    try: work,
    catch: (error) => {
      if (error instanceof AppError) return error;
      // Do not log SQL parameters, request bodies, connection strings, or passwords.
      console.error(
        'Server operation failed',
        error instanceof Error ? error.name : 'UnknownError',
      );
      return new AppError({ status: 500, message: 'Something went wrong. Please try again.' });
    },
  });
}
export function requireValue<A>(value: A | undefined | null, message = 'Not found.'): A {
  if (value === undefined || value === null) throw new AppError({ status: 404, message });
  return value;
}
