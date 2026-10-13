import { CalendarClock } from "lucide-react";

import { followUpState, formatTimestamp, timeAgo } from "@/lib/dates";
import type { Discussion } from "@/lib/types";

interface TimelineProps {
  discussions: Discussion[];
  /** The lead's live follow-up, to tell the pending one apart from ones already done. */
  activeFollowUp: string | null;
  now: Date;
}

export function Timeline({ discussions, activeFollowUp, now }: TimelineProps) {
  return (
    <ol aria-label="Discussion history, newest first" className="relative space-y-5">
      {/* the vertical rail */}
      <span aria-hidden className="absolute top-2 bottom-2 left-[5px] w-px bg-slate-200" />
      {discussions.map((entry, index) => {
        const isEvent = entry.kind === "event";
        const isActive = entry.follow_up_at !== null && entry.follow_up_at === activeFollowUp;
        const overdue = isActive && followUpState(entry.follow_up_at, now) === "overdue";
        return (
          <li key={entry.id} className="relative pl-7">
            <span
              aria-hidden
              className={`absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-slate-50 ${
                index === 0 ? "bg-blue-600" : "bg-slate-300"
              }`}
            />
            <p className="text-xs text-slate-500">
              <time dateTime={entry.created_at}>{formatTimestamp(entry.created_at, now)}</time>
              <span className="ml-1.5 text-slate-400">({timeAgo(entry.created_at, now)})</span>
            </p>
            {isEvent ? (
              <p className="mt-1 text-sm text-slate-500 italic">{entry.body}</p>
            ) : (
              <div className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="whitespace-pre-wrap">{entry.body}</p>
                {entry.follow_up_at && (
                  <p
                    className={`mt-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${
                      overdue
                        ? "bg-rose-50 text-rose-700"
                        : isActive
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <CalendarClock aria-hidden className="size-3.5" />
                    {isActive ? (overdue ? "Overdue follow-up:" : "Follow-up set for:") : "Follow-up was set for:"}{" "}
                    {formatTimestamp(entry.follow_up_at, now)}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
