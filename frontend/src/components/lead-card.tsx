import { timeAgo } from "@/lib/dates";
import { isClosed } from "@/lib/status";
import type { LeadSummary } from "@/lib/types";

import { FollowUpChip } from "./follow-up-chip";
import { StatusBadge } from "./status-badge";

interface LeadCardProps {
  lead: LeadSummary;
  now: Date;
  tone?: "default" | "today" | "overdue";
  highlighted?: boolean;
  onOpen: (id: number) => void;
  onPrefetch?: (id: number) => void;
}

const TONES = {
  default: "border-slate-200 bg-white hover:border-slate-300",
  today: "border-blue-200 bg-blue-50/70 hover:border-blue-300",
  overdue: "border-rose-200 bg-rose-50/70 hover:border-rose-300",
};

export function LeadCard({ lead, now, tone = "default", highlighted = false, onOpen, onPrefetch }: LeadCardProps) {
  const last = lead.last_discussion;
  const closed = isClosed(lead.status);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        onPointerEnter={() => onPrefetch?.(lead.id)}
        onFocus={() => onPrefetch?.(lead.id)}
        className={`block w-full rounded-lg border px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-5 ${TONES[tone]} ${highlighted ? "animate-[flash_1.6s_ease-out]" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className={`min-w-0 truncate text-[17px] font-semibold ${closed ? "text-slate-500" : "text-slate-900"}`}>
            {lead.name}
            {lead.company && <span className="ml-1.5 text-sm font-normal text-slate-500">({lead.company})</span>}
          </h3>
          <StatusBadge status={lead.status} />
        </div>

        <p className={`mt-1.5 flex min-w-0 items-baseline gap-2 text-sm ${closed ? "text-slate-500" : "text-slate-700"}`}>
          {last ? (
            <>
              <span className="line-clamp-2 min-w-0 sm:line-clamp-1">
                <span className="font-semibold text-slate-800">Last Note:</span>{" "}
                <span className={last.kind === "event" ? "italic" : undefined}>{last.body}</span>
              </span>
              <time dateTime={lead.last_activity_at} className="shrink-0 text-xs text-slate-400">
                {timeAgo(lead.last_activity_at, now)}
              </time>
            </>
          ) : (
            <span className="text-slate-400 italic">No discussions yet</span>
          )}
        </p>

        {lead.follow_up_at && (
          <div className="mt-2.5">
            <FollowUpChip at={lead.follow_up_at} now={now} />
          </div>
        )}
      </button>
    </li>
  );
}
