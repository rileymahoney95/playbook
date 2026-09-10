import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Routine, RoutineInput, StepInput } from '../shared/types';
import { api, ApiError, message, useData } from './api';
import { Back, ErrorNotice, Loading, PageTitle } from './ui';

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
  if (loading) return <Loading />;
  if (error) return <ErrorNotice retry={reload}>{error}</ErrorNotice>;
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
  if (routine?.archivedAt)
    return (
      <>
        <Back />
        <p className="notice mt-5">This routine is archived.</p>
      </>
    );
  return (
    <>
      <PageTitle>{routine ? 'Edit routine' : 'New routine'}</PageTitle>
      {routine?.activeRunId && (
        <p className="notice mb-6">
          A run is in progress. These edits will apply to your next run.
        </p>
      )}
      <form onSubmit={save} onChange={() => setDirty(true)} className="grid gap-6">
        <fieldset disabled={busy} className="grid gap-5">
          <label>
            Routine name
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              placeholder="Morning mobility"
            />
          </label>
          <label>
            Category
            <input
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
          </label>
          <label>
            Description <span className="optional">optional</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={2}
            />
          </label>
        </fieldset>
        <div className="flex justify-between items-center">
          <h2>Steps</h2>
          <span className="muted text-sm">{steps.length} / 100</span>
        </div>
        {steps.map((step, index) => (
          <fieldset
            disabled={busy}
            key={step.key}
            className="card grid gap-4"
            aria-label={`Step ${index + 1}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3>Step {index + 1}</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="button compact secondary"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move step ${index + 1} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="button compact secondary"
                  disabled={index === steps.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move step ${index + 1} down`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="button compact secondary"
                  disabled={steps.length === 1}
                  onClick={() => {
                    setDirty(true);
                    setSteps((old) => old.filter((_, i) => i !== index));
                  }}
                  aria-label={`Remove step ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            </div>
            <label>
              Step name
              <input
                value={step.title}
                onChange={(e) => updateStep(index, { title: e.target.value })}
                required
                maxLength={160}
              />
            </label>
            <label>
              Instructions <span className="optional">optional</span>
              <textarea
                rows={2}
                value={step.instructions}
                onChange={(e) => updateStep(index, { instructions: e.target.value })}
                maxLength={4000}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Reps or quantity <span className="optional">optional</span>
                <input
                  value={step.quantity}
                  onChange={(e) => updateStep(index, { quantity: e.target.value })}
                  maxLength={120}
                  placeholder="6 reps / 30 seconds each side"
                />
              </label>
              <label>
                Timer in seconds <span className="optional">optional</span>
                <input
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
              </label>
            </div>
            <label>
              Reference link <span className="optional">optional</span>
              <input
                type="url"
                value={step.referenceUrl}
                onChange={(e) => updateStep(index, { referenceUrl: e.target.value })}
                maxLength={2000}
                placeholder="https://…"
              />
            </label>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary justify-self-start"
          disabled={busy || steps.length >= 100}
          onClick={() => {
            setDirty(true);
            setSteps((old) => [...old, blankStep()]);
          }}
        >
          Add step
        </button>
        <ErrorNotice>{error}</ErrorNotice>
        {conflicted && (
          <button
            type="button"
            className="text-link justify-self-start"
            onClick={() => {
              if (window.confirm('Reload the saved version? Your unsaved changes will be lost.'))
                void reload();
            }}
          >
            Reload saved version
          </button>
        )}
        <div className="save-bar">
          <button className="button" disabled={busy || conflicted}>
            {busy ? 'Saving…' : 'Save routine'}
          </button>
          <button type="button" className="button secondary" onClick={cancel} disabled={busy}>
            Cancel
          </button>
          <span className="muted text-sm" role="status">
            {dirty ? 'Unsaved changes' : ''}
          </span>
        </div>
      </form>
      {routine && (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <button className="text-link text-sm text-red-700" onClick={archive} disabled={busy}>
            Archive routine
          </button>
          <p className="muted text-sm mt-2">Removes it from your list and keeps its history.</p>
        </div>
      )}
    </>
  );
}
