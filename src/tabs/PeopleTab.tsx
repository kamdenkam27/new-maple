import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ConnectionType } from '../db';
import { computePersonState, sortPersonStates, type PersonStatus } from '../lib/status';
import { todayKey, prettyDate } from '../lib/dates';

const STATUS_LABEL: Record<PersonStatus, string> = {
  good: 'connected',
  dueSoon: 'due soon',
  overdue: 'reach out',
  noneYet: 'no log yet'
};

const STATUS_CLASS: Record<PersonStatus, string> = {
  good: 'text-good',
  dueSoon: 'text-neutral-700 bg-gold/20 rounded-full px-2',
  overdue: 'text-ember bg-ember/10 rounded-full px-2',
  noneYet: 'text-neutral-400'
};

export default function PeopleTab({
  initialLogPersonId,
  onConsumedInitial
}: {
  initialLogPersonId: number | null;
  onConsumedInitial: () => void;
}) {
  const people = useLiveQuery(() => db.people.toArray(), []);
  const connections = useLiveQuery(() => db.connections.toArray(), []);
  const [logOpenFor, setLogOpenFor] = useState<number | 'any' | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (initialLogPersonId != null) {
      setLogOpenFor(initialLogPersonId);
      onConsumedInitial();
    }
  }, [initialLogPersonId, onConsumedInitial]);

  const states = useMemo(() => {
    if (!people || !connections) return [];
    return sortPersonStates(
      people.filter((p) => p.active).map((p) => computePersonState(p, connections))
    );
  }, [people, connections]);

  const archived = (people ?? []).filter((p) => !p.active);

  // Gentle continuity: connections logged this calendar month, counted by person.
  const monthCount = useMemo(() => {
    if (!connections) return 0;
    const prefix = todayKey().slice(0, 7);
    return new Set(
      connections.filter((c) => c.date.startsWith(prefix)).map((c) => c.personId)
    ).size;
  }, [connections]);

  const addPerson = async () => {
    const name = newName.trim();
    if (!name) return;
    await db.people.add({ name, cadenceDays: 14, active: true, createdAt: new Date().toISOString() });
    setNewName('');
    setAdding(false);
  };

  if (detailId != null) {
    return <PersonDetail personId={detailId} onBack={() => setDetailId(null)} />;
  }

  return (
    <div className="space-y-4">
      <header className="pt-2 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">People</h1>
          {monthCount > 0 && (
            <p className="text-sm text-neutral-500">
              Connected with {monthCount} {monthCount === 1 ? 'person' : 'people'} this month.
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={() => setLogOpenFor('any')}>
          + Log connection
        </button>
      </header>

      <ul className="space-y-2">
        {states.map((s) => (
          <li key={s.person.id} className="card !p-0 flex items-center">
            <button
              className="flex-1 text-left px-4 py-3"
              onClick={() => setDetailId(s.person.id!)}
            >
              <div className="font-medium text-neutral-800">{s.person.name}</div>
              <div className="text-sm text-neutral-500">
                {s.lastConnected
                  ? `${s.daysSince} ${s.daysSince === 1 ? 'day' : 'days'} since`
                  : 'Every friendship starts with one log.'}
                <span className={`ml-2 text-xs font-medium ${STATUS_CLASS[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            </button>
            <button
              className="px-4 py-3 text-mid font-medium text-sm hover:text-ink"
              onClick={() => setLogOpenFor(s.person.id!)}
            >
              Log
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="card flex gap-2">
          <input
            className="input"
            placeholder="Name"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPerson()}
          />
          <button className="btn-primary" onClick={addPerson}>
            Add
          </button>
          <button className="btn-quiet" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn-quiet w-full" onClick={() => setAdding(true)}>
          + Add person
        </button>
      )}

      {archived.length > 0 && (
        <div>
          <button
            className="text-sm text-neutral-500 underline"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 space-y-2">
              {archived.map((p) => (
                <li key={p.id} className="card flex items-center justify-between">
                  <span className="text-neutral-500">{p.name}</span>
                  <button
                    className="text-sm text-mid font-medium"
                    onClick={() => db.people.update(p.id!, { active: true })}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {logOpenFor !== null && (
        <QuickLogSheet
          presetPersonId={logOpenFor === 'any' ? null : logOpenFor}
          onClose={() => setLogOpenFor(null)}
        />
      )}
    </div>
  );
}

function QuickLogSheet({
  presetPersonId,
  onClose
}: {
  presetPersonId: number | null;
  onClose: () => void;
}) {
  const people = useLiveQuery(() => db.people.filter((p) => p.active).toArray(), []);
  const [personId, setPersonId] = useState<number | null>(presetPersonId);
  const [date, setDate] = useState(todayKey());
  const [type, setType] = useState<ConnectionType>('call');
  const [note, setNote] = useState('');

  const save = async () => {
    if (personId == null) return;
    await db.connections.add({ personId, date, type, note: note.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-20 bg-black/30 flex items-end md:items-center md:justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-ink text-lg">Log a connection</h2>
        <div>
          <label className="label">Person</label>
          <select
            className="input"
            value={personId ?? ''}
            onChange={(e) => setPersonId(Number(e.target.value))}
          >
            <option value="" disabled>
              Choose…
            </option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Type</label>
          <div className="flex gap-2">
            {(['call', 'hangout', 'other'] as ConnectionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium border capitalize transition-colors ${
                  type === t
                    ? 'bg-ink text-white border-ink'
                    : 'border-lavender text-neutral-600 hover:bg-lavender'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">
            What we talked about / what to remember for next time
          </label>
          <textarea
            className="input"
            rows={2}
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="text-xs text-neutral-400 text-right">{note.length}/280</div>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={personId == null}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonDetail({ personId, onBack }: { personId: number; onBack: () => void }) {
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const logs = useLiveQuery(
    () => db.connections.where('personId').equals(personId).reverse().sortBy('date'),
    [personId]
  );
  const [editingCadence, setEditingCadence] = useState(false);
  const [cadence, setCadence] = useState<number | null>(null);

  if (!person) return null;
  const sorted = [...(logs ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  // Average gap between consecutive logged connections, in days.
  let avgGap: number | null = null;
  if (sorted.length >= 2) {
    const asc = [...sorted].reverse();
    let total = 0;
    for (let i = 1; i < asc.length; i++) {
      total +=
        (new Date(asc[i].date).getTime() - new Date(asc[i - 1].date).getTime()) / 86400000;
    }
    avgGap = Math.round(total / (asc.length - 1));
  }

  const saveCadence = async () => {
    if (cadence && cadence > 0) await db.people.update(personId, { cadenceDays: cadence });
    setEditingCadence(false);
  };

  return (
    <div className="space-y-4">
      <button className="text-mid font-medium pt-2" onClick={onBack}>
        ← People
      </button>
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{person.name}</h1>
          <div className="text-sm text-neutral-500">
            {sorted.length} {sorted.length === 1 ? 'connection' : 'connections'} logged
            {avgGap != null && ` · about every ${avgGap} days`}
          </div>
        </div>
        <button
          className="text-sm text-neutral-400 hover:text-ember"
          onClick={() => {
            db.people.update(personId, { active: false });
            onBack();
          }}
        >
          Archive
        </button>
      </header>

      <div className="card flex items-center justify-between">
        <span className="text-sm text-neutral-600">Cadence</span>
        {editingCadence ? (
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className="input !w-20"
              value={cadence ?? person.cadenceDays}
              onChange={(e) => setCadence(Number(e.target.value))}
            />
            <button className="btn-primary text-sm" onClick={saveCadence}>
              Save
            </button>
          </span>
        ) : (
          <button
            className="text-mid font-medium text-sm"
            onClick={() => {
              setCadence(person.cadenceDays);
              setEditingCadence(true);
            }}
          >
            every {person.cadenceDays} days · edit
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {sorted.map((c) => (
          <li key={c.id} className="card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{prettyDate(c.date)}</span>
              <span className="text-xs uppercase tracking-wide text-mid">{c.type}</span>
            </div>
            {c.note && <p className="mt-1 text-sm text-neutral-600">{c.note}</p>}
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="text-sm text-neutral-500 px-1">Nothing logged yet. A call counts.</li>
        )}
      </ul>
    </div>
  );
}
