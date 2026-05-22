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
import { SitesBreakdown } from "@/components/SitesBreakdown";
import { RevenueBreakdown } from "@/components/RevenueBreakdown";
import { ClientsRanking } from "@/components/ClientsRanking";
import { OperatorsChart } from "@/components/OperatorsChart";
import { ForecastAdvanced } from "@/components/ForecastAdvanced";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useGetDashboardKpis,
  useGetDashboardTimeseries,
  useGetDashboardWasteCategories,
  useGetDashboardTreatmentMethods,
  useGetDashboardForecast,
  useGetDashboardLogs,
  useGetDashboardSitesBreakdown,
  useGetDashboardClientsRanking,
  useGetDashboardOperatorsPerformance,
  useGetDashboardRevenueBreakdown,
  type GetDashboardTimeseriesGranularity,
} from "@workspace/api-client-react";


export default function Dashboard() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<DashboardFilters>({});
  const [granularity, setGranularity] = useState<GetDashboardTimeseriesGranularity>("daily");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("apercu");
  const pageSize = 15;

  const [isSpinning, setIsSpinning] = useState(false);

  const apiFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    site: filters.site,
    wasteType: filters.wasteType,
  };

  // Core queries (always fetched)
  const kpisQuery = useGetDashboardKpis(apiFilters);
  const timeseriesQuery = useGetDashboardTimeseries({ ...apiFilters, granularity });
  const categoriesQuery = useGetDashboardWasteCategories(apiFilters);
  const treatmentQuery = useGetDashboardTreatmentMethods(apiFilters);
  const forecastQuery = useGetDashboardForecast({ months: 12 });
  const logsQuery = useGetDashboardLogs({ ...apiFilters, page, pageSize });

  // Analytics queries
  const sitesQuery = useGetDashboardSitesBreakdown(apiFilters);
  const clientsQuery = useGetDashboardClientsRanking(apiFilters);
  const operatorsQuery = useGetDashboardOperatorsPerformance(apiFilters);
  const revenueQuery = useGetDashboardRevenueBreakdown(apiFilters);

  const anyLoading =
    kpisQuery.isLoading || kpisQuery.isFetching ||
    timeseriesQuery.isLoading || timeseriesQuery.isFetching;

  useEffect(() => {
    if (anyLoading) {
      setIsSpinning(true);
    } else {
      const t = setTimeout(() => setIsSpinning(false), 600);
      return () => clearTimeout(t);
    }
  }, [anyLoading]);

  const handleManualRefresh = () => queryClient.invalidateQueries();

  const lastRefreshed = kpisQuery.dataUpdatedAt
    ? (() => {
        const d = new Date(kpisQuery.dataUpdatedAt);
        return `${d.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })} — ${d.toLocaleDateString("fr-DZ", { day: "numeric", month: "short" })}`;
      })()
    : null;

  const statsForAi = {
    kpis: kpisQuery.data,
    latestVolumes: timeseriesQuery.data?.slice(-7),
    categories: categoriesQuery.data,
  };

  const handleFilterChange = (f: DashboardFilters) => {
    setFilters(f);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-5 md:px-8">
      <div className="max-w-[1600px] mx-auto space-y-5">
        <DashboardHeader
          lastRefreshed={lastRefreshed}
          isSpinning={isSpinning}
          onRefresh={handleManualRefresh}
        />

        <FilterBar filters={filters} onChange={handleFilterChange} />

        <KpiCards data={kpisQuery.data} loading={kpisQuery.isLoading || kpisQuery.isFetching} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 mb-4 bg-muted/50">
            <TabsTrigger value="apercu" className="text-xs h-7">Aperçu général</TabsTrigger>
            <TabsTrigger value="previsions" className="text-xs h-7">🔮 Prévisions</TabsTrigger>
            <TabsTrigger value="sites" className="text-xs h-7">Sites & Capacités</TabsTrigger>
            <TabsTrigger value="revenus" className="text-xs h-7">Revenus & Facturation</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs h-7">Clients</TabsTrigger>
            <TabsTrigger value="operateurs" className="text-xs h-7">Opérateurs</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs h-7">Journal</TabsTrigger>
          </TabsList>

          {/* ── TAB: Aperçu général ── */}
          <TabsContent value="apercu" className="space-y-5 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ForecastChart data={forecastQuery.data} loading={forecastQuery.isLoading || forecastQuery.isFetching} />
              <AiInsightsPanel statsObject={statsForAi} />
            </div>
          </TabsContent>

          {/* ── TAB: Prévisions intelligentes ── */}
          <TabsContent value="previsions" className="mt-0">
            <ForecastAdvanced />
          </TabsContent>

          {/* ── TAB: Sites & Capacités ── */}
          <TabsContent value="sites" className="mt-0">
            <SitesBreakdown
              data={sitesQuery.data}
              loading={sitesQuery.isLoading || sitesQuery.isFetching}
            />
          </TabsContent>

          {/* ── TAB: Revenus & Facturation ── */}
          <TabsContent value="revenus" className="mt-0">
            <RevenueBreakdown
              data={revenueQuery.data}
              loading={revenueQuery.isLoading || revenueQuery.isFetching}
            />
          </TabsContent>

          {/* ── TAB: Clients ── */}
          <TabsContent value="clients" className="mt-0">
            <ClientsRanking
              data={clientsQuery.data}
              loading={clientsQuery.isLoading || clientsQuery.isFetching}
            />
          </TabsContent>

          {/* ── TAB: Opérateurs ── */}
          <TabsContent value="operateurs" className="mt-0">
            <OperatorsChart
              data={operatorsQuery.data}
              loading={operatorsQuery.isLoading || operatorsQuery.isFetching}
            />
          </TabsContent>

          {/* ── TAB: Journal ── */}
          <TabsContent value="logs" className="mt-0">
            <LogsTable
              logs={logsQuery.data?.logs || []}
              total={logsQuery.data?.total || 0}
              page={page}
              pageSize={pageSize}
              loading={logsQuery.isLoading || logsQuery.isFetching}
              onPageChange={setPage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
