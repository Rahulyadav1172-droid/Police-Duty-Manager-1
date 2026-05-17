import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Search, LogOut, CheckCircle2, XCircle, FileDown, Calendar } from "lucide-react";
import { generateShiftReport } from "@/lib/report";

import {
  useListRoster,
  getListRosterQueryKey,
  useReleaseFromDuty,
  RosterEntryStatus,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/rank-badge";

function StatusBadge({ status }: { status: string }) {
  if (status === RosterEntryStatus.active) {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 uppercase text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
  }
  if (status === RosterEntryStatus.released) {
    return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border border-slate-200 uppercase text-[10px]">Released</Badge>;
  }
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200 uppercase text-[10px]"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
}

const today = new Date().toISOString().slice(0, 10);
const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

export default function RosterHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate]       = useState(sevenDaysAgo);
  const [toDate, setToDate]           = useState(today);

  const { data: roster, isLoading } = useListRoster();

  const releaseMutation = useReleaseFromDuty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRosterQueryKey() });
        toast({ title: "Personnel released from duty" });
      },
      onError: () => toast({ title: "Failed to release personnel", variant: "destructive" }),
    },
  });

  const filteredRoster = useMemo(() => {
    return (roster ?? []).filter((entry) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        entry.personnel?.name.toLowerCase().includes(q) ||
        entry.personnel?.beltNumber.toLowerCase().includes(q) ||
        entry.dutyPoint?.name.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;

      let matchesDate = true;
      if (fromDate || toDate) {
        try {
          const entryDate = parseISO(entry.startDateTime);
          const from = fromDate ? startOfDay(parseISO(fromDate)) : null;
          const to   = toDate   ? endOfDay(parseISO(toDate))     : null;
          if (from && to) {
            matchesDate = isWithinInterval(entryDate, { start: from, end: to });
          } else if (from) {
            matchesDate = entryDate >= from;
          } else if (to) {
            matchesDate = entryDate <= to;
          }
        } catch { matchesDate = true; }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [roster, searchTerm, statusFilter, fromDate, toDate]);

  const activeCount   = (roster ?? []).filter(e => e.status === "active").length;
  const releasedCount = (roster ?? []).filter(e => e.status === "released").length;
  const expiredCount  = (roster ?? []).filter(e => e.status === "expired").length;

  function clearDateFilter() {
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roster History</h1>
            <p className="text-sm text-muted-foreground">
              All duty assignments — past and present.
              {roster && (
                <span className="ml-2 text-muted-foreground/70">
                  Total: <strong>{roster.length}</strong> records
                  {" · "}Active: <strong className="text-emerald-600">{activeCount}</strong>
                  {" · "}Released: <strong className="text-slate-600">{releasedCount}</strong>
                  {" · "}Expired: <strong className="text-red-600">{expiredCount}</strong>
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground shrink-0"
            disabled={filteredRoster.length === 0 || isLoading}
            onClick={() => generateShiftReport({ entries: filteredRoster, statusFilter })}
            data-testid="button-export-pdf"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, PNO, duty point…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-roster-search"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-muted/40 border rounded-md px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-sm bg-transparent border-none outline-none w-32"
              />
            </div>
            <span className="text-muted-foreground text-sm">→</span>
            <div className="flex items-center gap-1.5 bg-muted/40 border rounded-md px-3 py-1.5">
              <span className="text-xs text-muted-foreground">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-sm bg-transparent border-none outline-none w-32"
              />
            </div>
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilter} className="text-xs h-8 text-muted-foreground">
                Clear
              </Button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex rounded-md shadow-sm">
            {["all", RosterEntryStatus.active, RosterEntryStatus.released, RosterEntryStatus.expired].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                data-testid={`filter-status-${status}`}
                className={`px-3 py-2 text-sm font-medium border-y border-l first:border-l last:border-r first:rounded-l-md last:rounded-r-md transition-colors
                  ${statusFilter === status
                    ? "bg-primary text-primary-foreground border-primary z-10"
                    : "bg-background text-muted-foreground border-input hover:bg-muted"
                  }`}
              >
                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground -mt-3">
          Showing <strong>{filteredRoster.length}</strong> of {roster?.length ?? 0} records
        </p>
      )}

      <div className="bg-card rounded-md border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Personnel</TableHead>
              <TableHead>Duty Point</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredRoster.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                  No records found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoster.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell><StatusBadge status={entry.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{entry.personnel?.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-muted-foreground">PNO {entry.personnel?.beltNumber}</span>
                        <RankBadge rank={entry.personnel?.rank ?? ""} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{entry.dutyPoint?.name}</TableCell>
                  <TableCell>
                    {entry.dutyType === "unlimited" ? (
                      <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] uppercase">Unlimited</Badge>
                    ) : (
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-[10px] uppercase">Fixed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(entry.startDateTime), "dd MMM yyyy, HH:mm")}</TableCell>
                  <TableCell className="text-sm">
                    {entry.endDateTime
                      ? format(new Date(entry.endDateTime), "dd MMM yyyy, HH:mm")
                      : <span className="text-muted-foreground italic text-xs">Until released</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.status === RosterEntryStatus.active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => releaseMutation.mutate({ id: entry.id })}
                        disabled={releaseMutation.isPending}
                      >
                        <LogOut className="w-3 h-3 mr-1" /> Release
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
