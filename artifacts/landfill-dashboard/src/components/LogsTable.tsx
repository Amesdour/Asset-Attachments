import { useState } from "react";
import { format } from "date-fns";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { WasteLog } from "@workspace/api-client-react";

export function LogsTable({ 
  logs, 
  total, 
  page, 
  pageSize, 
  loading,
  onPageChange
}: { 
  logs: WasteLog[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (p: number) => void;
}) {
  
  const columns: ColumnDef<WasteLog>[] = [
    {
      accessorKey: "timestamp",
      header: "Date / Heure",
      cell: ({ row }) => <span className="whitespace-nowrap">{format(new Date(row.original.timestamp), "dd/MM/yyyy HH:mm")}</span>,
    },
    { accessorKey: "truckId", header: "Immatriculation", cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.truckId}</span> },
    { accessorKey: "site", header: "Site" },
    { accessorKey: "wasteType", header: "Type de déchet" },
    { accessorKey: "wasteCode", header: "Code", cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.wasteCode}</span> },
    { 
      accessorKey: "weightMt", 
      header: () => <div className="text-right">Poids net (t)</div>,
      cell: ({ row }) => <div className="text-right font-medium">{row.original.weightMt.toFixed(2)}</div>
    },
    { accessorKey: "treatmentMethod", header: "Mode opératoire" },
    {
      accessorKey: "treatmentStatus",
      header: "Statut",
      cell: ({ row }) => {
        const status = row.original.treatmentStatus;
        const s = status.toLowerCase();
        const isGood = s === "settled" || s === "paid" || s === "traité";
        const isBad = s === "cancelled" || s === "annulé";
        const label = s === "settled" ? "Réglé" : s === "paid" ? "Payé" : s === "cancelled" ? "Annulé" : status;
        return (
          <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            isGood ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
            : isBad ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          }`}>
            {label}
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // We are doing manual server-side pagination, so we don't use getPaginationRowModel internally for slicing,
    // but we can set page count manually if we were using it fully. For simplicity, we just render the rows.
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <Card className="shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
        <CardTitle className="text-base font-semibold">Journal des décharges</CardTitle>
        {!loading && logs.length > 0 && (
          <CSVLink data={logs} filename="waste-logs.csv" className="print:hidden flex items-center justify-center w-7 h-7 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </CSVLink>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-border/50">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="border-b-border/50 hover:bg-muted/20 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2.5 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Affichage de <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> à <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> sur <span className="font-medium text-foreground">{total}</span> enregistrements
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onPageChange(page - 1)} 
                  disabled={!hasPrevPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onPageChange(page + 1)} 
                  disabled={!hasNextPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-10 text-center text-muted-foreground">
            Aucun enregistrement correspondant aux filtres sélectionnés.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
