import type { Entry, Section } from '../db';

/** Deterministic small hash so the same date always picks the same line. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h);
}

/**
 * The Today-header rotation pool: Absolute Goods entries plus any starred
 * entries, deduplicated. A different line each day, deterministic by date.
 */
export function rotatingLine(
  dayKey: string,
  sections: Section[],
  entries: Entry[]
): string | null {
  const goodsSection = sections.find((s) => s.title === 'Absolute Goods');
  const pool: string[] = [];
  for (const e of entries) {
    if (e.retired) continue;
    if ((goodsSection && e.sectionId === goodsSection.id) || e.starred) {
      if (!pool.includes(e.text)) pool.push(e.text);
    }
  }
  if (pool.length === 0) return null;
  return pool[hashString(dayKey) % pool.length];
}
