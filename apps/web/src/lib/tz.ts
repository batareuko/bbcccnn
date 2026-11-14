/** Time-zone helpers built on Intl (no dependencies). Work both on server and in the browser. */

export const DEFAULT_TZ = "Europe/Kyiv";

export function isValidTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function listTimeZones(): string[] {
  const f = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  return f ? f("timeZone") : [DEFAULT_TZ, "UTC"];
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

/** Wall-clock parts of `date` in `tz`. month is 1-12, weekday 0=Mon..6=Sun. */
export function partsInTz(date: Date, tz: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute,
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday),
  };
}

function offsetMs(date: Date, tz: string) {
  const p = partsInTz(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(date.getTime() / 60000) * 60000;
}

/** Converts a wall-clock time in `tz` to a real Date (UTC instant). Handles DST. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess - offsetMs(new Date(guess), tz);
  ts = guess - offsetMs(new Date(ts), tz);
  return new Date(ts);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" day key of a date in tz. */
export function dayKey(date: Date, tz: string) {
  const p = partsInTz(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Value for <input type="datetime-local"> showing `date` in tz. */
export function toTzInput(date: Date, tz: string) {
  const p = partsInTz(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Parses a datetime-local value as wall time in tz. */
export function fromTzInput(value: string, tz: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
}

export function formatInTz(date: Date | string, tz: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { timeZone: tz, ...opts }).format(new Date(date));
}
