export const STATUSES = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as const;

export type LeadStatus = (typeof STATUSES)[number];
export type DiscussionKind = "note" | "event";

export interface Discussion {
  id: number;
  kind: DiscussionKind;
  body: string;
  follow_up_at: string | null;
  created_at: string;
}

export interface LeadSummary {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  follow_up_at: string | null;
  created_at: string;
  last_discussion: Discussion | null;
  last_activity_at: string;
}

export interface LeadDetail extends LeadSummary {
  discussions: Discussion[];
}

export interface LeadList {
  items: LeadSummary[];
  counts: Record<"all" | LeadStatus, number>;
}

export interface LeadFilters {
  status?: LeadStatus;
  q?: string;
}

export interface NewLead {
  name: string;
  company?: string | null;
  phone?: string | null;
}

export interface NewDiscussion {
  body: string;
  follow_up_at?: string | null;
}

export interface DiscussionCreated {
  discussion: Discussion;
  lead: LeadSummary;
}
