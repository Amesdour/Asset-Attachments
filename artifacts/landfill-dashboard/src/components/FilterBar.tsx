import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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

  const handleDateChange = (range: any) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onChange({
        ...filters,
        dateFrom: range.from.toISOString(),
        dateTo: range.to.toISOString(),
      });
    } else if (!range?.from && !range?.to) {
      onChange({ ...filters, dateFrom: undefined, dateTo: undefined });
    }
  };

  const handleSiteChange = (val: string) => {
    onChange({ ...filters, site: val === "all" ? undefined : val });
  };

  const handleWasteTypeChange = (val: string) => {
    onChange({ ...filters, wasteType: val === "all" ? undefined : val });
  };

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-card border rounded-lg shadow-sm">
      <div className="w-[280px]">
        <Label className="text-[13px] mb-1.5 block text-muted-foreground font-medium">Période</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to ? (
                <>{format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}</>
              ) : (
                <span className="text-muted-foreground">Toute la période</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="w-[200px]">
        <Label className="text-[13px] mb-1.5 block text-muted-foreground font-medium">Site / Zone</Label>
        <Select value={filters.site || "all"} onValueChange={handleSiteChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Tous les sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sites</SelectItem>
            {filterOptions?.sites?.map(site => (
              <SelectItem key={site} value={site}>{site}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[220px]">
        <Label className="text-[13px] mb-1.5 block text-muted-foreground font-medium">Type de déchet</Label>
        <Select value={filters.wasteType || "all"} onValueChange={handleWasteTypeChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {filterOptions?.wasteTypes?.map(wt => (
              <SelectItem key={wt} value={wt}>{wt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="ml-auto">
        <Button 
          variant="ghost" 
          onClick={() => {
            setDateRange({});
            onChange({ dateFrom: undefined, dateTo: undefined, site: undefined, wasteType: undefined });
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          Effacer les filtres
        </Button>
      </div>
    </div>
  );
}
