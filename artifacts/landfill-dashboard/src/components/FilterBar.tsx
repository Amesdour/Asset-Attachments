import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetDashboardFilterOptions } from "@workspace/api-client-react";

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  site?: string;
  wasteType?: string;
}

export function FilterBar({ filters, onChange }: { filters: DashboardFilters; onChange: (f: DashboardFilters) => void }) {
  const { data: filterOptions } = useGetDashboardFilterOptions();

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    to: filters.dateTo ? new Date(filters.dateTo) : undefined,
  });

  const hasFilters = !!(filters.dateFrom || filters.dateTo || filters.site || filters.wasteType);

  const handleDateChange = (range: { from?: Date; to?: Date } | undefined) => {
    const r = range ?? {};
    setDateRange(r);
    if (r?.from && r?.to) {
      onChange({ ...filters, dateFrom: r.from.toISOString(), dateTo: r.to.toISOString() });
    } else if (!r?.from && !r?.to) {
      onChange({ ...filters, dateFrom: undefined, dateTo: undefined });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 bg-card border border-border/60 rounded-lg shadow-sm mb-5">
      {/* Date range */}
      <div className="flex-shrink-0">
        <Label className="text-[11px] mb-1 block text-muted-foreground font-medium uppercase tracking-wide">Période</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 text-xs justify-start font-normal bg-background min-w-[200px]">
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              {dateRange.from && dateRange.to
                ? <>{format(dateRange.from, "dd/MM/yy")} – {format(dateRange.to, "dd/MM/yy")}</>
                : <span className="text-muted-foreground">Toute la période</span>
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={{ from: dateRange.from, to: dateRange.to }} onSelect={handleDateChange} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {/* Site */}
      <div className="flex-shrink-0">
        <Label className="text-[11px] mb-1 block text-muted-foreground font-medium uppercase tracking-wide">Site</Label>
        <Select value={filters.site || "all"} onValueChange={v => onChange({ ...filters, site: v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs bg-background w-[180px]">
            <SelectValue placeholder="Tous les sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sites</SelectItem>
            {filterOptions?.sites?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Waste type */}
      <div className="flex-shrink-0">
        <Label className="text-[11px] mb-1 block text-muted-foreground font-medium uppercase tracking-wide">Type de déchet</Label>
        <Select value={filters.wasteType || "all"} onValueChange={v => onChange({ ...filters, wasteType: v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs bg-background w-[180px]">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {filterOptions?.wasteTypes?.map(wt => (
              <SelectItem key={wt.id} value={wt.id}>{wt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 ml-auto self-end"
          onClick={() => { setDateRange({}); onChange({}); }}
        >
          <X className="w-3.5 h-3.5" />
          Effacer
        </Button>
      )}
    </div>
  );
}
