import type { CSSProperties } from 'react';
import type { Run } from '../../shared/types';
import { CheckIcon, ChevronLeftIcon, ResetIcon } from '../icons';
import {
  Button,
  clock,
  duration,
  ErrorNotice,
  Eyebrow,
  IconButton,
  Panel,
  plural,
  SectionHead,
} from '../ui';
import { Ring, ringCircumference } from './step';

/* The completion state, rendered in place once a run has ended. A discarded
   run uses the same layout with a partial ring and no check glyph. */
export function CompleteState({
  run,
  busy,
  error,
  onStartAgain,
}: {
  run: Run;
  busy: boolean;
  error?: string;
  onStartAgain: () => void;
}) {
  const completed = run.status === 'completed';
  const total = run.stepCount;
  const done = run.completedSteps;
  const fraction = completed ? 1 : total ? done / total : 0;
  const finishedAt = run.finishedAt ?? run.startedAt;
  const elapsed = duration(
    (new Date(finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000,
  );
  const ringTo = (ringCircumference(54) * (1 - fraction)).toFixed(1);
  return (
    <div className="page">
      <header className="page-head items-center">
        <IconButton label="Back to routines" to="/">
          <ChevronLeftIcon />
        </IconButton>
        <Eyebrow className="text-center">{run.category} · Saved to history</Eyebrow>
        <span className="w-11 shrink-0" aria-hidden="true" />
      </header>
      <ErrorNotice>{error}</ErrorNotice>
      <Panel as="section" raised className="done-card">
        <div className="done-ring" style={{ '--ring-to': ringTo } as CSSProperties}>
          <Ring r={54} />
          {completed && (
            <div className="glyph">
              <CheckIcon />
            </div>
          )}
        </div>
        <div className="grid justify-items-center">
          <Eyebrow as="h2" live={completed}>
            {completed ? 'Routine complete' : 'Run discarded'}
          </Eyebrow>
          <h1 className="title-xl mt-2">{run.title}</h1>
          <p className="muted mt-1.5">
            {completed ? 'Finished' : 'Discarded'} {clock(finishedAt)}.
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="v">
              {done} / {total}
            </span>
            <span className="k">Steps</span>
          </div>
          <div className="stat">
            <span className="v">{elapsed}</span>
            <span className="k">Elapsed</span>
          </div>
        </div>
        <div className="done-actions">
          <Button variant="primary" to="/">
            Done
          </Button>
          <Button icon={<ResetIcon />} onClick={onStartAgain} busy={busy} busyLabel="Starting…">
            Start again
          </Button>
        </div>
      </Panel>
      <section className="grid gap-2.5">
        <SectionHead title="What you did" meta={plural(total, 'step')} />
        <div className="recap">
          {run.steps.map((step) => (
            <div className="recap-row" key={step.id}>
              <span className={step.completedAt ? 'ck' : 'ck is-open'} aria-hidden="true">
                <CheckIcon />
              </span>
              <span>
                {step.title}
                {step.quantity && <span className="faint"> · {step.quantity}</span>}
              </span>
              <span className="at">{step.completedAt ? clock(step.completedAt) : ''}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
