import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Activity, Truck, AlertTriangle, DollarSign, Scale, TrendingUp, FileWarning, BarChart2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { DashboardKpis } from "@workspace/api-client-react";

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function TrendBadge({ value, inverted = false }: { value?: number | null; inverted?: boolean }) {
  if (value == null) return <div className="h-5 mt-1" />;
  const positive = inverted ? value <= 0 : value >= 0;
  return (
    <div className="flex items-center gap-1 mt-1">
      {positive ? <ArrowUp className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDown className="w-3.5 h-3.5 text-red-500" />}
      <span className={`text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
        {Math.abs(value).toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground">vs mois préc.</span>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: number | null;
  trendInverted?: boolean;
  progress?: number;
  progressColor?: string;
  loading: boolean;
  accent?: string;
}

function KpiCard({ title, value, sub, icon, trend, trendInverted, progress, progressColor, loading, accent }: KpiCardProps) {
  return (
    <Card className={`bg-card shadow-sm border border-border/60 hover:shadow-md transition-shadow ${accent ?? ""}`}>
      <CardContent className="p-4">
        {loading ? (
          <>
            <Skeleton className="h-3 w-2/3 mb-3" />
            <Skeleton className="h-7 w-1/2 mb-2" />
            <Skeleton className="h-2.5 w-1/3" />
          </>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-snug">{title}</p>
              <div className="p-1.5 rounded-md bg-muted/60">{icon}</div>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {progress !== undefined ? (
              <div className="mt-2.5">
                <Progress value={Math.min(progress, 100)} className="h-1.5" style={{ "--progress-color": progressColor } as React.CSSProperties} />
                <p className="text-[11px] text-muted-foreground mt-1">{progress.toFixed(2)}% utilisé</p>
              </div>
            ) : (
              <TrendBadge value={trend} inverted={trendInverted} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiCards({ data, loading }: { data?: DashboardKpis; loading: boolean }) {
  const cap = data?.capacityUsedPercent ?? 0;
  const capColor = cap > 85 ? "#dc2626" : cap > 70 ? "#f59e0b" : "#16a34a";

  const totalRevenue = data?.totalRevenue ?? 0;
  const revenuePerTonne = data?.revenuePerTonne ?? 0;
  const totalDischarges = data?.totalDischarges ?? 0;
  const avgNetWeightMt = data?.avgNetWeightMt ?? 0;
  const outstandingInvoicesTotal = data?.outstandingInvoicesTotal ?? 0;
  const overdueInvoicesCount = data?.overdueInvoicesCount ?? 0;

  const kpis: KpiCardProps[] = [
    {
      title: "Volume collecté (mois)",
      value: data ? `${fmt(data.totalWasteCurrentMonth, 1)} t` : "--",
      sub: data ? `Mois préc. : ${fmt(data.totalWasteLastMonth, 1)} t` : undefined,
      icon: <Activity className="w-4 h-4 text-blue-500" />,
      trend: data?.wasteTrend,
      loading,
    },
    {
      title: "Chiffre d'affaires total",
      value: data ? `${fmt(totalRevenue)} DZD` : "--",
      sub: data ? `${fmt(revenuePerTonne)} DZD/t` : undefined,
      icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
      loading,
    },
    {
      title: "Total décharges",
      value: data ? fmt(totalDischarges) : "--",
      sub: data ? `Moy. ${fmt(avgNetWeightMt, 2)} t/décharge` : undefined,
      icon: <Truck className="w-4 h-4 text-violet-500" />,
      loading,
    },
    {
      title: "Capacité CET utilisée",
      value: data ? `${cap.toFixed(2)}%` : "--",
      icon: <BarChart2 className="w-4 h-4 text-orange-500" />,
      progress: cap,
      progressColor: capColor,
      loading,
    },
    {
      title: "Taux de règlement",
      value: data ? `${fmt(data.diversionRate, 1)}%` : "--",
      sub: "Bons réglés / total",
      icon: <TrendingUp className="w-4 h-4 text-teal-500" />,
      trend: data?.diversionRateTrend,
      loading,
    },
    {
      title: "Opérations aujourd'hui",
      value: data ? fmt(data.activeOperationsToday) : "--",
      sub: "Camions actifs",
      icon: <Scale className="w-4 h-4 text-sky-500" />,
      loading,
    },
    {
      title: "Factures impayées",
      value: data ? `${fmt(outstandingInvoicesTotal)} DZD` : "--",
      sub: data ? `${overdueInvoicesCount} facture(s) en retard` : undefined,
      icon: <FileWarning className="w-4 h-4 text-red-500" />,
      trendInverted: true,
      loading,
      accent: data && overdueInvoicesCount > 0 ? "border-l-4 border-l-red-400" : "",
    },
    {
      title: "Revenus / tonne",
      value: data ? `${fmt(revenuePerTonne)} DZD/t` : "--",
      sub: "Tarif moyen pondéré",
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      loading,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
    </div>
  );
}
