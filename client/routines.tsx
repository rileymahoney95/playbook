import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Routine, RoutineSummary, Run } from '../shared/types';
import { api, message, useData } from './api';
import { CategoryIcon, ChevronLeftIcon, ClockIcon, LinkIcon, PlayIcon, PlusIcon } from './icons';
import {
  Badge,
  Button,
  Chip,
  clock,
  dayLabel,
  dayMonth,
  duration,
  EmptyState,
  ErrorNotice,
  Eyebrow,
  hostname,
  IconButton,
  pad2,
  PageHead,
  Panel,
  plural,
  SectionHead,
  Segments,
  Skeleton,
  useNow,
} from './ui';

/* ---------------------------------------------------------------------
   Library
   --------------------------------------------------------------------- */
export function RoutineList() {
  const { data, loading, error, reload } = useData<RoutineSummary[]>('/api/routines');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();
  const now = useNow(1000);
  useEffect(() => {
    const focus = () => {
      void reload();
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [reload]);
  const start = async (routine: RoutineSummary) => {
    if (busy) return;
    if (routine.activeRunId) return navigate(`/runs/${routine.activeRunId}`);
    setBusy(routine.id);
    setActionError('');
    try {
      const run = await api<{ id: string }>(`/api/routines/${routine.id}/runs`, 'POST');
      navigate(`/runs/${run.id}`);
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy('');
    }
  };
  const routines = data ?? [];
  const categories = ['All', ...new Set(routines.map((r) => r.category))];
  const selected = categories.includes(filter) ? filter : 'All';
  const active = routines.filter((r) => r.activeRunId);
  const shown = routines.filter((r) => selected === 'All' || r.category === selected);
  return (
    <div className="page">
      <PageHead
        eyebrow={
          <Eyebrow>
            {dayMonth(now)} · {clock(now)}
          </Eyebrow>
        }
        title="Routines"
        action={
          <Button to="/routines/new" icon={<PlusIcon />} aria-label="New routine">
            New
          </Button>
        }
      />
      <ErrorNotice retry={reload}>{error}</ErrorNotice>
      <ErrorNotice>{actionError}</ErrorNotice>
      {active.map((r) => (
        <ResumeCard
          key={r.id}
          routine={r}
          now={now}
          busy={busy === r.id}
          onResume={() => start(r)}
        />
      ))}
      {loading && <Skeleton rows={3} />}
      {data && routines.length === 0 && (
        <EmptyState
          title="No routines yet"
          action={
            <Button variant="primary" to="/routines/new">
              Create a routine
            </Button>
          }
        >
          Create a checklist for something you do repeatedly.
        </EmptyState>
      )}
      {routines.length > 0 && (
        <>
          <div className="chips" role="group" aria-label="Filter by category">
            {categories.map((c) => (
              <Chip key={c} pressed={selected === c} onClick={() => setFilter(c)}>
                {c}
              </Chip>
            ))}
          </div>
          <section className="grid gap-3">
            <SectionHead
              title={selected === 'All' ? 'All routines' : selected}
              meta={`${shown.length} of ${routines.length}`}
            />
            <div className="routine-list">
              {shown.map((r) => (
                <RoutineRow key={r.id} routine={r} busy={busy === r.id} onStart={() => start(r)} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ResumeCard({
  routine,
  now,
  busy,
  onResume,
}: {
  routine: RoutineSummary;
  now: number;
  busy: boolean;
  onResume: () => void;
}) {
  const { data: run } = useData<Run>(`/api/runs/${routine.activeRunId}`);
  const total = run ? run.steps.length : routine.activeStepCount;
  const doneFlags = run
    ? run.steps.map((s) => !!s.completedAt)
    : Array.from({ length: total }, (_, i) => i < routine.completedSteps);
  const done = doneFlags.filter(Boolean).length;
  const currentIndex = doneFlags.indexOf(false);
  const next = run?.steps.find((s) => !s.completedAt);
  return (
    <Panel as="section" raised className="resume-card">
      <div className="meta">
        <Eyebrow live>In progress · {routine.category}</Eyebrow>
        <span className="mono small faint">{run ? `started ${clock(run.startedAt)}` : ' '}</span>
      </div>
      <h2 className="title-lg">{routine.title}</h2>
      <div className="progress">
        <Segments
          total={total}
          done={doneFlags}
          current={currentIndex >= 0 ? currentIndex : undefined}
        />
        <div className="row">
          <span className="count">
            <b>{done}</b> of {total} complete
          </span>
          <span className="count">
            {run ? `${duration((now - new Date(run.startedAt).getTime()) / 1000)} elapsed` : ' '}
          </span>
        </div>
      </div>
      <div className="next">
        <span className="k">Next</span>
        <span className="v">{next ? next.title : run ? 'All steps checked' : ' '}</span>
        {next?.durationSeconds ? (
          <span className="t mono">
            <ClockIcon />
            {duration(next.durationSeconds)}
          </span>
        ) : next?.quantity ? (
          <span className="t">{next.quantity}</span>
        ) : null}
      </div>
      <Button
        variant="primary"
        block
        icon={<PlayIcon />}
        onClick={onResume}
        busy={busy}
        busyLabel="Opening…"
      >
        Resume routine
      </Button>
    </Panel>
  );
}

function MiniBar({ total, done }: { total: number; done: number }) {
  const filled = total > 0 ? Math.round((done / total) * 6) : 0;
  return (
    <span className="mini-bar" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} className={i < filled ? 'done' : undefined} />
      ))}
    </span>
  );
}
function RoutineRow({
  routine,
  busy,
  onStart,
}: {
  routine: RoutineSummary;
  busy: boolean;
  onStart: () => void;
}) {
  const active = !!routine.activeRunId;
  const last = routine.lastCompletedAt ? dayLabel(routine.lastCompletedAt) : null;
  return (
    <Panel className={active ? 'routine-row is-active' : 'routine-row'} onClick={onStart}>
      <span className="glyph">
        <CategoryIcon category={routine.category} />
      </span>
      <span className="body">
        <span className="t">{routine.title}</span>
        <span className="s">
          <b>{routine.category}</b>
          <span className="sep">·</span>
          {plural(routine.stepCount, 'step')}
          {active ? (
            <>
              <span className="sep">·</span>
              <MiniBar total={routine.activeStepCount} done={routine.completedSteps} />
            </>
          ) : (
            last && (
              <>
                <span className="sep">·</span>
                {last}
              </>
            )
          )}
        </span>
      </span>
      <span className="cta">
        <Button
          size="sm"
          variant={active ? 'primary' : 'secondary'}
          busy={busy}
          busyLabel="Starting…"
        >
          {active ? 'Resume' : 'Start'}
        </Button>
      </span>
    </Panel>
  );
}

/* ---------------------------------------------------------------------
   Routine detail: a read-only preview in the editor's row style
   --------------------------------------------------------------------- */
export function RoutineDetail() {
  const { id } = useParams();
  const { data: routine, error, loading, reload } = useData<Routine>(`/api/routines/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();
  const start = async () => {
    if (routine?.activeRunId) return navigate(`/runs/${routine.activeRunId}`);
    setBusy(true);
    setActionError('');
    try {
      const run = await api<{ id: string }>(`/api/routines/${id}/runs`, 'POST');
      navigate(`/runs/${run.id}`);
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy(false);
    }
  };
  if (!routine)
    return (
      <div className="page">
        <ErrorNotice retry={reload}>{error}</ErrorNotice>
        {loading && <Skeleton rows={3} />}
      </div>
    );
  const steps = routine.steps;
  return (
    <div className="page">
      <PageHead
        back={
          <IconButton label="Back to routines" to="/">
            <ChevronLeftIcon />
          </IconButton>
        }
        eyebrow={
          <Eyebrow>
            {routine.category} · {plural(steps.length, 'step')}
          </Eyebrow>
        }
        title={routine.title}
        titleClass="title-lg"
        action={
          !routine.archivedAt && (
            <Button size="sm" to={`/routines/${id}/edit`}>
              Edit routine
            </Button>
          )
        }
      />
      {routine.description && <p className="muted whitespace-pre-wrap">{routine.description}</p>}
      <ErrorNotice retry={reload}>{error}</ErrorNotice>
      <ErrorNotice>{actionError}</ErrorNotice>
      {routine.archivedAt ? (
        <div>
          <Badge tone="off">Archived</Badge>
        </div>
      ) : (
        <Button
          variant="primary"
          block
          className="sm:w-auto sm:self-start"
          icon={<PlayIcon />}
          onClick={start}
          busy={busy}
          busyLabel="Starting…"
        >
          {routine.activeRunId ? 'Resume routine' : 'Start routine'}
        </Button>
      )}
      <section className="grid gap-2">
        <SectionHead title="Steps" meta={plural(steps.length, 'step')} />
        <ol className="m-0 grid list-none gap-2 p-0">
          {steps.map((step, index) => {
            const meta = [
              step.quantity,
              step.durationSeconds ? `${duration(step.durationSeconds)} timer` : '',
              step.referenceUrl ? 'link' : '',
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <Panel as="li" key={step.id} className="edit-row no-grip">
                <span className="idx">{pad2(index + 1)}</span>
                <span className="body">
                  <span className="t">{step.title}</span>
                  {meta && <span className="s">{meta}</span>}
                  {step.instructions && <p className="instructions">{step.instructions}</p>}
                  {step.referenceUrl && (
                    <a
                      className="ref inline-flex items-center gap-1.5 self-start pt-1 text-sm text-accent no-underline"
                      href={step.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {hostname(step.referenceUrl)}
                    </a>
                  )}
                </span>
              </Panel>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
