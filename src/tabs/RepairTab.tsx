import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting } from '../db';
import { todayKey } from '../lib/dates';

type Step = 'idle' | 'name' | 'repair' | 'adjust' | 'resume' | 'done';

export default function RepairTab() {
  const [step, setStep] = useState<Step>('idle');
  const [named, setNamed] = useState('');
  const [personAffected, setPersonAffected] = useState<boolean | null>(null);
  const [repairPlan, setRepairPlan] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);

  const escalationText =
    useLiveQuery(async () => getSetting<string>('escalationPage'), []) ?? '';

  const reset = () => {
    setStep('idle');
    setNamed('');
    setPersonAffected(null);
    setRepairPlan('');
    setAdjustment('');
  };

  const complete = async () => {
    await db.repairs.add({
      date: todayKey(),
      named: named.trim(),
      personAffected: personAffected === true,
      repairPlan: personAffected ? repairPlan.trim() : '',
      repairDone: false,
      adjustment: adjustment.trim(),
      completedAt: new Date().toISOString()
    });
    setStep('done');
  };

  if (showEscalation) {
    return (
      <div className="space-y-4">
        <button className="text-mid font-medium pt-2" onClick={() => setShowEscalation(false)}>
          ← Back
        </button>
        <div className="card whitespace-pre-wrap leading-relaxed text-neutral-700">
          {escalationText}
        </div>
        <p className="text-sm text-neutral-500 px-1">
          You can edit this page in Review → Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col min-h-[70vh]">
      <header className="pt-2">
        <h1 className="text-xl font-semibold text-ink">Repair</h1>
        <p className="text-sm text-neutral-500">Name it, repair it, adjust, resume.</p>
      </header>

      <div className="flex-1 space-y-4">
        {step === 'idle' && (
          <button className="btn-primary w-full py-4 text-lg" onClick={() => setStep('name')}>
            Something went sideways
          </button>
        )}

        {step === 'name' && (
          <div className="card space-y-3">
            <div className="text-sm font-medium text-mid">Step 1 — Name it</div>
            <input
              className="input"
              placeholder="What happened, plainly."
              value={named}
              autoFocus
              onChange={(e) => setNamed(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn-quiet text-sm" onClick={reset}>
                Cancel
              </button>
              <button
                className="btn-primary text-sm disabled:opacity-40"
                disabled={!named.trim()}
                onClick={() => setStep('repair')}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 'repair' && (
          <div className="card space-y-3">
            <div className="text-sm font-medium text-mid">Step 2 — Repair</div>
            <div className="text-neutral-700">Was a person affected?</div>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setPersonAffected(v)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                    personAffected === v
                      ? 'bg-ink text-white border-ink'
                      : 'border-lavender text-neutral-600 hover:bg-lavender'
                  }`}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
            {personAffected === true && (
              <input
                className="input"
                placeholder="What’s the repair, and when will you do it?"
                value={repairPlan}
                onChange={(e) => setRepairPlan(e.target.value)}
              />
            )}
            <div className="flex justify-end">
              <button
                className="btn-primary text-sm disabled:opacity-40"
                disabled={
                  personAffected === null || (personAffected === true && !repairPlan.trim())
                }
                onClick={() => setStep('adjust')}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 'adjust' && (
          <div className="card space-y-3">
            <div className="text-sm font-medium text-mid">Step 3 — Adjust</div>
            <input
              className="input"
              placeholder="What one condition made this likely, and what changes?"
              value={adjustment}
              autoFocus
              onChange={(e) => setAdjustment(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                className="btn-primary text-sm disabled:opacity-40"
                disabled={!adjustment.trim()}
                onClick={() => setStep('resume')}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 'resume' && (
          <div className="card space-y-3 text-center py-8">
            <div className="text-sm font-medium text-mid">Step 4 — Resume</div>
            <button className="btn-primary mx-auto" onClick={complete}>
              Debt settled. Resume.
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="card text-center py-10 space-y-3">
            <div className="text-good text-2xl">✓</div>
            <p className="text-ink font-medium text-lg">
              That is the entire debt. No interest accrues.
            </p>
            {personAffected && repairPlan.trim() && (
              <p className="text-sm text-neutral-500">
                Your repair will sit on Today until it’s done.
              </p>
            )}
            <button className="btn-quiet mx-auto" onClick={reset}>
              Close
            </button>
          </div>
        )}
      </div>

      <button
        className="text-sm text-neutral-500 underline text-left px-1 pb-2"
        onClick={() => setShowEscalation(true)}
      >
        If the heavy version of this is back — the punishment spiral — that’s the pre-agreed
        trigger to talk to a person, not to write a better rule.
      </button>
    </div>
  );
}
