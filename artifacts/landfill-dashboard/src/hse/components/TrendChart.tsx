import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { trend } from "../mock-data";

type Range = keyof typeof trend;
const ranges: Range[] = ["weekly", "monthly", "quarterly"];

export function TrendChart() {
  const [range, setRange] = useState<Range>("monthly");
  return (
    <div>
      <div className="mb-3 inline-flex rounded-[var(--hse-radius-md)] border border-[var(--hse-border)] p-0.5" role="tablist">
        {ranges.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={range === r}
            onClick={() => setRange(r)}
            className={
              "rounded-[var(--hse-radius-sm)] px-3 py-1 text-xs font-medium capitalize transition " +
              (range === r ? "bg-[var(--hse-primary)] text-white" : "text-[var(--hse-text-muted)] hover:text-[var(--hse-text)]")
            }
          >
            {r}
          </button>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend[range]} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hse-found" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hse-resolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hse-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--hse-text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--hse-text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--hse-surface)", border: "1px solid var(--hse-border)",
                borderRadius: 10, fontSize: 12, color: "var(--hse-text)",
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="found" name="Hazards found" stroke="#F59E0B" strokeWidth={2} fill="url(#hse-found)" />
            <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" strokeWidth={2} fill="url(#hse-resolved)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
