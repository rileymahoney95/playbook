import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Routine, RoutineInput, StepInput } from '../shared/types';
import { api, ApiError, message, useData } from './api';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  GripIcon,
  PlusIcon,
  TrashIcon,
} from './icons';
import {
  Badge,
  Button,
  ErrorNotice,
  Eyebrow,
  IconButton,
  Loading,
  pad2,
  PageHead,
  Panel,
  SectionHead,
  TextAreaField,
  TextField,
} from './ui';

type DraftStep = StepInput & { key: string };
const blankStep = (): DraftStep => ({
  key: crypto.randomUUID(),
  title: '',
  instructions: '',
  quantity: '',
  durationSeconds: null,
  referenceUrl: '',
});

export function RoutineEditor() {
  const { id } = useParams();
  const { data, error, loading, reload } = useData<Routine>(id ? `/api/routines/${id}` : null);
  if (loading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="page">
        <ErrorNotice retry={reload}>{error}</ErrorNotice>
      </div>
    );
  if (id && !data) return null;
  return (
    <EditorForm key={data ? `${data.id}:${data.version}` : 'new'} routine={data} reload={reload} />
  );
}

function EditorForm({ routine, reload }: { routine: Routine | null; reload: () => Promise<void> }) {
  const [title, setTitle] = useState(routine?.title ?? '');
  const [description, setDescription] = useState(routine?.description ?? '');
  const [category, setCategory] = useState(routine?.category ?? 'General');
  const [steps, setSteps] = useState<DraftStep[]>(
    routine?.steps.map((s) => ({ ...s, key: s.id })) ?? [blankStep()],
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflicted, setConflicted] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [dirty]);
  const updateStep = (index: number, update: Partial<DraftStep>) => {
    setDirty(true);
    setSteps((old) => old.map((s, i) => (i === index ? { ...s, ...update } : s)));
  };
  const move = (index: number, delta: number) => {
    setDirty(true);
    setSteps((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const input: RoutineInput = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      steps: steps.map(({ key: _key, ...step }) => ({
        ...step,
        title: step.title.trim(),
        referenceUrl: step.referenceUrl.trim(),
      })),
    };
    try {
      const result = await api<{ id: string }>(
        routine ? `/api/routines/${routine.id}` : '/api/routines',
        routine ? 'PUT' : 'POST',
        routine ? { ...input, version: routine.version } : input,
      );
      setDirty(false);
      navigate(`/routines/${result.id}`);
    } catch (e) {
      setError(message(e));
      setConflicted(e instanceof ApiError && e.status === 409);
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    if (
      !routine ||
      !window.confirm(
        'Archive this routine? It will leave your routine list. Saved history will remain.',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/routines/${routine.id}/archive`, 'POST');
      setDirty(false);
      navigate('/');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const cancel = () => {
    if (!dirty || window.confirm('Leave without saving your changes?'))
      navigate(routine ? `/routines/${routine.id}` : '/');
  };
  const back = (
    <IconButton label="Back" onClick={cancel}>
      <ChevronLeftIcon />
    </IconButton>
  );
  if (routine?.archivedAt)
    return (
      <div className="page">
        <PageHead
          back={back}
          eyebrow={<Eyebrow>Edit routine</Eyebrow>}
          title={routine.title}
          titleClass="title-lg"
        />
        <Panel className="notice-info">
          <div>
            <Badge tone="off">Archived</Badge>
          </div>
          <p className="small muted">This routine is archived. Its saved history remains.</p>
        </Panel>
      </div>
    );
  return (
    <div className="page">
      <PageHead
        back={back}
        eyebrow={<Eyebrow>{routine ? 'Edit routine' : 'New routine'}</Eyebrow>}
        title={routine?.title ?? 'Untitled routine'}
        titleClass="title-lg"
        action={
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="routine-form"
            busy={busy}
            busyLabel="Saving…"
            disabled={conflicted}
          >
            Save routine
          </Button>
        }
      />
      {routine?.activeRunId && (
        <Panel className="notice-info">
          <Eyebrow live>In progress</Eyebrow>
          <p className="small muted">
            A run is in progress. These edits will apply to your next run.
          </p>
        </Panel>
      )}
      <form
        id="routine-form"
        onSubmit={save}
        onChange={() => setDirty(true)}
        className="grid gap-6"
      >
        <fieldset disabled={busy} className="panel setting m-0 min-w-0">
          <TextField
            label="Routine name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Morning mobility"
          />
          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            maxLength={60}
            list="routine-categories"
          />
          <datalist id="routine-categories">
            <option>Mobility</option>
            <option>Workout</option>
            <option>Baby care</option>
            <option>Maintenance</option>
            <option>General</option>
          </datalist>
          <TextAreaField
            label="Description"
            optional
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="What is this routine for?"
          />
        </fieldset>
        <section className="grid gap-2">
          <SectionHead title="Steps" meta={`${steps.length} / 100`} />
          {steps.map((step, index) => (
            <fieldset
              disabled={busy}
              key={step.key}
              className="panel edit-step m-0 min-w-0"
              aria-label={`Step ${index + 1}`}
            >
              <span className="grip" aria-hidden="true">
                <GripIcon />
              </span>
              <div className="fields">
                <div className="head">
                  <span className="t">Step {pad2(index + 1)}</span>
                  <div className="flex gap-1">
                    <IconButton
                      size="sm"
                      label={`Move step ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={`Move step ${index + 1} down`}
                      disabled={index === steps.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={`Remove step ${index + 1}`}
                      disabled={steps.length === 1}
                      onClick={() => {
                        setDirty(true);
                        setSteps((old) => old.filter((_, i) => i !== index));
                      }}
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                </div>
                <TextField
                  label="Step name"
                  value={step.title}
                  onChange={(e) => updateStep(index, { title: e.target.value })}
                  required
                  maxLength={160}
                />
                <TextAreaField
                  label="Instructions"
                  optional
                  rows={2}
                  value={step.instructions}
                  onChange={(e) => updateStep(index, { instructions: e.target.value })}
                  maxLength={4000}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Reps or quantity"
                    optional
                    value={step.quantity}
                    onChange={(e) => updateStep(index, { quantity: e.target.value })}
                    maxLength={120}
                    placeholder="6 reps / 30 seconds each side"
                  />
                  <TextField
                    label="Timer in seconds"
                    optional
                    type="number"
                    min={1}
                    max={86400}
                    step={1}
                    inputMode="numeric"
                    value={step.durationSeconds ?? ''}
                    onChange={(e) =>
                      updateStep(index, {
                        durationSeconds: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="30"
                  />
                </div>
                <TextField
                  label="Reference link"
                  optional
                  type="url"
                  value={step.referenceUrl}
                  onChange={(e) => updateStep(index, { referenceUrl: e.target.value })}
                  maxLength={2000}
                  placeholder="https://…"
                />
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            className="dashed"
            disabled={busy || steps.length >= 100}
            onClick={() => {
              setDirty(true);
              setSteps((old) => [...old, blankStep()]);
            }}
          >
            <PlusIcon />
            Add step
          </button>
        </section>
        <ErrorNotice>{error}</ErrorNotice>
        {conflicted && (
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => {
              if (window.confirm('Reload the saved version? Your unsaved changes will be lost.'))
                void reload();
            }}
          >
            Reload saved version
          </Button>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={cancel} disabled={busy}>
            Cancel
          </Button>
          <span className="small faint mono" role="status">
            {dirty ? 'Unsaved changes' : ''}
          </span>
        </div>
      </form>
      {routine && (
        <div className="grid gap-2 border-t border-line pt-4">
          <div>
            <Button variant="danger-ghost" size="sm" onClick={archive} disabled={busy}>
              Archive routine
            </Button>
          </div>
          <p className="small faint">Removes it from your list and keeps its history.</p>
        </div>
      )}
    </div>
  );
}
