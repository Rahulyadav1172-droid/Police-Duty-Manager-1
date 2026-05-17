import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import {
  ShieldAlert, MapPin, Search, Clock, Users,
  ArrowRightCircle, LogOut, CalendarCheck, CalendarOff,
  FileDown, MessageCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useGetLiveBoard,
  getGetLiveBoardQueryKey,
  useGetRosterStats,
  useReleaseFromDuty,
  useGetActiveLeavesToday,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RankBadge } from "@/components/rank-badge";

type ViewFilter = "all" | "on-duty" | "available" | "on-leave";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick_leave:    "Sick Leave",
  earned_leave:  "Earned Leave",
  casual_leave:  "Casual Leave",
  absent:        "Absent",
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  sick_leave:    "bg-red-100 text-red-800 border-red-200",
  earned_leave:  "bg-blue-100 text-blue-800 border-blue-200",
  casual_leave:  "bg-purple-100 text-purple-800 border-purple-200",
  absent:        "bg-gray-100 text-gray-800 border-gray-200",
};

function TimeRemaining({ endDateTime }: { endDateTime: string }) {
  const end = new Date(endDateTime);
  const now = new Date();
  if (now > end) return <span className="text-red-500 font-bold">Expired</span>;
  const mins = differenceInMinutes(end, now);
  const hrs  = differenceInHours(end, now);
  if (hrs > 0) return <span>{hrs}h {mins % 60}m left</span>;
  return <span>{mins}m left</span>;
}

export default function LiveBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  const { data: liveBoard, isLoading: isLiveBoardLoading } = useGetLiveBoard({
    query: {
      queryKey: getGetLiveBoardQueryKey(),
      refetchInterval: 30000,
    },
  });

  const { data: stats, isLoading: isStatsLoading } = useGetRosterStats({
    query: {
      queryKey: ["getRosterStats"],
      refetchInterval: 30000,
    },
  });

  const { data: leaveToday = [], isLoading: isLeaveLoading } = useGetActiveLeavesToday({
    query: {
      queryKey: ["getActiveLeavesToday"],
      refetchInterval: 30000,
    },
  });

  const { role } = useAuth();
  const isAdmin = role === "admin";

  function generateDailyReportPDF() {
    const doc = new jsPDF();
    const today = format(new Date(), "dd MMMM yyyy");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Ayodhya Police Line — Daily Duty Report", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${today}  |  Generated: ${format(new Date(), "HH:mm")}`, 14, 26);

    const onDutyRows = (liveBoard?.onDuty ?? []).map((e, i) => [
      i + 1,
      e.personnel?.name ?? "—",
      e.personnel?.beltNumber ?? "—",
      e.personnel?.rank ?? "—",
      e.dutyPoint?.name ?? "—",
      e.dutyPoint?.location ?? "—",
      e.dutyType === "unlimited" ? "Unlimited" : "Fixed",
      format(new Date(e.startDateTime), "HH:mm"),
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["#", "Name", "Belt No", "Rank", "Duty Point", "Location", "Type", "Since"]],
      body: onDutyRows,
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    const afterTable = (doc as any).lastAutoTable?.finalY ?? 80;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Summary`, 14, afterTable + 12);
    doc.setFont("helvetica", "normal");
    doc.text(`Total On Duty: ${liveBoard?.onDuty.length ?? 0}`, 14, afterTable + 20);
    doc.text(`Total Available: ${(liveBoard?.available ?? []).filter(p => !onLeaveIds.has(p.id)).length}`, 80, afterTable + 20);
    doc.text(`On Leave: ${leaveToday.length}`, 150, afterTable + 20);

    doc.save(`daily-duty-report-${today.replace(/ /g, "-")}.pdf`);
  }

  function shareWhatsApp() {
    const today = format(new Date(), "dd MMM yyyy");
    const time = format(new Date(), "HH:mm");
    const onDuty = liveBoard?.onDuty ?? [];
    const available = (liveBoard?.available ?? []).filter(p => !onLeaveIds.has(p.id));

    let msg = `🚔 *Ayodhya Police Line — Duty Report*\n📅 ${today} | 🕐 ${time}\n\n`;
    msg += `*On Duty (${onDuty.length}):*\n`;
    onDuty.forEach((e, i) => {
      msg += `${i + 1}. ${e.personnel?.name ?? "—"} (${e.personnel?.rank ?? ""}) → ${e.dutyPoint?.name ?? "—"}\n`;
    });
    msg += `\n✅ *Available: ${available.length}*  |  🏖️ *On Leave: ${leaveToday.length}*\n`;
    msg += `\n_Sent from Ayodhya Police Duty Manager_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const releaseMutation = useReleaseFromDuty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLiveBoardQueryKey() });
        toast({ title: "Personnel released from duty" });
      },
      onError: () => toast({ title: "Failed to release personnel", variant: "destructive" }),
    },
  });

  // Build a set of personnel IDs on leave today
  const onLeaveIds = useMemo(
    () => new Set(leaveToday.map((l) => l.personnelId)),
    [leaveToday],
  );

  const q = searchTerm.toLowerCase();

  const filteredOnDuty = (liveBoard?.onDuty ?? []).filter((entry) =>
    !q ||
    entry.personnel?.name.toLowerCase().includes(q) ||
    entry.personnel?.beltNumber.toLowerCase().includes(q) ||
    entry.dutyPoint?.name.toLowerCase().includes(q),
  );

  // Filter people on leave OUT of the available list
  const filteredAvailable = (liveBoard?.available ?? [])
    .filter((person) => !onLeaveIds.has(person.id))
    .filter((person) =>
      !q ||
      person.name.toLowerCase().includes(q) ||
      person.beltNumber.toLowerCase().includes(q) ||
      person.rank.toLowerCase().includes(q),
    );

  const filteredOnLeave = leaveToday.filter((leave) =>
    !q ||
    leave.personnel?.name.toLowerCase().includes(q) ||
    (leave.personnel as { beltNumber?: string } | undefined)?.beltNumber?.toLowerCase().includes(q) ||
    LEAVE_TYPE_LABELS[leave.leaveType]?.toLowerCase().includes(q),
  );

  const isLoading = isLiveBoardLoading || isLeaveLoading;

  const showOnDuty    = viewFilter === "all" || viewFilter === "on-duty";
  const showAvailable = viewFilter === "all" || viewFilter === "available";
  const showOnLeave   = viewFilter === "all" || viewFilter === "on-leave";

  const onLeaveCount    = leaveToday.length;
  const realAvailable   = (liveBoard?.available ?? []).filter(p => !onLeaveIds.has(p.id)).length;

  const FILTER_TABS: { value: ViewFilter; label: string; count: number; color: string }[] = [
    { value: "all",      label: "All",       count: (liveBoard?.onDuty.length ?? 0) + realAvailable + onLeaveCount, color: "bg-primary text-primary-foreground" },
    { value: "on-duty",  label: "On Duty",   count: liveBoard?.onDuty.length ?? 0,  color: "bg-red-600 text-white" },
    { value: "available",label: "Available", count: realAvailable,                   color: "bg-emerald-600 text-white" },
    { value: "on-leave", label: "On Leave",  count: onLeaveCount,                   color: "bg-amber-500 text-white" },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Duty Board</h1>
          <p className="text-sm text-muted-foreground">Real-time status of all personnel — Ayodhya Police Line.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, PNO, location…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full"
            />
          </div>
          <button
            onClick={shareWhatsApp}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={generateDailyReportPDF}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2"
            title="Download Daily Report PDF"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Daily Report</span>
          </button>
          {isAdmin && (
          <Link
            href="/assign"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
            data-testid="link-assign-duty"
          >
            <CalendarCheck className="w-4 h-4" />
            Assign Duty
          </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
              {isStatsLoading ? <Skeleton className="h-8 w-16 mt-2" /> : <h3 className="text-3xl font-bold mt-1">{stats?.totalPersonnel ?? 0}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-950 text-white border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">On Duty</p>
              {isStatsLoading ? <Skeleton className="h-8 w-16 mt-2 bg-blue-900" /> : <h3 className="text-3xl font-bold mt-1">{stats?.totalOnDuty ?? 0}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-900 text-white border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Available</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-2 bg-emerald-800" /> : <h3 className="text-3xl font-bold mt-1">{realAvailable}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-700 text-white border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">On Leave</p>
              {isLeaveLoading ? <Skeleton className="h-8 w-16 mt-2 bg-amber-600" /> : <h3 className="text-3xl font-bold mt-1">{onLeaveCount}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center">
              <CalendarOff className="w-6 h-6 text-amber-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Filter Tabs */}
      <div className="flex items-center gap-1 border-b pb-0 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setViewFilter(tab.value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              viewFilter === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              viewFilter === tab.value ? tab.color : "bg-muted text-muted-foreground"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`grid gap-6 ${
        viewFilter === "all"
          ? "grid-cols-1 lg:grid-cols-3"
          : "grid-cols-1"
      }`}>

        {/* ── On Duty Column ─────────────────────────────────────────────── */}
        {showOnDuty && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                ON DUTY
              </h2>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold">
                {filteredOnDuty.length} Active
              </Badge>
            </div>

            <div className={`space-y-3 ${viewFilter === "on-duty" ? "grid grid-cols-1 md:grid-cols-2 gap-3 space-y-0" : ""}`}>
              {isLiveBoardLoading ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
              ) : filteredOnDuty.length === 0 ? (
                <div className="text-center py-10 bg-card rounded-lg border border-dashed col-span-full">
                  <p className="text-muted-foreground">
                    {searchTerm ? `No on-duty matches for "${searchTerm}"` : "No personnel currently on duty."}
                  </p>
                </div>
              ) : (
                filteredOnDuty.map((entry) => (
                  <Card key={entry.id} className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base">{entry.personnel?.name}</h4>
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            PNO {entry.personnel?.beltNumber}
                          </span>
                          <RankBadge rank={entry.personnel?.rank ?? ""} />
                        </div>

                        <div className="flex items-start gap-2 text-sm text-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{entry.dutyPoint?.name}</p>
                            <p className="text-muted-foreground text-xs">{entry.dutyPoint?.location}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          {entry.dutyType === "unlimited" ? (
                            <Badge variant="destructive" className="text-[10px] uppercase">Unlimited</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] uppercase">Fixed</Badge>
                          )}
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Started: {format(new Date(entry.startDateTime), "HH:mm")}
                          </span>
                          {entry.dutyType === "fixed" && entry.endDateTime && (
                            <span className="text-foreground font-medium flex items-center gap-1">
                              <ArrowRightCircle className="w-3 h-3" />
                              <TimeRemaining endDateTime={entry.endDateTime} />
                            </span>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => releaseMutation.mutate({ id: entry.id })}
                          disabled={releaseMutation.isPending}
                          data-testid={`btn-release-${entry.id}`}
                          className="shrink-0"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Release
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Available Column ───────────────────────────────────────────── */}
        {showAvailable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                AVAILABLE
              </h2>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                {filteredAvailable.length} Ready
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isLiveBoardLoading ? (
                Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredAvailable.length === 0 ? (
                <div className="text-center py-10 bg-card rounded-lg border border-dashed col-span-full">
                  <p className="text-muted-foreground">
                    {searchTerm ? `No available matches for "${searchTerm}"` : "No personnel available."}
                  </p>
                </div>
              ) : (
                filteredAvailable.map((person) => (
                  <Card key={person.id} className="border-l-4 border-l-emerald-500 bg-card/50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{person.name}</h4>
                          <span className="text-xs font-mono text-muted-foreground">PNO {person.beltNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <RankBadge rank={person.rank} />
                        <Link
                          href={`/assign?personnelId=${person.id}`}
                          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-assign-${person.id}`}
                        >
                          Assign <ArrowRightCircle className="w-3 h-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── On Leave Column ────────────────────────────────────────────── */}
        {showOnLeave && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                ON LEAVE
              </h2>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">
                {filteredOnLeave.length} on leave
              </Badge>
            </div>

            <div className={`space-y-3 ${viewFilter === "on-leave" ? "grid grid-cols-1 md:grid-cols-2 gap-3 space-y-0" : ""}`}>
              {isLeaveLoading ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredOnLeave.length === 0 ? (
                <div className="text-center py-10 bg-card rounded-lg border border-dashed col-span-full">
                  <p className="text-muted-foreground">
                    {searchTerm ? `No leave matches for "${searchTerm}"` : "No personnel on leave today."}
                  </p>
                </div>
              ) : (
                filteredOnLeave.map((leave) => {
                  const leaveBadge = LEAVE_TYPE_COLORS[leave.leaveType] ?? "bg-gray-100 text-gray-700 border-gray-200";
                  const leaveLabel = LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType;
                  const personnel = leave.personnel as {
                    id: number; name: string; beltNumber: string; rank: string;
                  } | undefined;
                  return (
                    <Card key={leave.id} className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm">{personnel?.name ?? "—"}</h4>
                            <span className="text-xs font-mono text-muted-foreground">PNO {personnel?.beltNumber}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] uppercase shrink-0 ${leaveBadge}`}>
                            {leaveLabel}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <RankBadge rank={personnel?.rank ?? ""} />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarOff className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {format(new Date(leave.startDate), "dd MMM")}
                            {" — "}
                            {format(new Date(leave.endDate), "dd MMM yyyy")}
                          </span>
                        </div>

                        {leave.reason && (
                          <p className="text-xs text-muted-foreground italic border-t pt-1.5 mt-1 line-clamp-2">
                            {leave.reason}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
