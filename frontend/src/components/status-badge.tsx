import { STATUS_META } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, badge } = STATUS_META[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset ${badge}`}
    >
      {label}
    </span>
  );
}
