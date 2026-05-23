import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Brain, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useGetDashboardForecastAdvanced } from "@workspace/api-client-react";
import type { AdvancedForecastResult } from "@workspace/api-client-react";

type Scenario = "base" | "pessimistic" | "optimistic";

function fmt(n: number, d = 0) { return n.toLocaleString("fr-DZ", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtMonth(s: string) { try { return format(parseISO(s), "MMM yy", { locale: fr }); } catch { return s; } }

const SCENARIO_COLOR: Record<Scenario, string> = {
  base: "#3b82f6",
  pessimistic: "#ef4444",
  optimistic: "#10b981",
};
const WASTE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
const HORIZON_OPTIONS = [
  { label: "2 ans", value: 2 },
  { label: "5 ans", value: 5 },
  { label: "10 ans", value: 10 },
  { label: "20 ans", value: 20 },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ModelBadge({ data }: { data: AdvancedForecastResult["modelStats"] }) {
  const dir = data.trendDirection;
  const Icon = dir === "hausse" ? TrendingUp : dir === "baisse" ? TrendingDown : Minus;
  const color = dir === "hausse" ? "text-emerald-600" : dir === "baisse" ? "text-red-500" : "text-amber-500";
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Badge variant="outline" className="gap-1 text-[11px]">
        <Brain className="w-3 h-3" /> {data.algorithm}
      </Badge>
      <Badge variant="outline" className="gap-1 text-[11px]">
        R² = {data.rSquared.toFixed(2)}
      </Badge>
      <Badge variant="outline" className="gap-1 text-[11px]">
        MAPE = {data.mape}%
      </Badge>
      <Badge variant="outline" className={`gap-1 text-[11px] ${color}`}>
        <Icon className="w-3 h-3" />
        Tendance : {data.annualGrowthRatePct > 0 ? "+" : ""}{data.annualGrowthRatePct}%/an
      </Badge>
      {data.seasonalPatternDetected && (
        <Badge variant="outline" className="gap-1 text-[11px] text-violet-600">
          Saisonnalité détectée
        </Badge>
      )}
      <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
        {data.monthlyDataPoints} jours d'historique
      </Badge>
    </div>
  );
}

function MainVolumeChart({ data, scenario, horizonYears }: { data: AdvancedForecastResult; scenario: Scenario; horizonYears: number }) {
  // Build unified historical + forecast series for chart
  const hist = data.historicalMonthly.map(h => ({
    month: fmtMonth(h.month),
    historical: h.volume,
    base: undefined as number | undefined,
    lower95: undefined as number | undefined,
    upper95: undefined as number | undefined,
    scenario: undefined as number | undefined,
  }));

  // Sample to avoid cluttering (max 120 points)
  const maxPoints = 120;
  const raw = data.forecastMonthly.filter((_, i) => i < horizonYears * 12);
  const step = Math.max(1, Math.ceil(raw.length / maxPoints));
  const fore = raw.filter((_, i) => i % step === 0).map(f => ({
    month: fmtMonth(f.month),
    historical: undefined as number | undefined,
    base: f.base,
    lower95: f.lower95,
    upper95: f.upper95,
    scenario: scenario === "pessimistic" ? f.pessimistic : scenario === "optimistic" ? f.optimistic : f.base,
  }));

  const combined = [...hist, ...fore];
  const scenarioLabel = scenario === "base" ? "Base" : scenario === "pessimistic" ? "Pessimiste" : "Optimiste";
  const scenarioColor = SCENARIO_COLOR[scenario];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={combined} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="ci95" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}t`} />
        <Tooltip
          contentStyle={{ fontSize: 11 }}
          formatter={(v: number, name: string) => {
            const labels: Record<string, string> = {
              historical: "Historique (t)",
              base: "Prévision base (t)",
              lower95: "Borne inf. 95%",
              upper95: "Borne sup. 95%",
              scenario: `${scenarioLabel} (t)`,
            };
            return [fmt(v, 1), labels[name] ?? name];
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        {/* 95% CI band */}
        <Area dataKey="upper95" fill="url(#ci95)" stroke="none" name="upper95" legendType="none" connectNulls />
        <Area dataKey="lower95" fill="white" stroke="none" name="lower95" legendType="none" connectNulls />
        {/* Historical */}
        <Line dataKey="historical" name="Historique" stroke="#64748b" strokeWidth={2} dot={false} connectNulls />
        {/* Base forecast */}
        <Line dataKey="base" name="Base" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
        {/* Scenario */}
        {scenario !== "base" && (
          <Line dataKey="scenario" name={scenarioLabel} stroke={scenarioColor} strokeWidth={2} dot={false} strokeDasharray="8 4" connectNulls />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function AnnualTable({ data, scenario }: { data: AdvancedForecastResult; scenario: Scenario }) {
  const today = new Date().getFullYear();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40">
            {["Année", "Volume base (t/an)", scenario === "pessimistic" ? "Pessimiste (t)" : "Optimiste (t)", "IC 95% min", "IC 95% max", "Revenus (DZD)", "Δ vs. référence"].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.annualForecasts.map(row => {
            const scenarioVol = scenario === "pessimistic" ? row.pessimisticVolume : row.optimisticVolume;
            const isFirst = row.year === today + 1;
            return (
              <tr key={row.year} className={`border-b hover:bg-muted/20 transition-colors ${isFirst ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
                <td className="px-3 py-2 font-bold text-foreground">{row.year}</td>
                <td className="px-3 py-2 font-semibold">{fmt(row.baseVolume, 1)}</td>
                <td className={`px-3 py-2 font-semibold ${scenario === "pessimistic" ? "text-red-600" : "text-emerald-600"}`}>
                  {fmt(scenarioVol, 1)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{fmt(row.lower95Volume, 1)}</td>
                <td className="px-3 py-2 text-muted-foreground">{fmt(row.upper95Volume, 1)}</td>
                <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400 font-semibold">{fmt(row.baseRevenue)}</td>
                <td className="px-3 py-2">
                  <span className={`font-semibold ${row.growthVsBase >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {row.growthVsBase >= 0 ? "+" : ""}{row.growthVsBase}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SiteTimeline({ data, scenario }: { data: AdvancedForecastResult; scenario: Scenario }) {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 30;

  return (
    <div className="space-y-4">
      {data.siteProjections.map((site, i) => {
        const baseYear = site.exhaustionYear_base;
        const pessYear = site.exhaustionYear_pessimistic;
        const optYear = site.exhaustionYear_optimistic;
        const targetYear = scenario === "base" ? baseYear : scenario === "pessimistic" ? pessYear : optYear;
        const remaining = site.capacityMt - site.usedMt;
        const pct = site.pctUsed;
        const barColor = pct > 80 ? "#dc2626" : pct > 50 ? "#f59e0b" : "#16a34a";
        const trend = site.trendMtPerMonth;
        const trendLabel = trend > 1 ? `+${trend.toFixed(1)}t/jour` : trend < -0.5 ? `${trend.toFixed(1)}t/jour` : "stable";
        const trendColor = trend > 1 ? "text-red-500" : trend < -0.5 ? "text-emerald-500" : "text-muted-foreground";

        return (
          <Card key={site.siteId} className="border border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-sm">{site.siteName}</h4>
                  <p className="text-xs text-muted-foreground">{site.region}</p>
                </div>
                <div className="text-right">
                  {targetYear ? (
                    <div>
                      <p className={`text-sm font-bold ${targetYear < currentYear + 10 ? "text-red-600" : targetYear < currentYear + 20 ? "text-amber-600" : "text-emerald-600"}`}>
                        Saturation vers {targetYear}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {targetYear - currentYear} années restantes
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-emerald-600">Capacité suffisante &gt;30 ans</p>
                  )}
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{fmt(site.usedMt)} t utilisées</span>
                  <span>{pct.toFixed(3)}% de {(site.capacityMt / 1_000_000).toFixed(0)}M t</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                </div>
              </div>

              {/* Scenario comparison */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                {[
                  { label: "Pessimiste", year: pessYear, color: "text-red-600" },
                  { label: "Base", year: baseYear, color: "text-blue-600" },
                  { label: "Optimiste", year: optYear, color: "text-emerald-600" },
                ].map(s => (
                  <div key={s.label} className="bg-muted/30 rounded p-1.5">
                    <p className="text-muted-foreground">{s.label}</p>
                    <p className={`font-bold text-xs ${s.color}`}>{s.year ? s.year : ">2055"}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-2 text-[10px]">
                <span className="text-muted-foreground">Rythme actuel : {fmt(site.monthlyRateMt, 1)} t/jour</span>
                <span className={`font-semibold ${trendColor}`}>{trendLabel}</span>
                <span className="text-muted-foreground">Restant : {fmt(remaining, 0)} t</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function WasteTypeForecastChart({ data }: { data: AdvancedForecastResult }) {
  if (!data.wasteTypeForecast.length || !data.annualForecasts.length) return null;

  const years = [...new Set(data.wasteTypeForecast[0]?.annualVolumes.map(v => v.year) ?? [])];

  // Build stacked bar data by year
  const chartData = years.map(yr => {
    const row: Record<string, number | string> = { year: String(yr) };
    for (const wt of data.wasteTypeForecast) {
      const found = wt.annualVolumes.find(v => v.year === yr);
      row[wt.label] = found?.volume ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}t`} />
        <Tooltip
          contentStyle={{ fontSize: 11 }}
          formatter={(v: number, name: string) => [`${fmt(v, 1)} t`, name]}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        {data.wasteTypeForecast.map((wt, i) => (
          <Bar key={wt.wasteType} dataKey={wt.label} stackId="a" fill={WASTE_COLORS[i % WASTE_COLORS.length]} radius={i === data.wasteTypeForecast.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function WasteTypeCards({ data }: { data: AdvancedForecastResult }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {data.wasteTypeForecast.map((wt, i) => {
        const Icon = wt.trendDir === "hausse" ? TrendingUp : wt.trendDir === "baisse" ? TrendingDown : Minus;
        const color = wt.trendDir === "hausse" ? "text-red-500" : wt.trendDir === "baisse" ? "text-emerald-500" : "text-amber-500";
        return (
          <Card key={wt.wasteType} className="border border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: WASTE_COLORS[i % WASTE_COLORS.length] }} />
                <p className="text-xs font-semibold truncate">{wt.label}</p>
              </div>
              <p className="text-lg font-bold">{fmt(wt.annualForecastMt, 1)} t/an</p>
              <div className="flex items-center gap-1 mt-1">
                <Icon className={`w-3 h-3 ${color}`} />
                <span className={`text-[10px] font-medium ${color}`}>{wt.trendDir}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Total historique : {fmt(wt.totalHistoricalMt, 1)} t</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RevenueChart({ data, horizonYears }: { data: AdvancedForecastResult; horizonYears: number }) {
  // Yearly revenue bars
  const chartData = data.annualForecasts.map(r => ({
    year: String(r.year),
    Revenus: r.baseRevenue,
    color: r.growthVsBase >= 0 ? "#10b981" : "#ef4444",
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
        <Tooltip formatter={(v: number) => [`${fmt(v)} DZD`, "Revenus prévisionnels"]} />
        <Bar dataKey="Revenus" radius={[4, 4, 0, 0]}>
          {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ForecastAdvanced() {
  const [horizonYears, setHorizonYears] = useState(10);
  const [scenario, setScenario] = useState<Scenario>("base");

  const { data, isLoading, isFetching } = useGetDashboardForecastAdvanced({ years: horizonYears });
  const loading = isLoading || isFetching;

  const modelStats = data?.modelStats;
  const qualityColor = modelStats ? (modelStats.rSquared > 0.7 ? "text-emerald-600" : modelStats.rSquared > 0.4 ? "text-amber-600" : "text-red-500") : "";

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <Card className="border border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" />
                Moteur de prévision intelligent — Holt-Winters
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lissage exponentiel double (α=0.35, β=0.12) · Intervalles de confiance 80%/95% · 3 scénarios
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Horizon selector */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Horizon</p>
                <div className="flex rounded-md border overflow-hidden">
                  {HORIZON_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setHorizonYears(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        horizonYears === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted text-foreground border-r last:border-r-0"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Scenario selector */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Scénario</p>
                <div className="flex rounded-md border overflow-hidden">
                  {(["pessimistic", "base", "optimistic"] as Scenario[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setScenario(s)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 ${
                        scenario === s
                          ? s === "pessimistic"
                            ? "bg-red-500 text-white"
                            : s === "optimistic"
                            ? "bg-emerald-500 text-white"
                            : "bg-blue-500 text-white"
                          : "bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      {s === "pessimistic" ? "Pessimiste" : s === "optimistic" ? "Optimiste" : "Base"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Model quality strip */}
          {!loading && modelStats && (
            <div className="mt-3 pt-3 border-t">
              <ModelBadge data={modelStats} />
            </div>
          )}
          {loading && <Skeleton className="h-6 w-full mt-3" />}
        </CardContent>
      </Card>

      {/* Main volume forecast chart */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Prévision volume collecté — {horizonYears} ans ({scenario === "base" ? "Scénario base" : scenario === "pessimistic" ? "Scénario pessimiste" : "Scénario optimiste"})
            </CardTitle>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-slate-400" /> Historique</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-400 border-dashed border-b-2" /> Base</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 bg-blue-100 rounded" /> IC 95%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? <Skeleton className="h-[280px] w-full" /> : data && (
            <MainVolumeChart data={data} scenario={scenario} horizonYears={horizonYears} />
          )}
        </CardContent>
      </Card>

      {/* Tabs: Annual Table / Sites / Waste Types / Revenue */}
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : data ? (
        <Tabs defaultValue="annual">
          <TabsList className="h-8 mb-3 bg-muted/50">
            <TabsTrigger value="annual" className="text-xs h-7">Projections annuelles</TabsTrigger>
            <TabsTrigger value="sites" className="text-xs h-7">Saturation des sites</TabsTrigger>
            <TabsTrigger value="waste" className="text-xs h-7">Flux de déchets</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs h-7">Revenus prévisionnels</TabsTrigger>
          </TabsList>

          {/* Annual table */}
          <TabsContent value="annual" className="mt-0">
            <Card className="border border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Tableau de projections annuelles — {horizonYears} ans</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <AnnualTable data={data} scenario={scenario} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Site saturation */}
          <TabsContent value="sites" className="mt-0">
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap text-xs">
                {[
                  { color: "bg-red-100 text-red-700 border-red-200", label: "Saturation dans < 10 ans" },
                  { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Saturation dans 10-20 ans" },
                  { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Capacité suffisante > 20 ans" },
                ].map(l => (
                  <Badge key={l.label} variant="outline" className={l.color}>{l.label}</Badge>
                ))}
              </div>
              <SiteTimeline data={data} scenario={scenario} />
            </div>
          </TabsContent>

          {/* Waste type forecast */}
          <TabsContent value="waste" className="mt-0 space-y-4">
            <WasteTypeCards data={data} />
            <Card className="border border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Volume prévisionnel par type de déchet (t/an)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <WasteTypeForecastChart data={data} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue forecast */}
          <TabsContent value="revenue" className="mt-0 space-y-4">
            <Card className="border border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Revenus prévisionnels annuels (DZD)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <RevenueChart data={data} horizonYears={horizonYears} />
              </CardContent>
            </Card>
            {/* Revenue summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.annualForecasts.slice(0, 4).map(r => (
                <Card key={r.year} className="border border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">{r.year}</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{fmt(r.baseRevenue)} DZD</p>
                    <p className={`text-[10px] font-medium mt-0.5 ${r.growthVsBase >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {r.growthVsBase >= 0 ? "+" : ""}{r.growthVsBase}% vs référence
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : null}

      {/* Alert banners for critical sites */}
      {!loading && data && data.siteProjections.some(s => s.exhaustionYear_pessimistic && s.exhaustionYear_pessimistic < new Date().getFullYear() + 10) && (
        <Card className="border-l-4 border-l-red-500 border border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-300">Alerte capacité — intervention requise</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  {data.siteProjections.filter(s => s.exhaustionYear_pessimistic && s.exhaustionYear_pessimistic < new Date().getFullYear() + 10)
                    .map(s => `${s.siteName} : saturation estimée ${s.exhaustionYear_pessimistic} (scénario pessimiste)`)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
