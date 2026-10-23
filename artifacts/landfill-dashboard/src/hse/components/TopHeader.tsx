import { Bell, Building2, Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function TopHeader({ onMenu }: { onMenu: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--hse-border)] bg-[var(--hse-surface)]/90 px-4 backdrop-blur lg:px-6">
      <button type="button" onClick={onMenu} aria-label="Open menu" className="rounded-md p-2 hover:bg-[var(--hse-surface-alt)] lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hse-text-muted)]" />
        <input
          type="search"
          placeholder="Search hazards, audits, regulations…"
          aria-label="Global search"
          className="w-full rounded-[var(--hse-radius-md)] border border-[var(--hse-border)] bg-[var(--hse-bg)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--hse-primary)] focus:ring-2 focus:ring-[var(--hse-primary)]/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" className="hidden items-center gap-2 rounded-[var(--hse-radius-md)] border border-[var(--hse-border)] px-3 py-2 text-sm md:flex">
          <Building2 className="h-4 w-4 text-[var(--hse-text-muted)]" />
          CET Jijel
        </button>
        <button type="button" aria-label="Toggle theme" onClick={() => setTheme(dark ? "light" : "dark")} className="rounded-md p-2 hover:bg-[var(--hse-surface-alt)]">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button type="button" aria-label="Notifications, 3 unread" className="relative rounded-md p-2 hover:bg-[var(--hse-surface-alt)]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--hse-danger)] px-1 text-[10px] font-semibold text-white">3</span>
        </button>
        <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--hse-primary)] text-sm font-semibold text-white" aria-label="User profile">
          A
        </div>
      </div>
    </header>
  );
}
