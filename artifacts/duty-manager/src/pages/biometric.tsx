import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Fingerprint, LogIn, LogOut, Clock, Users, Trash2,
  CalendarDays, Plus, RefreshCw, CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  useGetBiometricToday,
  useListBiometricRecords,
  useRecordBiometricPunch,
  useDeleteBiometricRecord,
  useListPersonnel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RankBadge } from "@/components/rank-badge";

export default function BiometricAttendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"summary" | "log">("summary");
  const [punchOpen, setPunchOpen] = useState(false);
  const [beltNumber, setBeltNumber] = useState("");
  const [punchType, setPunchType] = useState<"IN" | "OUT">("IN");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === today;

  const { data: todaySummary = [], isLoading: loadToday, refetch: refetchToday } = useGetBiometricToday();
  const { data: logRecords = [], isLoading: loadLog, refetch: refetchLog } = useListBiometricRecords({ date: selectedDate });
  const { data: personnel = [] } = useListPersonnel();

  const punch = useRecordBiometricPunch({
    mutation: {
      onSuccess: () => {
        toast({ title: "Punch recorded successfully" });
        setPunchOpen(false);
        setBeltNumber("");
        setPunchType("IN");
        void queryClient.invalidateQueries();
      },
      onError: async (err: unknown) => {
        let msg = "Failed to record punch";
        if (err && typeof err === "object" && "response" in err) {
          try {
            const data = await (err as { response: Response }).response.json();
            msg = data?.error ?? msg;
          } catch { /* ignore */ }
        }
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const deletePunch = useDeleteBiometricRecord({
    mutation: {
      onSuccess: () => {
        toast({ title: "Record deleted" });
        setDeleteTarget(null);
        void queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "Failed to delete record", variant: "destructive" });
      },
    },
  });

  function handlePunchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!beltNumber.trim()) return;
    punch.mutate({ data: { beltNumber: beltNumber.trim(), punchType } });
  }

  function handleRefresh() {
    void refetchToday();
    void refetchLog();
  }

  const totalPresent = todaySummary.filter((s) => s.firstIn).length;
  const totalAbsent = personnel.length - totalPresent;
  const avgHours = useMemo(() => {
    const worked = todaySummary.filter((s) => s.hoursWorked !== null).map((s) => s.hoursWorked as number);
    return worked.length ? (worked.reduce((a, b) => a + b, 0) / worked.length).toFixed(2) : null;
  }, [todaySummary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-primary" />
            Biometric Attendance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Punch records from the biometric machine — {format(new Date(), "dd MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setPunchOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Record Punch
          </Button>
        </div>
      </div>

      {/* Stat cards — today only */}
      {isToday && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Strength", value: personnel.length, icon: Users, cls: "border-l-primary", badge: "bg-primary/10 text-primary" },
            { label: "Present Today", value: totalPresent, icon: CheckCircle2, cls: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-800" },
            { label: "Not Punched", value: totalAbsent, icon: AlertCircle, cls: "border-l-red-400", badge: "bg-red-50 text-red-700" },
            { label: "Avg Hours Worked", value: avgHours ? `${avgHours}h` : "—", icon: Clock, cls: "border-l-blue-500", badge: "bg-blue-50 text-blue-700" },
          ].map(({ label, value, icon: Icon, cls, badge }) => (
            <div key={label} className={`bg-card rounded-lg border p-5 border-l-4 ${cls}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${badge}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              {loadToday
                ? <Skeleton className="h-10 w-16 mt-1" />
                : <p className="text-3xl font-extrabold">{value}</p>}
            </div>
          ))}
        </div>
      )}

      {/* View toggle + date picker */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-lg border overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === "summary" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            onClick={() => setView("summary")}
          >
            Daily Summary
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === "log" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            onClick={() => setView("log")}
          >
            Punch Log
          </button>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 text-sm"
          />
        </div>
      </div>

      {/* Daily Summary View */}
      {view === "summary" && (
        <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Personnel Biometric Summary — {format(parseISO(selectedDate), "dd MMM yyyy")}</h3>
            <span className="text-xs text-muted-foreground">{isToday ? "Live (today)" : "Historical"}</span>
          </div>
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="w-10 text-center">S.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Belt No.</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>First IN</TableHead>
                <TableHead>Last OUT</TableHead>
                <TableHead className="text-center">Hours Worked</TableHead>
                <TableHead className="text-center">Punches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadToday
                ? Array(6).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(9).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                : (() => {
                    const summaryMap = new Map(todaySummary.map((s) => [s.personnelId, s]));
                    const allRows = personnel.map((p) => ({ p, s: summaryMap.get(p.id) }));
                    allRows.sort((a, b) => {
                      const hasA = a.s?.firstIn ? 1 : 0;
                      const hasB = b.s?.firstIn ? 1 : 0;
                      return hasB - hasA || a.p.name.localeCompare(b.p.name);
                    });
                    return allRows.map(({ p, s }, idx) => (
                      <TableRow key={p.id} className={s?.firstIn ? "bg-emerald-50/20" : "bg-red-50/10"}>
                        <TableCell className="text-center text-sm text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                        <TableCell className="font-mono text-sm">{p.beltNumber}</TableCell>
                        <TableCell><RankBadge rank={p.rank} /></TableCell>
                        <TableCell className="text-center">
                          {s?.firstIn
                            ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] uppercase gap-1 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3" /> Present</Badge>
                            : <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] uppercase gap-1 hover:bg-red-100"><AlertCircle className="w-3 h-3" /> Absent</Badge>}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {s?.firstIn ? (
                            <span className="flex items-center gap-1 text-emerald-700">
                              <LogIn className="w-3 h-3" />
                              {format(parseISO(s.firstIn), "hh:mm a")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {s?.lastOut ? (
                            <span className="flex items-center gap-1 text-red-600">
                              <LogOut className="w-3 h-3" />
                              {format(parseISO(s.lastOut), "hh:mm a")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm font-semibold">
                          {s?.hoursWorked != null ? (
                            <span className={`${s.hoursWorked >= 8 ? "text-emerald-700" : "text-amber-600"}`}>
                              {s.hoursWorked.toFixed(2)}h
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-semibold text-muted-foreground">{s?.punches?.length ?? 0}</span>
                        </TableCell>
                      </TableRow>
                    ));
                  })()
              }
            </TableBody>
          </Table>
        </div>
      )}

      {/* Punch Log View */}
      {view === "log" && (
        <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">All Punch Records — {format(parseISO(selectedDate), "dd MMM yyyy")} ({logRecords.length} records)</h3>
          </div>
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Belt No.</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead className="text-center">Punch Type</TableHead>
                <TableHead>Punch Time</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead className="w-16 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadLog
                ? Array(6).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                : logRecords.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No biometric records for this date
                      </TableCell>
                    </TableRow>
                  )
                  : logRecords.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center text-sm text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-sm">{r.personnel?.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{r.personnel?.beltNumber ?? "—"}</TableCell>
                      <TableCell>{r.personnel?.rank ? <RankBadge rank={r.personnel.rank} /> : "—"}</TableCell>
                      <TableCell className="text-center">
                        {r.punchType === "IN"
                          ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-[11px] hover:bg-emerald-100"><LogIn className="w-3 h-3" /> IN</Badge>
                          : <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-[11px] hover:bg-red-100"><LogOut className="w-3 h-3" /> OUT</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {format(parseISO(r.punchTime), "hh:mm:ss a")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.deviceId ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => setDeleteTarget(r.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </div>
      )}

      {/* Record Punch Dialog */}
      <Dialog open={punchOpen} onOpenChange={setPunchOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              Record Biometric Punch
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePunchSubmit} className="space-y-4 pt-1">
            <div>
              <Label className="text-sm font-medium">Belt Number (PNO)</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g. UP1234"
                value={beltNumber}
                onChange={(e) => setBeltNumber(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the belt number as registered in the biometric machine</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Punch Type</Label>
              <Select value={punchType} onValueChange={(v) => setPunchType(v as "IN" | "OUT")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">
                    <span className="flex items-center gap-2"><LogIn className="w-4 h-4 text-emerald-600" /> Punch IN</span>
                  </SelectItem>
                  <SelectItem value="OUT">
                    <span className="flex items-center gap-2"><LogOut className="w-4 h-4 text-red-500" /> Punch OUT</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
              Punch time will be set to current server time. Connect the biometric machine API to automate this.
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPunchOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={punch.isPending || !beltNumber.trim()} className="gap-2">
                <Fingerprint className="w-4 h-4" />
                {punch.isPending ? "Recording…" : "Record Punch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Punch Record?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deletePunch.isPending}
              onClick={() => deleteTarget !== null && deletePunch.mutate({ id: deleteTarget })}
            >
              {deletePunch.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
