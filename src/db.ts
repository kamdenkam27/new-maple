import Dexie, { type Table } from 'dexie';

export interface Person {
  id?: number;
  name: string;
  cadenceDays: number;
  active: boolean;
  createdAt: string;
}

export type ConnectionType = 'call' | 'hangout' | 'other';

export interface Connection {
  id?: number;
  personId: number;
  date: string; // yyyy-MM-dd
  type: ConnectionType;
  note: string;
}

export interface Section {
  id?: number;
  title: string;
  order: number;
}

export interface Entry {
  id?: number;
  sectionId: number;
  order: number;
  text: string;
  starred: boolean;
  entrenched: boolean;
  retired: boolean;
  updatedAt: string;
}

export interface EntryHistory {
  id?: number;
  entryId: number;
  priorText: string;
  timestamp: string;
}

export interface RoutineItem {
  id?: number;
  list: 'morning' | 'night';
  label: string;
  order: number;
  active: boolean;
}

export interface RoutineCheck {
  id?: number;
  itemId: number;
  date: string;
  checked: boolean;
}

export interface WaterLog {
  id?: number;
  date: string;
  cups: number;
}

export interface GraceLog {
  id?: number;
  date: string;
  level: 'full' | 'partial';
}

export interface FocusSession {
  id?: number;
  date: string;
  minutes: number;
  categoryId: number;
  source: 'timer' | 'manual';
}

export interface Category {
  id?: number;
  label: string;
  active: boolean;
}

export interface Repair {
  id?: number;
  date: string;
  named: string;
  personAffected: boolean;
  repairPlan: string;
  repairDone: boolean;
  adjustment: string;
  completedAt: string | null;
}

export interface Review {
  id?: number;
  weekOf: string;
  wellWithPeople: string;
  nextWeekNeeds: string;
  driftCheck: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export class TextbookDB extends Dexie {
  people!: Table<Person, number>;
  connections!: Table<Connection, number>;
  sections!: Table<Section, number>;
  entries!: Table<Entry, number>;
  entryHistory!: Table<EntryHistory, number>;
  routineItems!: Table<RoutineItem, number>;
  routineChecks!: Table<RoutineCheck, number>;
  waterLog!: Table<WaterLog, number>;
  graceLog!: Table<GraceLog, number>;
  focusSessions!: Table<FocusSession, number>;
  categories!: Table<Category, number>;
  repairs!: Table<Repair, number>;
  reviews!: Table<Review, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('the-textbook');
    this.version(1).stores({
      people: '++id, name, active',
      connections: '++id, personId, date',
      sections: '++id, order',
      entries: '++id, sectionId, order, starred, retired',
      entryHistory: '++id, entryId, timestamp',
      routineItems: '++id, list, order',
      routineChecks: '++id, itemId, date, [itemId+date]',
      waterLog: '++id, date',
      graceLog: '++id, date',
      focusSessions: '++id, date, categoryId',
      categories: '++id, label',
      repairs: '++id, date, completedAt',
      reviews: '++id, weekOf',
      settings: 'key'
    });
  }
}

export const db = new TextbookDB();

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  waterTarget: 6,
  connectionNotifyTime: '09:00',
  weeklyReviewNotify: false,
  notificationsEnabled: false,
  semiAnnualDates: ['01-02', '07-02'],
  escalationPage:
    'This page is yours to write.\n\nPut the names and numbers of your people here — Jude, a trusted friend — and space for a professional contact.\n\nEdit it in Settings whenever you like.',
  semiAnnualProgress: {}
};

export async function getSetting<T>(key: string): Promise<T> {
  const row = await db.settings.get(key);
  if (row) return row.value as T;
  return DEFAULT_SETTINGS[key] as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
