import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db, getSetting } from '../db';
import type { TabId } from '../App';
import { appDayKey } from '../lib/dates';
import { computePersonState, sortPersonStates } from '../lib/status';
import { rotatingLine } from '../lib/rotation';
import { maybeNotifyConnections } from '../lib/notifications';
import FocusTimer from '../components/FocusTimer';
import RoutineList from '../components/RoutineList';

export default function TodayTab({
  onOpenQuickLog,
  onGoTo
}: {
  onOpenQuickLog: (personId: number) => void;
  onGoTo: (tab: TabId) => void;
}) {
  const day = appDayKey();

  const sections = useLiveQuery(() => db.sections.toArray(), []);
  const entries = useLiveQuery(() => db.entries.toArray(), []);
  const activePeople = useLiveQuery(() => db.people.filter((p) => p.active).toArray(), []);
  const connections = useLiveQuery(() => db.connections.toArray(), []);
  const water = useLiveQuery(() => db.waterLog.where('date').equals(day).first(), [day]);
  const grace = useLiveQuery(() => db.graceLog.where('date').equals(day).first(), [day]);
  const graceAll = useLiveQuery(() => db.graceLog.toArray(), []);
  const focusToday = useLiveQuery(() => db.focusSessions.where('date').equals(day).toArray(), [day]);
  const openRepairs = useLiveQuery(
    () =>
      db.repairs
        .filter((r) => r.personAffected && !!r.repairPlan && !r.repairDone)
        .toArray(),
    []
  );

  const waterTarget = useLiveQuery(async () => getSetting<number>('waterTarget'), []) ?? 6;
  const semiAnnualDates =
    useLiveQuery(async () => getSetting<string[]>('semiAnnualDates'), []) ?? [];

  const line = useMemo(
    () => (sections && entries ? rotatingLine(day, sections, entries) : null),
    [day, sections, entries]
  );

  const states = useMemo(() => {
    if (!activePeople || !connections) return [];
    return sortPersonStates(activePeople.map((p) => computePersonState(p, connections)));
  }, [activePeople, connections]);

  const dueStates = states.filter((s) => s.status === 'dueSoon' || s.status === 'overdue');

  useEffect(() => {
    if (dueStates.length > 0) {
      maybeNotifyConnections(dueStates.map((s) => s.person.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueStates.length]);

  // "Partial grace acceptable but not more than two days in a row":
  // after two consecutive partial days, today gently asks for full grace.
  const fullGraceNote = useMemo(() => {
    if (!graceAll) return false;
    const byDate = new Map(graceAll.map((g) => [g.date, g.level]));
    const d = new Date();
    d.setHours(d.getHours() - 4);
    const keys: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - i);
      keys.push(format(prev, 'yyyy-MM-dd'));
    }
    return keys.every((k) => byDate.get(k) === 'partial');
  }, [graceAll]);

  const isSemiAnnualDay = semiAnnualDates.includes(format(new Date(), 'MM-dd'));

  const focusMinutes = (focusToday ?? []).reduce((sum, s) => sum + s.minutes, 0);
  const cups = water?.cups ?? 0;

  const setWater = async (delta: number) => {
    const next = Math.max(0, cups + delta);
    if (water?.id) await db.waterLog.update(water.id, { cups: next });
    else await db.waterLog.add({ date: day, cups: next });
  };

  const setGrace = async (level: 'full' | 'partial') => {
    if (grace?.level === level) {
      await db.graceLog.delete(grace.id!);
    } else if (grace?.id) {
      await db.graceLog.update(grace.id, { level });
    } else {
      await db.graceLog.add({ date: day, level });
    }
  };

  const ringPct = Math.min(100, waterTarget === 0 ? 0 : (cups / waterTarget) * 100);
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <div className="text-sm text-mid">{format(new Date(), 'EEEE, MMMM d')}</div>
        {line && (
          <p className="mt-1 text-lg text-ink font-medium leading-snug">“{line}”</p>
        )}
      </header>

      {isSemiAnnualDay && (
        <button
          onClick={() => onGoTo('textbook')}
          className="w-full card text-left border-gold bg-gold/10 hover:bg-gold/20 transition-colors"
        >
          <div className="font-medium text-ink">Full reading of the Textbook</div>
          <div className="text-sm text-neutral-600">
            It’s a semi-annual day. Open reading mode and take it section by section.
          </div>
        </button>
      )}

      {(openRepairs ?? []).map((r) => (
        <div key={r.id} className="card border-mid">
          <div className="text-sm text-mid font-medium mb-1">Repair to make</div>
          <div className="text-neutral-800">{r.repairPlan}</div>
          <button
            className="btn-quiet mt-3 text-sm"
            onClick={() => db.repairs.update(r.id!, { repairDone: true })}
          >
            Done — repaired
          </button>
        </div>
      ))}

      {dueStates.length > 0 && (
        <div>
          <div className="text-sm font-medium text-mid mb-2">Worth a reach-out</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dueStates.map((s) => (
              <button
                key={s.person.id}
                onClick={() => onOpenQuickLog(s.person.id!)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  s.status === 'overdue'
                    ? 'border-ember text-ember bg-ember/5 hover:bg-ember/10'
                    : 'border-gold text-neutral-700 bg-gold/10 hover:bg-gold/20'
                }`}
              >
                {s.person.name} · {s.daysSince}d
              </button>
            ))}
          </div>
        </div>
      )}

      <RoutineList list="morning" title="Morning" day={day} />
      <RoutineList list="night" title="Night" day={day} />

      <div className="card flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" stroke="#EDE7F6" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke={ringPct >= 100 ? '#2E7D32' : '#7B5EA7'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * ringPct) / 100}
              className="transition-all duration-200"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink">
            {cups}
          </div>
        </div>
        <div className="flex-1">
          <div className="font-medium text-ink">Water</div>
          <div className="text-sm text-neutral-500">
            {cups} of {waterTarget} cups
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-quiet w-10 h-10 !p-0 text-lg" onClick={() => setWater(-1)}>
            −
          </button>
          <button className="btn-primary w-10 h-10 !p-0 text-lg" onClick={() => setWater(1)}>
            +
          </button>
        </div>
      </div>

      <div className="card">
        <div className="font-medium text-ink mb-1">Grace</div>
        {fullGraceNote && !grace && (
          <div className="text-sm text-mid mb-2">Full grace today.</div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setGrace('full')}
            className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
              grace?.level === 'full'
                ? 'bg-good text-white border-good'
                : 'border-lavender text-neutral-600 hover:bg-lavender'
            }`}
          >
            Full grace
          </button>
          <button
            onClick={() => setGrace('partial')}
            className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
              grace?.level === 'partial'
                ? 'bg-mid text-white border-mid'
                : 'border-lavender text-neutral-600 hover:bg-lavender'
            }`}
          >
            Partial grace
          </button>
        </div>
      </div>

      <FocusTimer day={day} totalTodayMinutes={focusMinutes} />
    </div>
  );
}
