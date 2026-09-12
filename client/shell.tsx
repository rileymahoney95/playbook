import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckIcon, HistoryIcon, ListIcon, Mark, SettingsIcon } from './icons';

interface ShellValue {
  setDock: (on: boolean) => void;
  toast: (message: string, icon?: ReactNode) => void;
}
const ShellContext = createContext<ShellValue | null>(null);

const TABS = [
  {
    to: '/',
    label: 'Routines',
    icon: <ListIcon />,
    match: (p: string) => p === '/' || p.startsWith('/routines') || p.startsWith('/runs'),
  },
  {
    to: '/history',
    label: 'History',
    icon: <HistoryIcon />,
    match: (p: string) => p.startsWith('/history'),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    match: (p: string) => p.startsWith('/settings'),
  },
];
function Tabs() {
  const { pathname } = useLocation();
  return (
    <>
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="tab"
          aria-current={tab.match(pathname) ? 'page' : undefined}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </>
  );
}

/* One shell for every signed-in screen: the dome, a rail on wide screens, a
   tab bar on phones, and the toast host. The run screen swaps the tab bar for
   its dock with useDockMode(). */
export function AppShell({ children }: { children: ReactNode }) {
  const [docks, setDocks] = useState(0);
  const [toast, setToast] = useState<{ message: string; icon: ReactNode; on: boolean } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setDock = useCallback((on: boolean) => setDocks((n) => Math.max(0, n + (on ? 1 : -1))), []);
  const show = useCallback((message: string, icon?: ReactNode) => {
    clearTimeout(toastTimer.current);
    setToast({ message, icon: icon ?? <CheckIcon />, on: true });
    toastTimer.current = setTimeout(() => setToast((t) => (t ? { ...t, on: false } : t)), 1800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const value = useMemo(() => ({ setDock, toast: show }), [setDock, show]);
  const hasDock = docks > 0;
  return (
    <ShellContext.Provider value={value}>
      <div className="app">
        <aside className="rail">
          <Link to="/" className="brand">
            <Mark />
            <span>playbook</span>
          </Link>
          <nav aria-label="Primary" className="contents">
            <Tabs />
          </nav>
          <div className="rail-foot mono">BIOSPHERE · v0.1</div>
        </aside>
        <main className={hasDock ? 'stage has-dock' : 'stage'}>{children}</main>
        <nav className={hasDock ? 'tabbar is-hidden' : 'tabbar'} aria-label="Primary">
          <Tabs />
        </nav>
      </div>
      <div className={toast?.on ? 'toast is-on' : 'toast'} role="status" aria-live="polite">
        {toast?.icon}
        {toast?.message}
      </div>
    </ShellContext.Provider>
  );
}

/** Hide the tab bar and reserve room for the dock while `active`. */
export function useDockMode(active: boolean) {
  const shell = useContext(ShellContext);
  useLayoutEffect(() => {
    if (!active || !shell) return;
    shell.setDock(true);
    return () => shell.setDock(false);
  }, [active, shell]);
}
export function useToast() {
  const shell = useContext(ShellContext);
  return useCallback((message: string, icon?: ReactNode) => shell?.toast(message, icon), [shell]);
}

/** Fixed action bar for the active run. Rendered last in DOM order. */
export function Dock({
  children,
  hint,
  two,
}: {
  children: ReactNode;
  hint?: ReactNode;
  two?: boolean;
}) {
  return (
    <div className="dock">
      <div className={two ? 'inner two' : 'inner'}>
        {children}
        {hint && <span className="hint">{hint}</span>}
      </div>
    </div>
  );
}
