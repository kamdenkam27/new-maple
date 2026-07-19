import { format, subHours, parseISO, differenceInCalendarDays, startOfWeek } from 'date-fns';

/** The app day rolls over at 4:00 AM local, per the routine-reset rule. */
export function appDayKey(now: Date = new Date()): string {
  return format(subHours(now, 4), 'yyyy-MM-dd');
}

export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function daysSince(dateKey: string, now: Date = new Date()): number {
  return differenceInCalendarDays(now, parseISO(dateKey));
}

export function weekOfKey(now: Date = new Date()): string {
  return format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd');
}

export function prettyDate(dateKey: string): string {
  return format(parseISO(dateKey), 'MMM d, yyyy');
}

export function prettyDateShort(dateKey: string): string {
  return format(parseISO(dateKey), 'MMM d');
}
