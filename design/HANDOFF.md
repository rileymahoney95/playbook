# Handoff: implement the Biosphere design in the Playbook client

This brief is written for a coding agent. It is self-contained: read it, then
[`DESIGN.md`](../DESIGN.md) and [`design/prototype.html`](prototype.html), and
you have everything needed to ship the redesign without asking questions.

## Paste-ready prompt

```
Implement the Biosphere design for Playbook's React + Tailwind v4 client by
following design/HANDOFF.md exactly. The prototype at design/prototype.html and
the token spec in DESIGN.md are the source of truth for look, motion and copy;
HANDOFF.md is the source of truth for scope, data wiring and test contracts.
Change only client/, index.html, tests/browser/routine.spec.ts, and package
files for the two font packages. Do not touch server/, shared/, drizzle/, or
tests/api.test.ts. Work in the order listed in "Suggested order of work".
Done means: bun run typecheck, bun run build, and bun run test:e2e (desktop and
mobile projects) all pass, both themes render without console errors, and you
have taken screenshots of the library and run screens in light and dark at 390px
and 1280px and compared them against design/screens/.
```

## 1. Outcome and scope

**Outcome.** The existing app keeps every behavior it has today (login, list,
detail, editor, run with persisted checks and timers, history, settings,
password change, sign out, archive) and gains the Biosphere visual system:
tokens, light/dark/system appearance, the new shell, and the redesigned
screens in `design/prototype.html`.

**In scope**

- `client/**` (all screens, styles, new components)
- `index.html` (fonts, theme boot script, theme-color)
- `tests/browser/routine.spec.ts` (only the selector and copy changes listed in §11)
- `package.json` / `bun.lock` (font packages only)
- `README.md`: replace the sentence "The interface is intentionally plain." with one line pointing to `DESIGN.md`.

**Out of scope, do not change**

- `server/**`, `shared/**`, `drizzle/**`, `tests/api.test.ts`, the API contract in `docs/architecture.md`
- Data semantics: one active run per routine, explicit completion, snapshot
  boundary, optimistic versions, 409 handling, 5 s polling, focus refresh
- No new dependencies beyond the two font packages. Icons are inline SVG copied
  from the prototype. No animation library, no component library.

**Why these limits.** The product doc promised a design overhaul that stays
inside `client/`. Everything the screens need is already in the API.

## 2. Source of truth

| Question | Look at |
| --- | --- |
| Colors, type, radius, shadows, motion tokens | `DESIGN.md` §2; prototype lines 16–140 (`:root`, dark media block, `[data-theme="dark"]`) |
| Shell, tab bar, rail | prototype 213–260 (`.tabbar`, `.rail`, 900 px breakpoint) |
| Buttons, segmented control, chips | prototype 282–350 |
| Library cards and rows | prototype 366–420 and `renderLibrary()` (882) |
| Segmented progress | prototype 421–437 and `segments()` (868) |
| Run header, steps, check, expansion | prototype 439–515 and `renderRun()` (976) |
| Timer well and ring geometry | prototype 516–546, `ringSvg()` (955), `timerHtml()` (960) |
| Dock states | prototype 548–562 and the `dock` branch in `renderRun()` (1003) |
| Completion state | prototype 564–585 and `renderComplete()` (1031) |
| History, settings, editor | `renderHistory()` (1067), `renderSettings()` (1081), `renderEdit()` (1124) |
| Save feedback | `markSaving()` (820) and `.save-state` (451) |
| Reference renders | `design/screens/*.png` (phone 390×844 at 2×, desktop 1280×820) |

Where the prototype and this document disagree, this document wins; the
differences are deliberate and listed in §11.

## 3. Repo orientation

Current client (flat, React 19, React Router 7, Tailwind v4 via `@tailwindcss/vite`):

| File | Today | After |
| --- | --- | --- |
| `client/styles.css` | Tailwind import, a few `@layer components` classes with slate/blue literals | Token `@theme` block, dark overrides, base styles, reduced-motion rules. No color literals outside the token blocks. |
| `client/main.tsx` | `App` with header nav + routes, `Login` | Wraps routes in `ThemeProvider` and `AppShell`; `Login` restyled |
| `client/ui.tsx` | `dateTime`, `duration`, `ErrorNotice`, `Loading`, `Back`, `PageTitle` | Keep the helpers; add the shared primitives listed in §7 |
| `client/routines.tsx` | `RoutineList`, `RoutineDetail` | Library screen (resume card, chips, rows) and the restyled detail page |
| `client/run.tsx` | `RunPage` with checkbox list, timers, finish/discard | Run screen: sticky header, segments, step cards, timer ring, dock, completion state |
| `client/editor.tsx` | `RoutineEditor` form | Same behavior, restyled with panels and step rows |
| `client/settings.tsx` | `History`, `Settings` | History with day groups; Settings with Appearance, Reduce motion, password, sign out |
| `client/api.ts` | `api`, `useData`, `message` | Unchanged |
| new `client/theme.tsx` | | `ThemeProvider`, `useTheme()`, `useReduceMotion()`; persists `pb-theme` and `pb-reduce-motion` |
| new `client/shell.tsx` | | `AppShell` (tab bar / rail), `Dock`, `Toast` host |
| new `client/icons.tsx` | | The inline SVG set from prototype line 674 (`I`) plus the brand `MARK`, as React components |
| `index.html` | plain | fonts preload, theme boot script, two `theme-color` metas |

Keep files flat unless a file passes ~400 lines; then split by screen
(`run/`), not by component type.

## 4. Tokens in Tailwind v4

Put this in `client/styles.css`. Use `@theme` (not `@theme inline`) so
utilities compile to `var(--color-…)` and the dark overrides below apply at
runtime.

```css
@import 'tailwindcss';
@import '@fontsource-variable/geist';
@import '@fontsource-variable/geist-mono';

@theme {
  --font-sans: 'Geist Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --color-ground: #e6eaec;
  --color-surface-1: #f0f3f4;
  --color-surface-2: #f8fafa;
  --color-surface-3: #ffffff;
  --color-surface-sunk: #e4e9eb;
  --color-line: rgba(16, 36, 44, 0.12);
  --color-line-strong: rgba(16, 36, 44, 0.22);
  --color-line-hi: rgba(255, 255, 255, 0.85);
  --color-text: #11181d;
  --color-text-2: #44515a;
  --color-text-3: #5d6a72;
  --color-text-on-accent: #f4fffd;
  --color-accent: #0a7470;
  --color-accent-strong: #085e5a;
  --color-accent-soft: rgba(10, 116, 112, 0.10);
  --color-accent-line: rgba(10, 116, 112, 0.42);
  --color-accent-glow: rgba(10, 116, 112, 0.20);
  --color-warn: #a8701a;
  --color-danger: #bd4239;
  --color-danger-soft: rgba(189, 66, 57, 0.10);
  --color-grid-ink: rgba(16, 36, 44, 0.07);

  --shadow-raise: 0 1px 2px rgba(12, 24, 30, 0.06), 0 10px 28px -14px rgba(12, 24, 30, 0.22);
  --shadow-float: 0 2px 6px rgba(12, 24, 30, 0.08), 0 18px 44px -18px rgba(12, 24, 30, 0.35);
  --shadow-press: inset 0 1.5px 3px rgba(12, 24, 30, 0.14);
  --shadow-inset-hi: inset 0 1px 0 rgba(255, 255, 255, 0.9);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  --ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.3, 0.64, 1);

  --animate-check-pop: check-pop 380ms var(--ease-spring);
  --animate-seg-breathe: seg-breathe 2.4s var(--ease-out) infinite;
  --animate-pulse-dot: pulse-dot 0.9s ease-in-out infinite;
  --animate-ring-close: ring-close 1.1s var(--ease-out) both;
  --animate-page-in: page-in 380ms var(--ease-out) both;
  @keyframes check-pop { 0% { transform: scale(.85) } 60% { transform: scale(1.08) } 100% { transform: scale(1) } }
  @keyframes seg-breathe { 0%,100% { box-shadow: inset 0 0 0 1px var(--color-accent-line), 0 0 8px -3px var(--color-accent-glow) } 50% { box-shadow: inset 0 0 0 1px var(--color-accent), 0 0 12px -1px var(--color-accent-glow) } }
  @keyframes pulse-dot { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
  @keyframes ring-close { from { stroke-dashoffset: 339 } to { stroke-dashoffset: 0 } }
  @keyframes page-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
}

/* Dark: same names, new values. Both selectors are required (see DESIGN.md §7). */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* paste the dark block from prototype lines 88–116 */ }
}
:root[data-theme='dark'] { /* same values as above */ }
```

Dark values are in `DESIGN.md` §2.1 and prototype lines 88–140. Also set
`color-scheme` on each block so native controls and scrollbars match.

Notes:

- Overriding `--radius-lg` and `--ease-out` replaces Tailwind's defaults on
  purpose; nothing in the app relies on the old values.
- Utilities you get: `bg-surface-2`, `text-text-2`, `border-line`,
  `border-accent-line`, `shadow-raise`, `rounded-lg`, `font-mono`,
  `animate-check-pop`, `ease-spring`, and so on.
- Spacing stays on Tailwind's default 4 px scale. Minimum touch height is
  `min-h-11` (44 px); the dock button is `min-h-13` (52 px, add `--spacing-13`
  or use `min-h-[52px]`).
- If the fontsource packages cannot be installed, fall back to the Google
  Fonts `<link>` used in the prototype's head and keep the same fallback stacks.
- Reduced motion: keep the prototype's `prefers-reduced-motion` rule and add
  `:root[data-reduce-motion='true']` with the same body so the in-app switch works.

## 5. Shell, navigation, theme boot

**Routes** stay as they are: `/`, `/routines/new`, `/routines/:id`,
`/routines/:id/edit`, `/runs/:id`, `/history`, `/settings`, `*`.

**AppShell** (`client/shell.tsx`)

- `< 900px`: content column `max-w-[560px] mx-auto px-4`, bottom tab bar
  (Routines · History · Settings) as `NavLink`s with the prototype's icon +
  label layout, `min-h-[52px]`, blurred `surface-1` ground, hairline top,
  `env(safe-area-inset-bottom)` padding. Page bottom padding 88 px.
- `≥ 900px`: 232 px fixed left rail with the brand mark and the same three
  links, plus a mono footer "BIOSPHERE · v0.1". Content `max-w-[640px]` centered in
  the remaining width with 40 px padding.
- The run screen (`/runs/:id`, active status) hides the tab bar and renders the
  `Dock` instead. On desktop the dock spans the content column, left offset 232 px.
- The page background is the "dome": `radial-gradient(70% 45% at 50% -8%,
  var(--color-accent-glow), transparent 70%)` over `--color-ground`, plus the
  28 px grid masked to fade out by 90% of the viewport height. Render it as two
  fixed pseudo-elements on the shell, exactly as prototype `.app::before/::after`.
- The header "Sign out" button moves to Settings (§6.7).

**ThemeProvider** (`client/theme.tsx`)

- State `theme: 'light' | 'dark' | 'system'`, persisted under `localStorage`
  key `pb-theme`, wrapped in try/catch.
- Effect: `system` removes `data-theme` from `<html>`; otherwise sets it.
- `reduceMotion: boolean` persisted under `pb-reduce-motion`; sets
  `data-reduce-motion="true"` on `<html>`.
- Boot script in `index.html`, inline before the module script, so the first
  paint has the right theme:

```html
<script>try{var t=localStorage.getItem('pb-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;if(localStorage.getItem('pb-reduce-motion')==='true')document.documentElement.dataset.reduceMotion='true'}catch(e){}</script>
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#e6eaec">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0d10">
```

Update the `theme-color` meta when the in-app theme changes.

## 6. Screens

Each screen lists: data, layout, states, and the test contract it must keep.

### 6.1 Login (`client/main.tsx`)

- Centered `panel raised` (max 400 px) with the brand mark, `h1` "Sign in",
  the muted line "Your routines are ready when you are.", a `Password` field
  (label text exactly `Password`), and a primary "Sign in" button. Errors use
  the restyled `ErrorNotice`.
- Keep `autoFocus`, `autoComplete="current-password"`, and the busy label
  "Signing in…".

### 6.2 Routine library (`/`, `RoutineList`)

**Data**: `GET /api/routines` → `RoutineSummary[]` (`id, title, description,
category, stepCount, activeRunId, completedSteps, activeStepCount,
lastCompletedAt`). For each routine with `activeRunId`, also fetch
`GET /api/runs/:activeRunId` to fill the resume card's next step and start
time; render the card immediately from the summary and fill those two lines
when the run arrives.

**Layout** (prototype `renderLibrary`)

1. Page head: mono eyebrow with today's date and time (`Sat 12 Sep · 06:42`,
   24-hour, device locale for the weekday and month abbreviations), `h1`
   "Routines", and a "New" button (plus icon) linking to `/routines/new`. The
   button's accessible name must be "New routine": render `New` visibly and
   add `aria-label="New routine"`.
2. Resume card (`panel raised resume-card`) for every routine with an active
   run: live eyebrow "In progress · {category}", "started HH:MM" (from the
   run's `startedAt`), title, segmented progress + "{done} of {n} complete" +
   elapsed (from `startedAt`, ticking every second), the "Next" well with the
   first unchecked step's title and its quantity or timer duration, and a
   full-width primary "Resume routine" button.
3. Category chips: "All" plus the distinct categories present, in first-seen
   order. Selected chip filters the list. Horizontal scroll on phones with
   hidden scrollbar; wraps on desktop.
4. Section head "All routines" (or the category) with a mono count
   "{shown} of {total}".
5. Routine rows (`panel routine-row`): category glyph tile, title, meta line
   `{category} · {n} steps · {last done}` where last done is "Today",
   "Yesterday", or `Wed 10 Sep` from `lastCompletedAt`; omit when null. Active
   routines get the accent glyph tile, a six-dot mini bar sized to
   `activeStepCount`, and a small primary "Resume" button; others get a small
   secondary "Start". The whole row is the click target (navigates the same
   way the button does); the button is the only element with a role.
   Glyphs: map `Mobility`, `Workout`, `Baby care`, `Maintenance` to the
   prototype icons; any other category uses the list icon.
6. Empty state: dashed panel "No routines yet", muted line, primary "Create a
   routine". Loading: three skeleton rows using `surface-1` blocks. Errors:
   `ErrorNotice` with retry.

**Behavior**: Start creates a run via `POST /api/routines/:id/runs` and
navigates to it; Resume navigates to `/runs/:activeRunId`. Keep the focus
refresh. The "timed" count from the prototype is not in the summary type;
leave it out.

**Test contract**: the page `h1` becomes "Routines" (test updated, §11). A
link with accessible name "New routine" must exist.

### 6.3 Routine detail (`/routines/:id`, `RoutineDetail`)

Not in the prototype; style it as a read-only preview using the editor's row
style:

- Page head with back chevron to `/`, eyebrow "{category} · {n} steps",
  `h1` routine title, and a secondary "Edit routine" link on the right
  (hidden when archived).
- Description as body text. Archived routines show a `badge off`
  "Archived" and no start button.
- Primary "Start routine" / "Resume routine" (full width on phones).
- Steps as `panel edit-row`s without the grip: index in mono, title,
  meta `{quantity} · {m:ss} timer · link`, and expanded instructions text
  under each row (this page is where you read the whole routine).

**Test contract**: heading with the routine title, link "Edit routine",
button "Start routine".

### 6.4 Active run (`/runs/:id`, `RunPage`)

**Data**: `GET /api/runs/:id` → `Run` (`steps[]` with `completedAt`,
`timerRemainingMs`, `timerStartedAt`, `version`, `durationSeconds`;
`serverNow`). Keep the existing `mutate`, clock offset, 5 s poll, focus
refresh, 409 message, and the reconcile-on-failure reload.

**Local UI state** (not persisted server-side): `currentIndex`. Initialize to
the first unchecked step; recompute after each successful check to the next
unchecked step after the one just checked, or the first unchecked overall;
unchecking sets current to that step; tapping a step's title sets current.
Keep it in `sessionStorage` under `pb-run-current:{runId}` so a reload lands on
the same step.

**Layout** (prototype `renderRun`)

1. Sticky header (`run-head`): ghost icon button back to `/` (aria-label
   "Back to routines"), eyebrow category, title (single line, ellipsis),
   `SaveState`, ghost icon "more" button linking to the routine's edit page
   (aria-label "Edit routine"). Second row: `Segments` and the count row
   "{done} of {n} complete" + elapsed `m:ss` (or `h:mm:ss`) since `startedAt`.
2. Step cards in order. Row: `Check`, title + label line, mono index `01`.
   Label line: quantity, then timer glyph + `m:ss` if `durationSeconds`,
   then `· HH:MM` completion time once `completedAt` is set. Body (grid-row
   expansion) holds instructions (pre-wrap), the reference link (external,
   `rel="noopener noreferrer"`, label is the URL's hostname), and the `Timer`
   when the step has a duration.
3. Below the list: the hint "Tap any step to open it. Tap a check to undo
   it." and a ghost danger button "Discard run" that confirms with
   `window.confirm` (existing copy).
4. `Dock` (fixed): see §7 for states.

**Check semantics**: the visually hidden `<input type="checkbox">` keeps
`aria-label="Complete {title}"` in every state (the test reads the same name
after checking). `onChange` → `update(step, { completed })`. Disabled while
busy or when the run has ended. The styled circle is the input's `<label>`.

**Timer semantics**: remaining = `timerRemainingMs - (timerStartedAt ? now +
offset - startedAt : 0)` clamped at 0, exactly as today. `running =
!!timerStartedAt && remaining > 0`. Ring fraction = `remaining /
(durationSeconds * 1000)`. Readout `role="timer"` with
`aria-label="Timer for {title}"`. Buttons (visible → accessible name):
Start or Resume → "Start timer for {title}"; Pause → "Pause timer for
{title}"; Reset → "Reset timer for {title}". At zero: readout turns accent,
label reads "Time complete · check when ready" in a `role="status"`, and
only Reset is offered. Timer controls hide when the step is checked or the
run has ended; the ring stays.

**Finishing**: when every step is checked the dock shows the primary
"Finish routine" (`POST /api/runs/:id/complete`). After success show the
toast "Saved to history" and render the completion state in place.

**Completion state** (`renderComplete`): page head with back chevron and the
eyebrow "{category} · Saved to history"; `panel raised done-card` with the
128 px closing ring and check, `h2` "Routine complete" styled as the live
eyebrow, `h1` routine title, "Finished HH:MM.", stat tiles (steps `n / n`,
elapsed, and the discarded/completed count is not available so show only two
tiles), primary "Done" (link to `/`) and secondary "Start again"
(`POST /api/routines/:routineId/runs`, navigate). Below: "What you did" recap
rows with each step's completion time. A discarded run renders the same
layout with `h2` "Run discarded", the ring at the partial fraction
`completedSteps / stepCount`, no check glyph, and stat tiles
`{completedSteps} / {stepCount}`.

**Edge cases**: 100 steps must scroll smoothly (no per-step intervals; one
250 ms tick for the visible timers and elapsed). Titles wrap in the expanded
card and ellipsize in the header. A step with no instructions, no quantity
and no timer still expands to show the index and "No instructions" in
tertiary ink. Network failure keeps the previous state, shows `ErrorNotice`
and a `SaveState` of "Not saved" in danger.

**Test contract**: checkbox names "Complete {title}", the three timer button
names, timer role and text `0:30`, the count text "1 of 2 complete" (test
updated), buttons "Finish routine" (present only when all steps are checked,
test updated), "Start again", "Discard run", headings "Routine complete" and
"Run discarded".

### 6.5 History (`/history`, `History`)

**Data**: `GET /api/history?offset=` → `{ items: RunSummary[], hasMore }`
with `startedAt`, `finishedAt`, `status`, `stepCount`, `completedSteps`.

- Page head: eyebrow "Last {n} runs" (n = items loaded), `h1` "History".
- Group items by `finishedAt` day with mono day labels "Today", "Yesterday",
  then `Wed 10 Sep`.
- Row = `Link` to `/runs/:id` styled as `panel list-row`, containing an `h2`
  with the title (the test finds the link by its heading), meta
  `{category} · HH:MM · {completedSteps} / {stepCount} steps`, and on the right
  the mono duration `finishedAt - startedAt` for completed runs or a
  `badge off` "Discarded".
- Pagination keeps Newer / Older as secondary buttons with "Page n" in mono.
- The prototype's stat tiles need aggregates the API does not provide; leave
  them out.
- Empty state: dashed panel "No saved runs yet".

### 6.6 Editor (`/routines/new`, `/routines/:id/edit`, `RoutineEditor`)

Behavior is unchanged; only presentation moves to the design.

- Page head: back chevron (calls the existing `cancel`, so the unsaved-changes
  confirm still fires), eyebrow "Edit routine" / "New routine", `h1` with the
  current title or "Untitled routine", and a small primary "Save routine" on
  the right that submits the form (`form="…"` attribute). Keep a second
  "Save routine" in the bottom save bar only if the head button cannot submit
  the form; never render two buttons with that name.
- Fields in a `panel setting`: "Routine name", "Category" (keep the datalist),
  "Description" as a textarea. Inputs use the `input` style (sunken well,
  accent focus ring).
- Steps: section head "Steps" with mono `{n} / 100`. Each step is a
  `<fieldset aria-label="Step {n}">` styled as a `panel` with the step's
  fields inside, a grip icon at the left as decoration only, and the existing
  three buttons ("Move step n up", "Move step n down", "Remove step n") as
  small ghost icon buttons with those aria-labels. Do not add drag and drop
  in this pass.
- Dashed "Add step" button, the 409 "Reload saved version" link, the
  `role="status"` "Unsaved changes" text, Cancel, and the "Archive routine"
  ghost danger button with its confirm all remain.
- The "A run is in progress…" notice becomes a `panel` with `accent-line`
  border and an info eyebrow.

**Test contract**: all labels and button names above, exactly as today.

### 6.7 Settings (`/settings`, `Settings`)

- Page head: eyebrow "Private · one owner", `h1` "Settings".
- **Appearance**: `panel setting` with "Theme" and the Biosphere note, the
  three-way segmented control (Light / Dark / System) bound to `useTheme()`,
  and the six token swatches (decorative, `aria-hidden`).
- **Reduce motion**: switch bound to `useReduceMotion()`.
- **Account**: the existing password form (labels "Current password", "New
  password", "Confirm new password"; button "Change password"; the success
  `role="status"` line), then a `panel setting` with "Sign out" as a ghost
  danger button that calls the existing logout.
- The prototype's "Keep screen awake" and "Sound" switches are not backed by
  anything; leave them out.

**Test contract**: button "Sign out" (test updated to open Settings first).

### 6.8 Not found

Page head with `h1` "Page not found" and a secondary "Back to routines" link.

## 7. Components (add to `client/ui.tsx` and `client/shell.tsx`)

| Component | Props | Variants / states | Notes |
| --- | --- | --- | --- |
| `Button` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger-ghost'`, `size: 'md' \| 'sm' \| 'dock'`, `icon?`, `block?`, `as?: 'button' \| Link` | hover (surface-3 / brightness 1.04), active (translateY 1px + `shadow-press`), disabled (opacity .5), busy (label swap, disabled) | Primary background is a gradient: accent mixed 10 % toward white on top, 8 % toward black underneath, using `color-mix`. |
| `IconButton` | `label` (required, becomes `aria-label`), `size` | same as Button ghost | 44 px square; 36 px when `sm` |
| `Panel` | `raised?`, `as?` | rest, hover (rows only: surface-3 + line-strong) | `raised` uses surface-3 and `shadow-float` |
| `Eyebrow` | `live?` | live adds the accent dot with halo and accent text | mono 11 px, `tracking-[0.12em]`, uppercase |
| `Segments` | `total`, `done: boolean[]`, `current?: number`, `fill?: 0–1` | done / current (breathing outline, partial fill while a timer runs) / remaining | `role="img"` with `aria-label="{done} of {total} steps complete"` |
| `Check` | `checked`, `current?`, `disabled?`, `label`, `onChange` | rest, current (accent border + halo), checked (accent fill + pop animation once), pressed (scale .9) | Visually hidden real checkbox; the circle is its label |
| `StepCard` | `step`, `index`, `current`, `onFocus`, children | rest, current (surface-2, accent-line border, halo, 2 px left edge), done (tertiary title) | Body uses `grid-rows-[0fr]` → `grid-rows-[1fr]` transition, inner `min-h-0 overflow-hidden` |
| `Timer` | `remainingMs`, `durationMs`, `running`, `done`, `title`, `onStart`, `onPause`, `onReset`, `controlsHidden?` | idle, running, paused, done | Ring: SVG `viewBox 0 0 100 100`, `r=44`, circumference 276.5, `stroke-dashoffset = c × (1 − fraction)`, 3 px track and arc, 12 ticks between radius 36 and 38.5. Stacked and 124 px on phones, two-column and 96 px from 480 px. |
| `SaveState` | `state: 'idle' \| 'saving' \| 'saved' \| 'error'` | idle "Saved" grey dot; saving "Saving" warn dot pulsing; saved "Saved" accent dot with halo for 2.2 s then idle; error "Not saved" danger | `aria-live="polite"` |
| `Dock` | children | one primary; or `Undo` + `Next step` two-column | Fixed, blurred surface-1, hairline top, 52 px primary, mono hint line beneath. Hidden when the run has ended. |
| `Toast` | via `useToast()` returning `show(message, icon?)` | on / off | Pill, 1.8 s, bottom 96 px above the tab bar, `role="status"` |
| `Chip` | `pressed`, children | rest / pressed (accent-soft fill, accent-line border) | `aria-pressed` |
| `SegControl` | `value`, `options: {value,label,icon}[]`, `onChange` | | `role="group"`, buttons with `aria-pressed` |
| `Switch` | `checked`, `onChange`, `label` | off / on | `role="switch"`, `aria-checked`, spring knob |
| `Field` / `Input` / `Textarea` | label, error | rest, focus (accent border + 3 px accent-soft ring), disabled | Sunken well style |
| `Badge` | `tone: 'ok' \| 'off' \| 'neutral'` | | mono uppercase pill |
| `TabBar` / `Rail` | | active (accent), pressed (accent-soft) | `NavLink` with `aria-current="page"` |
| `ErrorNotice` | existing props | | Restyle: `panel` with `danger-soft` background and `danger` text, retry as a small secondary button |
| `Skeleton` | `rows` | | `surface-1` blocks with `line` borders, no shimmer |

Dock state logic for an active run:

| Condition | Dock |
| --- | --- |
| Current step unchecked | primary "Mark complete" (checks the current step) + hint "Step {i} of {n} · {title}" |
| Current step checked, others remain | secondary "Undo" (unchecks it) + primary "Next step" (moves current to the first unchecked) |
| All steps checked | primary "Finish routine" + hint "All {n} steps checked · {elapsed} elapsed" |

## 8. Motion

| Element | Trigger | Animation | Duration | Easing |
| --- | --- | --- | --- | --- |
| Step body | current changes | `grid-template-rows` 0fr ↔ 1fr | 380 ms | `ease-out` token |
| Step card | current changes | background, border, shadow | 220 ms | ease-out |
| Check | becomes checked | fill + `check-pop` scale | 220 ms fill, 380 ms pop | spring |
| Check | pointer down | scale .9 + press shadow | 120 ms | ease-out |
| Segment | becomes done | fill color | 220 ms | ease-out |
| Current segment | always | `seg-breathe` box-shadow | 2.4 s loop | ease-out |
| Timer arc | running | `stroke-dashoffset` | 1 s linear per tick | linear |
| Save dot | saving | opacity pulse | 0.9 s loop | ease-in-out |
| Completion ring | mount | `ring-close` dashoffset 339 → 0, then check pops at 0.7 s | 1.1 s | ease-out |
| Page | route change | `page-in` fade + 6 px rise | 380 ms | ease-out |
| Buttons | hover / active | color, `translateY(1px)` | 120 ms | ease-out |
| Toast | show / hide | opacity + 8 px rise | 220 ms | ease-out |

All durations collapse to zero under `prefers-reduced-motion: reduce` or
`data-reduce-motion="true"`.

## 9. Responsive

| Breakpoint | Behavior |
| --- | --- |
| < 380 px | Timer stacks (already at < 480); step body left padding 14 px; category chips scroll |
| < 480 px | Timer stacked, 124 px ring, 30 px readout, controls centered |
| < 640 px | Step body padding-left 14 px (instructions align to the card edge) |
| 480–899 px | Timer two-column, 96 px ring; step body padding-left 64 px from 640 px so instructions align under the title |
| ≥ 900 px | Rail replaces the tab bar; content column 640 px; dock spans the column; run header sticks at top 0 without the phone's safe-area padding |

Never let the body scroll horizontally (the e2e test asserts
`scrollWidth <= innerWidth`). Chips get their own `overflow-x: auto`.

## 10. Accessibility

- Every icon-only control has an `aria-label`. Every tappable control is at
  least 44 px tall.
- Focus: `outline: 2px solid var(--color-accent); outline-offset: 2px` on
  `:focus-visible`, on every control including the check circle (style the
  label on `input:focus-visible + label`).
- Run screen focus order: back, more, then steps in order (check, then
  title button, then the timer buttons when expanded), then discard, then the
  dock. The dock is last in DOM order.
- Announcements: `SaveState` and `Toast` are `aria-live="polite"`; the timer
  end status is `role="status"`; the segments are one `role="img"`.
- Headings: one `h1` per page; the completion page's "Routine complete" is an
  `h2`.
- Contrast is verified in `DESIGN.md` §6; do not lighten tertiary ink or the
  light accent.

## 11. Test contract changes in `tests/browser/routine.spec.ts`

Make only these edits. Everything else in the test must pass unchanged.

| Today | After | Why |
| --- | --- | --- |
| `getByRole('heading', { name: 'Your routines' })` (two places) | `getByRole('heading', { name: 'Routines', exact: true })` | New page title |
| `expect(getByRole('button', { name: 'Finish routine' })).toBeDisabled()` right after starting | `await expect(page.getByRole('button', { name: 'Mark complete', exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Finish routine' })).toHaveCount(0);` | Finish appears only when all steps are checked |
| `getByText('1 of 2 steps done', { exact: true })` and `'0 of 2 steps done'` | `'1 of 2 complete'` and `'0 of 2 complete'` | New count copy |
| `getByRole('button', { name: 'Sign out', exact: true })` | precede with `await page.getByRole('link', { name: 'Settings', exact: true }).click();` | Sign out lives in Settings |

Do not rename: `Password`, `Sign in`, `New routine`, `Routine name`,
`Category`, `Step name`, `Instructions`, `Timer in seconds`, `Reps or
quantity`, `Add step`, `Save routine`, `Edit routine`, `Move step 2 up`,
`Remove step 3`, `Start routine`, `Complete {title}`, `Start timer for
{title}`, `Pause timer for {title}`, `Reset timer for {title}`, `Timer for
{title}`, `Finish routine`, `Routine complete`, `History`, `Start again`,
`Discard run`, `Run discarded`, `Archive routine`, `Sign out`.

## 12. Definition of done

Run from the repo root with Postgres up (`docker compose up -d`) and the app
running (`bun run dev` and `bun run dev:client`, or `bun run build` +
`bun run start`):

```bash
bun run typecheck
```

```bash
bun run build
```

```bash
bun run test:e2e
```

Both Playwright projects (desktop and mobile) must pass, and the test's
`pageerror` assertion must stay green in both themes: run the suite once with
`pb-theme` unset and once after setting it to `dark` in Settings, or add a
`colorScheme: 'dark'` project for the run.

Then capture and compare against `design/screens/`:

- `/` and `/runs/:id` at 390 × 844 in light and dark
- `/runs/:id` at 1280 × 820 in dark, `/` at 1280 × 820 in light
- the completion state in both themes

Differences that are acceptable: sample content, dates, the absence of the
"timed" count and the history stat tiles. Differences that are not: spacing,
type sizes, token colors, missing states, layout jumps when a step expands or
a count changes.

Finally, `bun run format` and confirm `git status` shows only the files in §1.

## 13. Suggested order of work

1. Fonts, `styles.css` tokens and base, `theme.tsx`, `index.html` boot script.
2. `icons.tsx`, `ui.tsx` primitives, `shell.tsx` with tab bar, rail, dock, toast.
3. Run screen, including timer ring, dock states, save state, completion.
4. Library, then routine detail.
5. History and Settings (appearance control, reduce motion, sign out).
6. Editor and login restyle, not-found page.
7. Test edits from §11, run the full suite on both projects, screenshots, format.

Commit after steps 1–2, after 3, after 4–6, and after 7, each with a message
that names the screens touched.
