import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Routine, RoutineSummary } from '../shared/types';
import { api, message, useData } from './api';
import { Back, dateTime, duration, ErrorNotice, Loading, PageTitle } from './ui';

export function RoutineList() {
  const { data, loading, error, reload } = useData<RoutineSummary[]>('/api/routines');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();
  useEffect(() => { const focus = () => { void reload(); }; window.addEventListener('focus', focus); return () => window.removeEventListener('focus', focus); }, [reload]);
  const start = async (routine: RoutineSummary) => {
    if (routine.activeRunId) return navigate(`/runs/${routine.activeRunId}`);
    setBusy(routine.id); setActionError('');
    try { const run = await api<{ id: string }>(`/api/routines/${routine.id}/runs`, 'POST'); navigate(`/runs/${run.id}`); }
    catch (e) { setActionError(message(e)); } finally { setBusy(''); }
  };
  return <><PageTitle action={<Link className="button secondary" to="/routines/new">New routine</Link>}>Your routines</PageTitle><ErrorNotice retry={reload}>{error}</ErrorNotice><ErrorNotice>{actionError}</ErrorNotice>
    {loading && <Loading />}{data?.length === 0 && <div className="empty"><h2>No routines yet</h2><p className="muted">Create a checklist for something you do repeatedly.</p><Link className="button mt-5" to="/routines/new">Create a routine</Link></div>}
    <div className="grid gap-4">{data?.map(r => <article key={r.id} className="card routine-card"><div className="min-w-0"><span className="eyebrow">{r.category}</span><h2 className="mt-1"><Link to={`/routines/${r.id}`}>{r.title}</Link></h2>{r.description && <p className="muted mt-2 whitespace-pre-wrap">{r.description}</p>}<p className="muted text-sm mt-4">{r.stepCount} {r.stepCount === 1 ? 'step' : 'steps'}{r.lastCompletedAt && ` · Last completed ${dateTime(r.lastCompletedAt)}`}</p>{r.activeRunId && <p className="text-sm mt-2">In progress · {r.completedSteps} of {r.activeStepCount} done</p>}</div><div className="flex flex-wrap gap-3 items-center"><button className="button" onClick={() => start(r)} disabled={!!busy}>{busy === r.id ? 'Starting…' : r.activeRunId ? 'Resume routine' : 'Start routine'}</button><Link className="text-link text-sm" to={`/routines/${r.id}/edit`}>Edit</Link></div></article>)}</div>
  </>;
}

export function RoutineDetail() {
  const { id } = useParams();
  const { data: routine, error, loading, reload } = useData<Routine>(`/api/routines/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();
  const start = async () => {
    setBusy(true); setActionError('');
    try { const run = await api<{ id: string }>(`/api/routines/${id}/runs`, 'POST'); navigate(`/runs/${run.id}`); }
    catch (e) { setActionError(message(e)); } finally { setBusy(false); }
  };
  return <><Back /><ErrorNotice retry={reload}>{error}</ErrorNotice>{loading && <Loading />}{routine && <>
    <PageTitle action={!routine.archivedAt && <Link className="button secondary" to={`/routines/${id}/edit`}>Edit routine</Link>}>{routine.title}</PageTitle><p className="eyebrow">{routine.category} · {routine.steps.length} steps</p><p className="muted mt-3 whitespace-pre-wrap">{routine.description}</p><ErrorNotice>{actionError}</ErrorNotice>
    {routine.archivedAt ? <p className="notice mt-5">This routine is archived.</p> : <button className="button my-6" disabled={busy} onClick={start}>{busy ? 'Starting…' : routine.activeRunId ? 'Resume routine' : 'Start routine'}</button>}
    <ol className="grid gap-3">{routine.steps.map((s, index) => <li key={s.id} className="card"><h2 className="text-base">{index + 1}. {s.title}</h2><p className="muted text-sm mt-1">{[s.quantity, s.durationSeconds ? `${duration(s.durationSeconds)} timer` : ''].filter(Boolean).join(' · ')}</p>{s.instructions && <p className="mt-3 whitespace-pre-wrap">{s.instructions}</p>}{s.referenceUrl && <a className="text-link inline-block mt-3" href={s.referenceUrl} target="_blank" rel="noopener noreferrer">Open reference ↗</a>}</li>)}</ol>
  </>}</>;
}
