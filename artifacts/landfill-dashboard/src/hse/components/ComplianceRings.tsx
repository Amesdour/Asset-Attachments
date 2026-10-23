import { frameworks } from "../mock-data";

function Ring({ name, value }: { name: string; value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = value >= 85 ? "var(--hse-success)" : value >= 70 ? "var(--hse-primary)" : "var(--hse-warning)";
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="h-16 w-16 shrink-0 -rotate-90" role="img" aria-label={`${name}: ${value}%`}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--hse-surface-alt)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}%</p>
        <p className="text-sm text-[var(--hse-text-muted)]">{name}</p>
      </div>
    </div>
  );
}

export function ComplianceRings() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {frameworks.map((f) => (
        <Ring key={f.name} {...f} />
      ))}
    </div>
  );
}
