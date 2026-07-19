import { getSetting, setSetting } from '../db';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function canNotify(): boolean {
  return notificationsSupported() && Notification.permission === 'granted';
}

/**
 * Fires at most one connections notification per day, when the app is open
 * at/after the configured time. If permission is denied the app falls back to
 * the in-app due strip — nothing is lost.
 */
export async function maybeNotifyConnections(dueNames: string[]): Promise<void> {
  if (!canNotify() || dueNames.length === 0) return;
  const enabled = await getSetting<boolean>('notificationsEnabled');
  if (!enabled) return;

  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const lastSent = await getSetting<string | null>('lastConnectionNotifyDay');
  if (lastSent === dayKey) return;

  const timeStr = await getSetting<string>('connectionNotifyTime');
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const target = new Date(today);
  target.setHours(h, m, 0, 0);
  if (today < target) return;

  const list = dueNames.slice(0, 4).join(', ') + (dueNames.length > 4 ? '…' : '');
  new Notification('The Textbook', {
    body: `Worth a reach-out: ${list}`,
    tag: 'connections-due'
  });
  await setSetting('lastConnectionNotifyDay', dayKey);
}
