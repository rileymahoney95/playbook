import type { SVGProps } from 'react';

/* Icons: 1.5–2px strokes on a 24-unit grid, currentColor. Copied from the
   prototype's `I` map. All are decorative; the control that holds one names
   itself. */
type IconProps = SVGProps<SVGSVGElement>;

const Svg = ({ children, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    {children}
  </svg>
);
const stroke = (width: number): IconProps => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: width,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const CheckIcon = (p: IconProps) => (
  <Svg {...stroke(2.4)} {...p}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </Svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...stroke(2)} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...stroke(2)} {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);
export const PlayIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
  </Svg>
);
export const PauseIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </Svg>
);
export const ResetIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v5h5" />
  </Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...stroke(2)} strokeLinejoin={undefined} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} strokeLinejoin={undefined} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const ListIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth={2.6} />
  </Svg>
);
export const HistoryIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
    <path d="M3.5 3.5V8h4.5" />
    <path d="M12 8v4.5l3 1.8" />
  </Svg>
);
export const SettingsIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} strokeLinejoin={undefined} {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Svg>
);
export const EditIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.1l-1.9-1.9a1.5 1.5 0 0 0-2.1 0L4 16z" />
    <path d="M13 7l4 4" />
  </Svg>
);
export const LinkIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Svg>
);
export const SunIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} strokeLinejoin={undefined} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Svg>
);
export const MoonIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Svg>
);
export const MonitorIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} strokeLinejoin={undefined} {...p}>
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <path d="M9 20h6M12 17v3" />
  </Svg>
);
export const GripIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <circle cx="9" cy="6" r="1.4" />
    <circle cx="15" cy="6" r="1.4" />
    <circle cx="9" cy="12" r="1.4" />
    <circle cx="15" cy="12" r="1.4" />
    <circle cx="9" cy="18" r="1.4" />
    <circle cx="15" cy="18" r="1.4" />
  </Svg>
);
export const MoreIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />
  </Svg>
);
export const UndoIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M9 14l-4-4 4-4" />
    <path d="M5 10h9a5 5 0 0 1 0 10h-3" />
  </Svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...stroke(2)} {...p}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...stroke(2)} {...p}>
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

/* category glyphs */
export const MobilityIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <circle cx="12" cy="4.5" r="1.8" />
    <path d="M8 20l3-6 3 2 2 4" />
    <path d="M6 12l4-2 3 1 4-3" />
  </Svg>
);
export const WorkoutIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M3 10v4M6 8v8M18 8v8M21 10v4" />
    <path d="M6 12h12" />
  </Svg>
);
export const BabyIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M9 3h6" />
    <path d="M10 3v3M14 3v3" />
    <path d="M8 8h8l1 12H7z" />
    <path d="M8 13h8" />
  </Svg>
);
export const MaintenanceIcon = (p: IconProps) => (
  <Svg {...stroke(1.8)} {...p}>
    <path d="M14.5 5.5a4 4 0 0 0-5 5L4 16v4h4l5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2-2z" />
  </Svg>
);
export function CategoryIcon({ category, ...p }: IconProps & { category: string }) {
  switch (category.trim().toLowerCase()) {
    case 'mobility':
      return <MobilityIcon {...p} />;
    case 'workout':
      return <WorkoutIcon {...p} />;
    case 'baby care':
      return <BabyIcon {...p} />;
    case 'maintenance':
      return <MaintenanceIcon {...p} />;
    default:
      return <ListIcon {...p} />;
  }
}

/* Brand mark: a sealed ring with a living pulse inside */
export const Mark = (p: IconProps) => (
  <svg className="mark" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity=".55" />
    <circle cx="12" cy="12" r="3.2" fill="var(--color-accent)" />
    <path
      d="M12 3v3M12 18v3M3 12h3M18 12h3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity=".55"
    />
  </svg>
);
