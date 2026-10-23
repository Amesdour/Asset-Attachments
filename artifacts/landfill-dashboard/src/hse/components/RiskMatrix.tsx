import { matrix, risk } from "../mock-data";

// score = likelihood (row, bottom=1) x severity (col) -> colour band
function cellColor(row: number, col: number) {
  const score = (5 - row) * (col + 1);
  if (score >= 15) return "#EF4444";
  if (score >= 8) return "#F97316";
  if (score >= 4) return "#F59E0B";
  return "#10B981";
}

export function RiskMatrix() {
  const total = risk.reduce((s, r) => s + r.count, 0);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label="Risk distribution by severity">
          {risk.map((r) => (
            <div key={r.level} style={{ width: `${(r.count / total) * 100}%`, background: r.color }} />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {risk.map((r) => (
            <li key={r.level} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
              <span className="text-[var(--hse-text-muted)]">{r.level}</span>
              <span className="ml-auto font-medium tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--hse-text-muted)]">
          Likelihood × Severity
        </p>
        <div className="grid grid-cols-5 gap-1">
          {matrix.map((row, i) =>
            row.map((n, j) => (
              <div
                key={`${i}-${j}`}
                className="flex aspect-square items-center justify-center rounded-md text-xs font-semibold text-white"
                style={{ background: cellColor(i, j), opacity: n ? 1 : 0.28 }}
                title={`${n} risk(s)`}
              >
                {n || ""}
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
