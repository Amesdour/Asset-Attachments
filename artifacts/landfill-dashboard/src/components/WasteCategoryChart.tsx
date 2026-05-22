import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import { Download } from "lucide-react";
import { useTheme } from "next-themes";
import type { WasteCategoryBar } from "@workspace/api-client-react";

const CHART_COLORS = {
  collected: "#3b82f6", // blue
  treated: "#10b981", // green
};

export function WasteCategoryChart({ data, loading }: { data?: WasteCategoryBar[]; loading: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5";
  const tickColor = isDark ? "#98999C" : "#71717a";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div style={{ backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: "6px", padding: "10px 14px", border: `1px solid ${gridColor}`, color: isDark ? "#f3f4f6" : "#1a1a1a", fontSize: "13px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
        <div style={{ marginBottom: "6px", fontWeight: 600 }}>{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", backgroundColor: entry.color }} />
            <span style={{ color: isDark ? "#9ca3af" : "#4b5563" }}>{entry.name}</span>
            <span style={{ marginLeft: "auto", fontWeight: 600 }}>{entry.value.toLocaleString()} MT</span>
          </div>
        ))}
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px", fontSize: "13px", marginTop: "10px" }}>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", backgroundColor: entry.color }} />
            <span style={{ color: tickColor }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="col-span-1 shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
        <CardTitle className="text-base font-semibold">Collected vs Treated</CardTitle>
        {!loading && data && data.length > 0 && (
          <CSVLink data={data} filename="waste-categories.csv" className="print:hidden flex items-center justify-center w-7 h-7 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </CSVLink>
        )}
      </CardHeader>
      <CardContent className="p-5">
        {loading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300} debounce={0}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} axisLine={false} tickLine={false} dy={10} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
              <Legend content={<CustomLegend />} verticalAlign="bottom" />
              <Bar dataKey="collected" name="Collected" fill={CHART_COLORS.collected} fillOpacity={0.9} radius={[2, 2, 0, 0]} isAnimationActive={false} maxBarSize={40} />
              <Bar dataKey="treated" name="Treated" fill={CHART_COLORS.treated} fillOpacity={0.9} radius={[2, 2, 0, 0]} isAnimationActive={false} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}
