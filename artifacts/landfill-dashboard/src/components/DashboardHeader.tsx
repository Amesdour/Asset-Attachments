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
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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

  const sky = isDark ? "#0F2723" : "#D6E8E1";
  const ink = isDark ? "#E6F2EC" : "#0E1F1B";
  const inkSoft = isDark ? "rgba(230,242,236,0.68)" : "rgba(14,31,27,0.68)";
  const grass = isDark ? "#4F8A3F" : "#5E9B4A";
  const soil = isDark ? "#8F6B3F" : "#B58B55";
  const waste = "#2A2824";
  const onWaste = "#F1ECE2";
  const btn = {
    backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(14,31,27,0.08)",
    color: ink,
  };
  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  // Stepped terraces: same silhouette three times, each layer 5 units lower
  const steps = (o: number) => `M0 40 V${28 + o} H300 V${21 + o} H640 V${14 + o} H900 V${7 + o} H1200 V40 Z`;

  return (
    <div
      className="mb-6 overflow-hidden rounded-2xl print:rounded-none"
      style={{ fontFamily: "'Source Sans 3', 'Inter', sans-serif", backgroundColor: sky, color: ink }}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5 px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="flex min-w-0 items-center gap-5">
          <img src="/logo.png" alt="Logo EPWGCET" className="h-16 w-16 shrink-0 object-contain sm:h-[88px] sm:w-[88px]" />
          <h1 className="text-[26px] font-black leading-[1.02] tracking-[-0.025em] sm:text-[46px]">
            Tableau de bord
            <br />
            opérationnel
          </h1>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="text-right print:hidden">
            <div className="text-[34px] font-black leading-none tabular-nums tracking-tight">{timeStr}</div>
            <div className="mt-1.5 text-[13px] font-semibold capitalize" style={{ color: inkSoft }}>
              {dateStr}
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <div className="relative" ref={dropdownRef}>
              <div className="flex h-10 items-center overflow-hidden rounded-full text-[14px] font-semibold" style={btn}>
                <button onClick={onRefresh} className="flex h-full items-center gap-2 pl-4 pr-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                  <RefreshCw className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-label="Options d'actualisation automatique"
                  className="flex h-full items-center justify-center pl-1 pr-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border bg-popover py-1.5 text-popover-foreground shadow-xl">
                  <div className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Actualisation auto</div>
                  {INTERVAL_OPTIONS.map((opt) => (
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

            <button onClick={() => window.print()} className={iconBtn} style={btn} aria-label="Export as PDF">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={iconBtn} style={btn} aria-label="Toggle dark mode">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={logout} className={iconBtn} style={btn} aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Landfill cross-section: grass cap, cover soil, compacted waste */}
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="mt-5 block h-12 w-full sm:h-14" aria-hidden="true">
        <path d={steps(0)} fill={grass} />
        <path d={steps(5)} fill={soil} />
        <path d={steps(10)} fill={waste} />
      </svg>
      <div className="px-5 pb-5 pt-1 sm:px-8" style={{ backgroundColor: waste, color: onWaste }}>
        <p className="text-[18px] font-bold leading-tight">EPWGCET — Jijel</p>
        <p className="mt-0.5 max-w-[80ch] text-[13px] leading-snug opacity-70">
          Établissement Public de Wilaya de Gestion des Centres d'Enfouissement Technique
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold opacity-70">Sources :</span>
            {DATA_SOURCES.map((source) => (
              <span
                key={source}
                className="truncate rounded-full px-3 py-1 font-semibold"
                style={{ maxWidth: "22ch", backgroundColor: "rgba(241,236,226,0.12)" }}
                title={source}
              >
                {source}
              </span>
            ))}
          </div>
          {lastRefreshed && (
            <span className="flex items-center gap-1.5 opacity-70">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Dernière actualisation : {lastRefreshed}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
