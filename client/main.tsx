import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { api, message } from './api';
import { RoutineEditor } from './editor';
import { Mark } from './icons';
import { RoutineList, RoutineDetail } from './routines';
import { RunPage } from './run';
import { SessionContext } from './session';
import { History, Settings } from './settings';
import { AppShell } from './shell';
import { bootTheme, ThemeProvider } from './theme';
import { Button, ErrorNotice, Loading, PageHead, Panel, TextField } from './ui';
import './styles.css';

bootTheme();

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/login', 'POST', { password });
      setPassword('');
      onLogin();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="app">
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Panel raised className="page w-full max-w-[400px] gap-5 p-6">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight">
            <Mark />
            <span>playbook</span>
          </div>
          <div className="grid gap-1.5">
            <h1 className="title-xl">Sign in</h1>
            <p className="muted">Your routines are ready when you are.</p>
          </div>
          <form onSubmit={submit} className="grid gap-4">
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={256}
              required
              autoFocus
            />
            <ErrorNotice>{error}</ErrorNotice>
            <Button type="submit" variant="primary" block busy={busy} busyLabel="Signing in…">
              Sign in
            </Button>
          </form>
        </Panel>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <PageHead title="Page not found" />
      <div>
        <Button to="/">Back to routines</Button>
      </div>
    </div>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const checkSession = async () => {
    setError('');
    try {
      await api('/api/session');
      setAuthenticated(true);
    } catch (e) {
      if ((e as { status?: number }).status === 401) setAuthenticated(false);
      else setError(message(e));
    }
  };
  useEffect(() => {
    void checkSession();
    const signedOut = () => setAuthenticated(false);
    window.addEventListener('playbook:signed-out', signedOut);
    return () => window.removeEventListener('playbook:signed-out', signedOut);
  }, []);
  if (authenticated === null)
    return (
      <div className="app">
        <main className="stage">
          <div className="page">
            {error ? <ErrorNotice retry={checkSession}>{error}</ErrorNotice> : <Loading />}
          </div>
        </main>
      </div>
    );
  if (!authenticated)
    return (
      <Login
        onLogin={() => {
          setError('');
          setAuthenticated(true);
        }}
      />
    );
  const logout = async () => {
    setLoggingOut(true);
    try {
      await api('/api/logout', 'POST');
      setAuthenticated(false);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <SessionContext.Provider value={{ logout, loggingOut }}>
      <AppShell>
        {error && (
          <div className="page pb-0">
            <ErrorNotice>{error}</ErrorNotice>
          </div>
        )}
        <Routes>
          <Route path="/" element={<RoutineList />} />
          <Route path="/routines/new" element={<RoutineEditor />} />
          <Route path="/routines/:id" element={<RoutineDetail />} />
          <Route path="/routines/:id/edit" element={<RoutineEditor />} />
          <Route path="/runs/:id" element={<RunPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </SessionContext.Provider>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
