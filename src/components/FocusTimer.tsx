import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting, setSetting } from '../db';

interface ActiveFocus {
  startedAt: number;
  categoryId: number;
}

export default function FocusTimer({
  day,
  totalTodayMinutes
}: {
  day: string;
  totalTodayMinutes: number;
}) {
  const categories = useLiveQuery(() => db.categories.filter((c) => c.active).toArray(), []);
  const active = useLiveQuery(async () => getSetting<ActiveFocus | null>('activeFocus'), []);
  const [now, setNow] = useState(Date.now());
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const start = async (categoryId: number) => {
    await setSetting('activeFocus', { startedAt: Date.now(), categoryId });
    setPicking(false);
  };

  const stop = async () => {
    if (!active) return;
    const minutes = Math.max(1, Math.round((Date.now() - active.startedAt) / 60000));
    await db.focusSessions.add({
      date: day,
      minutes,
      categoryId: active.categoryId,
      source: 'timer'
    });
    await setSetting('activeFocus', null);
  };

  if (active) {
    const elapsed = Math.max(0, now - active.startedAt);
    const mm = Math.floor(elapsed / 60000);
    const ss = Math.floor((elapsed % 60000) / 1000);
    const cat = (categories ?? []).find((c) => c.id === active.categoryId);
    return (
      <div className="card flex items-center gap-4">
        <div className="flex-1">
          <div className="font-medium text-ink">Deep focus — {cat?.label ?? '…'}</div>
          <div className="text-2xl font-semibold text-ink tabular-nums">
            {mm}:{String(ss).padStart(2, '0')}
          </div>
        </div>
        <button className="btn-primary" onClick={stop}>
          Finish
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="font-medium text-ink">Deep focus</div>
          <div className="text-sm text-neutral-500">{totalTodayMinutes} min today</div>
        </div>
        <button className="btn-primary" onClick={() => setPicking((p) => !p)}>
          Start
        </button>
      </div>
      {picking && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(categories ?? []).map((c) => (
            <button
              key={c.id}
              className="btn-quiet text-sm"
              onClick={() => start(c.id!)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
