import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { CheckIcon } from './icons';

/* ---------------------------------------------------------------------
   Formatting helpers. Every number that changes while you watch it is
   monospaced and tabular; these return the strings those readouts show.
   --------------------------------------------------------------------- */
export const pad2 = (n: number) => String(n).padStart(2, '0');
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
    ? `${hours}:${pad2(Math.floor((value % 3600) / 60))}:${pad2(value % 60)}`
    : `${Math.floor(value / 60)}:${pad2(value % 60)}`;
}
/** `HH:MM`, 24-hour, local time. */
export function clock(date: string | number | Date) {
  const d = new Date(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
/** `Sat 12 Sep` with the device locale's weekday and month abbreviations. */
export function dayMonth(date: string | number | Date) {
  const parts = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(new Date(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')} ${part('month')}`.trim();
}
/** "Today", "Yesterday", or `Wed 10 Sep`. */
export function dayLabel(date: string | number | Date, now = new Date()) {
  const d = new Date(date);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return dayMonth(d);
}
export function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------------------------------------------------------------------
   Buttons
   --------------------------------------------------------------------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger-ghost';
type Size = 'md' | 'sm' | 'dock';
interface ButtonStyle {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
  busy?: boolean;
  busyLabel?: ReactNode;
  className?: string;
  children?: ReactNode;
}
type ButtonAsLink = ButtonStyle & { to: LinkProps['to'] } & Omit<
    LinkProps,
    'to' | 'className' | 'children'
  >;
type ButtonAsButton = ButtonStyle & { to?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'children'
  >;
export type ButtonProps = ButtonAsLink | ButtonAsButton;

function buttonClass({ variant = 'secondary', size = 'md', block, className }: ButtonStyle) {
  return cx(
    'btn',
    variant === 'primary' && 'primary',
    variant === 'ghost' && 'ghost',
    variant === 'danger-ghost' && 'ghost danger',
    size === 'sm' && 'sm',
    size === 'dock' && 'dock-size',
    block && 'full',
    className,
  );
}
function stripStyle<T extends ButtonStyle>(props: T) {
  const {
    variant: _v,
    size: _s,
    block: _b,
    icon: _i,
    busy: _y,
    busyLabel: _l,
    className: _c,
    children: _ch,
    ...rest
  } = props;
  return rest;
}
export function Button(props: ButtonProps) {
  const { icon, busy, busyLabel, children } = props;
  const cls = buttonClass(props);
  const content = (
    <>
      {!busy && icon}
      {busy ? (busyLabel ?? children) : children}
    </>
  );
  if (props.to !== undefined) {
    const { to, ...link } = stripStyle(props);
    return (
      <Link to={to} className={cls} {...link}>
        {content}
      </Link>
    );
  }
  const { to: _t, type = 'button', disabled, ...button } = stripStyle(props);
  return (
    <button type={type} className={cls} disabled={disabled || busy} {...button}>
      {content}
    </button>
  );
}
type IconButtonProps = { label: string; size?: 'md' | 'sm'; className?: string } & (
  | ({ to: LinkProps['to'] } & Omit<LinkProps, 'to' | 'className' | 'aria-label'>)
  | ({ to?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'aria-label'>)
);
export function IconButton(props: IconButtonProps) {
  const { label, size = 'md', className, ...rest } = props;
  const cls = cx('btn ghost icon', size === 'sm' && 'sm', className);
  if (rest.to !== undefined) {
    const { to, ...link } = rest;
    return <Link to={to} className={cls} aria-label={label} {...link} />;
  }
  const { to: _t, type = 'button', ...button } = rest;
  return <button type={type} className={cls} aria-label={label} {...button} />;
}

/* ---------------------------------------------------------------------
   Surfaces and type roles
   --------------------------------------------------------------------- */
type PanelTag = 'div' | 'section' | 'article' | 'li' | 'fieldset';
export function Panel({
  raised,
  as: Tag = 'div',
  className,
  ...rest
}: { raised?: boolean; as?: PanelTag; className?: string } & Omit<
  HTMLAttributes<HTMLElement>,
  'className'
>) {
  return <Tag className={cx('panel', raised && 'raised', className)} {...rest} />;
}
export function Eyebrow({
  live,
  as: Tag = 'span',
  className,
  children,
}: {
  live?: boolean;
  as?: 'span' | 'p' | 'h2';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cx('eyebrow', live && 'is-live', className)}>
      {live && <span className="dot" aria-hidden="true" />}
      {children}
    </Tag>
  );
}
export function PageHead({
  back,
  eyebrow,
  title,
  titleClass = 'title-xl',
  action,
}: {
  back?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  titleClass?: string;
  action?: ReactNode;
}) {
  return (
    <header className={cx('page-head', !!back && 'items-center')}>
      {back}
      <div className={cx('stack', !!back && 'flex-1')}>
        {eyebrow}
        <h1 className={titleClass}>{title}</h1>
      </div>
      {action}
    </header>
  );
}
export function SectionHead({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {meta !== undefined && <span className="small faint mono">{meta}</span>}
    </div>
  );
}
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'ok' | 'off' | 'neutral';
  children: ReactNode;
}) {
  return <span className={cx('badge', tone !== 'neutral' && tone)}>{children}</span>;
}
export function Chip({
  pressed,
  children,
  onClick,
}: {
  pressed: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}
export function SegControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

/* ---------------------------------------------------------------------
   Fields
   --------------------------------------------------------------------- */
export function Field({
  id,
  label,
  optional,
  children,
}: {
  id: string;
  label: ReactNode;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional"> optional</span>}
      </label>
      {children}
    </div>
  );
}
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('input', className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('input', className)} {...rest} />;
}
export function TextField({
  label,
  optional,
  id,
  ...input
}: { label: ReactNode; optional?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field id={fieldId} label={label} optional={optional}>
      <Input id={fieldId} {...input} />
    </Field>
  );
}
export function TextAreaField({
  label,
  optional,
  id,
  ...input
}: { label: ReactNode; optional?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field id={fieldId} label={label} optional={optional}>
      <Textarea id={fieldId} {...input} />
    </Field>
  );
}

/* ---------------------------------------------------------------------
   Feedback
   --------------------------------------------------------------------- */
export function ErrorNotice({ children, retry }: { children?: ReactNode; retry?: () => void }) {
  if (!children) return null;
  return (
    <div role="alert" className="notice-error">
      <span>{children}</span>
      {retry && (
        <Button size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <p role="status" className="muted small py-6">
      Loading…
    </p>
  );
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2 className="title-md">{title}</h2>
      {children && <p className="muted small">{children}</p>}
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}
export function SaveState({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  const label = state === 'saving' ? 'Saving' : state === 'error' ? 'Not saved' : 'Saved';
  return (
    <span className={cx('save-state', state !== 'idle' && `is-${state}`)} aria-live="polite">
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/* ---------------------------------------------------------------------
   Progress and checks
   --------------------------------------------------------------------- */
export function Segments({
  total,
  done,
  current,
  fill = 0,
}: {
  total: number;
  done: boolean[];
  current?: number;
  fill?: number;
}) {
  const count = done.filter(Boolean).length;
  return (
    <div className="segments" role="img" aria-label={`${count} of ${total} steps complete`}>
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = !done[i] && i === current;
        return (
          <i
            key={i}
            className={cx(done[i] && 'done', isCurrent && 'current')}
            style={
              isCurrent
                ? ({
                    '--fill': `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%`,
                  } as CSSProperties)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
export function Check({
  id,
  checked,
  current,
  disabled,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  current?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const [pop, setPop] = useState(false);
  const was = useRef(checked);
  useEffect(() => {
    const became = checked && !was.current;
    was.current = checked;
    if (!became) return;
    setPop(true);
    const timer = setTimeout(() => setPop(false), 420);
    return () => clearTimeout(timer);
  }, [checked]);
  return (
    <span className="check-wrap">
      <input
        id={id}
        type="checkbox"
        className="check-input"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className={cx('check', current && 'is-current', pop && 'just-done')}>
        <CheckIcon />
      </label>
    </span>
  );
}

/** A ticking clock for readouts that change while you watch them. */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
