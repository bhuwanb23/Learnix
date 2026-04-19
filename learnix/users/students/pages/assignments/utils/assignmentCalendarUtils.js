/**
 * Parse due dates like "Oct 24" or "Nov 02" into a Date (local midnight).
 */
const MONTH_MAP = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseDueDateString(str, year = new Date().getFullYear()) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const monKey = parts[0].slice(0, 3).toLowerCase();
  const month = MONTH_MAP[monKey];
  const day = parseInt(parts[1].replace(/\D/g, ''), 10);
  if (month === undefined || Number.isNaN(day) || day < 1 || day > 31) return null;
  const d = new Date(year, month, day);
  if (d.getMonth() !== month) return null;
  return d;
}

export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {Array<{ dueDate?: string, calendarSource: string }>} items
 * @returns {Record<string, Array>}
 */
export function buildDueDateIndex(items, year = new Date().getFullYear()) {
  const index = {};
  for (const item of items) {
    const parsed = parseDueDateString(item.dueDate, year);
    if (!parsed) continue;
    const key = dateKey(parsed);
    if (!index[key]) index[key] = [];
    index[key].push(item);
  }
  return index;
}

export function getCalendarMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push({ type: 'pad', key: `pad-${year}-${month}-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(year, month, d);
    cells.push({ type: 'day', day: d, date, key: `day-${year}-${month}-${d}` });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ type: 'pad', key: `trail-${cells.length}` });
  }
  return { cells, daysInMonth };
}

export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const SOURCE_LABELS = {
  active: 'Active',
  upcoming: 'Upcoming',
  completed: 'Completed',
};
