import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { TimeseriesPoint, GetDashboardTimeseriesGranularity } from "@workspace/api-client-react";

function fmtDate(d: string, granularity: string) {
  try { return format(parseISO(d), granularity === "weekly" ? "'S'w MMM" : "dd MMM", { locale: fr }); }
  catch { return d; }
}

interface Props {
  data?: TimeseriesPoint[];
  loading: boolean;
  granularity: GetDashboardTimeseriesGranularity;
  onGranularityChange: (g: GetDashboardTimeseriesGranularity) => void;
}

export function TimeseriesChart({ data, loading, granularity, onGranularityChange }: Props) {
  const chartData = (data ?? []).map(p => ({
    date: fmtDate(p.date, granularity),
    "Volume (t)": p.weightMt,
    "Revenus (k DZD)": p.revenue != null ? parseFloat((p.revenue / 1000).toFixed(1)) : undefined,
  }));

  const hasRevenue = chartData.some(d => d["Revenus (k DZD)"] != null && d["Revenus (k DZD)"]! > 0);

  return (
    <Card className="border border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Évolution des décharges dans le temps</CardTitle>
        <Select value={granularity} onValueChange={v => onGranularityChange(v as GetDashboardTimeseriesGranularity)}>
          <SelectTrigger className="h-7 w-[100px] text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Journalier</SelectItem>
            <SelectItem value="weekly">Hebdo</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aucune donnée pour cette période</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis yAxisId="vol" tick={{ fontSize: 10 }} tickFormatter={v => `${v}t`} />
              {hasRevenue && <YAxis yAxisId="rev" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${v}k`} />}
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  name === "Volume (t)" ? `${v} t` : `${v}k DZD`, name,
                ]}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="vol" type="monotone" dataKey="Volume (t)" stroke="#3b82f6" strokeWidth={2} fill="url(#volGrad)" dot={false} activeDot={{ r: 4 }} />
              {hasRevenue && <Line yAxisId="rev" type="monotone" dataKey="Revenus (k DZD)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
