import { describe, expect, it } from "vitest";

import { groupLeads } from "./group-leads";
import type { LeadSummary } from "./types";

const now = new Date(2026, 4, 6, 12, 0);
const lead = (id: number, follow_up_at: Date | null): LeadSummary => ({
  id,
  name: `Lead ${id}`,
  company: null,
  phone: null,
  status: "contacted",
  follow_up_at: follow_up_at?.toISOString() ?? null,
  created_at: now.toISOString(),
  last_discussion: null,
  last_activity_at: now.toISOString(),
});

describe("groupLeads", () => {
  it("pins today's and overdue follow-ups, soonest first, and keeps the rest in API order", () => {
    const items = [
      lead(1, null),
      lead(2, new Date(2026, 4, 6, 17)), // later today
      lead(3, new Date(2026, 4, 9, 9)), // next week: not pinned
      lead(4, new Date(2026, 4, 5, 16)), // yesterday: overdue, pinned
      lead(5, new Date(2026, 4, 6, 9)), // this morning: overdue, pinned
    ];

    const { due, rest } = groupLeads(items, now);

    expect(due.map((l) => l.id)).toEqual([4, 5, 2]);
    expect(rest.map((l) => l.id)).toEqual([1, 3]);
  });
});
