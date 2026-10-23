import { Activity, AlertOctagon, BarChart3, ChevronsLeft, ClipboardCheck, LayoutDashboard, Settings, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Risk Assessments", icon: ShieldAlert },
  { label: "Regulatory Audits", icon: ClipboardCheck },
  { label: "Incidents", icon: AlertOctagon },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: Props) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-[var(--hse-sidebar)] text-[var(--hse-sidebar-text)] transition-all lg:static",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Activity className="h-6 w-6 shrink-0 text-[var(--hse-primary)]" />
          <span className={cn("text-base font-semibold text-white", collapsed && "lg:hidden")}>SafetyComply</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main">
          {items.map(({ label, icon: Icon, active }) => (
            <a
              key={label}
              href="#"
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[var(--hse-radius-md)] px-3 py-2.5 text-sm font-medium transition hover:bg-[var(--hse-sidebar-active)] hover:text-white",
                active && "bg-[var(--hse-sidebar-active)] text-white",
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-[var(--hse-primary)]")} />
              <span className={cn(collapsed && "lg:hidden")}>{label}</span>
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="m-3 hidden items-center gap-3 rounded-[var(--hse-radius-md)] px-3 py-2.5 text-sm hover:bg-[var(--hse-sidebar-active)] lg:flex"
        >
          <ChevronsLeft className={cn("h-5 w-5 transition", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </aside>
    </>
  );
}
