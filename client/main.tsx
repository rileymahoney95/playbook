import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { api, message } from './api';
import { ErrorNotice, Loading } from './ui';
import { RoutineList, RoutineDetail } from './routines';
import { RoutineEditor } from './editor';
import { RunPage } from './run';
import { History, Settings } from './settings';
import './styles.css';

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/api/login', 'POST', { password }); setPassword(''); onLogin(); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };
  return <main className="login"><Link to="/" className="brand">playbook</Link><h1 className="mt-10">Sign in</h1><p className="muted mt-2">Your routines are ready when you are.</p>
    <form onSubmit={submit} className="mt-8 grid gap-5"><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={256} required autoFocus /></label><ErrorNotice>{error}</ErrorNotice><button className="button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form>
  </main>;
}
function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const checkSession = async () => {
    setError('');
    try { await api('/api/session'); setAuthenticated(true); }
    catch (e) { if ((e as { status?: number }).status === 401) setAuthenticated(false); else setError(message(e)); }
  };
  useEffect(() => {
    void checkSession();
    const signedOut = () => setAuthenticated(false);
    window.addEventListener('playbook:signed-out', signedOut);
    return () => window.removeEventListener('playbook:signed-out', signedOut);
  }, []);
  if (authenticated === null) return <main className="shell"><span className="brand">playbook</span>{error ? <ErrorNotice retry={checkSession}>{error}</ErrorNotice> : <Loading />}</main>;
  if (!authenticated) return <Login onLogin={() => { setError(''); setAuthenticated(true); }} />;
  const logout = async () => {
    setLoggingOut(true);
    try { await api('/api/logout', 'POST'); setAuthenticated(false); }
    catch (e) { setError(message(e)); }
    finally { setLoggingOut(false); }
  };
  return <><header className="app-header"><div className="shell header-inner"><Link to="/" className="brand">playbook</Link><nav aria-label="Main navigation"><NavLink to="/" end>Routines</NavLink><NavLink to="/history">History</NavLink><NavLink to="/settings">Settings</NavLink></nav><button className="text-link text-sm" onClick={logout} disabled={loggingOut}>Sign out</button></div></header>
    <main className="shell content"><ErrorNotice>{error}</ErrorNotice><Routes>
      <Route path="/" element={<RoutineList />} />
      <Route path="/routines/new" element={<RoutineEditor />} />
      <Route path="/routines/:id" element={<RoutineDetail />} />
      <Route path="/routines/:id/edit" element={<RoutineEditor />} />
      <Route path="/runs/:id" element={<RunPage />} />
      <Route path="/history" element={<History />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<><h1>Page not found</h1><Link className="text-link" to="/">Back to routines</Link></>} />
    </Routes></main></>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
