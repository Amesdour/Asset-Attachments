import { useState, useRef, useEffect } from "react";
import { RefreshCw, ChevronDown, Printer, Sun, Moon, Check, LogOut, Clock } from "lucide-react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const DATA_SOURCES = ["Base de données", "API Pont-bascule"];

const INTERVAL_OPTIONS = [
  { label: "Désactivé", ms: 0 },
  { label: "Toutes les 5 min", ms: 5 * 60 * 1000 },
  { label: "Toutes les 15 min", ms: 15 * 60 * 1000 },
  { label: "Toutes les 30 min", ms: 30 * 60 * 1000 },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function DashboardHeader({ lastRefreshed, isSpinning, onRefresh }: { lastRefreshed: string | null; isSpinning: boolean; onRefresh: () => void }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIntervalMs, setSelectedIntervalMs] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const now = useClock();

  const timeStr = now.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("fr-DZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedIntervalMs > 0) {
      const timer = setInterval(() => {
        queryClient.invalidateQueries();
      }, selectedIntervalMs);
      return () => clearInterval(timer);
    }
  }, [selectedIntervalMs, queryClient]);

  const accent = isDark ? "hsl(153 55% 55%)" : "hsl(153 55% 32%)";
  const glass = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.75)";
  const glassBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)";
  const buttonStyle = {
    backgroundColor: glass,
    border: `1px solid ${glassBorder}`,
    color: isDark ? "#d4d6da" : "#374151",
    backdropFilter: "blur(8px)",
  };
  const iconBtn =
    "flex items-center justify-center w-9 h-9 rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0";

  return (
    <div
      className="relative mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-4 overflow-hidden rounded-3xl p-5 sm:p-6 print:p-0 print:rounded-none"
      style={{
        fontFamily: "'Source Sans 3', 'Inter', sans-serif",
        border: `1px solid ${glassBorder}`,
        backgroundImage: isDark
          ? "radial-gradient(120% 140% at 0% 0%, rgba(16,185,129,0.16), transparent 55%), radial-gradient(90% 120% at 100% 0%, rgba(14,165,233,0.12), transparent 60%)"
          : "radial-gradient(120% 140% at 0% 0%, rgba(16,185,129,0.14), transparent 55%), radial-gradient(90% 120% at 100% 0%, rgba(14,165,233,0.10), transparent 60%)",
        boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 30px rgba(15,23,42,0.06)",
      }}
    >
      <div className="relative">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="Logo EPWGCET"
            className="h-[72px] w-[72px] shrink-0 object-contain"
            style={{ filter: "drop-shadow(0 6px 14px rgba(16,185,129,0.25))" }}
          />
          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)", color: accent }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
              EPWGCET — Jijel
            </span>
            <h1
              className="mt-1 text-[32px] font-bold leading-tight tracking-tight text-foreground"
              style={{
                backgroundImage: `linear-gradient(90deg, ${isDark ? "#f1f5f9" : "#0f172a"} 30%, ${accent})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Tableau de Bord opérationnel
            </h1>
          </div>
        </div>

        <div className="mt-4">
          <p className="max-w-[60ch] text-[13px] leading-snug text-muted-foreground">
            Établissement Public de Wilaya de Gestion des Centres d'Enfouissement Technique
          </p>

          {DATA_SOURCES.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-[12px] font-semibold text-muted-foreground">Sources :</span>
              {DATA_SOURCES.map((source) => (
                <span
                  key={source}
                  className="inline-flex items-center gap-1.5 truncate rounded-full px-3 py-1 text-[12px] font-semibold shadow-sm print:!bg-[rgb(229,231,235)] print:!text-[rgb(75,85,99)]"
                  title={source}
                  style={{ maxWidth: "22ch", ...buttonStyle }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }} />
                  {source}
                </span>
              ))}
            </div>
          )}

          {lastRefreshed && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              Dernière actualisation : {lastRefreshed}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex flex-col items-end gap-3">
        {/* Real-time clock */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-sm print:hidden"
          style={{ ...buttonStyle }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)" }}>
            <Clock className="h-4 w-4 shrink-0" style={{ color: accent }} />
          </div>
          <div className="text-right leading-none">
            <div className="font-mono text-[22px] font-bold tracking-widest" style={{ color: accent }}>
              {timeStr}
            </div>
            <div className="mt-1 text-[11px] capitalize" style={{ color: isDark ? "#8a9ba0" : "#6b7280" }}>
              {dateStr}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <div className="relative" ref={dropdownRef}>
            <div
              className="flex h-9 items-center overflow-hidden rounded-xl text-[13px] font-medium shadow-sm transition-all duration-200 hover:shadow-md"
              style={buttonStyle}
            >
              <button onClick={onRefresh} className="flex h-full items-center gap-1.5 px-3.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                <RefreshCw className={`h-3.5 w-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                Actualiser
              </button>
              <div className="h-4 w-px shrink-0" style={{ backgroundColor: glassBorder }} />
              <button onClick={() => setDropdownOpen((o) => !o)} className="flex h-full items-center justify-center px-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border bg-popover py-1.5 shadow-xl">
                <div className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actualisation auto
                </div>
                {INTERVAL_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    className="mx-1.5 flex w-[calc(100%-12px)] items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => { setSelectedIntervalMs(opt.ms); setDropdownOpen(false); }}
                  >
                    {opt.label}
                    {selectedIntervalMs === opt.ms && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => window.print()} className={iconBtn} style={buttonStyle} aria-label="Export as PDF">
            <Printer className="h-4 w-4" />
          </button>

          <button onClick={() => setTheme(isDark ? "light" : "dark")} className={iconBtn} style={buttonStyle} aria-label="Toggle dark mode">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={logout}
            className={`${iconBtn} text-muted-foreground hover:!bg-red-100 hover:text-red-600 dark:hover:!bg-red-900/30 dark:hover:text-red-400`}
            style={buttonStyle}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
