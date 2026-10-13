import { followUpState } from "./dates";
import type { LeadSummary } from "./types";

export interface LeadGroups {
  /** Follow-ups due today or already overdue, soonest first. Pinned above the rest. */
  due: LeadSummary[];
  /** Everything else, in the API's order (most recent activity first). */
  rest: LeadSummary[];
}

export function groupLeads(items: LeadSummary[], now: Date): LeadGroups {
  const due: LeadSummary[] = [];
  const rest: LeadSummary[] = [];
  for (const lead of items) {
    const state = followUpState(lead.follow_up_at, now);
    (state === "overdue" || state === "today" ? due : rest).push(lead);
  }
  due.sort((a, b) => Date.parse(a.follow_up_at!) - Date.parse(b.follow_up_at!));
  return { due, rest };
}
