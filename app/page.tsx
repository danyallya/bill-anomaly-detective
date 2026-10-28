'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LuActivity, LuDatabase, LuShieldAlert, LuTrash2, LuWifiOff } from 'react-icons/lu';
import { localDatabase } from '@/client-db';
import {
  compareBillPeriods,
  createBillComparison,
  isBillComparisonRecord,
  transitionBillComparison,
  updateBillComparison,
  type BillComparisonError,
  type BillComparisonField,
  type BillComparisonInput,
  type BillComparisonRecord,
} from '@/domain/bill-comparison';
import { projectInfo } from '@/project-info';

const localComparisonId = 'local-monthly-usage-comparison';

function monthLabel(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function defaultInput(): BillComparisonInput {
  const current = new Date();
  const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  return {
    previousMonth: monthLabel(previous),
    previousUsageKwh: '',
    currentMonth: monthLabel(current),
    currentUsageKwh: '',
  };
}

function inputFromRecord(record: BillComparisonRecord): BillComparisonInput {
  return {
    previousMonth: record.periods[0].month,
    previousUsageKwh: String(record.periods[0].usageKwh),
    currentMonth: record.periods[1].month,
    currentUsageKwh: String(record.periods[1].usageKwh),
  };
}

function formatKwh(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${formatKwh(value)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'Unavailable because the previous period is zero.';
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}%`;
}

function saveMessage(state: 'idle' | 'unsaved' | 'saved' | 'error'): string {
  if (state === 'unsaved') return 'Unsaved changes. Saving stays on this device.';
  if (state === 'saved') return 'Saved in this browser only. Nothing is synced or shared.';
  if (state === 'error') return 'Could not save the comparison on this device.';
  return 'No saved comparison yet.';
}

export default function HomePage() {
  const [comparison, setComparison] = useState<BillComparisonRecord | null>(null);
  const [form, setForm] = useState<BillComparisonInput>(defaultInput);
  const [validationErrors, setValidationErrors] = useState<BillComparisonError[]>([]);
  const [storageState, setStorageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'unsaved' | 'saved' | 'error'>('idle');
  const [syntheticAcknowledged, setSyntheticAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadComparison = useCallback(async () => {
    setStorageState('loading');
    setActionError('');
    try {
      const saved = await localDatabase.billComparisons.get(localComparisonId);
      if (saved && !isBillComparisonRecord(saved)) throw new Error('Invalid stored comparison.');
      setComparison(saved ?? null);
      setForm(saved ? inputFromRecord(saved) : defaultInput());
      setSaveState(saved ? 'saved' : 'idle');
      setStorageState('ready');
    } catch {
      setComparison(null);
      setStorageState('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    localDatabase.billComparisons.get(localComparisonId)
      .then((saved) => {
        if (!active) return;
        if (saved && !isBillComparisonRecord(saved)) throw new Error('Invalid stored comparison.');
        setComparison(saved ?? null);
        if (saved) setForm(inputFromRecord(saved));
        setSaveState(saved ? 'saved' : 'idle');
        setStorageState('ready');
      })
      .catch(() => {
        if (active) {
          setComparison(null);
          setStorageState('error');
        }
      });
    return () => { active = false; };
  }, []);

  const errorsFor = (field: BillComparisonField) => validationErrors.filter((error) => error.field === field);

  function changeField(field: keyof BillComparisonInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => current.filter((error) => error.field !== field));
    setActionError('');
    setSaveState('unsaved');
  }

  async function saveComparison(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError('');
    if (!syntheticAcknowledged) {
      setActionError('Confirm that these are synthetic test values, not values from a real utility bill.');
      return;
    }

    const result = comparison
      ? updateBillComparison(comparison, form, new Date().toISOString())
      : createBillComparison(form, { id: localComparisonId, now: new Date().toISOString() });
    if (!result.ok) {
      setValidationErrors(result.errors);
      setSaveState('unsaved');
      return;
    }

    const previous = comparison;
    setValidationErrors([]);
    setComparison(result.value);
    setSaveState('unsaved');
    setBusy(true);
    try {
      await localDatabase.billComparisons.put(result.value);
      setSaveState('saved');
    } catch {
      setComparison(previous);
      setSaveState('error');
      setActionError('Could not save these synthetic values in this browser.');
    } finally {
      setBusy(false);
    }
  }

  async function changeReviewStatus() {
    if (!comparison || busy || saveState !== 'saved') return;
    setActionError('');
    const nextStatus = comparison.status === 'draft' ? 'reviewed' : 'draft';
    const result = transitionBillComparison(comparison, nextStatus, new Date().toISOString());
    if (!result.ok) {
      setActionError(result.errors[0]?.message ?? 'Could not change the review status.');
      return;
    }
    setComparison(result.value);
    setSaveState('unsaved');
    setBusy(true);
    try {
      await localDatabase.billComparisons.put(result.value);
      setSaveState('saved');
    } catch {
      setComparison(comparison);
      setSaveState('error');
      setActionError('Could not save the review status in this browser.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteComparison() {
    if (!comparison || busy) return;
    if (!window.confirm('Delete this saved local comparison and discard any unsaved edits? This cannot be undone here.')) return;
    setActionError('');
    setSaveState('unsaved');
    setBusy(true);
    try {
      await localDatabase.billComparisons.delete(comparison.id);
      setComparison(null);
      setForm(defaultInput());
      setSyntheticAcknowledged(false);
      setSaveState('idle');
    } catch {
      setSaveState('error');
      setActionError('Could not delete the comparison from this browser.');
    } finally {
      setBusy(false);
    }
  }

  const difference = comparison ? compareBillPeriods(comparison) : null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-semibold text-sky-800">{projectInfo.scope}</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{projectInfo.title}</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">Observed usage only</span>
        </header>

        <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="flex items-center gap-2 font-semibold text-amber-950">
            <LuShieldAlert aria-hidden="true" /> Synthetic values only
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            Use invented test values only. Do not enter actual kWh totals or other details from a utility account. This prototype saves usage values in browser storage without application-level encryption, backup or recovery. It does not collect a provider, tariff, bill image, meter ID, account number, address, currency or cost.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <LuActivity className="mt-1 text-sky-800" size={22} aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold">Compare two monthly totals</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Enter two synthetic month labels and kWh totals manually. No bill or document is uploaded.</p>
              </div>
            </div>

            <div className="mb-5 rounded-lg bg-slate-50 p-3 text-sm" role="status" aria-live="polite" aria-busy={storageState === 'loading' || busy}>
              {storageState === 'loading' ? 'Opening local comparison storage…' : storageState === 'error' ? 'Could not open this browser’s local storage.' : saveMessage(saveState)}
            </div>

            {storageState === 'error' ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-900">The saved comparison could not be loaded or validated.</p>
                <button className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-900 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void loadComparison()}>
                  Try again
                </button>
              </div>
            ) : storageState === 'ready' ? (
              <>
                {!comparison && <p className="mb-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No comparison saved yet. Enter synthetic values to preview an observed difference.</p>}

                <form className="space-y-5" onSubmit={saveComparison} noValidate>
                  <fieldset disabled={busy || comparison?.status === 'reviewed'}>
                    <legend className="mb-3 text-sm font-semibold">Monthly meter use</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium" htmlFor="previous-month">Previous billing month</label>
                        <input
                          id="previous-month"
                          type="month"
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-200"
                          value={form.previousMonth}
                          aria-invalid={errorsFor('previousMonth').length > 0}
                          aria-describedby={errorsFor('previousMonth').length ? 'previous-month-error' : undefined}
                          onChange={(event) => changeField('previousMonth', event.target.value)}
                        />
                        {errorsFor('previousMonth').map((error) => <p id="previous-month-error" key={error.message} className="mt-1 text-sm text-red-700">{error.message}</p>)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium" htmlFor="previous-kwh">Previous use (kWh)</label>
                        <input
                          id="previous-kwh"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="1000000"
                          step="0.001"
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-200"
                          value={form.previousUsageKwh}
                          aria-invalid={errorsFor('previousUsageKwh').length > 0}
                          aria-describedby={errorsFor('previousUsageKwh').length ? 'previous-kwh-error' : undefined}
                          onChange={(event) => changeField('previousUsageKwh', event.target.value)}
                        />
                        {errorsFor('previousUsageKwh').map((error) => <p id="previous-kwh-error" key={error.message} className="mt-1 text-sm text-red-700">{error.message}</p>)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium" htmlFor="current-month">Current billing month</label>
                        <input
                          id="current-month"
                          type="month"
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-200"
                          value={form.currentMonth}
                          aria-invalid={errorsFor('currentMonth').length > 0}
                          aria-describedby={errorsFor('currentMonth').length ? 'current-month-error' : undefined}
                          onChange={(event) => changeField('currentMonth', event.target.value)}
                        />
                        {errorsFor('currentMonth').map((error) => <p id="current-month-error" key={error.message} className="mt-1 text-sm text-red-700">{error.message}</p>)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium" htmlFor="current-kwh">Current use (kWh)</label>
                        <input
                          id="current-kwh"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="1000000"
                          step="0.001"
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-200"
                          value={form.currentUsageKwh}
                          aria-invalid={errorsFor('currentUsageKwh').length > 0}
                          aria-describedby={errorsFor('currentUsageKwh').length ? 'current-kwh-error' : undefined}
                          onChange={(event) => changeField('currentUsageKwh', event.target.value)}
                        />
                        {errorsFor('currentUsageKwh').map((error) => <p id="current-kwh-error" key={error.message} className="mt-1 text-sm text-red-700">{error.message}</p>)}
                      </div>
                    </div>
                  </fieldset>

                  <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    <input
                      className="mt-1 size-4 accent-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2"
                      type="checkbox"
                      checked={syntheticAcknowledged}
                      disabled={busy}
                      onChange={(event) => {
                        setSyntheticAcknowledged(event.target.checked);
                        setActionError('');
                      }}
                    />
                    <span>I am using invented test values, not data from a real utility bill.</span>
                  </label>

                  {comparison?.status !== 'reviewed' && (
                    <button disabled={busy} type="submit" className="rounded-lg bg-sky-800 px-4 py-2.5 font-medium text-white hover:bg-sky-900 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2">
                      {comparison ? 'Save comparison on this device' : 'Save comparison on this device'}
                    </button>
                  )}
                </form>

                {comparison && difference && (
                  <section className="mt-7 rounded-2xl border border-sky-200 bg-sky-50 p-5" aria-labelledby="difference-heading">
                    {saveState === 'unsaved' && <p className="mb-3 rounded-lg bg-white p-3 text-sm text-slate-700">These results show the last saved values. Save your edits before reviewing the comparison.</p>}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 id="difference-heading" className="text-lg font-semibold">Observed usage difference</h3>
                        <p className="mt-1 text-sm text-slate-600">{comparison.periods[0].month} to {comparison.periods[1].month} · {comparison.status === 'draft' ? 'Draft' : 'Reviewed'}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">No cause inferred</span>
                    </div>
                    <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-white p-4"><dt className="text-xs text-slate-600">Previous total</dt><dd className="mt-1 text-lg font-semibold">{formatKwh(difference.previousKwh)} kWh</dd></div>
                      <div className="rounded-xl bg-white p-4"><dt className="text-xs text-slate-600">Current total</dt><dd className="mt-1 text-lg font-semibold">{formatKwh(difference.currentKwh)} kWh</dd></div>
                      <div className="rounded-xl bg-white p-4"><dt className="text-xs text-slate-600">Observed difference</dt><dd className="mt-1 text-lg font-semibold">{signed(difference.differenceKwh)} kWh</dd></div>
                    </dl>
                    <p className="mt-4 text-sm"><strong>Relative change:</strong> {formatPercent(difference.percentageChange)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">Formula: current total − previous total; percentage = difference ÷ previous total. Totals are not adjusted for bill-day count, weather or household changes. No tariff rule or cause is estimated.</p>
                  </section>
                )}

                {comparison && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button disabled={busy || saveState !== 'saved'} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void changeReviewStatus()}>
                      {comparison.status === 'draft' ? 'Mark comparison reviewed' : 'Reopen for edits'}
                    </button>
                    <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void deleteComparison()}>
                      <LuTrash2 aria-hidden="true" /> Delete from this browser
                    </button>
                  </div>
                )}
              </>
            ) : null}

            {actionError && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">{actionError}</p>}
          </div>

          <aside className="grid content-start gap-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <LuDatabase className="mb-3 text-sky-800" aria-hidden="true" />
              <h2 className="font-semibold">Local only</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Drafts live in IndexedDB in this browser. They are not sent to a server, synced or backed up.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <LuWifiOff className="mb-3 text-sky-800" aria-hidden="true" />
              <h2 className="font-semibold">Transparent comparison</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">The app shows only the submitted kWh totals and arithmetic difference. It does not explain why usage changed or estimate a bill.</p>
            </article>
          </aside>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          A synthetic-data prototype for monthly totals. Real utility records remain unsupported until local protection, recovery and consent requirements are designed.
        </footer>
      </div>
    </main>
  );
}
