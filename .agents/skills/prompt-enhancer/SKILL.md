---
name: prompt-enhancer
description: Sharpen a rough prompt before you hand it to a coding agent — clarifies the ask without adding constraints, then offers a few optional enhancements you can fold in or ignore.
argument-hint: <your draft prompt>
allowed-tools: Read, Grep, Glob
---

# Prompt enhancer

Rewrite the draft below into a clearer, sharper version of the **same** prompt, then return it alongside a short menu of optional enhancements. You are not the agent that will run it — don't do the task or touch code; the rewrite and those suggestions are the only output.

## Draft

$ARGUMENTS

If empty, ask for the draft and stop.

## Rewrite it to be clearer, not bigger

Make explicit what the draft already implies — the objective, the specific ask, and any success criteria it gestures at — and sharpen vague or ambiguous wording. That's the whole job of the rewrite.

Shape the rewrite the way you'd brief a strong model: outcome first, intent context if the draft has it ("for X so they can Y"), real fences, and a checkable done signal when one is already implied. If the draft is a step chain, collapse it to goal + bar + boundaries — don't produce a tidier procedure. Prefer a short outcome-shaped brief when the draft supports it; omit empty sections. Lead with the outcome; keep the user's voice; prefer brief principles over enumerated don'ts in the rewrite itself.

Do **not** (this is the point of the tool — no enhanced prompt should carry constraints the user didn't write):

- Add requirements, scope, conventions, personas, or process the user didn't ask for. No "be thorough," "follow best practices," or persistence/verification/anti-overengineering boilerplate.
- Change the intent, scope, or the user's voice. Sharper, not bigger.
- Invent specifics (filenames, numbers, criteria, stakeholders, DoD, house rules, or process rails) to patch a gap. If something important is missing, leave a marked `[...]` placeholder, or ask one short question — only if it genuinely blocks the rewrite.
- Force a full prompt skeleton. A three-line brief beats fake headings.

If the draft names something real but vaguely ("the invoice service"), you may do a quick read-only lookup to resolve the actual path. Otherwise stay in text.

## Then offer enhancements the rewrite left out

Recommendations are the one place you may reach past the literal draft — but they stay **out** of the rewritten block until the user picks them. Each must be a concrete, prompt-specific addition that would measurably change what the agent produces: a decision it would otherwise guess wrong, an ambiguity whose branches diverge, a success criterion that lets it self-check, a scope boundary that stops over- or under-reach, or a missing piece of context (a file, a constraint) that saves it a search.

Offer 1–3, fewer is better — and **zero is correct when the prompt is already tight**. Don't pad to hit a number; if you wouldn't bet the suggestion changes the output, drop it. Never recommend personas, "be thorough"/"best practices" boilerplate, generic "add more detail," full prompt scaffolds, verification loops, sub-agent topology, or effort dials unless the draft is clearly a long/autonomous build. Prefer one principle over an enumerated don't-list when suggesting a boundary.

## Output

1. The rewritten prompt in one `~~~` fenced block, ready to paste. If you left a placeholder or made a judgment call, note it in one line directly below the block.
2. Then an **Optional enhancements** list: the numbered recommendations, each one line as _addition → why it helps_. Close with one line — the user can paste the block as-is, or reply with the numbers to fold in, and you re-emit the block with those (now user-chosen) additions baked in. If nothing clears the bar, replace the list with a single line: _Prompt is already tight — nothing worth adding._
