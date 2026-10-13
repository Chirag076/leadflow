import { Plus, TrendingUp } from "lucide-react";

export function Header({ onAddLead }: { onAddLead: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-blue-600">
          <TrendingUp aria-hidden className="size-6" strokeWidth={2.5} />
          LeadFlow
        </h1>
        <button
          type="button"
          onClick={onAddLead}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus aria-hidden className="size-4" />
          Add New Lead
        </button>
      </div>
    </header>
  );
}
