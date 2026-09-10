# Playbook MVP

## Agreed scope

- Private, single-user application with password login and persistent sessions.
- Phone-friendly interface; functional styling only. A design overhaul comes later.
- Editable morning mobility starter routine for validating the workflow. The owner
  will replace its sample steps with their real routine inside the app.
- Create and edit reusable routines, including ordered steps, instructions,
  repetition labels, reference links, and optional durations.
- Start or resume a checklist, persist progress across refreshes and devices,
  optionally time steps, and explicitly finish a run.
- Completion history, with the steps and instructions used for each run.
- Application and PostgreSQL database hosted together on Railway.

## Data boundaries

Routine templates describe repeatable work. Runs describe one execution. Each
run snapshots its routine and steps, so template edits affect future runs while
past and active runs retain their original instructions.

Routine category is descriptive metadata, not a hard-coded set of workflows.
Mobility, workouts, baby care, maintenance, and other routines share the same
ordered-step engine. Optional per-step fields support instructions, quantity
labels, links, and timers without requiring a separate table for every category.

Keep at most one active run per routine. Starting that routine from another
device resumes the existing run. Completing a run requires every step to be
checked. An explicit discard action handles a run the owner decides not to finish.

The initial release requires a network connection to save progress. Show saving
and failure states clearly; never report an unsaved checkmark as persisted.

## Acceptance

1. Sign in with the generated initial password and optionally change it.
2. Open and edit the starter routine; add, reorder, and remove steps.
3. Start the routine, check a step, and refresh or open another authenticated
   session to verify the saved state.
4. Start/pause/reset a timer and verify its persisted state.
5. Check all steps and finish; the run appears in history.
6. Start a fresh run with unchecked steps while the previous run stays intact.
7. Create another routine category and run it through the same workflow.
8. Redeploy on Railway and verify stored routines and runs remain available.
