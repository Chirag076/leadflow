"use client";

import { Inbox, RefreshCw, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNow } from "@/hooks/use-now";
import { groupLeads } from "@/lib/group-leads";
import { useLeads } from "@/lib/queries";
import type { LeadStatus } from "@/lib/types";

import { FilterBar } from "./filter-bar";
import { Header } from "./header";
import { LeadList } from "./lead-list";

/** The whole app: one screen with the list, plus the two dialogs. */
export function LeadBoard() {
  const now = useNow();
  const [status, setStatus] = useState<LeadStatus | undefined>();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const [openLeadId, setOpenLeadId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  void setHighlightId;

  const { data, isPending, isError, error, refetch, isFetching } = useLeads({ status, q: q || undefined });
  const groups = useMemo(() => (data ? groupLeads(data.items, now) : null), [data, now]);

  useEffect(() => {
    if (highlightId === null) return;
    const id = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(id);
  }, [highlightId]);

  const clearFilters = () => {
    setStatus(undefined);
    setSearch("");
  };

  return (
    <>
      <Header onAddLead={() => setAdding(true)} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <FilterBar
          status={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
          counts={data?.counts}
        />

        <div aria-busy={isFetching} className={isFetching && !isPending ? "opacity-70 transition-opacity" : undefined}>
          {isPending ? (
            <ListSkeleton />
          ) : isError ? (
            <EmptyState
              icon={<RefreshCw className="size-6" />}
              title="Couldn't load your leads"
              body={error.message}
              action={{ label: "Try again", onClick: () => void refetch() }}
            />
          ) : groups && groups.due.length + groups.rest.length > 0 ? (
            <LeadList groups={groups} now={now} highlightId={highlightId} onOpen={setOpenLeadId} />
          ) : status || q ? (
            <EmptyState
              icon={<SearchX className="size-6" />}
              title="No leads match"
              body={q ? `Nothing found for “${q}”${status ? " with this status" : ""}.` : "No leads have this status yet."}
              action={{ label: "Clear filters", onClick: clearFilters }}
            />
          ) : (
            <EmptyState
              icon={<Inbox className="size-6" />}
              title="No leads yet"
              body="Add your first lead to start tracking discussions and follow-ups."
              action={{ label: "Add New Lead", onClick: () => setAdding(true) }}
            />
          )}
        </div>
      </main>

      {/* dialogs arrive in the next step */}
      <span hidden data-open-lead={openLeadId ?? undefined} data-adding={adding || undefined} />
    </>
  );
}

function ListSkeleton() {
  return (
    <ul aria-label="Loading leads" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-80 max-w-full rounded bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}

function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
      <button
        type="button"
        onClick={action.onClick}
        className="mt-5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {action.label}
      </button>
    </div>
  );
}
