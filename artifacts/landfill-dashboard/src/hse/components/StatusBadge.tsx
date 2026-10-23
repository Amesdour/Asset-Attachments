import { cn } from "@/lib/utils";
import type { Status } from "../mock-data";

const map: Record<Status, { label: string; cls: string }> = {
  compliant: { label: "Compliant", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  action: { label: "Action Required", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  critical: { label: "Critical Review", cls: "bg-red-500/10 text-red-700 dark:text-red-400" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
