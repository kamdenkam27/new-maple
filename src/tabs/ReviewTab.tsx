import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting, setSetting, DEFAULT_SETTINGS } from '../db';
import { todayKey, weekOfKey, prettyDate } from '../lib/dates';
import {
  requestNotificationPermission,
  notificationsSupported
} from '../lib/notifications';

export default function ReviewTab() {
  const [view, setView] = useState<'main' | 'weekly' | 'settings' | 'repairLog'>('main');

  if (view === 'weekly') return <WeeklyReview onBack={() => setView('main')} />;
  if (view === 'settings') return <Settings onBack={() => setView('main')} />;
  if (view === 'repairLog') return <RepairLog onBack={() => setView('main')} />;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-xl font-semibold text-ink">Review</h1>
      </header>

      <FocusLedger />

      <button className="card w-full text-left hover:bg-paper transition-colors" onClick={() => setView('weekly')}>
        <div className="font-medium text-ink">Weekly review</div>
        <div className="text-sm text-neutral-500">Five minutes. Just honest.</div>
      </button>

      <button className="card w-full text-left hover:bg-paper transition-colors" onClick={() => setView('repairLog')}>
        <div className="font-medium text-ink">Repair log</div>
        <div className="text-sm text-neutral-500">A private record, by date.</div>
      </button>

      <button className="card w-full text-left hover:bg-paper transition-colors" onClick={() => setView('settings')}>
        <div className="font-medium text-ink">Settings</div>
        <div className="text-sm text-neutral-500">Reminders, routines, backup.</div>
      </button>
    </div>
  );
}

function FocusLedger() {
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const sessions = useLiveQuery(() => db.focusSessions.toArray(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState(todayKey());
  const [newCat, setNewCat] = useState('');

  const weekStart = weekOfKey();
  const totals = useMemo(() => {
    const map = new Map<number, { lifetime: number; week: number }>();
    for (const s of sessions ?? []) {
      const t = map.get(s.categoryId) ?? { lifetime: 0, week: 0 };
      t.lifetime += s.minutes;
      if (s.date >= weekStart) t.week += s.minutes;
      map.set(s.categoryId, t);
    }
    return map;
  }, [sessions, weekStart]);

  const hours = (m: number) => (m / 60).toFixed(m % 60 === 0 ? 0 : 1);

  const addManual = async () => {
    const m = parseInt(minutes, 10);
    if (!m || m <= 0 || categoryId === '') return;
    await db.focusSessions.add({ date, minutes: m, categoryId, source: 'manual' });
    setMinutes('');
    setAddOpen(false);
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    await db.categories.add({ label: newCat.trim(), active: true });
    setNewCat('');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="font-medium text-ink">Focus ledger</div>
        <div className="flex gap-2 text-sm">
          <button className="text-mid font-medium" onClick={() => setAddOpen((v) => !v)}>
            + Add time
          </button>
          <button className="text-neutral-400" onClick={() => setManageOpen((v) => !v)}>
            edit
          </button>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {(categories ?? [])
          .filter((c) => c.active)
          .map((c) => {
            const t = totals.get(c.id!) ?? { lifetime: 0, week: 0 };
            return (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 flex items-center gap-2">
                  {c.label}
                  {manageOpen && (
                    <button
                      className="text-neutral-300 hover:text-ember"
                      onClick={() => db.categories.update(c.id!, { active: false })}
                      title="Hide category"
                    >
                      ×
                    </button>
                  )}
                </span>
                <span className="text-neutral-500 tabular-nums">
                  {hours(t.week)} h this week · {hours(t.lifetime)} h lifetime
                </span>
              </li>
            );
          })}
      </ul>
      {manageOpen && (
        <div className="mt-3 flex gap-2">
          <input
            className="input"
            placeholder="New category"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button className="btn-quiet text-sm" onClick={addCategory}>
            Add
          </button>
        </div>
      )}
      {addOpen && (
        <div className="mt-3 space-y-2 border-t border-lavender pt-3">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              className="input"
              placeholder="Minutes"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              <option value="" disabled>
                Category…
              </option>
              {(categories ?? [])
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn-primary text-sm" onClick={addManual}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyReview({ onBack }: { onBack: () => void }) {
  const reviews = useLiveQuery(() => db.reviews.reverse().sortBy('weekOf'), []);
  const week = weekOfKey();
  const existing = (reviews ?? []).find((r) => r.weekOf === week);
  const [wellWithPeople, setWell] = useState('');
  const [nextWeekNeeds, setNeeds] = useState('');
  const [driftCheck, setDrift] = useState('');
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const sorted = [...(reviews ?? [])].sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));

  const save = async () => {
    await db.reviews.add({ weekOf: week, wellWithPeople, nextWeekNeeds, driftCheck });
    setSaved(true);
    setStarted(false);
  };

  return (
    <div className="space-y-4">
      <button className="text-mid font-medium pt-2" onClick={onBack}>
        ← Review
      </button>
      <header>
        <h1 className="text-xl font-semibold text-ink">Weekly review</h1>
        <p className="text-sm text-neutral-500">Five minutes. Just honest.</p>
      </header>

      {!started && !existing && !saved && (
        <button className="btn-primary w-full" onClick={() => setStarted(true)}>
          Start this week’s review
        </button>
      )}
      {(existing || saved) && !started && (
        <div className="card text-sm text-neutral-500">This week’s review is in. ✓</div>
      )}

      {started && (
        <div className="card space-y-3">
          <div>
            <label className="label">What went well with people this week?</label>
            <textarea className="input" rows={3} value={wellWithPeople} onChange={(e) => setWell(e.target.value)} />
          </div>
          <div>
            <label className="label">What does next week need?</label>
            <textarea className="input" rows={3} value={nextWeekNeeds} onChange={(e) => setNeeds(e.target.value)} />
          </div>
          <div>
            <label className="label">Anything drifting toward the old patterns?</label>
            <textarea className="input" rows={3} value={driftCheck} onChange={(e) => setDrift(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={save}>
              Save
            </button>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-mid">Past reviews</div>
          {sorted.map((r) => (
            <details key={r.id} className="card">
              <summary className="cursor-pointer text-sm font-medium text-ink">
                Week of {prettyDate(r.weekOf)}
              </summary>
              <div className="mt-2 space-y-2 text-sm text-neutral-600">
                <p><span className="text-mid">People:</span> {r.wellWithPeople || '—'}</p>
                <p><span className="text-mid">Next week:</span> {r.nextWeekNeeds || '—'}</p>
                <p><span className="text-mid">Drift:</span> {r.driftCheck || '—'}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function RepairLog({ onBack }: { onBack: () => void }) {
  const repairs = useLiveQuery(() => db.repairs.reverse().sortBy('date'), []);
  const sorted = [...(repairs ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <button className="text-mid font-medium pt-2" onClick={onBack}>
        ← Review
      </button>
      <header>
        <h1 className="text-xl font-semibold text-ink">Repair log</h1>
      </header>
      {sorted.length === 0 && (
        <p className="text-sm text-neutral-500 px-1">Nothing here. That’s fine too.</p>
      )}
      {sorted.map((r) => (
        <div key={r.id} className="card space-y-1 text-sm">
          <div className="font-medium text-ink">{prettyDate(r.date)}</div>
          <p className="text-neutral-700">{r.named}</p>
          {r.repairPlan && (
            <p className="text-neutral-500">
              Repair: {r.repairPlan} {r.repairDone ? '✓' : '(on Today)'}
            </p>
          )}
          {r.adjustment && <p className="text-neutral-500">Adjust: {r.adjustment}</p>}
        </div>
      ))}
    </div>
  );
}

function Settings({ onBack }: { onBack: () => void }) {
  const waterTarget = useLiveQuery(async () => getSetting<number>('waterTarget'), []);
  const notifyTime = useLiveQuery(async () => getSetting<string>('connectionNotifyTime'), []);
  const notificationsEnabled =
    useLiveQuery(async () => getSetting<boolean>('notificationsEnabled'), []) ?? false;
  const semiAnnualDates =
    useLiveQuery(async () => getSetting<string[]>('semiAnnualDates'), []) ?? [];
  const escalationPage = useLiveQuery(async () => getSetting<string>('escalationPage'), []);
  const routineItems = useLiveQuery(() => db.routineItems.orderBy('order').toArray(), []);
  const [escalationDraft, setEscalationDraft] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<{ list: 'morning' | 'night'; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const ok = await requestNotificationPermission();
      await setSetting('notificationsEnabled', ok);
    } else {
      await setSetting('notificationsEnabled', false);
    }
  };

  const exportData = async () => {
    setBusy(true);
    const dump: Record<string, unknown> = {};
    for (const table of db.tables) {
      dump[table.name] = await table.toArray();
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `textbook-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  };

  const importData = async (file: File) => {
    setBusy(true);
    try {
      const dump = JSON.parse(await file.text()) as Record<string, unknown[]>;
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          if (Array.isArray(dump[table.name])) {
            await table.clear();
            await table.bulkAdd(dump[table.name] as never[]);
          }
        }
      });
      window.alert('Import complete. Everything is back.');
    } catch {
      window.alert('That file didn’t look like a Textbook backup. Nothing was changed.');
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <button className="text-mid font-medium pt-2" onClick={onBack}>
        ← Review
      </button>
      <header>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
      </header>

      <div className="card space-y-3">
        <div className="font-medium text-ink">Reminders</div>
        {notificationsSupported() ? (
          <label className="flex items-center justify-between text-sm">
            <span>Daily connections notification</span>
            <button
              onClick={toggleNotifications}
              className={`rounded-full w-11 h-6 transition-colors relative ${
                notificationsEnabled ? 'bg-ink' : 'bg-lavender'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  notificationsEnabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>
        ) : (
          <p className="text-sm text-neutral-500">
            Notifications aren’t available here — due badges show in-app instead.
          </p>
        )}
        <label className="flex items-center justify-between text-sm">
          <span>Notification time</span>
          <input
            type="time"
            className="input !w-32"
            value={notifyTime ?? '09:00'}
            onChange={(e) => setSetting('connectionNotifyTime', e.target.value)}
          />
        </label>
      </div>

      <div className="card space-y-3">
        <div className="font-medium text-ink">Daily targets</div>
        <label className="flex items-center justify-between text-sm">
          <span>Water target (cups)</span>
          <input
            type="number"
            min={1}
            className="input !w-20"
            value={waterTarget ?? 6}
            onChange={(e) => setSetting('waterTarget', Math.max(1, Number(e.target.value)))}
          />
        </label>
      </div>

      <div className="card space-y-2">
        <div className="font-medium text-ink">Routines</div>
        {(['morning', 'night'] as const).map((list) => (
          <div key={list}>
            <div className="text-sm font-medium text-mid capitalize mt-2">{list}</div>
            <ul className="space-y-1 mt-1">
              {(routineItems ?? [])
                .filter((i) => i.list === list && i.active)
                .map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{i.label}</span>
                    <button
                      className="text-neutral-300 hover:text-ember px-1"
                      onClick={() => db.routineItems.update(i.id!, { active: false })}
                    >
                      ×
                    </button>
                  </li>
                ))}
            </ul>
            {newItem?.list === list ? (
              <div className="flex gap-2 mt-1">
                <input
                  className="input"
                  autoFocus
                  value={newItem.label}
                  onChange={(e) => setNewItem({ list, label: e.target.value })}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newItem.label.trim()) {
                      const max = (routineItems ?? [])
                        .filter((i) => i.list === list)
                        .reduce((m, i) => Math.max(m, i.order), -1);
                      await db.routineItems.add({
                        list,
                        label: newItem.label.trim(),
                        order: max + 1,
                        active: true
                      });
                      setNewItem(null);
                    }
                  }}
                />
                <button className="btn-quiet text-sm" onClick={() => setNewItem(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="text-sm text-mid font-medium mt-1"
                onClick={() => setNewItem({ list, label: '' })}
              >
                + Add
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card space-y-2">
        <div className="font-medium text-ink">Semi-annual reading dates</div>
        <div className="flex gap-2">
          {[0, 1].map((i) => (
            <input
              key={i}
              className="input"
              placeholder="MM-DD"
              value={semiAnnualDates[i] ?? ''}
              onChange={(e) => {
                const next = [...semiAnnualDates];
                next[i] = e.target.value;
                setSetting('semiAnnualDates', next);
              }}
            />
          ))}
        </div>
      </div>

      <div className="card space-y-2">
        <div className="font-medium text-ink">Escalation page</div>
        <p className="text-sm text-neutral-500">
          Shown from the Repair tab. Your people, your numbers, in your words.
        </p>
        {escalationDraft === null ? (
          <>
            <div className="text-sm text-neutral-600 whitespace-pre-wrap">{escalationPage}</div>
            <button
              className="btn-quiet text-sm"
              onClick={() =>
                setEscalationDraft(
                  escalationPage ?? (DEFAULT_SETTINGS.escalationPage as string)
                )
              }
            >
              Edit
            </button>
          </>
        ) : (
          <>
            <textarea
              className="input"
              rows={6}
              value={escalationDraft}
              onChange={(e) => setEscalationDraft(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-quiet text-sm" onClick={() => setEscalationDraft(null)}>
                Cancel
              </button>
              <button
                className="btn-primary text-sm"
                onClick={async () => {
                  await setSetting('escalationPage', escalationDraft);
                  setEscalationDraft(null);
                }}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card space-y-3">
        <div className="font-medium text-ink">Backup</div>
        <div className="flex gap-2">
          <button className="btn-primary text-sm" onClick={exportData} disabled={busy}>
            Export all data (JSON)
          </button>
          <label className="btn-quiet text-sm cursor-pointer">
            Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-400">
          Everything lives on this device. Export now and then; keep the file somewhere safe.
        </p>
      </div>
    </div>
  );
}
