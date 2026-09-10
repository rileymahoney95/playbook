import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const dateTime = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
export function duration(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(value / 3600);
  return hours
    ? `${hours}:${String(Math.floor((value % 3600) / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
    : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
export function ErrorNotice({ children, retry }: { children?: ReactNode; retry?: () => void }) {
  if (!children) return null;
  return (
    <div role="alert" className="notice error">
      <span>{children}</span>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <p role="status" className="muted py-8">
      Loading…
    </p>
  );
}
export function Back({ to = '/', children = 'Routines' }: { to?: string; children?: ReactNode }) {
  return (
    <Link className="text-link text-sm" to={to}>
      ← {children}
    </Link>
  );
}
export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-title">
      <h1>{children}</h1>
      {action}
    </div>
  );
}
