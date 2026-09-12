import { memo, type CSSProperties } from 'react';
import type { RunStep, TimerAction } from '../../shared/types';
import { ClockIcon, LinkIcon, PauseIcon, PlayIcon, ResetIcon } from '../icons';
import { Button, Check, clock, duration, hostname, pad2 } from '../ui';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** Milliseconds left on a step's timer at server-corrected `now`, clamped at 0. */
export function remainingMs(step: RunStep, now: number) {
  return Math.max(
    0,
    step.timerRemainingMs -
      (step.timerStartedAt ? now - new Date(step.timerStartedAt).getTime() : 0),
  );
}

/* Ring: thin circular progress with 12 ticks. viewBox 0 0 100 100; the arc's
   dashoffset is c × (1 − fraction). Shared by the timer and the completion card. */
export function Ring({
  r,
  dashoffset,
  style,
}: {
  r: number;
  dashoffset?: number;
  style?: CSSProperties;
}) {
  const c = 2 * Math.PI * r;
  const ticks = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    const inner = r - 8;
    const outer = r - 5.5;
    return (
      <line
        key={k}
        x1={(50 + Math.cos(a) * inner).toFixed(1)}
        y1={(50 + Math.sin(a) * inner).toFixed(1)}
        x2={(50 + Math.cos(a) * outer).toFixed(1)}
        y2={(50 + Math.sin(a) * outer).toFixed(1)}
      />
    );
  });
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g className="ticks">{ticks}</g>
      <circle className="track" cx="50" cy="50" r={r} />
      <circle
        className="arc"
        cx="50"
        cy="50"
        r={r}
        strokeDasharray={c.toFixed(1)}
        style={{ ...(dashoffset === undefined ? {} : { strokeDashoffset: dashoffset }), ...style }}
      />
    </svg>
  );
}
export const ringCircumference = (r: number) => 2 * Math.PI * r;

export function Timer({
  remainingMs: remaining,
  durationMs,
  running,
  done,
  title,
  disabled,
  controlsHidden,
  onStart,
  onPause,
  onReset,
}: {
  remainingMs: number;
  durationMs: number;
  running: boolean;
  done: boolean;
  title: string;
  disabled?: boolean;
  controlsHidden?: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  const fraction = durationMs > 0 ? Math.min(1, remaining / durationMs) : 0;
  const paused = !running && !done && remaining < durationMs;
  const hold = duration(durationMs / 1000);
  const reset = (variant: 'secondary' | 'ghost') => (
    <Button
      size="sm"
      variant={variant}
      icon={<ResetIcon />}
      aria-label={`Reset timer for ${title}`}
      onClick={onReset}
      disabled={disabled}
    >
      Reset
    </Button>
  );
  return (
    <div className={cx('timer', running && 'is-running', done && 'is-done')}>
      <div className="timer-ring">
        <Ring r={44} dashoffset={ringCircumference(44) * (1 - fraction)} />
        <div className="readout" role="timer" aria-label={`Timer for ${title}`}>
          {duration(remaining / 1000)}
        </div>
      </div>
      <div className="ctl">
        <span className="lbl" role={done ? 'status' : undefined}>
          {done ? (
            <>
              <b>Time complete</b> · check when ready
            </>
          ) : running ? (
            <>
              <b>Running</b> · {hold} hold
            </>
          ) : paused ? (
            <>
              <b>Paused</b> · {hold} hold
            </>
          ) : (
            <>
              <b>Timer</b> · {hold} hold
            </>
          )}
        </span>
        {!controlsHidden && (
          <div className="btns">
            {done ? (
              reset('secondary')
            ) : running ? (
              <>
                <Button
                  size="sm"
                  icon={<PauseIcon />}
                  aria-label={`Pause timer for ${title}`}
                  onClick={onPause}
                  disabled={disabled}
                >
                  Pause
                </Button>
                {reset('ghost')}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<PlayIcon />}
                  aria-label={`Start timer for ${title}`}
                  onClick={onStart}
                  disabled={disabled}
                >
                  {paused ? 'Resume' : 'Start'}
                </Button>
                {paused && reset('ghost')}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface StepCardProps {
  step: RunStep;
  index: number;
  current: boolean;
  disabled: boolean;
  ended: boolean;
  /** Server-corrected milliseconds left on the timer (0 when there is none). */
  remaining: number;
  onFocus: (index: number) => void;
  onCheck: (step: RunStep, completed: boolean) => void;
  onTimer: (step: RunStep, action: TimerAction) => void;
}
export const StepCard = memo(function StepCard({
  step,
  index,
  current,
  disabled,
  ended,
  remaining,
  onFocus,
  onCheck,
  onTimer,
}: StepCardProps) {
  const checked = !!step.completedAt;
  const hasTimer = !!step.durationSeconds;
  const running = !!step.timerStartedAt && remaining > 0;
  const bodyEmpty = !step.instructions && !step.referenceUrl && !hasTimer;
  return (
    <article
      className={cx('step', checked && 'is-done', current && 'is-current')}
      aria-current={current ? 'step' : undefined}
    >
      <div className="step-row">
        <Check
          id={`step-${step.id}`}
          checked={checked}
          current={current}
          disabled={disabled || ended}
          label={`Complete ${step.title}`}
          onChange={(value) => onCheck(step, value)}
        />
        <button type="button" className="name" onClick={() => onFocus(index)}>
          <span className="t">{step.title}</span>
          {(step.quantity || hasTimer || checked) && (
            <span className="q">
              {step.quantity && <span>{step.quantity}</span>}
              {hasTimer && (
                <>
                  {step.quantity && <span className="sep">·</span>}
                  <ClockIcon />
                  <span className="mono">{duration(step.durationSeconds!)}</span>
                </>
              )}
              {checked && (
                <>
                  {(step.quantity || hasTimer) && <span className="sep">·</span>}
                  <span className="mono">{clock(step.completedAt!)}</span>
                </>
              )}
            </span>
          )}
        </button>
        <span className="idx">{pad2(index + 1)}</span>
      </div>
      <div className="step-body">
        <div>
          <div className="step-inner">
            {step.instructions ? (
              <p className="instructions">{step.instructions}</p>
            ) : (
              bodyEmpty && <p className="instructions faint">No instructions</p>
            )}
            {step.referenceUrl && (
              <a className="ref" href={step.referenceUrl} target="_blank" rel="noopener noreferrer">
                <LinkIcon />
                {hostname(step.referenceUrl)}
              </a>
            )}
            {hasTimer && (
              <Timer
                remainingMs={remaining}
                durationMs={step.durationSeconds! * 1000}
                running={running}
                done={remaining <= 0}
                title={step.title}
                disabled={disabled}
                controlsHidden={checked || ended}
                onStart={() => onTimer(step, 'start')}
                onPause={() => onTimer(step, 'pause')}
                onReset={() => onTimer(step, 'reset')}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
