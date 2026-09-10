export interface StepInput {
  id?: string;
  title: string;
  instructions: string;
  quantity: string;
  durationSeconds: number | null;
  referenceUrl: string;
}
export interface RoutineInput {
  title: string;
  description: string;
  category: string;
  steps: StepInput[];
}
export interface Routine extends RoutineInput {
  id: string;
  version: number;
  steps: (StepInput & { id: string; position: number })[];
  activeRunId: string | null;
  archivedAt: string | null;
}
export interface RoutineSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  stepCount: number;
  activeRunId: string | null;
  completedSteps: number;
  activeStepCount: number;
  lastCompletedAt: string | null;
}
export interface RunStep extends StepInput {
  id: string;
  position: number;
  completedAt: string | null;
  timerRemainingMs: number;
  timerStartedAt: string | null;
  version: number;
}
export interface RunSummary {
  id: string;
  routineId: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'completed' | 'discarded';
  startedAt: string;
  finishedAt: string | null;
  stepCount: number;
  completedSteps: number;
}
export interface Run extends RunSummary {
  steps: RunStep[];
  serverNow: number;
}
export type TimerAction = 'start' | 'pause' | 'reset';
