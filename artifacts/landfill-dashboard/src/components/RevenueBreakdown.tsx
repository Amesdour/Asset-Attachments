import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import type { RevenueBreakdown as RevenueBreakdownType } from "@workspace/api-client-react";

const PAY_COLORS: Record<string, string> = {
  convention: "#3b82f6",
  espèces: "#10b981",
  cheque: "#f59e0b",
  virement: "#8b5cf6",
};
const WASTE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

function fmt(n: number) { return n.toLocaleString("fr-DZ"); }

const RADIAN = Math.PI / 180;
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: Record<string, number>) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.06) return null;
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>;
}

export function RevenueBreakdown({ data, loading }: { data?: RevenueBreakdownType; loading: boolean }) {
  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0,1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>)}
    </div>
  );

  if (!data) return null;

  const inv = data.invoiceSummary;

  return (
    <div className="space-y-4">
      {/* Invoice summary bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total facturé", value: `${fmt(inv.totalBilled)} DZD`, color: "text-foreground" },
          { label: "Total encaissé", value: `${fmt(inv.totalPaid)} DZD`, color: "text-emerald-600" },
          { label: "Solde impayé", value: `${fmt(inv.totalOutstanding)} DZD`, color: inv.totalOutstanding > 0 ? "text-red-600" : "text-emerald-600" },
          { label: "Factures en retard", value: String(inv.overdueCount), color: inv.overdueCount > 0 ? "text-red-600 text-2xl font-bold" : "text-foreground" },
          { label: "En attente", value: String(inv.pendingCount), color: "text-amber-600 text-2xl font-bold" },
          { label: "Réglées", value: String(inv.paidCount), color: "text-emerald-600 text-2xl font-bold" },
        ].map((item, i) => (
          <Card key={i} className="border border-border/60">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
              <p className={`font-bold text-sm ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue by site */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Revenus par site</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.bySite} layout="vertical" margin={{ left: 10, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="siteName" tick={{ fontSize: 10 }} width={80} tickFormatter={v => v.replace(/^CET |^CDI /, "")} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} DZD`, "Revenus"]} labelStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} fill="#3b82f6" label={{ position: "right", fontSize: 9, formatter: (v: number) => `${(v/1000).toFixed(0)}k` }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by waste type */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Revenus par type de déchet</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byWasteType} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number, name: string) => [`${fmt(v)} DZD`, name === "revenue" ? "Revenus" : name === "revPerTonne" ? "DZD/t" : name]} />
                <Bar dataKey="revenue" name="Revenus" radius={[4,4,0,0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment method donut */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Répartition par mode de paiement</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.byPayMethod} dataKey="revenue" nameKey="method" cx="40%" cy="50%" outerRadius={75} labelLine={false} label={renderCustomLabel}>
                  {data.byPayMethod.map((e, i) => <Cell key={i} fill={PAY_COLORS[e.method] ?? WASTE_COLORS[i % WASTE_COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} formatter={(v) => <span className="text-[11px]">{v}</span>} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} DZD`]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top clients by revenue */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Top clients par revenus</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byClient.slice(0,8)} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="clientName" tick={{ fontSize: 9 }} width={100} tickFormatter={v => v.length > 14 ? v.slice(0,14)+"…" : v} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} DZD`, "Revenus"]} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue per tonne comparison */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Prix moyen par tonne — comparaison types de déchets</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.byWasteType} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v)}`} />
              <Tooltip formatter={(v: number) => [`${fmt(v)} DZD/t`, "Prix moyen/tonne"]} />
              <Bar dataKey="revPerTonne" name="DZD/t" radius={[4,4,0,0]}>
                {data.byWasteType.map((_, i) => <Cell key={i} fill={WASTE_COLORS[i % WASTE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
