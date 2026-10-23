import { AlertTriangle, CalendarPlus, Download, ShieldPlus } from "lucide-react";

const actions = [
  { label: "New Risk Assessment", icon: ShieldPlus, primary: true },
  { label: "Schedule Audit", icon: CalendarPlus },
  { label: "Export Compliance Report", icon: Download },
  { label: "Log Incident", icon: AlertTriangle },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ label, icon: Icon, primary }) => (
        <button
          key={label}
          type="button"
          className={
            primary
              ? "inline-flex items-center gap-2 rounded-[var(--hse-radius-md)] bg-[var(--hse-primary)] px-3.5 py-2 text-sm font-medium text-white shadow-[var(--hse-shadow-sm)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hse-primary)]"
              : "inline-flex items-center gap-2 rounded-[var(--hse-radius-md)] border border-[var(--hse-border)] bg-[var(--hse-surface)] px-3.5 py-2 text-sm font-medium transition hover:bg-[var(--hse-surface-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hse-primary)]"
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
