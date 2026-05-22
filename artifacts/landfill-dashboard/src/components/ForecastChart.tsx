import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Bar
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { useTheme } from "next-themes";
import type { ForecastResult } from "@workspace/api-client-react";

function YearsLabel({ years }: { years: number }) {
  if (years >= 9999) return <span className="text-green-600 dark:text-green-400 font-semibold text-xs">Stable ∞</span>;
  if (years > 100) return <span className="text-green-600 dark:text-green-400 font-semibold text-xs">{Math.round(years)}y remaining</span>;
  if (years > 30) return <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">{Math.round(years)}y remaining</span>;
  return <span className="text-red-600 dark:text-red-400 font-semibold text-xs">{Math.round(years)}y remaining</span>;
}

export function ForecastChart({ data, loading }: { data?: ForecastResult; loading: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const tickColor = isDark ? "#6b7280" : "#9ca3af";

  const volumeChartData = data
    ? [...data.historicalPoints, ...data.forecastPoints]
    : [];

  const revenueChartData = data
    ? [...(data.revenueHistorical ?? []), ...(data.revenueForecast ?? [])]
    : [];

  const combinedChart = volumeChartData.map((vp, i) => ({
    date: vp.date,
    cumulativeVolume: vp.cumulativeVolume,
    isForecast: vp.isForecast,
    revenue: revenueChartData[i]?.revenue ?? null,
  }));

  const VolumeTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const isForecast = payload[0]?.payload?.isForecast;
    return (
      <div style={{ background: isDark ? "#1f2937" : "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${gridColor}`, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          {format(new Date(label), "MMM yyyy")}
          {isForecast && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#d97706" }}>Projected</span>}
        </div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, display: "inline-block" }} />
            <span style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>{p.name}</span>
            <span style={{ marginLeft: "auto", fontWeight: 600, paddingLeft: 12 }}>
              {p.dataKey === "revenue"
                ? `${Number(p.value).toLocaleString("fr-DZ")} DZD`
                : `${Number(p.value).toLocaleString()} t`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Capacity & Revenue Forecast
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Solid = historical · Dashed = 12-month projection</p>
          </div>
        </div>
      </CardHeader>

      {data?.willExceedCapacity && (
        <div className="bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 px-5 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Capacity will be reached in {data.warningMonths} months — begin expansion planning immediately.
          </p>
        </div>
      )}

      <CardContent className="p-5 space-y-6">
        {loading ? (
          <Skeleton className="w-full h-[260px]" />
        ) : combinedChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={260} debounce={0}>
            <ComposedChart data={combinedChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "MMM yy")} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} dy={8} minTickGap={28} />
              <YAxis yAxisId="vol" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k t`} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} dx={-4} width={52} />
              <YAxis yAxisId="rev" orientation="right" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} dx={4} width={48} />
              <Tooltip content={<VolumeTooltip />} isAnimationActive={false} />
              <Legend iconType="line" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line yAxisId="vol" type="monotone" dataKey="cumulativeVolume" name="Cumulative Volume (t)" stroke="#3b82f6" strokeWidth={2.5} dot={false} strokeDasharray={(d: any) => d?.isForecast ? "6 3" : "0"} isAnimationActive={false} />
              <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Monthly Revenue (DZD)" stroke="#10b981" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No forecast data</div>
        )}

        {/* Per-site capacity bars */}
        {!loading && data?.siteProjections && data.siteProjections.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Per-Site Capacity Status
            </h4>
            <div className="space-y-3">
              {data.siteProjections.map((site) => {
                const pct = Math.max(site.pctUsed, 0.01);
                const barWidth = Math.min(pct * 100, 100);
                const barColor = pct > 50 ? "#ef4444" : pct > 25 ? "#f59e0b" : "#10b981";
                return (
                  <div key={site.siteId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{site.siteName}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{site.siteId}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-xs text-muted-foreground">{site.monthlyRateMt.toFixed(0)} t/mo</span>
                        <YearsLabel years={site.yearsUntilFull} />
                      </div>
                    </div>
                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                        style={{ width: `${barWidth}%`, background: barColor }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{site.usedMt.toLocaleString()} t used</span>
                      <span className="text-[10px] text-muted-foreground">{site.pctUsed.toFixed(3)}% of {(site.capacityMt / 1000000).toFixed(0)}M t capacity</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
