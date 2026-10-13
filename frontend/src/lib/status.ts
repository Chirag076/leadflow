import type { LeadStatus } from "./types";

export const STATUS_META: Record<LeadStatus, { label: string; badge: string }> = {
  new: { label: "New", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  contacted: { label: "Contacted", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  qualified: { label: "Qualified", badge: "bg-sky-50 text-sky-700 ring-sky-200" },
  proposal_sent: { label: "Proposal Sent", badge: "bg-violet-50 text-violet-700 ring-violet-200" },
  won: { label: "Won", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
  lost: { label: "Lost", badge: "bg-rose-50 text-rose-700 ring-rose-200" },
};

/** Won and lost leads are finished: shown dimmed in the list. */
export const isClosed = (status: LeadStatus) => status === "won" || status === "lost";
