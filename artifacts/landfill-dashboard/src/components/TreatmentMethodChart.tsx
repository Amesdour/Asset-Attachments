import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import { Download } from "lucide-react";
import { useTheme } from "next-themes";
import type { TreatmentMethodSlice } from "@workspace/api-client-react";

const CHART_COLOR_LIST = [
  "#0079F2", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#6366f1", // indigo
];

export function TreatmentMethodChart({ data, loading }: { data?: TreatmentMethodSlice[]; loading: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5";
  const tickColor = isDark ? "#98999C" : "#71717a";

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0].payload;
    return (
      <div style={{ backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: "6px", padding: "10px 14px", border: `1px solid ${gridColor}`, color: isDark ? "#f3f4f6" : "#1a1a1a", fontSize: "13px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", backgroundColor: payload[0].color }} />
          <span style={{ fontWeight: 600 }}>{entry.method}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "6px", color: isDark ? "#9ca3af" : "#4b5563" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <span>Volume:</span>
            <span style={{ fontWeight: 500, color: isDark ? "#f3f4f6" : "#111827" }}>{entry.value.toLocaleString()} MT</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <span>Share:</span>
            <span style={{ fontWeight: 500, color: isDark ? "#f3f4f6" : "#111827" }}>{entry.percent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 20px", fontSize: "12px", marginTop: "10px" }}>
        {payload.map((entry: any, index: number) => {
          const original = data?.[index];
          return (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", backgroundColor: entry.color }} />
              <span style={{ color: tickColor }}>{entry.value} ({original?.percent.toFixed(1)}%)</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="col-span-1 shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
        <CardTitle className="text-base font-semibold">Treatment Methods</CardTitle>
        {!loading && data && data.length > 0 && (
          <CSVLink data={data} filename="treatment-methods.csv" className="print:hidden flex items-center justify-center w-7 h-7 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </CSVLink>
        )}
      </CardHeader>
      <CardContent className="p-5">
        {loading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300} debounce={0}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="method"
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={100}
                cornerRadius={3}
                paddingAngle={2}
                isAnimationActive={false}
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLOR_LIST[index % CHART_COLOR_LIST.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
              <Legend content={<CustomLegend />} verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}
