const ZONE = 'Europe/Zagreb';
export const RESET_HOUR = 12;

function zonedParts(date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  weekday: string;
  monthLabel: string;
} {
  const numeric = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const labels = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    weekday: 'short',
    month: 'short',
  }).formatToParts(date);
  const value = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: Number(value(numeric, 'year')),
    month: Number(value(numeric, 'month')),
    day: Number(value(numeric, 'day')),
    hour: Number(value(numeric, 'hour')),
    weekday: value(labels, 'weekday'),
    monthLabel: value(labels, 'month'),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function addDays(year: number, month: number, day: number, delta: number): string {
  const utc = Date.UTC(year, month - 1, day + delta);
  const next = new Date(utc);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function currentHuntingDay(now = new Date()): string {
  const parts = zonedParts(now);
  if (parts.hour < RESET_HOUR) {
    return addDays(parts.year, parts.month, parts.day, -1);
  }
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function nextResetLabel(now = new Date()): string {
  const parts = zonedParts(now);
  const resetTodayPassed = parts.hour >= RESET_HOUR;
  const target = resetTodayPassed
    ? addDays(parts.year, parts.month, parts.day, 1)
    : `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  const [year, month, day] = target.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 11));
  const label = zonedParts(probe);
  return `${label.weekday} ${Number(day)} ${label.monthLabel}, ${pad(RESET_HOUR)}:00`;
}

export function formatZagreb(epochMs: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(epochMs));
}
