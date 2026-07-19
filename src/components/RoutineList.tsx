import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function RoutineList({
  list,
  title,
  day
}: {
  list: 'morning' | 'night';
  title: string;
  day: string;
}) {
  const [open, setOpen] = useState(true);

  const items = useLiveQuery(
    () => db.routineItems.where('list').equals(list).and((i) => i.active).sortBy('order'),
    [list]
  );
  const checks = useLiveQuery(
    () => db.routineChecks.where('date').equals(day).toArray(),
    [day]
  );

  if (!items) return null;
  const checkedIds = new Set((checks ?? []).filter((c) => c.checked).map((c) => c.itemId));
  const doneCount = items.filter((i) => checkedIds.has(i.id!)).length;

  const toggle = async (itemId: number) => {
    const existing = (checks ?? []).find((c) => c.itemId === itemId);
    if (existing) await db.routineChecks.update(existing.id!, { checked: !existing.checked });
    else await db.routineChecks.add({ itemId, date: day, checked: true });
  };

  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-medium text-ink">{title}</span>
        <span className="text-sm text-neutral-500">
          {doneCount === 0 ? 'New day. Start anywhere.' : `${doneCount} of ${items.length}`}
          <span className="ml-2 inline-block text-mid">{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1">
          {items.map((item) => {
            const done = checkedIds.has(item.id!);
            return (
              <li key={item.id}>
                <button
                  onClick={() => toggle(item.id!)}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-paper transition-colors"
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs transition-colors ${
                      done ? 'bg-good border-good text-white' : 'border-mid/40'
                    }`}
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className={done ? 'text-neutral-400' : 'text-neutral-700'}>
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
