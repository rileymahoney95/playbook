import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Run, RunStep, TimerAction } from '../../shared/types';
import { api, ApiError, message, useData } from '../api';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, MoreIcon, UndoIcon } from '../icons';
import { Dock, useDockMode, useToast } from '../shell';
import {
  Button,
  duration,
  ErrorNotice,
  Eyebrow,
  IconButton,
  SaveState,
  Segments,
  Skeleton,
} from '../ui';
import { CompleteState } from './complete';
import { remainingMs, StepCard } from './step';

export function RunPage() {
  const { id } = useParams();
  return <RunContent key={id} id={id!} />;
}

type Save = 'idle' | 'saving' | 'saved' | 'error';

/* "Current" is local UI state: which step is open. It survives a reload
   through sessionStorage so the page lands on the same step. */
const currentKey = (id: string) => `pb-run-current:${id}`;
const readCurrent = (id: string) => {
  try {
    const value = sessionStorage.getItem(currentKey(id));
    const index = value === null ? NaN : Number(value);
    return Number.isInteger(index) && index >= 0 ? index : null;
  } catch {
    return null;
  }
};
const writeCurrent = (id: string, index: number) => {
  try {
    sessionStorage.setItem(currentKey(id), String(index));
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
};
/** First unchecked step after `after`, else the first unchecked overall, else -1. */
const nextUnchecked = (steps: RunStep[], after = -1) => {
  const later = steps.findIndex((s, i) => i > after && !s.completedAt);
  return later >= 0 ? later : steps.findIndex((s) => !s.completedAt);
};

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
  const [save, setSave] = useState<Save>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const clockOffset = useRef(0);
  const stored = useMemo(() => readCurrent(id), [id]);
  const [chosen, setChosen] = useState<number | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const active = !!run && run.status === 'active';
  const ended = !!run && !active;
  useDockMode(loading || active);

  useEffect(() => {
    if (run) clockOffset.current = run.serverNow - Date.now();
  }, [run]);
  useEffect(() => {
    const refresh = () => {
      if (!busyRef.current && document.visibilityState === 'visible') void reload();
    };
    const sync = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(sync);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload]);
  // One tick drives every visible timer and the elapsed readout.
  useEffect(() => {
    if (ended) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [ended]);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const mutate = useCallback(
    async (path: string, method: string, body?: unknown): Promise<Run | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      invalidate();
      setBusy(true);
      setActionError('');
      clearTimeout(savedTimer.current);
      setSave('saving');
      try {
        const next = await api<Run>(path, method, body);
        replace(next);
        setSave('saved');
        savedTimer.current = setTimeout(() => setSave('idle'), 2200);
        return next;
      } catch (e) {
        setSave('error');
        setActionError(
          e instanceof ApiError && e.status === 409
            ? 'This run changed on another device. The latest state is shown; please try again.'
            : message(e),
        );
        // Reconcile even ambiguous network failures: the server may have saved the write.
        await reload();
        return null;
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [invalidate, replace, reload],
  );
  const setCurrent = useCallback(
    (index: number) => {
      setChosen(index);
      writeCurrent(id, index);
    },
    [id],
  );
  const check = useCallback(
    async (step: RunStep, completed: boolean) => {
      const next = await mutate(`/api/runs/${id}/steps/${step.id}`, 'PATCH', {
        version: step.version,
        completed,
      });
      if (!next) return;
      const index = next.steps.findIndex((s) => s.id === step.id);
      if (!completed) return setCurrent(index);
      const following = nextUnchecked(next.steps, index);
      setCurrent(following >= 0 ? following : index);
    },
    [id, mutate, setCurrent],
  );
  const timer = useCallback(
    (step: RunStep, action: TimerAction) => {
      void mutate(`/api/runs/${id}/steps/${step.id}`, 'PATCH', {
        version: step.version,
        timerAction: action,
      });
    },
    [id, mutate],
  );
  const finish = async (status: 'complete' | 'discard') => {
    if (
      status === 'discard' &&
      !window.confirm('Discard this run? It will be saved in history as discarded.')
    )
      return;
    const next = await mutate(`/api/runs/${id}/${status}`, 'POST');
    if (next && status === 'complete') toast('Saved to history');
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

  if (!run)
    return (
      <div className="page">
        <ErrorNotice retry={reload}>{error}</ErrorNotice>
        {loading && <Skeleton rows={4} />}
      </div>
    );
  if (ended)
    return <CompleteState run={run} busy={busy} error={actionError} onStartAgain={startAgain} />;

  const serverNow = now + clockOffset.current;
  const steps = run.steps;
  const total = steps.length;
  const doneFlags = steps.map((s) => !!s.completedAt);
  const done = doneFlags.filter(Boolean).length;
  const allDone = total > 0 && done === total;
  const firstOpen = nextUnchecked(steps);
  const current =
    chosen !== null && chosen < total
      ? chosen
      : stored !== null && stored < total
        ? stored
        : firstOpen >= 0
          ? firstOpen
          : Math.max(0, total - 1);
  const cur = steps[current];
  const curRemaining = cur?.durationSeconds ? remainingMs(cur, serverNow) : 0;
  const fill =
    cur?.durationSeconds && !cur.completedAt ? 1 - curRemaining / (cur.durationSeconds * 1000) : 0;
  const elapsed = duration((serverNow - new Date(run.startedAt).getTime()) / 1000);
  const dock = allDone ? (
    <Dock hint={`All ${total} steps checked · ${elapsed} elapsed`}>
      <Button
        variant="primary"
        size="dock"
        icon={<CheckIcon />}
        onClick={() => finish('complete')}
        disabled={busy}
      >
        Finish routine
      </Button>
    </Dock>
  ) : cur?.completedAt ? (
    <Dock two>
      <Button size="dock" icon={<UndoIcon />} onClick={() => check(cur, false)} disabled={busy}>
        Undo
      </Button>
      <Button
        variant="primary"
        size="dock"
        onClick={() => setCurrent(Math.max(0, firstOpen))}
        disabled={busy}
      >
        Next step
        <ChevronRightIcon />
      </Button>
    </Dock>
  ) : cur ? (
    <Dock hint={`Step ${current + 1} of ${total} · ${cur.title}`}>
      <Button
        variant="primary"
        size="dock"
        icon={<CheckIcon />}
        onClick={() => check(cur, true)}
        disabled={busy}
      >
        Mark complete
      </Button>
    </Dock>
  ) : null;

  return (
    <>
      <div className="page pt-0 gap-0">
        <header className="run-head">
          <div className="bar">
            <IconButton label="Back to routines" to="/">
              <ChevronLeftIcon />
            </IconButton>
            <div className="titles">
              <Eyebrow>{run.category}</Eyebrow>
              <h1 className="t">{run.title}</h1>
            </div>
            <SaveState state={save} />
            <IconButton label="Edit routine" to={`/routines/${run.routineId}/edit`}>
              <MoreIcon />
            </IconButton>
          </div>
          <div className="progress">
            <Segments total={total} done={doneFlags} current={current} fill={fill} />
            <div className="row">
              <span className="count">
                <b>{done}</b> of {total} complete
              </span>
              <span className="count">{elapsed}</span>
            </div>
          </div>
        </header>
        {(error || actionError) && (
          <div className="grid gap-2 pt-3">
            <ErrorNotice retry={reload}>{error}</ErrorNotice>
            <ErrorNotice>{actionError}</ErrorNotice>
          </div>
        )}
        <div className="steps">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              current={index === current}
              disabled={busy}
              ended={false}
              remaining={step.durationSeconds ? remainingMs(step, serverNow) : 0}
              onFocus={setCurrent}
              onCheck={check}
              onTimer={timer}
            />
          ))}
        </div>
        <p className="small faint px-1 pt-5 text-center">
          Tap any step to open it. Tap a check to undo it.
        </p>
        <div className="flex justify-center pt-2">
          <Button
            variant="danger-ghost"
            size="sm"
            onClick={() => finish('discard')}
            disabled={busy}
          >
            Discard run
          </Button>
        </div>
      </div>
      {dock}
    </>
  );
}
