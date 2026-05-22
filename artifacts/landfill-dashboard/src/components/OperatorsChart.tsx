import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import type { OperatorPerformance } from "@workspace/api-client-react";

function fmt(n: number) { return n.toLocaleString("fr-DZ"); }

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export function OperatorsChart({ data, loading }: { data?: OperatorPerformance[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">Aucune donnée opérateur</p>;

  const chartData = data.map(op => ({
    name: op.operatorName || op.operatorId,
    Volume: op.totalWeightMt,
    Décharges: op.dischargeCount,
    Annulations: op.cancelledCount,
    TauxAnnul: op.cancelRate,
    site: op.siteName,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Volume traité par opérateur (t)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}t`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} t`, "Volume"]} />
                <Bar dataKey="Volume" radius={[4,4,0,0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Décharges vs Annulations par opérateur</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Décharges" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Annulations" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Performance détaillée par opérateur</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Opérateur", "Site", "Décharges", "Volume (t)", "Revenus (DZD)", "Annulations", "Taux annul.", "Corrections", "Moy. net (t)"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((op, i) => (
                  <tr key={op.operatorId} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{op.operatorName || op.operatorId}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{op.siteName || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-center">{op.dischargeCount}</td>
                    <td className="px-3 py-2.5 font-semibold">{fmt(op.totalWeightMt)}</td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400">{fmt(op.totalRevenue)}</td>
                    <td className={`px-3 py-2.5 font-semibold text-center ${op.cancelledCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>{op.cancelledCount}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${op.cancelRate > 20 ? "bg-red-100 text-red-700 border-red-200" : op.cancelRate > 10 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                        {op.cancelRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className={`px-3 py-2.5 text-center ${op.correctionCount > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>{op.correctionCount}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{op.avgNetMt.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
