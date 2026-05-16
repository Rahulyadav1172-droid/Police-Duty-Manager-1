import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, LogOut, CheckCircle2, XCircle } from "lucide-react";

import { 
  useListRoster, 
  getListRosterQueryKey,
  useReleaseFromDuty,
  RosterEntryStatus
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

export default function RosterHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: roster, isLoading } = useListRoster();

  const releaseMutation = useReleaseFromDuty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRosterQueryKey() });
        toast({ title: "Personnel released from duty" });
      },
      onError: () => toast({ title: "Failed to release personnel", variant: "destructive" })
    }
  });

  const filteredRoster = roster?.filter(entry => {
    const matchesSearch = 
      entry.personnel?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.personnel?.beltNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.dutyPoint?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roster History</h1>
          <p className="text-sm text-muted-foreground">Log of all duty assignments, past and present.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search personnel or location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="flex rounded-md shadow-sm w-full sm:w-auto">
            {["all", RosterEntryStatus.active, RosterEntryStatus.released, RosterEntryStatus.expired].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 text-sm font-medium border-y border-l first:border-l last:border-r first:rounded-l-md last:rounded-r-md transition-colors
                  ${statusFilter === status 
                    ? "bg-primary text-primary-foreground border-primary z-10" 
                    : "bg-background text-muted-foreground border-input hover:bg-muted"
                  }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md border shadow-sm overflow-hidden">
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
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoster.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <StatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{entry.personnel?.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-muted-foreground">#{entry.personnel?.beltNumber}</span>
                        <RankBadge rank={entry.personnel?.rank || ""} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.dutyPoint?.name}
                  </TableCell>
                  <TableCell>
                    {entry.dutyType === 'unlimited' ? (
                      <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] uppercase">Unlimited</Badge>
                    ) : (
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-[10px] uppercase">Fixed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(entry.startDateTime), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.endDateTime ? format(new Date(entry.endDateTime), 'MMM dd, HH:mm') : <span className="text-muted-foreground italic">Until released</span>}
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
  );
}
