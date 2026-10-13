import { Pin } from "lucide-react";

import { followUpState } from "@/lib/dates";
import type { LeadGroups } from "@/lib/group-leads";

import { LeadCard } from "./lead-card";

interface LeadListProps {
  groups: LeadGroups;
  now: Date;
  highlightId: number | null;
  onOpen: (id: number) => void;
}

function SectionTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
      {children}
      <span className="font-medium text-slate-400">· {count}</span>
    </h2>
  );
}

export function LeadList({ groups, now, highlightId, onOpen }: LeadListProps) {
  const overdue = groups.due.filter((lead) => followUpState(lead.follow_up_at, now) === "overdue").length;

  return (
    <div className="space-y-9">
      {groups.due.length > 0 && (
        <section aria-labelledby="due-heading">
          <SectionTitle count={groups.due.length}>
            <Pin aria-hidden className="size-3.5 rotate-45 text-rose-500" />
            <span id="due-heading">Today&apos;s follow-ups</span>
            {overdue > 0 && (
              <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] tracking-wide text-rose-700">
                {overdue} overdue
              </span>
            )}
          </SectionTitle>
          <ul className="space-y-3">
            {groups.due.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                now={now}
                tone={followUpState(lead.follow_up_at, now) === "overdue" ? "overdue" : "today"}
                highlighted={lead.id === highlightId}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      )}

      {groups.rest.length > 0 && (
        <section aria-labelledby="all-heading">
          <SectionTitle count={groups.rest.length}>
            <span id="all-heading">{groups.due.length > 0 ? "All other leads" : "All leads"}</span>
          </SectionTitle>
          <ul className="space-y-3">
            {groups.rest.map((lead) => (
              <LeadCard key={lead.id} lead={lead} now={now} highlighted={lead.id === highlightId} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
