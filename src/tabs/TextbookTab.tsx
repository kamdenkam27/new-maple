import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db, getSetting, setSetting, type Entry } from '../db';
import { renderMarkdownLite } from '../lib/markdown';

const ENTRENCH_PHRASE = 'I have reasoned this in writing';

export default function TextbookTab() {
  const sections = useLiveQuery(() => db.sections.orderBy('order').toArray(), []);
  const entries = useLiveQuery(() => db.entries.toArray(), []);
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [search, setSearch] = useState('');
  const [showRetired, setShowRetired] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  const semiAnnualDates =
    useLiveQuery(async () => getSetting<string[]>('semiAnnualDates'), []) ?? [];
  const progress =
    useLiveQuery(async () => getSetting<Record<string, number[]>>('semiAnnualProgress'), []) ?? {};

  const mmdd = format(new Date(), 'MM-dd');
  const isSemiAnnualDay = semiAnnualDates.includes(mmdd);
  const progressKey = `${new Date().getFullYear()}-${mmdd}`;
  const readSectionIds = new Set(progress[progressKey] ?? []);

  const toggleSectionRead = async (sectionId: number) => {
    const current = progress[progressKey] ?? [];
    const next = current.includes(sectionId)
      ? current.filter((id) => id !== sectionId)
      : [...current, sectionId];
    await setSetting('semiAnnualProgress', { ...progress, [progressKey]: next });
  };

  const bySection = useMemo(() => {
    const map = new Map<number, Entry[]>();
    for (const e of entries ?? []) {
      if (!map.has(e.sectionId)) map.set(e.sectionId, []);
      map.get(e.sectionId)!.push(e);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [entries]);

  const q = search.trim().toLowerCase();
  const matches = (e: Entry) => q === '' || e.text.toLowerCase().includes(q);
  const retired = (entries ?? []).filter((e) => e.retired);

  const addSection = async () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    const max = (sections ?? []).reduce((m, s) => Math.max(m, s.order), -1);
    await db.sections.add({ title, order: max + 1 });
    setNewSectionTitle('');
    setAddingSection(false);
  };

  return (
    <div className="space-y-4">
      <header className="pt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">The Textbook</h1>
        <div className="flex gap-1 bg-lavender rounded-lg p-1">
          {(['read', 'edit'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${
                mode === m ? 'bg-white text-ink shadow-sm' : 'text-mid'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <input
        className="input"
        placeholder="Search the Textbook…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isSemiAnnualDay && mode === 'read' && (
        <div className="card bg-gold/10 border-gold text-sm text-neutral-700">
          Semi-annual reading. Mark each section as you go —{' '}
          {readSectionIds.size} of {(sections ?? []).length} read.
        </div>
      )}

      {(sections ?? []).map((section) => {
        const list = (bySection.get(section.id!) ?? []).filter((e) => !e.retired && matches(e));
        if (q !== '' && list.length === 0) return null;
        return (
          <section key={section.id}>
            <div className="flex items-center justify-between mt-6 mb-2">
              <h2 className="text-ink font-semibold tracking-wide">{section.title}</h2>
              <div className="flex items-center gap-2">
                {isSemiAnnualDay && mode === 'read' && (
                  <button
                    onClick={() => toggleSectionRead(section.id!)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs transition-colors ${
                      readSectionIds.has(section.id!)
                        ? 'bg-good border-good text-white'
                        : 'border-mid/40 text-transparent'
                    }`}
                    title="Mark section read"
                  >
                    ✓
                  </button>
                )}
                {mode === 'edit' && (
                  <SectionEditControls sectionId={section.id!} sections={sections ?? []} hasEntries={list.length > 0} />
                )}
              </div>
            </div>
            <div className="space-y-2">
              {list.map((entry) => (
                <EntryCard key={entry.id} entry={entry} mode={mode} siblings={list} />
              ))}
              {list.length === 0 && mode === 'read' && (
                <p className="text-sm text-neutral-400 italic px-1">— empty —</p>
              )}
              {mode === 'edit' && <AddEntry sectionId={section.id!} existing={list} />}
            </div>
          </section>
        );
      })}

      {mode === 'edit' &&
        (addingSection ? (
          <div className="card flex gap-2">
            <input
              className="input"
              placeholder="Section title"
              value={newSectionTitle}
              autoFocus
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSection()}
            />
            <button className="btn-primary" onClick={addSection}>
              Add
            </button>
            <button className="btn-quiet" onClick={() => setAddingSection(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-quiet w-full" onClick={() => setAddingSection(true)}>
            + Add section
          </button>
        ))}

      {retired.length > 0 && (
        <div className="pt-4">
          <button
            className="text-sm text-neutral-500 underline"
            onClick={() => setShowRetired((v) => !v)}
          >
            {showRetired ? 'Hide' : 'View'} retired entries ({retired.length})
          </button>
          {showRetired && (
            <div className="mt-2 space-y-2">
              {retired.map((e) => (
                <div key={e.id} className="card bg-paper text-neutral-500 text-sm flex justify-between gap-3">
                  <span>{e.text}</span>
                  <button
                    className="text-mid font-medium shrink-0"
                    onClick={() => db.entries.update(e.id!, { retired: false })}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionEditControls({
  sectionId,
  sections,
  hasEntries
}: {
  sectionId: number;
  sections: { id?: number; title: string; order: number }[];
  hasEntries: boolean;
}) {
  const move = async (dir: -1 | 1) => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await db.transaction('rw', db.sections, async () => {
      await db.sections.update(sectionId, { order: swap.order });
      await db.sections.update(swap.id!, { order: sorted[idx].order });
    });
  };

  const rename = async () => {
    const current = sections.find((s) => s.id === sectionId);
    const title = window.prompt('Section title', current?.title ?? '');
    if (title?.trim()) await db.sections.update(sectionId, { title: title.trim() });
  };

  const remove = async () => {
    if (hasEntries) {
      window.alert('Retire or move this section’s entries first.');
      return;
    }
    if (window.confirm('Remove this empty section?')) await db.sections.delete(sectionId);
  };

  return (
    <span className="flex gap-1 text-mid text-sm">
      <button className="px-1.5 hover:text-ink" onClick={() => move(-1)} title="Move up">↑</button>
      <button className="px-1.5 hover:text-ink" onClick={() => move(1)} title="Move down">↓</button>
      <button className="px-1.5 hover:text-ink" onClick={rename} title="Rename">✎</button>
      <button className="px-1.5 hover:text-ember" onClick={remove} title="Remove">×</button>
    </span>
  );
}

function AddEntry({ sectionId, existing }: { sectionId: number; existing: Entry[] }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const add = async () => {
    if (!text.trim()) return;
    const max = existing.reduce((m, e) => Math.max(m, e.order), -1);
    await db.entries.add({
      sectionId,
      order: max + 1,
      text: text.trim(),
      starred: false,
      entrenched: false,
      retired: false,
      updatedAt: new Date().toISOString()
    });
    setText('');
    setOpen(false);
  };

  if (!open)
    return (
      <button className="text-sm text-mid font-medium px-1" onClick={() => setOpen(true)}>
        + Add entry
      </button>
    );
  return (
    <div className="card space-y-2">
      <textarea
        className="input"
        rows={3}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="New entry. **bold** and *italics* work."
      />
      <div className="flex gap-2 justify-end">
        <button className="btn-quiet text-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="btn-primary text-sm" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  mode,
  siblings
}: {
  entry: Entry;
  mode: 'read' | 'edit';
  siblings: Entry[];
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.text);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [entrenchGate, setEntrenchGate] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const history = useLiveQuery(
    () => (showHistory ? db.entryHistory.where('entryId').equals(entry.id!).reverse().sortBy('timestamp') : []),
    [showHistory, entry.id]
  );

  const beginEdit = () => {
    setText(entry.text);
    if (entry.entrenched) {
      if (
        !window.confirm(
          'Entrenched rules change at semi-annual review with written reasoning. Continue?'
        )
      )
        return;
      setEntrenchGate(true);
      setConfirmPhrase('');
    }
    setEditing(true);
  };

  const save = async () => {
    const next = text.trim();
    if (!next || next === entry.text) {
      setEditing(false);
      setEntrenchGate(false);
      return;
    }
    await db.transaction('rw', [db.entries, db.entryHistory], async () => {
      await db.entryHistory.add({
        entryId: entry.id!,
        priorText: entry.text,
        timestamp: new Date().toISOString()
      });
      await db.entries.update(entry.id!, { text: next, updatedAt: new Date().toISOString() });
    });
    setEditing(false);
    setEntrenchGate(false);
  };

  const retire = async () => {
    if (entry.entrenched) {
      window.alert('This rule is entrenched. Un-entrench it first, with written reasoning.');
      return;
    }
    await db.entries.update(entry.id!, { retired: true });
  };

  const move = async (dir: -1 | 1) => {
    const idx = siblings.findIndex((e) => e.id === entry.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    await db.transaction('rw', db.entries, async () => {
      await db.entries.update(entry.id!, { order: swap.order });
      await db.entries.update(swap.id!, { order: entry.order });
    });
  };

  const toggleEntrenched = async () => {
    if (entry.entrenched) {
      if (
        !window.confirm(
          'Entrenched rules change at semi-annual review with written reasoning. Remove entrenchment?'
        )
      )
        return;
      const typed = window.prompt(`Type: “${ENTRENCH_PHRASE}”`);
      if (typed?.trim() !== ENTRENCH_PHRASE) return;
    }
    await db.entries.update(entry.id!, { entrenched: !entry.entrenched });
  };

  // Long-press (600ms) toggles entrenchment, per spec.
  const pressStart = () => {
    if (mode !== 'edit') return;
    pressTimer.current = window.setTimeout(toggleEntrenched, 600);
  };
  const pressEnd = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const phraseOk = !entrenchGate || confirmPhrase.trim() === ENTRENCH_PHRASE;

  return (
    <div
      className={`card ${entry.entrenched ? 'border-ink/30' : ''}`}
      onPointerDown={pressStart}
      onPointerUp={pressEnd}
      onPointerLeave={pressEnd}
    >
      {editing ? (
        <div className="space-y-2">
          <textarea
            className="input"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {entrenchGate && (
            <div>
              <label className="label">
                Type “{ENTRENCH_PHRASE}” to confirm
              </label>
              <input
                className="input"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              className="btn-quiet text-sm"
              onClick={() => {
                setEditing(false);
                setEntrenchGate(false);
              }}
            >
              Cancel
            </button>
            <button className="btn-primary text-sm disabled:opacity-40" onClick={save} disabled={!phraseOk}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-neutral-800 leading-relaxed">{renderMarkdownLite(entry.text)}</p>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <button
              onClick={() => db.entries.update(entry.id!, { starred: !entry.starred })}
              className={entry.starred ? 'text-gold' : 'text-neutral-300 hover:text-gold'}
              title={entry.starred ? 'Unstar' : 'Star — enters the Today rotation'}
            >
              ★
            </button>
            {entry.entrenched && (
              <span className="text-xs text-ink bg-lavender rounded-full px-2 py-0.5">
                entrenched
              </span>
            )}
            {mode === 'edit' && (
              <span className="flex gap-1 text-mid ml-auto">
                <button className="px-1 hover:text-ink" onClick={() => move(-1)} title="Move up">↑</button>
                <button className="px-1 hover:text-ink" onClick={() => move(1)} title="Move down">↓</button>
                <button className="px-1 hover:text-ink" onClick={beginEdit} title="Edit">✎</button>
                <button className="px-1 hover:text-ember" onClick={retire} title="Retire">×</button>
              </span>
            )}
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`text-xs text-neutral-400 hover:text-mid ${mode === 'edit' ? '' : 'ml-auto'}`}
            >
              amendments
            </button>
          </div>
          {showHistory && (
            <div className="mt-2 space-y-1 border-t border-lavender pt-2">
              {(history ?? []).length === 0 && (
                <p className="text-xs text-neutral-400">No amendments yet.</p>
              )}
              {(history ?? []).map((h) => (
                <div key={h.id} className="text-xs text-neutral-500">
                  <span className="text-mid">{h.timestamp.slice(0, 10)}:</span> {h.priorText}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
