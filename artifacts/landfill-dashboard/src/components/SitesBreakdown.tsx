import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from "recharts";
import type { SiteBreakdown } from "@workspace/api-client-react";

const SITE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

function CapacityGauge({ pct, color }: { pct: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="48" textAnchor="middle" className="text-[11px] font-bold" fill="currentColor" fontSize="13" fontWeight="700">
        {pct.toFixed(1)}%
      </text>
    </svg>
  );
}

function fmt(n: number) { return n.toLocaleString("fr-DZ"); }

export function SitesBreakdown({ data, loading }: { data?: SiteBreakdown[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>)}
      </div>
    );
  }

  if (!data?.length) return null;

  // Comparison bar chart data
  const compData = data.map((s, i) => ({
    name: s.siteName.replace(/^CET |^CDI /, ""),
    Volume: parseFloat(s.totalWeightMt.toFixed(1)),
    Revenus: s.totalRevenue / 1000,
    color: SITE_COLORS[i % SITE_COLORS.length],
  }));

  // Radar data (normalize each dimension 0-100)
  const maxVol = Math.max(...data.map(s => s.totalWeightMt), 1);
  const maxRev = Math.max(...data.map(s => s.totalRevenue), 1);
  const maxDis = Math.max(...data.map(s => s.dischargeCount), 1);
  const radarData = [
    { subject: "Volume", fullMark: 100 },
    { subject: "Revenus", fullMark: 100 },
    { subject: "Décharges", fullMark: 100 },
    { subject: "Capacité lib.", fullMark: 100 },
  ];

  return (
    <div className="space-y-4">
      {/* Per-site cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {data.map((site, i) => {
          const color = SITE_COLORS[i % SITE_COLORS.length];
          const capColor = site.pctUsed > 85 ? "#dc2626" : site.pctUsed > 70 ? "#f59e0b" : "#16a34a";
          return (
            <Card key={site.siteId} className="border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{site.siteName}</h3>
                    <p className="text-xs text-muted-foreground">{site.region} · <span className="font-medium">{site.siteType}</span></p>
                  </div>
                  <CapacityGauge pct={site.pctUsed} color={capColor} />
                </div>
                <div className="space-y-1.5 mt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Volume reçu</span>
                    <span className="font-semibold">{fmt(site.totalWeightMt)} t</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Revenus</span>
                    <span className="font-semibold">{fmt(site.totalRevenue)} DZD</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Prix moyen</span>
                    <span className="font-semibold">{fmt(site.revPerTonne)} DZD/t</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Décharges</span>
                    <span className="font-semibold">{site.dischargeCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Capacité</span>
                    <span className="font-semibold">{(site.capacityMt / 1_000_000).toFixed(0)}M t</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {site.acceptedWaste.map(w => (
                    <Badge key={w} variant="secondary" className="text-[10px] px-1.5 py-0">{w}</Badge>
                  ))}
                </div>
                {/* Mini waste breakdown */}
                {site.wasteBreakdown.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Répartition déchets</p>
                    {site.wasteBreakdown.map(w => {
                      const pct = site.totalWeightMt > 0 ? (w.weightMt / site.totalWeightMt) * 100 : 0;
                      return (
                        <div key={w.wasteType} className="mb-1">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground truncate">{w.label}</span>
                            <span className="font-medium ml-2">{w.weightMt.toFixed(1)} t</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Volume reçu par site (t)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={compData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)} t`, "Volume"]} />
                <Bar dataKey="Volume" radius={[4, 4, 0, 0]}>
                  {compData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Revenus par site (k DZD)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={compData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}k DZD`, "Revenus"]} />
                <Bar dataKey="Revenus" radius={[4, 4, 0, 0]}>
                  {compData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
