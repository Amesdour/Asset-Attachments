import { useState } from "react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import { Download } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme } from "next-themes";
import type { TimeseriesPoint, GetDashboardTimeseriesGranularity } from "@workspace/api-client-react";

const CHART_COLORS = {
  blue: "#0079F2",
  green: "#10b981",
};

export function TimeseriesChart({ 
  data, 
  loading, 
  granularity, 
  onGranularityChange 
}: { 
  data?: TimeseriesPoint[]; 
  loading: boolean;
  granularity: GetDashboardTimeseriesGranularity;
  onGranularityChange: (g: GetDashboardTimeseriesGranularity) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5";
  const tickColor = isDark ? "#98999C" : "#71717a";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div style={{ backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: "6px", padding: "10px 14px", border: `1px solid ${gridColor}`, color: isDark ? "#f3f4f6" : "#1a1a1a", fontSize: "13px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
        <div style={{ marginBottom: "6px", fontWeight: 600 }}>{format(new Date(label), "MMM d, yyyy")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", backgroundColor: CHART_COLORS.green }} />
          <span style={{ color: isDark ? "#9ca3af" : "#4b5563" }}>Poids net</span>
          <span style={{ marginLeft: "auto", fontWeight: 600 }}>{payload[0].value.toLocaleString()} t</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="col-span-1 lg:col-span-2 shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
        <div>
          <CardTitle className="text-base font-semibold">Volume des décharges</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value={granularity} onValueChange={(v) => v && onGranularityChange(v as GetDashboardTimeseriesGranularity)} size="sm" className="bg-muted p-0.5 rounded-md">
            <ToggleGroupItem value="daily" className="text-xs px-2.5 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm">Journalier</ToggleGroupItem>
            <ToggleGroupItem value="weekly" className="text-xs px-2.5 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm">Hebdomadaire</ToggleGroupItem>
          </ToggleGroup>

          {!loading && data && data.length > 0 && (
            <CSVLink data={data} filename="waste-volume.csv" className="print:hidden flex items-center justify-center w-7 h-7 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Download className="w-3.5 h-3.5" />
            </CSVLink>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {loading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300} debounce={0}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "MMM d")} tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} axisLine={false} tickLine={false} dy={10} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: tickColor, strokeDasharray: '3 3', fill: 'transparent' }} />
              <Area type="monotone" dataKey="weightMt" stroke={CHART_COLORS.green} fill="url(#gradientGreen)" strokeWidth={2.5} activeDot={{ r: 5, fill: CHART_COLORS.green, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">Aucune donnée disponible</div>
        )}
      </CardContent>
    </Card>
  );
}
