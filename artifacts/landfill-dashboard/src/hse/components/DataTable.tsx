import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, Pencil } from "lucide-react";
import { audits, type Status } from "../mock-data";
import { StatusBadge } from "./StatusBadge";

const PAGE_SIZE = 4;
type SortKey = "due" | "item" | "status";

export function DataTable() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [sort, setSort] = useState<SortKey>("due");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const filtered = filter === "all" ? audits : audits.filter((a) => a.status === filter);
    return [...filtered].sort((a, b) => String(a[sort]).localeCompare(String(b[sort])));
  }, [filter, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const select = "rounded-[var(--hse-radius-md)] border border-[var(--hse-border)] bg-[var(--hse-surface)] px-2.5 py-1.5 text-sm";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="hse-filter">Filter by status</label>
        <select id="hse-filter" className={select} value={filter} onChange={(e) => { setFilter(e.target.value as Status | "all"); setPage(0); }}>
          <option value="all">All statuses</option>
          <option value="compliant">Compliant</option>
          <option value="action">Action Required</option>
          <option value="critical">Critical Review</option>
        </select>
        <label className="sr-only" htmlFor="hse-sort">Sort by</label>
        <select id="hse-sort" className={select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="due">Sort: Due date</option>
          <option value="item">Sort: Item</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-[var(--hse-radius-md)] border border-[var(--hse-border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--hse-surface-alt)] text-xs uppercase tracking-wide text-[var(--hse-text-muted)]">
            <tr>
              {["ID", "Compliance item", "Site", "Owner", "Due", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((a, i) => (
              <tr key={a.id} className={i % 2 ? "bg-[var(--hse-surface-alt)]/40" : ""}>
                <td className="px-4 py-3 font-mono text-xs text-[var(--hse-text-muted)]">{a.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{a.item}</p>
                  <p className="text-xs text-[var(--hse-text-muted)]">{a.ref}</p>
                </td>
                <td className="px-4 py-3">{a.site}</td>
                <td className="px-4 py-3">{a.owner}</td>
                <td className="px-4 py-3 tabular-nums">{a.due}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {[
                      { icon: Eye, label: "View details" },
                      { icon: Pencil, label: "Edit item" },
                      { icon: Download, label: "Download certificate" },
                    ].map(({ icon: Icon, label }) => (
                      <button key={label} type="button" aria-label={label} title={label}
                        className="rounded-md p-1.5 text-[var(--hse-text-muted)] transition hover:bg-[var(--hse-surface-alt)] hover:text-[var(--hse-text)]">
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--hse-text-muted)]">No items match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-[var(--hse-text-muted)]">
        <span>{rows.length} items · page {page + 1} of {pages}</span>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-[var(--hse-border)] p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-[var(--hse-border)] p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
