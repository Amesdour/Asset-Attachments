import { useState, useRef, useEffect } from "react";
import { RefreshCw, ChevronDown, Printer, Sun, Moon, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";

const DATA_SOURCES = ["App DB", "Weighbridge API"];

const INTERVAL_OPTIONS = [
  { label: "Off", ms: 0 },
  { label: "Every 5 min", ms: 5 * 60 * 1000 },
  { label: "Every 15 min", ms: 15 * 60 * 1000 },
  { label: "Every 30 min", ms: 30 * 60 * 1000 },
];

export function DashboardHeader({ lastRefreshed, isSpinning, onRefresh }: { lastRefreshed: string | null; isSpinning: boolean; onRefresh: () => void }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIntervalMs, setSelectedIntervalMs] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

  const buttonStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2",
    color: isDark ? "#c8c9cc" : "#4b5563",
  };

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-4">
      <div className="pt-2">
        <h1 className="font-bold text-[32px] tracking-tight text-foreground">Waste Operations</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">Landfill Command Center</p>
        
        {DATA_SOURCES.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[12px] text-muted-foreground shrink-0 font-medium">Data Sources:</span>
            {DATA_SOURCES.map((source) => (
              <span
                key={source}
                className="text-[12px] font-bold rounded px-2 py-0.5 truncate print:!bg-[rgb(229,231,235)] print:!text-[rgb(75,85,99)]"
                title={source}
                style={{
                  maxWidth: "20ch",
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgb(229, 231, 235)",
                  color: isDark ? "#c8c9cc" : "rgb(75, 85, 99)",
                }}
              >
                {source}
              </span>
            ))}
          </div>
        )}
        
        {lastRefreshed && (
          <p className="text-[12px] text-muted-foreground mt-2">Last refresh: {lastRefreshed}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2 print:hidden">
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center rounded-[6px] overflow-hidden h-[28px] text-[13px] font-medium transition-colors"
            style={buttonStyle}
          >
            <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 h-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className="w-px h-4 shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
            <button onClick={() => setDropdownOpen((o) => !o)} className="flex items-center justify-center px-2 h-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-md z-50 py-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Auto-Refresh
              </div>
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
                  onClick={() => { setSelectedIntervalMs(opt.ms); setDropdownOpen(false); }}
                >
                  {opt.label}
                  {selectedIntervalMs === opt.ms && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={buttonStyle}
          aria-label="Export as PDF"
        >
          <Printer className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={buttonStyle}
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
