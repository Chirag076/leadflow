"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { STATUS_META } from "@/lib/status";
import { STATUSES, type LeadList, type LeadStatus } from "@/lib/types";

interface FilterBarProps {
  status: LeadStatus | undefined;
  onStatusChange: (status: LeadStatus | undefined) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts: LeadList["counts"] | undefined;
}

export function FilterBar({ status, onStatusChange, search, onSearchChange, counts }: FilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search, like most list apps.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pills: { value: LeadStatus | undefined; label: string; count?: number }[] = [
    { value: undefined, label: "All", count: counts?.all },
    ...STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, count: counts?.[s] })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase sm:inline">Filters:</span>
        <div role="group" aria-label="Filter by status" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible">
          {pills.map((pill) => {
            const active = pill.value === status;
            return (
              <button
                key={pill.label}
                type="button"
                aria-pressed={active}
                onClick={() => onStatusChange(pill.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {pill.label}
                {pill.count !== undefined && (
                  <span className={`text-xs tabular-nums ${active ? "text-slate-300" : "text-slate-400"}`}>{pill.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <label className="relative block w-full sm:ml-auto sm:w-52">
        <span className="sr-only">Search leads by name or company</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search leads"
          className="w-full rounded-md border border-slate-300 bg-white py-2 pr-9 pl-9 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-slate-200 px-1.5 text-[11px] text-slate-400 sm:block">
            /
          </kbd>
        )}
      </label>
    </div>
  );
}
