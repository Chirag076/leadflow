/** Date helpers. Everything is shown in the browser's own timezone; the API speaks UTC ISO strings. */

const relative = new Intl.RelativeTimeFormat("en", { numeric: "always" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "2 hours ago", "1 week ago", "just now". */
export function timeAgo(iso: string, now: Date): string {
  const seconds = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (Math.abs(seconds) < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(-Math.round(seconds / size), unit);
  }
  return relative.format(-Math.round(seconds / 60), "minute");
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export type FollowUpState = "overdue" | "today" | "upcoming";

/** Overdue wins over today: a 10:00 follow-up is overdue at 11:00 the same day. */
export function followUpState(iso: string | null, now: Date): FollowUpState | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (at < now) return "overdue";
  if (isSameDay(at, now)) return "today";
  return "upcoming";
}

const time = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "today at 2:00 PM", "yesterday at 4:00 PM", "Thu at 11:00 AM", "Nov 3 at 9:30 AM". */
export function whenPhrase(iso: string, now: Date): string {
  const at = new Date(iso);
  let day: string;
  if (isSameDay(at, now)) day = "today";
  else if (isSameDay(at, addDays(now, 1))) day = "tomorrow";
  else if (isSameDay(at, addDays(now, -1))) day = "yesterday";
  else if (Math.abs(at.getTime() - now.getTime()) < 6 * 86400000)
    day = at.toLocaleDateString("en-US", { weekday: "short" });
  else
    day = at.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(at.getFullYear() !== now.getFullYear() && { year: "numeric" }),
    });
  return `${day} at ${time(at)}`;
}

/** "May 4, 10:30 AM" (with the year when it isn't this year). */
export function formatTimestamp(iso: string, now: Date): string {
  const at = new Date(iso);
  return at.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(at.getFullYear() !== now.getFullYear() && { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Value for an <input type="date"> in local time. */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function tomorrow(now: Date): Date {
  return addDays(now, 1);
}

/** Local date + time inputs → UTC ISO string for the API. */
export function localInputsToIso(date: string, timeOfDay: string): string {
  // "YYYY-MM-DDTHH:MM" without an offset is parsed as local time.
  return new Date(`${date}T${timeOfDay || "09:00"}`).toISOString();
}
