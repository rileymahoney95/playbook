import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Run, RunStep, TimerAction } from '../shared/types';
import { api, ApiError, message, useData } from './api';
import { Back, dateTime, duration, ErrorNotice, Loading, PageTitle } from './ui';

export function RunPage() {
  const { id } = useParams();
  return <RunContent key={id} id={id!} />;
}
function RunContent({ id }: { id: string }) {
  const {
    data: run,
    error,
    loading,
    reload,
    replace,
    invalidate,
  } = useData<Run>(`/api/runs/${id}`);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [now, setNow] = useState(Date.now());
  const clockOffset = useRef(0);
  const navigate = useNavigate();
  useEffect(() => {
    if (run) clockOffset.current = run.serverNow - Date.now();
  }, [run]);
  useEffect(() => {
    const refresh = () => {
      if (!busyRef.current && document.visibilityState === 'visible') void reload();
    };
    const timer = setInterval(() => setNow(Date.now()), 250);
    const sync = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      clearInterval(sync);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload]);
  const mutate = async (path: string, method: string, body?: unknown) => {
    if (busyRef.current) return;
    busyRef.current = true;
    invalidate();
    setBusy(true);
    setSaveStatus('Saving…');
    setActionError('');
    try {
      replace(await api<Run>(path, method, body));
      setSaveStatus('Saved');
    } catch (e) {
      setSaveStatus('');
      setActionError(
        e instanceof ApiError && e.status === 409
          ? 'This run changed on another device. The latest state is shown; please try again.'
          : message(e),
      );
      // Reconcile even ambiguous network failures: the server may have saved the write.
      await reload();
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  const update = (step: RunStep, input: { completed?: boolean; timerAction?: TimerAction }) =>
    mutate(`/api/runs/${id}/steps/${step.id}`, 'PATCH', { version: step.version, ...input });
  const finish = (status: 'complete' | 'discard') => {
    if (
      status === 'discard' &&
      !window.confirm('Discard this run? It will be saved in history as discarded.')
    )
      return;
    void mutate(`/api/runs/${id}/${status}`, 'POST');
  };
  const startAgain = async () => {
    if (!run) return;
    setBusy(true);
    setActionError('');
    try {
      const next = await api<{ id: string }>(`/api/routines/${run.routineId}/runs`, 'POST');
      navigate(`/runs/${next.id}`);
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const ended = run && run.status !== 'active';
  return (
    <>
      <Back to={ended ? '/history' : '/'}>{ended ? 'History' : 'Routines'}</Back>
      <ErrorNotice retry={reload}>{error}</ErrorNotice>
      {loading && <Loading />}
      {run && (
        <>
          <PageTitle>{run.title}</PageTitle>
          {ended ? (
            <div className="notice">
              <h2>{run.status === 'completed' ? 'Routine complete' : 'Run discarded'}</h2>
              <p className="text-sm mt-1">
                {dateTime(run.finishedAt!)} · {run.completedSteps} of {run.stepCount} steps done
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex justify-between gap-4 text-sm mb-2">
                <span>
                  {run.completedSteps} of {run.stepCount} steps done
                </span>
                <span role="status" className="muted">
                  {saveStatus}
                </span>
              </div>
              <progress
                value={run.completedSteps}
                max={run.stepCount}
                aria-label="Routine progress"
              />
              <p className="muted text-sm mt-2">Started {dateTime(run.startedAt)}</p>
            </div>
          )}
          {run.description && <p className="muted whitespace-pre-wrap my-5">{run.description}</p>}
          <ErrorNotice>{actionError}</ErrorNotice>
          <ol className="grid gap-3">
            {run.steps.map((step) => {
              const remaining = Math.max(
                0,
                step.timerRemainingMs -
                  (step.timerStartedAt
                    ? now + clockOffset.current - new Date(step.timerStartedAt).getTime()
                    : 0),
              );
              const running = !!step.timerStartedAt && remaining > 0;
              return (
                <li
                  key={step.id}
                  className={`card step-card ${step.completedAt ? 'step-done' : ''}`}
                >
                  <div className="flex gap-4 items-start">
                    <input
                      id={`step-${step.id}`}
                      type="checkbox"
                      className="step-check"
                      aria-label={`Complete ${step.title}`}
                      checked={!!step.completedAt}
                      disabled={busy || !!ended}
                      onChange={(e) => update(step, { completed: e.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <label className="step-label" htmlFor={`step-${step.id}`}>
                        {step.title}
                      </label>
                      {step.quantity && <p className="muted text-sm mt-1">{step.quantity}</p>}
                      {step.instructions && (
                        <p className="mt-3 whitespace-pre-wrap">{step.instructions}</p>
                      )}
                      {step.referenceUrl && (
                        <a
                          className="text-link inline-block mt-3 text-sm"
                          href={step.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open reference ↗
                        </a>
                      )}
                      {step.durationSeconds && (
                        <div className="timer">
                          <span
                            className="font-mono text-xl tabular-nums"
                            role="timer"
                            aria-label={`Timer for ${step.title}`}
                          >
                            {duration(remaining / 1000)}
                          </span>
                          {!ended && !step.completedAt && (
                            <>
                              <button
                                className="button compact secondary"
                                disabled={busy}
                                onClick={() =>
                                  update(step, { timerAction: running ? 'pause' : 'start' })
                                }
                                aria-label={`${running ? 'Pause' : 'Start'} timer for ${step.title}`}
                              >
                                {running
                                  ? 'Pause'
                                  : remaining === 0
                                    ? 'Restart timer'
                                    : 'Start timer'}
                              </button>
                              <button
                                className="text-link text-sm"
                                disabled={busy}
                                onClick={() => update(step, { timerAction: 'reset' })}
                                aria-label={`Reset timer for ${step.title}`}
                              >
                                Reset
                              </button>
                              {remaining === 0 && (
                                <span className="text-sm" role="status">
                                  Time’s up. Check the step when done.
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {!ended ? (
            <div className="mt-6">
              <div className="save-bar">
                <button
                  className="button"
                  onClick={() => finish('complete')}
                  disabled={busy || run.completedSteps !== run.stepCount}
                >
                  Finish routine
                </button>
                <Link className="button secondary" to="/">
                  Continue later
                </Link>
              </div>
              {run.completedSteps !== run.stepCount && (
                <p className="muted text-sm mt-3">
                  Check every step to finish. Progress saves as you go.
                </p>
              )}
              <button
                className="text-link text-sm text-red-700 mt-8"
                onClick={() => finish('discard')}
                disabled={busy}
              >
                Discard run
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 mt-6">
              <button className="button" disabled={busy} onClick={startAgain}>
                Start again
              </button>
              <Link className="button secondary" to="/">
                Back to routines
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
