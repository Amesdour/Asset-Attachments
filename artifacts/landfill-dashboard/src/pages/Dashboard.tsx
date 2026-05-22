import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { FilterBar, type DashboardFilters } from "@/components/FilterBar";
import { KpiCards } from "@/components/KpiCards";
import { TimeseriesChart } from "@/components/TimeseriesChart";
import { WasteCategoryChart } from "@/components/WasteCategoryChart";
import { TreatmentMethodChart } from "@/components/TreatmentMethodChart";
import { ForecastChart } from "@/components/ForecastChart";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { LogsTable } from "@/components/LogsTable";

import {
  useGetDashboardKpis,
  useGetDashboardTimeseries,
  useGetDashboardWasteCategories,
  useGetDashboardTreatmentMethods,
  useGetDashboardForecast,
  useGetDashboardLogs,
  type GetDashboardTimeseriesGranularity
} from "@workspace/api-client-react";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Filters
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [granularity, setGranularity] = useState<GetDashboardTimeseriesGranularity>("daily");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Refresh State
  const [isSpinning, setIsSpinning] = useState(false);

  // Queries
  const kpisQuery = useGetDashboardKpis(filters);
  const timeseriesQuery = useGetDashboardTimeseries({ ...filters, granularity });
  const categoriesQuery = useGetDashboardWasteCategories(filters);
  const treatmentQuery = useGetDashboardTreatmentMethods(filters);
  const forecastQuery = useGetDashboardForecast({ months: 12 }); // forecast usually ignores dynamic time filters for historical context, or uses them if desired.
  const logsQuery = useGetDashboardLogs({ ...filters, page, pageSize });

  // Loading state combination
  const loading = kpisQuery.isLoading || kpisQuery.isFetching; // For KPIs specifically
  const chartsLoading = timeseriesQuery.isLoading || timeseriesQuery.isFetching || 
                        categoriesQuery.isLoading || categoriesQuery.isFetching || 
                        treatmentQuery.isLoading || treatmentQuery.isFetching;
  const forecastLoading = forecastQuery.isLoading || forecastQuery.isFetching;
  const logsLoading = logsQuery.isLoading || logsQuery.isFetching;
  
  const anyLoading = loading || chartsLoading || forecastLoading || logsLoading;

  // Handle Refresh
  useEffect(() => {
    if (anyLoading) {
      setIsSpinning(true);
    } else {
      const t = setTimeout(() => setIsSpinning(false), 600);
      return () => clearTimeout(t);
    }
  }, [anyLoading]);

  const handleManualRefresh = () => {
    queryClient.invalidateQueries();
  };

  // Format last refreshed time based on KPI query updated time
  const lastRefreshed = kpisQuery.dataUpdatedAt
    ? (() => {
        const d = new Date(kpisQuery.dataUpdatedAt);
        return `${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()} on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      })()
    : null;

  // Stats object for AI
  const statsForAi = {
    kpis: kpisQuery.data,
    latestVolumes: timeseriesQuery.data?.slice(-7), // last 7 days/weeks
    categories: categoriesQuery.data,
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <DashboardHeader 
          lastRefreshed={lastRefreshed} 
          isSpinning={isSpinning} 
          onRefresh={handleManualRefresh} 
        />
        
        <FilterBar 
          filters={filters} 
          onChange={(f) => { setFilters(f); setPage(1); }} 
        />

        <KpiCards data={kpisQuery.data} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Charts Row */}
          <div className="lg:col-span-2">
             <TimeseriesChart 
               data={timeseriesQuery.data} 
               loading={timeseriesQuery.isLoading || timeseriesQuery.isFetching} 
               granularity={granularity}
               onGranularityChange={setGranularity}
             />
          </div>
          <div className="lg:col-span-1">
             <WasteCategoryChart 
               data={categoriesQuery.data} 
               loading={categoriesQuery.isLoading || categoriesQuery.isFetching} 
             />
          </div>
          <div className="lg:col-span-1">
             <TreatmentMethodChart 
               data={treatmentQuery.data} 
               loading={treatmentQuery.isLoading || treatmentQuery.isFetching} 
             />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ForecastChart data={forecastQuery.data} loading={forecastLoading} />
          <AiInsightsPanel statsObject={statsForAi} />
        </div>

        <LogsTable 
          logs={logsQuery.data?.logs || []} 
          total={logsQuery.data?.total || 0}
          page={page}
          pageSize={pageSize}
          loading={logsLoading}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
