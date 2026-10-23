import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  trend: number; // % change vs last month
  goodWhenDown?: boolean;
}

export function MetricCard({ label, value, trend, goodWhenDown }: Props) {
  const up = trend >= 0;
  const good = goodWhenDown ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-[var(--hse-radius-lg)] border border-[var(--hse-border)] bg-[var(--hse-surface)] p-5 shadow-[var(--hse-shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--hse-text-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          good ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {up ? "+" : ""}
        {trend.toFixed(1)}% <span className="font-normal opacity-70">from last month</span>
      </p>
    </div>
  );
}
