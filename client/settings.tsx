import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { RunSummary } from '../shared/types';
import { api, message, useData } from './api';
import { MonitorIcon, MoonIcon, SunIcon } from './icons';
import { useSession } from './session';
import { useReduceMotion, useTheme } from './theme';
import {
  Badge,
  Button,
  clock,
  dayLabel,
  duration,
  EmptyState,
  ErrorNotice,
  Eyebrow,
  PageHead,
  Panel,
  plural,
  SectionHead,
  SegControl,
  Skeleton,
  Switch,
  TextField,
} from './ui';

/* ---------------------------------------------------------------------
   History: saved runs grouped by day
   --------------------------------------------------------------------- */
export function History() {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useData<{ items: RunSummary[]; hasMore: boolean }>(
    `/api/history?offset=${page * 25}`,
  );
  const groups = useMemo(() => {
    const out: { day: string; items: RunSummary[] }[] = [];
    for (const run of data?.items ?? []) {
      const day = dayLabel(run.finishedAt ?? run.startedAt);
      const group = out.find((g) => g.day === day);
      if (group) group.items.push(run);
      else out.push({ day, items: [run] });
    }
    return out;
  }, [data]);
  return (
    <div className="page">
      <PageHead
        eyebrow={
          <Eyebrow>{data ? `Last ${plural(data.items.length, 'run')}` : 'Saved runs'}</Eyebrow>
        }
        title="History"
      />
      <ErrorNotice retry={reload}>{error}</ErrorNotice>
      {loading && <Skeleton rows={3} />}
      {data?.items.length === 0 && (
        <EmptyState
          title="No saved runs yet"
          action={
            <Button variant="primary" to="/">
              Open routines
            </Button>
          }
        >
          Completed and discarded runs will appear here.
        </EmptyState>
      )}
      {groups.map((group) => (
        <section key={group.day} className="grid gap-2">
          <div className="day-label">{group.day}</div>
          <div className="list">
            {group.items.map((run) => (
              <Link key={run.id} to={`/runs/${run.id}`} className="panel list-row">
                <span className="min-w-0">
                  <h2 className="t">{run.title}</h2>
                  <span className="s block">
                    {run.category} · {clock(run.finishedAt ?? run.startedAt)} · {run.completedSteps}{' '}
                    / {run.stepCount} steps
                  </span>
                </span>
                <span className="r">
                  {run.status === 'completed' ? (
                    <span className="mono">
                      {duration(
                        (new Date(run.finishedAt ?? run.startedAt).getTime() -
                          new Date(run.startedAt).getTime()) /
                          1000,
                      )}
                    </span>
                  ) : (
                    <Badge tone="off">Discarded</Badge>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {(page > 0 || data?.hasMore) && (
        <div className="flex items-center justify-between gap-3">
          <Button disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="small faint mono">Page {page + 1}</span>
          <Button disabled={!data?.hasMore || loading} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   Settings: appearance, motion, account
   --------------------------------------------------------------------- */
const SWATCHES = ['ground', 'surface-1', 'surface-2', 'surface-3', 'accent', 'text'];

export function Settings() {
  const [theme, setTheme] = useTheme();
  const [reduceMotion, setReduceMotion] = useReduceMotion();
  const { logout, loggingOut } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/password', 'POST', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed. Other devices have been signed out.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <PageHead eyebrow={<Eyebrow>Private · one owner</Eyebrow>} title="Settings" />
      <section className="setting-group">
        <SectionHead title="Appearance" />
        <Panel className="setting">
          <div className="head">
            <div>
              <div className="t">Theme</div>
              <div className="s">Biosphere · the only theme for now. More can be added later.</div>
            </div>
          </div>
          <SegControl
            label="Appearance"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light', icon: <SunIcon /> },
              { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
              { value: 'system', label: 'System', icon: <MonitorIcon /> },
            ]}
          />
          <div className="swatches" aria-hidden="true">
            {SWATCHES.map((token) => (
              <span
                key={token}
                className="swatch"
                style={{ background: `var(--color-${token})` }}
              />
            ))}
          </div>
        </Panel>
        <Panel className="setting">
          <div className="head">
            <div>
              <div className="t">Reduce motion</div>
              <div className="s">
                Follows your device setting. Turn on to remove transitions here too.
              </div>
            </div>
            <Switch checked={reduceMotion} onChange={setReduceMotion} label="Reduce motion" />
          </div>
        </Panel>
      </section>
      <section className="setting-group">
        <SectionHead title="Account" />
        <Panel className="setting">
          <form className="grid gap-3" onSubmit={save}>
            <div>
              <div className="t font-semibold">Change password</div>
              <div className="s small faint">
                Use at least 12 characters. You’ll stay signed in on this device.
              </div>
            </div>
            <fieldset disabled={busy} className="m-0 grid min-w-0 gap-3 border-0 p-0">
              <TextField
                label="Current password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <TextField
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={256}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <TextField
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={256}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </fieldset>
            <ErrorNotice>{error}</ErrorNotice>
            {success && (
              <p className="small muted" role="status">
                {success}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" busy={busy} busyLabel="Updating…">
                Change password
              </Button>
            </div>
          </form>
        </Panel>
        <Panel className="setting">
          <div className="head">
            <div>
              <div className="t">Sign out</div>
              <div className="s">Ends this session on this device only.</div>
            </div>
            <Button size="sm" variant="danger-ghost" onClick={logout} disabled={loggingOut}>
              Sign out
            </Button>
          </div>
        </Panel>
      </section>
    </div>
  );
}
