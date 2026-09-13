# Playbook design system — theme "Biosphere"

Playbook runs reusable routines as checklists: morning mobility today, workouts,
baby care and maintenance procedures tomorrow. The interface has one job: make it
effortless to pick a routine, resume where you left off, follow the current
step, run a timer, check things off and finish.

This document describes the visual system used by the prototype in
[`design/prototype.html`](design/prototype.html) and how to carry it into the
React + Tailwind v4 client. Open the prototype locally or use the deep links
listed at the end to jump to any screen and theme. The implementation brief
for engineering, including data wiring and test contracts, is
[`design/HANDOFF.md`](design/HANDOFF.md).

## 1. Concept

**Advanced technology inside a protected habitat.** Resilient, precise, quietly
alive. The references are Halo Reach's calm HUD and JARVIS's instrument rings
for atmosphere, and Linear and Railway for hierarchy, spacing and product
polish.

The atmosphere is carried by a small set of recurring devices, and by nothing
else:

| Device | What it is | Where it appears |
| --- | --- | --- |
| Layered graphite | Four surface steps from ground to raised panel, each one hairline-bordered | every screen |
| Structural hairlines | 1 px borders at ~10 % opacity, a 1 px inner highlight on raised controls | panels, buttons, dock, tab bar |
| The living signal | one teal/cyan accent, used only for state that is alive or done | progress, checks, current step, timer arc |
| Instrument labels | monospaced, uppercase, letter-spaced eyebrows and readouts | dates, categories, step index, save state, counts |
| The dome | a faint 28 px structural grid fading downward, and one soft accent light above the content | page background only |
| Rings | thin circular progress with 12 tick marks | timers and the completion state |

Decoration stops there. There are no glows on text, no scan lines, no gradients
on surfaces. Every technical detail communicates something true: a step index,
an elapsed time, a save state.

## 2. Tokens

Tokens are plain CSS custom properties named to drop into a Tailwind v4
`@theme` block (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`). Light is
the base palette on `:root`; dark redefines the same names. Components only ever
reference tokens, never literals, so a second theme is a second block of
values.

### 2.1 Color

Surfaces are graphite with a slight cyan bias, never pure grey. Text on the
accent uses a near-black ink in dark mode and near-white in light mode so the
button always clears 7:1.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-ground` | `#e6eaec` | `#0a0d10` | page background |
| `--color-surface-1` | `#f0f3f4` | `#11151a` | quiet panels, list rows, bars |
| `--color-surface-2` | `#f8fafa` | `#171c21` | cards, the current step |
| `--color-surface-3` | `#ffffff` | `#1e242a` | raised controls, popovers, checks |
| `--color-surface-sunk` | `#e4e9eb` | `#0d1114` | wells: timer box, inputs, segmented control track |
| `--color-line` | `rgba(16,36,44,.12)` | `rgba(186,214,222,.10)` | hairline borders |
| `--color-line-strong` | `rgba(16,36,44,.22)` | `rgba(186,214,222,.18)` | control borders, ring tracks |
| `--color-line-hi` | `rgba(255,255,255,.85)` | `rgba(255,255,255,.05)` | 1 px inner top highlight |
| `--color-text` | `#11181d` | `#e7edf0` | primary ink |
| `--color-text-2` | `#44515a` | `#98a5ad` | secondary ink, instructions |
| `--color-text-3` | `#5d6a72` | `#7a8790` | tertiary ink, labels, indices |
| `--color-text-on-accent` | `#f4fffd` | `#04201e` | text on accent fills |
| `--color-accent` | `#0a7470` | `#46d4cb` | the living signal |
| `--color-accent-strong` | `#085e5a` | `#7fe9e2` | hover on accent text, finished timer arc |
| `--color-accent-soft` | accent @ 10 % | accent @ 12 % | tints, focus halos, selected chips |
| `--color-accent-line` | accent @ 42 % | accent @ 42 % | borders of accented panels |
| `--color-accent-glow` | accent @ 20 % | accent @ 26 % | dome light, ring drop-shadow |
| `--color-warn` | `#a8701a` | `#e2ab52` | saving indicator |
| `--color-danger` | `#bd4239` | `#e66a62` | discard, sign out |
| `--grid-ink` | `rgba(16,36,44,.07)` | `rgba(186,214,222,.055)` | dome grid lines |

Semantic colors (warn, danger) are separate from the accent and never double as
decoration. Completed and current states use the accent; remaining states use
surface and line tokens only.

### 2.2 Elevation

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-raise` | soft 1 px + 10 px ambient | inner 1 px highlight + deep 10 px ambient |
| `--shadow-float` | 2 px + 18 px ambient | inner highlight + 18 px ambient |
| `--shadow-press` | inset 1.5 px top shadow | inset 1.5 px top shadow, darker |
| `--shadow-inset-hi` | inset 1 px white @ 90 % | inset 1 px white @ 5 % |

Rule: elevation encodes role. Ground < panel (`raise`) < the current step and
the resume card (`float`). Pressed controls sink (`press`). Nothing else casts a
shadow.

### 2.3 Typography

| Token | Value |
| --- | --- |
| `--font-sans` | `Geist, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | `Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

Geist is a neo-grotesque with the technical, slightly engineered voice the
concept wants; Geist Mono is its sibling so the two share metrics. Both are on
Google Fonts. Inter and a system mono are acceptable fallbacks if self-hosting
is not wanted.

| Role | Size / weight | Face | Notes |
| --- | --- | --- | --- |
| `title-xl` | 28 / 600 | sans | page titles, completion title, `letter-spacing: -0.02em` |
| `title-lg` | 22 / 600 | sans | card titles |
| `title-md` | 17 / 600 | sans | current step title |
| body | 15 / 400 | sans | instructions at `line-height: 1.55`, max 62ch |
| small | 13 / 400–500 | sans | secondary rows, chips, list meta |
| eyebrow | 11 / 500 | mono | uppercase, `letter-spacing: .12em` |
| readout | 22–30 / 500 | mono | timer countdown, `tabular-nums` |
| count | 13 / 500 | mono | "2 of 6 complete", elapsed, step index |

Every number that changes while you watch it is monospaced and tabular so the
layout never shifts: countdowns, elapsed time, counts, step indices, timestamps.

### 2.4 Shape, rhythm, touch

| Token | Value | Used for |
| --- | --- | --- |
| `--radius-sm` | 6 px | small buttons, focus rings |
| `--radius-md` | 10 px | buttons, inputs, wells, segmented control |
| `--radius-lg` | 14 px | panels, step cards |
| `--radius-xl` | 20 px | reserved for sheets |
| `--radius-pill` | 999 px | chips, badges, toast |
| `--space-1…10` | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 px | a 4 px grid |
| `--touch` | 44 px | minimum height of every tappable control |

The dock's primary action is 52 px tall. Check controls are 40 px circles
inside a 60 px row, so the whole row is the hit target.

### 2.5 Motion

| Token | Value |
| --- | --- |
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` |
| `--ease-spring` | `cubic-bezier(.34,1.3,.64,1)` (check pop, switch knob only) |
| `--dur-fast` | 120 ms (press, hover, color) |
| `--dur` | 220 ms (segments, check fill, toast) |
| `--dur-slow` | 380 ms (step expansion, page entrance) |

`prefers-reduced-motion: reduce` collapses all durations to zero. The in-app
"Reduce motion" switch does the same for people who cannot set it at the OS.

## 3. Layout

Mobile first, single column, content width capped at 560 px and centered.

- **Phone (< 900 px)**: bottom tab bar (Routines · History · Settings) with a
  blurred surface-1 ground. The active-run screen hides the tab bar and shows
  the **dock** instead: one primary action within thumb reach, with a
  monospaced hint underneath. Safe-area insets are respected on both.
- **Tablet (600–899 px)**: same structure, more air; the timer switches from
  stacked to two-column at 480 px.
- **Desktop (≥ 900 px)**: the tab bar becomes a 232 px left rail with the brand
  mark; content sits in a 640 px column; the dock spans the content column.

The run header (back, category eyebrow, title, save state, more) and the
segmented progress are sticky on every size, so the count is never out of view.

## 4. Components

**Button** (`.btn`): surface-3 → surface-2 vertical gradient, hairline border,
1 px inner highlight. Primary: accent gradient (accent mixed 10 % toward white
on top, 8 % toward black underneath) with `--color-text-on-accent`. Ghost: no
border, tints on hover. Pressed: `translateY(1px)` + `--shadow-press`. Sizes:
default 44 px, `sm` 36 px, dock 52 px.

**Segmented control** (`.seg`): sunken track, raised selected segment. Used for
Light / Dark / System.

**Chip** (`.chip`): pill filter; selected = accent-soft fill + accent-line
border + accent text.

**Panel** (`.panel`): surface-2, hairline, `--shadow-raise`. `.raised` uses
surface-3 and `--shadow-float`. Only the resume card, the current step and the
completion card are raised.

**Routine row**: 44 px category glyph in a surface-1 tile, title, then
category · step count · timed count · last done, and a Start/Resume button. An
in-progress routine gets an accent glyph tile and a six-dot mini progress bar.

**Segmented progress** (`.segments`): one 6 px segment per step, 4 px gaps.
Done = accent fill. Current = hairline accent outline that breathes slowly and
fills left-to-right while a timer runs. Remaining = sunken surface. Always paired
with a monospaced count ("2 of 6 complete") and elapsed time.

**Step card** (`.step`): surface-1 row with a 40 px check circle, title, label
line (reps or timer glyph + duration, plus completion time once done) and a
monospaced index. The current step lifts to surface-2 with an accent hairline,
an accent-soft halo and a 2 px accent edge on the left. Its body expands with a
`grid-template-rows: 0fr → 1fr` transition so height animates without
measurement and the list around it stays stable. Done steps keep their title
readable (tertiary ink, no strikethrough) and their check stays tappable to undo.

**Check** (`.check`): raised surface-3 circle. Current = accent border. Done =
accent fill, on-accent check mark, accent-soft halo; the fill pops with the
spring curve once.

**Timer** (`.timer`): sunken well containing a 96–124 px ring (3 px track and
arc, 12 ticks, drop-shadow at accent-glow) with the countdown centered in mono.
Controls read Start → Pause / Reset → Resume / Reset. When the arc reaches zero
the readout turns accent and the label says "Time complete · check when
ready". Completion is never automatic.

**Dock** (`.dock`): fixed, blurred surface-1, hairline top. States: "Mark
complete" (step not yet done) · "Undo" + "Next step" (viewing a done step) ·
"Finish routine" (all steps done).

**Save state** (`.save-state`): mono label with a dot. Saving = warn dot
pulsing. Saved = accent dot with halo for two seconds, then quiet.

**Completion card**: raised panel, 128 px ring that closes over 1.1 s, check
mark that pops in after it, three stat tiles (steps, elapsed, total runs), Done
and Start again. A recap list underneath shows every step with its completion
time.

**Tab bar / rail, toast, badge, switch, input, editor row**: see the
prototype; all follow the same surface, hairline, and pressed-state rules.

## 5. Interaction rules

1. The whole checklist is always visible. Tapping any step makes it current and
   expands it; the previous one collapses in the same motion.
2. Checking a step advances "current" to the next unchecked step. Unchecking
   makes that step current again. Both are one tap.
3. Every write shows Saving → Saved in the header. Finishing shows a toast
   ("Saved to history"). Never claim a save that has not happened.
4. Timers are explicit: start, pause, reset. A finished timer changes color and
   copy but does not check the step.
5. Layout never jumps: tabular numerals, fixed-height rows, grid-row expansion,
   and a sticky header that stays the same height.
6. Touch targets are ≥ 44 px; the primary action lives at the bottom of the
   screen; the back control is top-left.
7. Copy is calm and specific: "3 of 6 complete", "Time complete · check when
   ready", "Run discarded". No exclamation marks.

## 6. Accessibility

- Text contrast (WCAG relative luminance, computed for this pass): primary ink
  ≥ 12:1, secondary ≥ 6.7:1, tertiary ≥ 4.5:1 on ground and surface-1 in both
  themes. Accent text on ground is 4.6:1 in light and 10.8:1 in dark; white on
  the light primary button is 5.6:1, near-black on the dark one is 10:1.
- Focus is a 2 px accent outline with 2 px offset on every control.
- Checks are `role="checkbox"` with `aria-checked` and a verb in the label
  ("Complete Cat–cow" / "Undo Cat–cow"). The current step carries
  `aria-current="step"`. Progress is an `img` with a text alternative.
- Toasts and the save state are `aria-live="polite"`.
- Reduced motion is honored via media query and an in-app switch.

## 7. Theming architecture

Three appearance choices: Light, Dark, Follow system.

```css
:root { color-scheme: light; /* full light palette */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { color-scheme: dark; /* dark palette */ }
}
:root[data-theme="dark"] { color-scheme: dark; /* dark palette */ }
```

"Follow system" removes the `data-theme` attribute; "Light"/"Dark" set it.
The choice persists in `localStorage` under `pb-theme`. Because every
component reads tokens only, adding a theme means adding one more token block
(and its `data-theme` selector), never touching components.

### Tailwind v4 mapping

```css
@import 'tailwindcss';
@theme {
  --font-sans: 'Geist', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  --color-ground: #e6eaec;
  --color-surface-1: #f0f3f4;
  /* …all --color-*, --radius-*, --shadow-* tokens from §2 */
}
```

Redefine the dark values on `:root:not([data-theme="light"])` inside the
`prefers-color-scheme` query and on `:root[data-theme="dark"]` as above. Then
`bg-surface-2 text-text-2 border-line rounded-lg shadow-raise` map one-to-one.

## 8. Screens in the prototype

| Screen | Deep link |
| --- | --- |
| Routine library | `prototype.html?screen=library` |
| Active run, two steps done | `?screen=run` |
| Active run with the timer running | `?screen=run&state=running` |
| Active run, all steps checked | `?screen=run&state=all` |
| Completion state | `?screen=run&state=complete` |
| Fresh run of another routine | `?screen=run&run=push&state=fresh` |
| History | `?screen=history` |
| Settings | `?screen=settings` |
| Routine editor | `?screen=edit` |

Add `&theme=light` or `&theme=dark` to force a theme, and `&proto=0` to hide
the floating theme switcher used for review. `design/overview.html` shows the
two core screens in both themes side by side, and `design/screens/` holds
captures of every state above (`biosphere-screens.png` is the contact sheet).
