import { useState } from 'react';
import TodayTab from './tabs/TodayTab';
import PeopleTab from './tabs/PeopleTab';
import TextbookTab from './tabs/TextbookTab';
import RepairTab from './tabs/RepairTab';
import ReviewTab from './tabs/ReviewTab';

export type TabId = 'today' | 'people' | 'textbook' | 'repair' | 'review';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'people', label: 'People', icon: '🤝' },
  { id: 'textbook', label: 'Textbook', icon: '📖' },
  { id: 'repair', label: 'Repair', icon: '🪡' },
  { id: 'review', label: 'Review', icon: '🌙' }
];

export default function App() {
  const [tab, setTab] = useState<TabId>('today');
  // Lets Today's due-connection chips jump into People with the log sheet open.
  const [logPersonId, setLogPersonId] = useState<number | null>(null);

  const openQuickLog = (personId: number) => {
    setLogPersonId(personId);
    setTab('people');
  };

  return (
    <div className="min-h-screen md:flex">
      <nav className="hidden md:flex md:flex-col md:w-52 md:shrink-0 md:min-h-screen bg-white border-r border-lavender p-4 gap-1">
        <div className="text-ink font-semibold text-lg px-3 py-2 mb-2">The Textbook</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-left px-3 py-2 rounded-lg transition-colors ${
              tab === t.id ? 'bg-lavender text-ink font-medium' : 'text-neutral-600 hover:bg-paper'
            }`}
          >
            <span className="mr-2">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 pb-24 md:pb-8">
        {tab === 'today' && <TodayTab onOpenQuickLog={openQuickLog} onGoTo={setTab} />}
        {tab === 'people' && (
          <PeopleTab initialLogPersonId={logPersonId} onConsumedInitial={() => setLogPersonId(null)} />
        )}
        {tab === 'textbook' && <TextbookTab />}
        {tab === 'repair' && <RepairTab />}
        {tab === 'review' && <ReviewTab />}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-lavender flex justify-around pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 text-xs ${
              tab === t.id ? 'text-ink font-medium' : 'text-neutral-500'
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
