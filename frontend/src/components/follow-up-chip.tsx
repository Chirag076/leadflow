import { AlarmClockOff, BellRing, CalendarClock } from "lucide-react";

import { followUpState, whenPhrase } from "@/lib/dates";

const STYLES = {
  overdue: { className: "bg-rose-50 text-rose-700 ring-rose-200", Icon: AlarmClockOff, label: "Overdue · was due" },
  today: { className: "bg-blue-50 text-blue-700 ring-blue-200", Icon: BellRing, label: "Follow-up" },
  upcoming: { className: "bg-slate-100 text-slate-600 ring-slate-200", Icon: CalendarClock, label: "Follow-up" },
} as const;

/** "Follow-up today at 2:00 PM" in blue, "Overdue · was due yesterday at 4:00 PM" in red. */
export function FollowUpChip({ at, now }: { at: string; now: Date }) {
  const state = followUpState(at, now);
  if (!state) return null;
  const { className, Icon, label } = STYLES[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      <Icon aria-hidden className="size-3.5" />
      {label} {whenPhrase(at, now)}
    </span>
  );
}
