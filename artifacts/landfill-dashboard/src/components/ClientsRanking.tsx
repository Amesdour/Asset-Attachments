import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ClientRanking } from "@workspace/api-client-react";

function fmt(n: number) { return n.toLocaleString("fr-DZ"); }

const STATUS_BADGE: Record<string, string> = {
  overdue: "bg-red-100 text-red-700 border-red-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  none: "bg-gray-100 text-gray-500 border-gray-200",
};

const TYPE_BADGE: Record<string, string> = {
  state: "bg-blue-100 text-blue-700",
  private: "bg-violet-100 text-violet-700",
  cash: "bg-orange-100 text-orange-700",
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#84cc16"];

export function ClientsRanking({ data, loading }: { data?: ClientRanking[]; loading: boolean }) {
  if (loading) return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {[0,1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
    </div>
  );

  if (!data?.length) return <p className="text-sm text-muted-foreground">Aucune donnée client</p>;

  const chartData = data.slice(0, 8).map(c => ({
    name: c.clientName.length > 14 ? c.clientName.slice(0, 14) + "…" : c.clientName,
    Volume: c.totalWeightMt,
    Revenus: c.totalRevenue / 1000,
  }));

  return (
    <div className="space-y-4">
      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">Volume par client (t)</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}t`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                <Tooltip formatter={(v: number) => [`${v} t`, "Volume"]} />
                <Bar dataKey="Volume" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">Revenus par client (k DZD)</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}k DZD`, "Revenus"]} />
                <Bar dataKey="Revenus" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Full table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">Classement clients complet</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["#", "Client", "Type", "Décharges", "Volume (t)", "Revenus (DZD)", "Solde dû (DZD)", "Statut facture", "Limite annuelle", "Dernière décharge"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((c, i) => {
                  const weightPct = c.weightLimitYear > 0 ? (c.weightUsedYear / c.weightLimitYear) * 100 : null;
                  return (
                    <tr key={c.clientId} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium max-w-[140px] truncate">{c.clientName}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_BADGE[c.clientType] ?? ""}`}>{c.clientType}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold">{c.dischargeCount}</td>
                      <td className="px-3 py-2.5 font-semibold">{fmt(c.totalWeightMt)}</td>
                      <td className="px-3 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400">{fmt(c.totalRevenue)}</td>
                      <td className={`px-3 py-2.5 font-semibold ${c.outstandingBalance > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {c.outstandingBalance > 0 ? fmt(c.outstandingBalance) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {c.invoiceStatus !== "none" && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[c.invoiceStatus] ?? ""}`}>{c.invoiceStatus}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {weightPct !== null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${weightPct > 90 ? "bg-red-500" : weightPct > 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(weightPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{weightPct.toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {c.lastDischarge ? new Date(c.lastDischarge).toLocaleDateString("fr-DZ") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
