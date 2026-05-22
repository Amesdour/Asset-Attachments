import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import { Download, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import type { ForecastResult } from "@workspace/api-client-react";

export function ForecastChart({ data, loading }: { data?: ForecastResult; loading: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5";
  const tickColor = isDark ? "#98999C" : "#71717a";

  const chartData = data ? [...data.historicalPoints, ...data.forecastPoints] : [];
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const isForecast = payload[0].payload.isForecast;
    
    return (
      <div style={{ backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: "6px", padding: "10px 14px", border: `1px solid ${gridColor}`, color: isDark ? "#f3f4f6" : "#1a1a1a", fontSize: "13px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
        <div style={{ marginBottom: "6px", fontWeight: 600, display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <span>{format(new Date(label), "MMM yyyy")}</span>
          {isForecast && <span style={{ color: "#f59e0b", fontSize: "11px", padding: "2px 6px", borderRadius: "4px", backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)" }}>Forecast</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", backgroundColor: isForecast ? "#f59e0b" : "#3b82f6" }} />
          <span style={{ color: isDark ? "#9ca3af" : "#4b5563" }}>Cumulative Volume</span>
          <span style={{ marginLeft: "auto", fontWeight: 600 }}>{payload[0].value.toLocaleString()} MT</span>
        </div>
        {data?.capacityMaxMt && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "2px", backgroundColor: "#ef4444" }} />
            <span style={{ color: isDark ? "#9ca3af" : "#4b5563" }}>Max Capacity</span>
            <span style={{ marginLeft: "auto", fontWeight: 600 }}>{data.capacityMaxMt.toLocaleString()} MT</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
        <div>
          <CardTitle className="text-base font-semibold">Capacity Forecast</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Projected landfill volume for next 12 months</p>
        </div>
        {!loading && chartData.length > 0 && (
          <CSVLink data={chartData} filename="capacity-forecast.csv" className="print:hidden flex items-center justify-center w-7 h-7 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </CSVLink>
        )}
      </CardHeader>
      
      {data?.willExceedCapacity && (
        <div className="bg-red-50 dark:bg-red-950/50 border-y border-red-200 dark:border-red-900 px-5 py-3 flex items-center gap-3">
          <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/80 p-2 rounded-full">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm">CAPACITY ALERT</h4>
            <p className="text-red-700 dark:text-red-400 text-xs mt-0.5">
              Landfill projected to reach maximum capacity in {data.warningMonths} months.
            </p>
          </div>
        </div>
      )}

      <CardContent className="p-5">
        {loading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300} debounce={0}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "MMM yy")} tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} axisLine={false} tickLine={false} dy={10} minTickGap={30} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} axisLine={false} tickLine={false} dx={-10} domain={[0, 'dataMax']} />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: tickColor, strokeDasharray: '3 3' }} />
              
              {data?.capacityMaxMt && (
                <ReferenceLine y={data.capacityMaxMt} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'top', value: 'Max Capacity', fill: '#ef4444', fontSize: 11 }} />
              )}
              
              <Line type="monotone" dataKey="cumulativeVolume" stroke={(d: any) => d.payload?.isForecast ? "#f59e0b" : "#3b82f6"} strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">No forecast data available</div>
        )}
      </CardContent>
    </Card>
  );
}
