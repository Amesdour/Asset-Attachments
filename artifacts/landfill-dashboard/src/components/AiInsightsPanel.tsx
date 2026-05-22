import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Info, AlertTriangle, AlertOctagon } from "lucide-react";
import { useGetAiInsights } from "@workspace/api-client-react";

export function AiInsightsPanel({ statsObject }: { statsObject: any }) {
  const mutation = useGetAiInsights();

  // Auto-trigger on mount
  useEffect(() => {
    mutation.mutate({ data: { statsJson: JSON.stringify(statsObject) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentional single run on mount. If filters change significantly, could add dependency.

  const handleRefresh = () => {
    mutation.mutate({ data: { statsJson: JSON.stringify(statsObject) } });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return { border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/20", icon: <AlertOctagon className="w-4 h-4 text-red-500" />, badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" };
      case "warning":
        return { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" };
      default:
        return { border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", icon: <Info className="w-4 h-4 text-blue-500" />, badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" };
    }
  };

  return (
    <Card className="shadow-sm border-blue-100 dark:border-blue-900/30 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/40 dark:to-transparent px-5 py-4 flex flex-row items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <CardTitle className="text-base font-semibold">AI Operational Insights</CardTitle>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={mutation.isPending}
          className="h-8 text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${mutation.isPending ? "animate-spin" : ""}`} />
          Refresh Insights
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {mutation.isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-border/50 rounded-lg p-4 h-32">
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        ) : mutation.data?.insights && mutation.data.insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mutation.data.insights.map((insight, i) => {
              const config = getSeverityConfig(insight.severity);
              return (
                <div key={i} className={`border border-border/50 rounded-lg p-4 border-l-4 ${config.border} ${config.bg} transition-colors`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {config.icon}
                      <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
                      {insight.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    {insight.description}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No insights generated yet. Click refresh to analyze current operations.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
