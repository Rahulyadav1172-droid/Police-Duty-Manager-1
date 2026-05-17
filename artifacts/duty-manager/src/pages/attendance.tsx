import { useMemo } from "react";
import { format } from "date-fns";
import {
  Users, ShieldAlert, Clock, CalendarOff,
  FileDown, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";
import {
  useListPersonnel,
  useGetLiveBoard,
  useGetActiveLeavesToday,
  useGetRosterStats,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { generateAttendanceSummary } from "@/lib/report";
import { RankBadge } from "@/components/rank-badge";

const RANK_ORDER: Record<string, number> = {
  Inspector: 1,
  "Sub-Inspector": 2,
  "Head Constable": 3,
  Constable: 4,
};

export default function AttendanceSummary() {
  const { toast } = useToast();

  const { data: personnel = [],    isLoading: loadP } = useListPersonnel();
  const { data: liveBoard,          isLoading: loadL } = useGetLiveBoard();
  const { data: leaveToday = [],    isLoading: loadLv} = useGetActiveLeavesToday();
  const { data: stats,              isLoading: loadS } = useGetRosterStats();

  const isLoading = loadP || loadL || loadLv || loadS;

  // Set of personnel IDs on duty / on leave
  const onDutyIds  = useMemo(() => new Set((liveBoard?.onDuty ?? []).map(e => e.personnelId)), [liveBoard]);
  const onLeaveIds = useMemo(() => new Set(leaveToday.map(l => l.personnelId)), [leaveToday]);

  // Rank-wise breakdown
  const rankBreakdown = useMemo(() => {
    const map: Record<string, { total: number; onDuty: number; onLeave: number; available: number }> = {};
    personnel.forEach(p => {
      if (!map[p.rank]) map[p.rank] = { total: 0, onDuty: 0, onLeave: 0, available: 0 };
      map[p.rank].total++;
      if (onDutyIds.has(p.id))       map[p.rank].onDuty++;
      else if (onLeaveIds.has(p.id)) map[p.rank].onLeave++;
      else                            map[p.rank].available++;
    });
    return Object.entries(map).sort(([a], [b]) => (RANK_ORDER[a] ?? 9) - (RANK_ORDER[b] ?? 9));
  }, [personnel, onDutyIds, onLeaveIds]);

  // Individual status table
  const personnelRows = useMemo(() =>
    [...personnel]
      .sort((a, b) => (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9) || a.name.localeCompare(b.name))
      .map(p => {
        const dutyEntry = liveBoard?.onDuty.find(e => e.personnelId === p.id);
        const leaveEntry = leaveToday.find(l => l.personnelId === p.id);
        let status: "on-duty" | "on-leave" | "available";
        if (dutyEntry)        status = "on-duty";
        else if (leaveEntry)  status = "on-leave";
        else                  status = "available";
        return { ...p, status, dutyEntry, leaveEntry };
      }),
    [personnel, liveBoard, leaveToday]);

  function handleExport() {
    try {
      generateAttendanceSummary({
        personnel,
        onDutyIds,
        onLeaveIds,
        leaveToday,
        liveBoard,
        rankBreakdown,
      });
      toast({ title: "Attendance summary downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }

  const total     = personnel.length;
  const onDuty    = onDutyIds.size;
  const onLeave   = onLeaveIds.size;
  const available = total - onDuty - onLeave;

  const STAT_CARDS = [
    { label: "Total Strength",  value: total,     icon: Users,        cls: "border-l-primary",   badge: "bg-primary/10 text-primary" },
    { label: "On Duty",         value: onDuty,    icon: ShieldAlert,  cls: "border-l-blue-600",  badge: "bg-blue-50 text-blue-800" },
    { label: "Available",       value: available, icon: Clock,        cls: "border-l-emerald-500",badge: "bg-emerald-50 text-emerald-800" },
    { label: "On Leave Today",  value: onLeave,   icon: CalendarOff,  cls: "border-l-amber-500", badge: "bg-amber-50 text-amber-800" },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance Summary</h1>
          <p className="text-sm text-muted-foreground">
            Parade date: <strong>{format(new Date(), "dd MMMM yyyy (EEEE)")}</strong>
          </p>
        </div>
        <Button onClick={handleExport} disabled={isLoading || total === 0} className="gap-2 shrink-0">
          <FileDown className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, cls, badge }) => (
          <div key={label} className={`bg-card rounded-lg border p-5 border-l-4 ${cls}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${badge}`}>
                <Icon className="w-4 h-4" />
              </span>
            </div>
            {isLoading
              ? <Skeleton className="h-10 w-16 mt-1" />
              : <p className="text-4xl font-extrabold">{value}</p>}
          </div>
        ))}
      </div>

      {/* Attendance % bar */}
      {!isLoading && total > 0 && (
        <div className="bg-card rounded-lg border p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Attendance at a Glance</h3>
          <div className="flex h-6 rounded-full overflow-hidden text-xs font-semibold">
            {onDuty > 0 && (
              <div style={{ width: `${(onDuty / total) * 100}%` }}
                className="bg-blue-600 flex items-center justify-center text-white">
                {Math.round((onDuty / total) * 100)}%
              </div>
            )}
            {available > 0 && (
              <div style={{ width: `${(available / total) * 100}%` }}
                className="bg-emerald-500 flex items-center justify-center text-white">
                {Math.round((available / total) * 100)}%
              </div>
            )}
            {onLeave > 0 && (
              <div style={{ width: `${(onLeave / total) * 100}%` }}
                className="bg-amber-400 flex items-center justify-center text-white">
                {Math.round((onLeave / total) * 100)}%
              </div>
            )}
          </div>
          <div className="flex gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> On Duty</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> On Leave</span>
          </div>
        </div>
      )}

      {/* Rank-wise breakdown */}
      <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Rank-wise Strength</h3>
        </div>
        <Table>
          <TableHeader className="bg-muted/20">
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">On Duty</TableHead>
              <TableHead className="text-center">Available</TableHead>
              <TableHead className="text-center">On Leave</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array(4).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(5).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-12" /></TableCell>)}
                </TableRow>
              ))
              : rankBreakdown.map(([rank, counts]) => (
                <TableRow key={rank}>
                  <TableCell><RankBadge rank={rank} /></TableCell>
                  <TableCell className="text-center font-bold">{counts.total}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5" />{counts.onDuty}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />{counts.available}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <CalendarOff className="w-3.5 h-3.5" />{counts.onLeave}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>

      {/* Individual personnel table */}
      <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Individual Status — {format(new Date(), "dd MMM yyyy")}</h3>
        </div>
        <Table>
          <TableHeader className="bg-muted/20">
            <TableRow>
              <TableHead className="w-10 text-center">S.No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>PNO No.</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duty Point / Leave Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array(8).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(6).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
              : personnelRows.map((p, idx) => (
                <TableRow key={p.id} className={
                  p.status === "on-duty"   ? "bg-blue-50/30" :
                  p.status === "on-leave"  ? "bg-amber-50/30" : ""
                }>
                  <TableCell className="text-center text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                  <TableCell className="font-mono text-sm">{p.beltNumber}</TableCell>
                  <TableCell><RankBadge rank={p.rank} /></TableCell>
                  <TableCell>
                    {p.status === "on-duty"  && <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] uppercase gap-1 hover:bg-blue-100"><ShieldAlert className="w-3 h-3" /> On Duty</Badge>}
                    {p.status === "available"&& <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] uppercase gap-1 hover:bg-emerald-100"><CheckCircle className="w-3 h-3" /> Available</Badge>}
                    {p.status === "on-leave" && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] uppercase gap-1 hover:bg-amber-100"><AlertTriangle className="w-3 h-3" /> On Leave</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.status === "on-duty"  && (p.dutyEntry?.dutyPoint?.name ?? "—")}
                    {p.status === "on-leave" && (p.leaveEntry?.leaveType?.replace(/_/g, " ") ?? "Leave")}
                    {p.status === "available"&& "—"}
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
