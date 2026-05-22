import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Activity, Truck, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { DashboardKpis } from "@workspace/api-client-react";

export function KpiCards({ data, loading }: { data?: DashboardKpis; loading: boolean }) {
  const kpis = [
    {
      title: "Waste Collected (Current Month)",
      value: data ? `${(data.totalWasteCurrentMonth || 0).toLocaleString()} MT` : "--",
      change: data?.wasteTrend,
      icon: <Activity className="w-4 h-4 text-muted-foreground" />
    },
    {
      title: "Active Fleet Operations",
      value: data ? data.activeOperationsToday.toLocaleString() : "--",
      change: null,
      icon: <Truck className="w-4 h-4 text-muted-foreground" />
    },
    {
      title: "Landfill Capacity Used",
      value: data ? `${(data.capacityUsedPercent || 0).toFixed(1)}%` : "--",
      progress: data?.capacityUsedPercent || 0,
      icon: <AlertTriangle className="w-4 h-4 text-muted-foreground" />
    },
    {
      title: "Treatment Diversion Rate",
      value: data ? `${(data.diversionRate || 0).toFixed(1)}%` : "--",
      change: data?.diversionRateTrend,
      icon: <Activity className="w-4 h-4 text-muted-foreground" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, i) => (
        <Card key={i} className="bg-card shadow-sm border-card-border">
          <CardContent className="p-5">
            {loading ? (
              <>
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-8 w-2/3 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  {kpi.icon}
                </div>
                
                {/* Default to blue, but using primary deep green for this dashboard's main theme */}
                <p className="text-3xl font-bold text-foreground mb-1">
                  {kpi.value}
                </p>

                {kpi.progress !== undefined ? (
                  <div className="mt-4">
                    <Progress 
                      value={kpi.progress} 
                      className={`h-2 ${kpi.progress > 85 ? 'bg-red-100 dark:bg-red-950' : kpi.progress > 70 ? 'bg-amber-100 dark:bg-amber-950' : 'bg-green-100 dark:bg-green-950'}`} 
                      indicatorClassName={kpi.progress > 85 ? 'bg-red-600' : kpi.progress > 70 ? 'bg-amber-500' : 'bg-green-600'}
                    />
                  </div>
                ) : kpi.change !== null && kpi.change !== undefined ? (
                  <div className="flex items-center gap-1.5 mt-2">
                    {kpi.change >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${kpi.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {Math.abs(kpi.change).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">vs last period</span>
                  </div>
                ) : (
                  <div className="h-6 mt-2" />
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
