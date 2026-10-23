import { useState, type ReactNode } from "react";
import "./tokens.css";
import { kpis } from "./mock-data";
import { ComplianceRings } from "./components/ComplianceRings";
import { DataTable } from "./components/DataTable";
import { MetricCard } from "./components/MetricCard";
import { QuickActions } from "./components/QuickActions";
import { RiskMatrix } from "./components/RiskMatrix";
import { Sidebar } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";
import { TrendChart } from "./components/TrendChart";

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--hse-radius-lg)] border border-[var(--hse-border)] bg-[var(--hse-surface)] p-5 shadow-[var(--hse-shadow-sm)] ${className}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mb-4 text-sm text-[var(--hse-text-muted)]">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

export default function HseDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="hse-root flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 lg:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Compliance Overview</h1>
              <p className="text-sm text-[var(--hse-text-muted)]">Real-time HSE posture across all sites</p>
            </div>
            <QuickActions />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <MetricCard key={k.id} label={k.label} value={k.value} trend={k.trend} goodWhenDown={k.goodWhenDown} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Hazard Discovery vs. Resolution" subtitle="Are we closing hazards faster than we find them?" className="xl:col-span-2">
              <TrendChart />
            </Panel>
            <Panel title="Risk Distribution" subtitle="By severity and likelihood">
              <RiskMatrix />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Regulatory Adherence" subtitle="Progress per framework">
              <ComplianceRings />
            </Panel>
            <Panel title="Upcoming Audit Items" subtitle="Sorted by due date" className="xl:col-span-2">
              <DataTable />
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
