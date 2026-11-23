export const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Ho_Chi_Minh': '+07:00',
  'Asia/Bangkok': '+07:00',
  'Asia/Singapore': '+08:00',
  UTC: 'Z',
};

export const MAX_WHEEL_MINUTES = 23 * 60 + 55;

export interface EarliestSlotWindow {
  date: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  earliestDate: string;
  earliestHour: number;
  earliestMinute: number;
  autoAdjustedDate: boolean;
  autoAdjustedTime: boolean;
}

/**
 * Splits total minutes from midnight into clamped wheel hour & minute.
 */
export function splitMinutes(totalMinutes: number): { hour: number; minute: number } {
  const clamped = Math.max(0, Math.min(MAX_WHEEL_MINUTES, totalMinutes));
  return {
    hour: Math.floor(clamped / 60),
    minute: clamped % 60,
  };
}

/**
 * Formats hour & minute as HH:MM.
 */
export function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Converts an ISO timestamp into YYYY-MM-DD in the specified IANA timezone.
 */
export function getDateYyyyMmDdInZone(iso: string, timezone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-CA', { timeZone: timezone || 'Asia/Ho_Chi_Minh' });
  } catch {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Extracts local 24h hour & minute from an ISO timestamp in the specified IANA timezone.
 */
export function formatIsoTimeInZone(iso: string, timezone: string): { hour: number; minute: number } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { hour: 9, minute: 0 };
  try {
    const formatted = d.toLocaleTimeString('en-GB', {
      timeZone: timezone || 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const [hStr, mStr] = formatted.split(':');
    const hour = Number(hStr) % 24;
    const minute = Number(mStr);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return { hour, minute };
    }
  } catch {
    // fallback below
  }
  return { hour: d.getHours(), minute: d.getMinutes() };
}

/**
 * Builds a UTC ISO string from a calendar YYYY-MM-DD, HH:MM, and known timezone offset.
 */
export function buildIsoFromDateAndHHMM(dateStr: string, hhmm: string, timezone: string): string | null {
  const trimmed = hhmm.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return null;
  const [hh, mm] = trimmed.split(':').map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const offset = TIMEZONE_OFFSETS[timezone] ?? '+07:00';
  const d = new Date(`${dateStr}T${trimmed}:00${offset}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Shifts a YYYY-MM-DD string by a whole number of calendar days without timezone drift.
 */
export function addDaysYyyyMmDd(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return dateStr;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Computes the earliest valid slot window that satisfies backend minimum notice policy,
 * advancing to the next valid time step (5-minute wheel grid) and rolling over to the next
 * calendar day when near midnight.
 */
export function computeEarliestValidSlot(
  selectedDate: string,
  timezone: string,
  durationMinutes: number,
  minNoticeMinutes: number,
  nowMs = Date.now()
): EarliestSlotWindow {
  const safeDuration = Math.max(5, Math.min(240, durationMinutes));
  const safeNotice = Math.max(0, minNoticeMinutes);
  const stepMs = 5 * 60_000;
  // Add a 60s safety margin before rounding up to a 5-min wheel tick so submitting
  // shortly after opening the modal still satisfies `startAt >= now + minNoticeMinutes`.
  const earliestMs = Math.ceil((nowMs + safeNotice * 60_000 + 60_000) / stepMs) * stepMs;
  const earliestIso = new Date(earliestMs).toISOString();

  let earliestDate = getDateYyyyMmDdInZone(earliestIso, timezone) || selectedDate;
  let { hour: earliestHour, minute: earliestMinute } = formatIsoTimeInZone(earliestIso, timezone);
  let earliestTotal = earliestHour * 60 + earliestMinute;

  if (earliestTotal + safeDuration > MAX_WHEEL_MINUTES) {
    earliestDate = addDaysYyyyMmDd(earliestDate, 1);
    earliestHour = 0;
    earliestMinute = 0;
    earliestTotal = 0;
  }

  let date = selectedDate;
  let startTotal = 9 * 60;
  let autoAdjustedDate = false;
  let autoAdjustedTime = false;

  if (selectedDate === earliestDate) {
    startTotal = earliestTotal;
    autoAdjustedTime = true;
  } else if (selectedDate < earliestDate) {
    date = earliestDate;
    startTotal = earliestTotal;
    autoAdjustedDate = true;
    autoAdjustedTime = true;
  }

  const endTotal = Math.min(MAX_WHEEL_MINUTES, startTotal + safeDuration);
  const startParts = splitMinutes(startTotal);
  const endParts = splitMinutes(endTotal);

  return {
    date,
    startHour: startParts.hour,
    startMinute: startParts.minute,
    endHour: endParts.hour,
    endMinute: endParts.minute,
    earliestDate,
    earliestHour,
    earliestMinute,
    autoAdjustedDate,
    autoAdjustedTime,
  };
}

