import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Info, AlertTriangle, AlertOctagon, ArrowRight } from "lucide-react";
import { useGetAiInsights } from "@workspace/api-client-react";

const CATEGORY_LABELS: Record<string, string> = {
  finance: "Finance",
  operations: "Ops",
  compliance: "Compliance",
  revenue: "Revenue",
  capacity: "Capacity",
  billing: "Billing",
  client: "Client",
  payment: "Payment",
  volume: "Volume",
  anomaly: "Anomaly",
  routing: "Routing",
  recycling: "Recycling",
};

export function AiInsightsPanel({ statsObject }: { statsObject: any }) {
  const mutation = useGetAiInsights();

  useEffect(() => {
    mutation.mutate({ data: { statsJson: JSON.stringify(statsObject) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    mutation.mutate({ data: { statsJson: JSON.stringify(statsObject) } });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return {
          border: "border-l-red-500",
          bg: "bg-red-50 dark:bg-red-950/25",
          icon: <AlertOctagon className="w-4 h-4 text-red-500 flex-shrink-0" />,
          badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
          metricColor: "text-red-700 dark:text-red-300",
        };
      case "warning":
        return {
          border: "border-l-amber-500",
          bg: "bg-amber-50 dark:bg-amber-950/25",
          icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
          badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
          metricColor: "text-amber-700 dark:text-amber-300",
        };
      default:
        return {
          border: "border-l-blue-400",
          bg: "bg-blue-50/50 dark:bg-blue-950/15",
          icon: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
          badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
          metricColor: "text-blue-700 dark:text-blue-300",
        };
    }
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="px-5 py-4 flex flex-row items-center justify-between border-b border-border/50 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/40 dark:to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Operational Insights</CardTitle>
          {mutation.data?.insights && (
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
              {mutation.data.insights.length} findings
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={mutation.isPending}
          className="h-7 text-xs font-medium gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${mutation.isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="p-4">
        {mutation.isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-border/50 rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        ) : mutation.data?.insights && mutation.data.insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mutation.data.insights.map((insight, i) => {
              const config = getSeverityConfig(insight.severity);
              const categoryLabel = CATEGORY_LABELS[insight.category] ?? insight.category;
              return (
                <div
                  key={i}
                  className={`border border-border/40 rounded-lg p-4 border-l-4 ${config.border} ${config.bg}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {config.icon}
                      <h4 className="font-semibold text-sm text-foreground leading-tight">{insight.title}</h4>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${config.badge}`}>
                      {categoryLabel}
                    </span>
                  </div>

                  {(insight as any).metric && (
                    <div className={`text-lg font-bold mb-2 tabular-nums ${config.metricColor}`}>
                      {(insight as any).metric}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>

                  {(insight as any).action && (
                    <div className="mt-3 pt-2 border-t border-border/30 flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-foreground/80">{(insight as any).action}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Click refresh to analyse current operations</p>
          </div>
        )}

        {mutation.data?.generatedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-3 text-right">
            Generated {new Date(mutation.data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
