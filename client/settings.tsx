import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { RunSummary } from '../shared/types';
import { api, message, useData } from './api';
import { dateTime, ErrorNotice, Loading, PageTitle } from './ui';

export function History() {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useData<{ items: RunSummary[]; hasMore: boolean }>(`/api/history?offset=${page * 25}`);
  return <><PageTitle>History</PageTitle><ErrorNotice retry={reload}>{error}</ErrorNotice>{loading && <Loading />}
    {data?.items.length === 0 && <div className="empty"><h2>No saved runs yet</h2><p className="muted mt-2">Completed and discarded runs will appear here.</p><Link className="button mt-5" to="/">Open routines</Link></div>}
    <div className="grid gap-3">{data?.items.map(run => <Link className="card history-row" key={run.id} to={`/runs/${run.id}`}><div className="min-w-0"><h2 className="text-base">{run.title}</h2><p className="muted text-sm mt-1">{dateTime(run.finishedAt!)} · {run.completedSteps} of {run.stepCount} steps</p></div><span className={`badge ${run.status === 'completed' ? 'completed' : ''}`}>{run.status === 'completed' ? 'Completed' : 'Discarded'}</span></Link>)}</div>
    {(page > 0 || data?.hasMore) && <div className="flex justify-between items-center mt-6 gap-3"><button className="button secondary" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Newer</button><span className="muted text-sm">Page {page + 1}</span><button className="button secondary" disabled={!data?.hasMore || loading} onClick={() => setPage(p => p + 1)}>Older</button></div>}
  </>;
}

export function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const save = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    setBusy(true);
    try {
      await api('/api/password', 'POST', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setSuccess('Password changed. Other devices have been signed out.');
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  return <><PageTitle>Settings</PageTitle><section className="max-w-lg"><h2>Change password</h2><p className="muted mt-2 mb-6">Use at least 12 characters. You’ll stay signed in on this device.</p>
    <form className="grid gap-5" onSubmit={save}><fieldset disabled={busy} className="grid gap-5"><label>Current password<input type="password" autoComplete="current-password" required maxLength={256} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label><label>New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label><label>Confirm new password<input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label></fieldset><ErrorNotice>{error}</ErrorNotice>{success && <p className="notice" role="status">{success}</p>}<button className="button justify-self-start" disabled={busy}>{busy ? 'Updating…' : 'Change password'}</button></form>
  </section></>;
}
