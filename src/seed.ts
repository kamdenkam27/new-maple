import { db } from './db';

const PEOPLE = [
  'Alessandra',
  'Mom',
  'Isaiah',
  'Leigha',
  'Boston',
  'Noah',
  'Avery',
  'Eli',
  'Rivers',
  'Caden'
];

const MORNING = ['Play the morning song', 'Text Jude', 'Water', 'Plan the day', 'Gratitude'];
const NIGHT = [
  'Brush teeth',
  'Text Jude goodnight',
  'One episode/chapter from the Night Watch list',
  'Gratitude'
];

const CATEGORIES = ['MIFH', 'School (SH)', 'Accounting (AC)', 'Running (R)', 'Meditation (M)'];

interface SeedSection {
  title: string;
  entries: { text: string; entrenched?: boolean }[];
}

const SECTIONS: SeedSection[] = [
  {
    title: 'The Validities',
    entries: [
      {
        text: 'That your capacity to be wrong is infinitely times greater than your ability to be right or remain right about things. That you may only become more close to the truth, but never overtake the full extent of that truth and, that truth may also shift over time.'
      },
      { text: 'Humans are dependent rational animals.' }
    ]
  },
  {
    title: 'Related Philosophies / Philosophers',
    entries: [
      { text: 'Ubuntu · Kant · Spinoza · Hegel · Utilitarianism · Alasdair MacIntyre' }
    ]
  },
  {
    title: 'Forward Facing Depth',
    entries: [
      {
        text: 'In deep desire to have a community, a family — because of my lack of a larger family. Which is indeed true.'
      }
    ]
  },
  {
    title: 'Absolute Goods',
    entries: [
      { text: 'Enacting my abilities' },
      { text: 'Adequate tries to connect' },
      { text: 'The act and togetherness of connecting' }
    ]
  },
  {
    title: 'The Book of Tendencies',
    entries: [
      { text: 'The tendency to be decently affected by my conscientiousness.' },
      {
        text: 'The tendency to work more fluidly and efficiently when my time is planned; the opposite is also true — unplanned time is inefficient and incredibly energy intensive.'
      },
      {
        text: 'The tendency to be able to focus in a chaotic, busy, or loud setting; focus or peace in quiet is a little harder.'
      },
      {
        text: 'The tendency to try to fish out things in conversations, and to do this often.'
      }
    ]
  },
  {
    title: 'Considerations',
    entries: [
      { text: 'You want to change your beliefs and values — change your experiences.' }
    ]
  },
  {
    title: 'Tools (that get me energy)',
    entries: [
      {
        text: 'Listen to a song with both headphones in with immense focus (pseudo-meditation — or simply meditate).'
      },
      { text: 'Run through the sensations through my body.' }
    ]
  },
  {
    title: 'Objectives',
    entries: []
  },
  {
    title: 'Rules',
    entries: [
      {
        text: "Unless deeply worked out by deep thought and logic work, question the actions you're taking currently and plan to take; see if they're fitted to your objectives, and if not, why might you be doing them — or how else do they fit into your life, smaller picture or bigger picture."
      },
      {
        text: 'If you have deeply worked out by deep thought for those things, you have the right to more-so thoughtlessly do that thing. No friction is the gift.'
      },
      { text: 'I perform much, much better with adequate water and food.' },
      { text: 'Stay in a fluid state of connection.' },
      {
        text: 'Give grace / pray once a day. If able, perform full grace; if necessary, partial grace can be accepted — but not more than two days in a row.'
      },
      {
        text: 'No experiments on people. Interventions in someone’s life require their informed participation.',
        entrenched: true
      },
      {
        text: 'Punishment is banned in all forms — physical, athletic, dietary, social withdrawal, self-talk. Repair replaces punishment: name it, repair it, adjust, resume. That is the entire debt.',
        entrenched: true
      },
      {
        text: 'If the punishment spiral ever returns with force, that is the pre-agreed trigger to bring in help from a person — Jude, a trusted friend, or a professional — not to build a better rule.',
        entrenched: true
      }
    ]
  }
];

export async function seedIfEmpty(): Promise<void> {
  const seeded = await db.settings.get('seeded');
  if (seeded) return;

  const now = new Date().toISOString();

  await db.transaction(
    'rw',
    [db.people, db.sections, db.entries, db.routineItems, db.categories, db.settings],
    async () => {
      await db.people.bulkAdd(
        PEOPLE.map((name) => ({ name, cadenceDays: 14, active: true, createdAt: now }))
      );

      for (let s = 0; s < SECTIONS.length; s++) {
        const sectionId = await db.sections.add({ title: SECTIONS[s].title, order: s });
        await db.entries.bulkAdd(
          SECTIONS[s].entries.map((e, i) => ({
            sectionId,
            order: i,
            text: e.text,
            starred: false,
            entrenched: !!e.entrenched,
            retired: false,
            updatedAt: now
          }))
        );
      }

      await db.routineItems.bulkAdd([
        ...MORNING.map((label, i) => ({ list: 'morning' as const, label, order: i, active: true })),
        ...NIGHT.map((label, i) => ({ list: 'night' as const, label, order: i, active: true }))
      ]);

      await db.categories.bulkAdd(CATEGORIES.map((label) => ({ label, active: true })));

      await db.settings.put({ key: 'seeded', value: true });
    }
  );
}
