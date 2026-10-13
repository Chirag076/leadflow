"use client";

import { Loader2, Phone, X } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { useLead, useUpdateStatus } from "@/lib/queries";
import { STATUS_META } from "@/lib/status";
import { STATUSES, type LeadDetail, type LeadStatus } from "@/lib/types";

import { DiscussionForm } from "./discussion-form";
import { Timeline } from "./timeline";

interface LeadDialogProps {
  leadId: number | null;
  now: Date;
  onClose: () => void;
}

export function LeadDialog({ leadId, now, onClose }: LeadDialogProps) {
  const { data: lead, isPending, error } = useLead(leadId);

  return (
    <Modal open={leadId !== null} onClose={onClose} labelledBy="lead-dialog-title" className="[--modal-width:42rem]">
      <div className="flex max-h-[min(52rem,calc(100dvh-2rem))] flex-col">
        {lead ? (
          <LeadDialogContent lead={lead} now={now} onClose={onClose} />
        ) : (
          <div className="flex items-center justify-between gap-4 p-5">
            <p id="lead-dialog-title" className="flex items-center gap-2 text-sm text-slate-500">
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Loading lead…
                </>
              ) : (
                <span className="text-rose-600">{error?.message ?? "Could not load this lead."}</span>
              )}
            </p>
            <CloseButton onClose={onClose} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function LeadDialogContent({ lead, now, onClose }: { lead: LeadDetail; now: Date; onClose: () => void }) {
  return (
    <>
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <h2 id="lead-dialog-title" className="truncate text-xl font-semibold text-slate-900">
            {lead.name}
            {lead.company && <span className="ml-1.5 font-normal text-slate-500">({lead.company})</span>}
          </h2>
          {lead.phone && (
            <a
              href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-700"
            >
              <Phone aria-hidden className="size-3.5" />
              {lead.phone}
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusSelect lead={lead} />
          <CloseButton onClose={onClose} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
        <Timeline discussions={lead.discussions} activeFollowUp={lead.follow_up_at} now={now} />
      </div>

      <footer className="border-t border-slate-200 px-5 pt-4 pb-3">
        <DiscussionForm key={lead.id} lead={lead} now={now} />
      </footer>
    </>
  );
}

function StatusSelect({ lead }: { lead: LeadDetail }) {
  const updateStatus = useUpdateStatus(lead.id);
  return (
    <div className="flex flex-col items-end">
      <label className="flex items-center gap-2">
        <span className="sr-only">Status</span>
        {updateStatus.isPending && <Loader2 aria-hidden className="size-4 animate-spin text-slate-400" />}
        <select
          value={lead.status}
          onChange={(event) => updateStatus.mutate(event.target.value as LeadStatus)}
          className="rounded-md border border-slate-300 bg-white py-1.5 pr-8 pl-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>
      </label>
      {updateStatus.error && (
        <p role="alert" className="mt-1 text-xs text-rose-600">
          {updateStatus.error.message}
        </p>
      )}
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <X className="size-5" />
    </button>
  );
}
