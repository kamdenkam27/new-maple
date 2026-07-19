import type { Connection, Person } from '../db';
import { daysSince } from './dates';

export type PersonStatus = 'good' | 'dueSoon' | 'overdue' | 'noneYet';

export interface PersonState {
  person: Person;
  lastConnected: string | null;
  daysSince: number | null;
  status: PersonStatus;
}

export function computePersonState(person: Person, connections: Connection[]): PersonState {
  const own = connections.filter((c) => c.personId === person.id);
  if (own.length === 0) {
    return { person, lastConnected: null, daysSince: null, status: 'noneYet' };
  }
  const last = own.reduce((a, b) => (a.date > b.date ? a : b)).date;
  const days = daysSince(last);
  let status: PersonStatus = 'good';
  if (days >= person.cadenceDays) status = 'overdue';
  else if (days >= person.cadenceDays - 3) status = 'dueSoon';
  return { person, lastConnected: last, daysSince: days, status };
}

const STATUS_RANK: Record<PersonStatus, number> = {
  overdue: 0,
  dueSoon: 1,
  noneYet: 2,
  good: 3
};

export function sortPersonStates(states: PersonState[]): PersonState[] {
  return [...states].sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    return (b.daysSince ?? -1) - (a.daysSince ?? -1);
  });
}
