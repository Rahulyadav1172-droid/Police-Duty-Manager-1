import { useMemo, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Users, ShieldAlert, CalendarOff, Fingerprint,
  LogOut, Clock, MapPin,
  UserCheck, UserX, X, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  useGetLiveBoard,
  getGetLiveBoardQueryKey,
  useGetRosterStats,
  useGetActiveLeavesToday,
  useGetBiometricToday,
  useGetRosterTrends,
  RosterEntryStatus,
  type Personnel,
  type RosterEntry,
  type LeaveRecord,
  type BiometricDailySummary,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/rank-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ── Types ──────────────────────────────────────────────────────────────── */
type ModalType = "total" | "onDuty" | "available" | "onLeave" | "present" | "absent" | null;

/* ── Live clock ─────────────────────────────────────────────────────────── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{format(now, "dd MMM yyyy  HH:mm:ss")}</span>;
}

/* ── Clickable stat card ─────────────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, color, onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white rounded-xl border-l-4 ${color} p-4 shadow-sm text-left w-full group hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1 group-hover:underline decoration-dotted underline-offset-4">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center group-hover:bg-muted/70 transition-colors">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 group-hover:text-primary transition-colors">Click to view details</p>
    </button>
  );
}

/* ── Detail modal ────────────────────────────────────────────────────────── */
function DetailModal({
  type, onClose,
  activeEntries, available, leaveToday, present, absent, allPersonnel,
}: {
  type: ModalType;
  onClose: () => void;
  activeEntries: RosterEntry[];
  available: Personnel[];
  leaveToday: LeaveRecord[];
  present: BiometricDailySummary[];
  absent: Personnel[];
  allPersonnel: Personnel[];
}) {
  if (!type) return null;

  const config: Record<NonNullable<ModalType>, { title: string; icon: React.ElementType; color: string }> = {
    total:     { title: "Total Strength",          icon: Users,       color: "text-blue-600" },
    onDuty:    { title: "On Duty Now",              icon: ShieldAlert, color: "text-green-600" },
    available: { title: "Available Personnel",      icon: UserCheck,   color: "text-sky-600" },
    onLeave:   { title: "On Leave Today",           icon: CalendarOff, color: "text-amber-600" },
    present:   { title: "Biometric Present Today",  icon: Fingerprint, color: "text-purple-600" },
    absent:    { title: "Absent Today",             icon: UserX,       color: "text-red-600" },
  };
  const { title, icon: Icon, color } = config[type];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${color}`} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-2 py-2">

          {/* TOTAL */}
          {type === "total" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Rank</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Belt No.</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allPersonnel.map((p) => {
                  const onDuty   = activeEntries.some((e) => e.personnelId === p.id);
                  const onLeave  = leaveToday.some((l) => l.personnelId === p.id);
                  const isPresent = present.some((r) => r.personnelId === p.id);
                  const label = onDuty ? "On Duty" : onLeave ? "On Leave" : isPresent ? "Present" : "Absent";
                  const cls   = onDuty ? "bg-green-100 text-green-800 border-green-200"
                              : onLeave ? "bg-amber-100 text-amber-800 border-amber-200"
                              : isPresent ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "bg-red-100 text-red-800 border-red-200";
                  return (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium">{p.name}</td>
                      <td className="px-3 py-2.5"><RankBadge rank={p.rank} /></td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.beltNumber}</td>
                      <td className="px-3 py-2.5"><Badge className={`${cls} text-[10px] uppercase font-semibold`}>{label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ON DUTY */}
          {type === "onDuty" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Duty Point</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{e.personnel?.name ?? "—"}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {e.personnel?.rank && <RankBadge rank={e.personnel.rank} />}
                        <span className="text-[10px] text-muted-foreground font-mono">{e.personnel?.beltNumber}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{e.dutyPoint?.name ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">
                      {e.startDateTime ? format(new Date(e.startDateTime), "dd MMM, HH:mm") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* AVAILABLE */}
          {type === "available" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Rank</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Belt No.</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {available.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5"><RankBadge rank={p.rank} /></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.beltNumber}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.mobileNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ON LEAVE */}
          {type === "onLeave" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Leave Type</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Period</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leaveToday.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{rec.personnel?.name ?? `#${rec.personnelId}`}</div>
                      {rec.personnel?.rank && <RankBadge rank={rec.personnel.rank} />}
                    </td>
                    <td className="px-3 py-2.5 capitalize text-muted-foreground">{rec.leaveType.replace("_", " ")}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {format(new Date(rec.startDate), "dd MMM")} – {format(new Date(rec.endDate), "dd MMM")}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] uppercase font-semibold">{rec.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* PRESENT (BIOMETRIC) */}
          {type === "present" && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">First In</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Last Out</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {present.map((r) => (
                  <tr key={r.personnelId} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.personnel.name}</div>
                      <RankBadge rank={r.personnel.rank} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-green-700">
                      {r.firstIn ? format(new Date(r.firstIn), "HH:mm") : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-red-600">
                      {r.lastOut ? format(new Date(r.lastOut), "HH:mm") : "Still in"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {r.hoursWorked != null ? `${r.hoursWorked.toFixed(1)}h` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ABSENT */}
          {type === "absent" && (
            absent.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No absent personnel today</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Rank</th>
                    <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Belt No.</th>
                    <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Mobile</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {absent.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium">{p.name}</td>
                      <td className="px-3 py-2.5"><RankBadge rank={p.rank} /></td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.beltNumber}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.mobileNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function OfficerDashboard() {
  const { logout } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const { data: liveBoard, isLoading: loadBoard } = useGetLiveBoard({
    query: { queryKey: getGetLiveBoardQueryKey(), refetchInterval: 30000 },
  });
  const { data: stats, isLoading: loadStats } = useGetRosterStats({
    query: { queryKey: ["getRosterStats"], refetchInterval: 30000 },
  });
  const { data: leaveToday = [], isLoading: loadLeave } = useGetActiveLeavesToday({
    query: { queryKey: ["getActiveLeavesToday"], refetchInterval: 30000 },
  });
  const { data: biometric = [], isLoading: loadBio } = useGetBiometricToday();

  const available     = useMemo(() => liveBoard?.available ?? [], [liveBoard]);
  const activeEntries = useMemo(
    () => (liveBoard?.onDuty ?? []).filter((e) => e.status === RosterEntryStatus.active),
    [liveBoard],
  );

  const onLeaveIds = useMemo(
    () => new Set(leaveToday.map((l) => l.personnelId)),
    [leaveToday],
  );
  const presentIds = useMemo(
    () => new Set(biometric.filter((r) => !!r.firstIn).map((r) => r.personnelId)),
    [biometric],
  );
  const presentList = useMemo(
    () => biometric.filter((r) => !!r.firstIn),
    [biometric],
  );
  const absent = useMemo(
    () => available.filter((p) => !onLeaveIds.has(p.id) && !presentIds.has(p.id)),
    [available, onLeaveIds, presentIds],
  );

  // Combine all known personnel for "Total Strength" popup
  const allPersonnel = useMemo(() => {
    const map = new Map<number, Personnel>();
    available.forEach((p) => map.set(p.id, p));
    activeEntries.forEach((e) => { if (e.personnel) map.set(e.personnelId, e.personnel); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [available, activeEntries]);

  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const { data: trends = [], isLoading: loadTrends } = useGetRosterTrends(
    { days: trendDays },
    { query: { queryKey: ["getGetRosterTrends", trendDays], refetchInterval: 60000 } },
  );

  const isLoading = loadBoard || loadStats;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-blue-950 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0">
              <img src="/up-police-logo.png" alt="UP Police" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight uppercase tracking-wide">Duty Manager</h1>
              <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Ayodhya Police Line — Senior Officer Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-blue-200 text-sm">
              <Clock className="w-4 h-4" />
              <LiveClock />
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

        {/* Stat cards — 6 clickable cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Total Strength"     value={stats?.totalPersonnel ?? allPersonnel.length} icon={Users}       color="border-l-blue-500"   onClick={() => setActiveModal("total")} />
              <StatCard label="On Duty Now"         value={activeEntries.length}                          icon={ShieldAlert} color="border-l-green-500"  onClick={() => setActiveModal("onDuty")} />
              <StatCard label="Available"           value={available.length}                              icon={UserCheck}   color="border-l-sky-500"    onClick={() => setActiveModal("available")} />
              <StatCard label="On Leave Today"      value={leaveToday.length}                             icon={CalendarOff} color="border-l-amber-500"  onClick={() => setActiveModal("onLeave")} />
              <StatCard label="Present (Biometric)" value={presentList.length}                            icon={Fingerprint} color="border-l-purple-500" onClick={() => setActiveModal("present")} />
              <StatCard label="Absent Today"        value={absent.length}                                 icon={UserX}       color="border-l-red-500"    onClick={() => setActiveModal("absent")} />
            </>
          )}
        </div>

        {/* Duty Roster + Available Personnel side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Live Duty Roster */}
          <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-green-600" />
                <h2 className="font-bold text-base">Live Duty Roster</h2>
              </div>
              <button
                onClick={() => setActiveModal("onDuty")}
                className="bg-green-100 text-green-800 border border-green-200 text-xs font-semibold px-2.5 py-0.5 rounded-full hover:bg-green-200 transition-colors"
              >
                {activeEntries.length} Active
              </button>
            </div>
            {loadBoard ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : activeEntries.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No personnel currently on duty</p>
            ) : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Personnel</th>
                      <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Duty Point</th>
                      <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold leading-tight">{entry.personnel?.name ?? "—"}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {entry.personnel?.rank && <RankBadge rank={entry.personnel.rank} />}
                            <span className="text-[10px] text-muted-foreground font-mono">{entry.personnel?.beltNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {entry.dutyPoint?.name ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {entry.startDateTime ? format(new Date(entry.startDateTime), "dd MMM, HH:mm") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Available Personnel */}
          <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <h2 className="font-bold text-base">Available Personnel</h2>
              </div>
              <button
                onClick={() => setActiveModal("available")}
                className="bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full hover:bg-sky-200 transition-colors"
              >
                {available.length} Available
              </button>
            </div>
            {loadBoard ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : available.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No personnel currently available</p>
            ) : (
              <ul className="divide-y max-h-72 overflow-y-auto">
                {available.map((p) => (
                  <li key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="font-semibold text-sm leading-tight">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RankBadge rank={p.rank} />
                        <span className="text-[10px] text-muted-foreground font-mono">{p.beltNumber}</span>
                      </div>
                    </div>
                    <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] uppercase font-semibold shrink-0">
                      Available
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* On Leave Today + Absent Today side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* On Leave Today */}
          <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-amber-600" />
                <h2 className="font-bold text-base">On Leave Today</h2>
              </div>
              <button
                onClick={() => setActiveModal("onLeave")}
                className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors"
              >
                {leaveToday.length} On Leave
              </button>
            </div>
            {loadLeave ? (
              <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : leaveToday.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No personnel on leave today</p>
            ) : (
              <ul className="divide-y max-h-64 overflow-y-auto">
                {leaveToday.map((rec) => (
                  <li key={rec.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{rec.personnel?.name ?? `Personnel #${rec.personnelId}`}</p>
                      <p className="text-xs text-muted-foreground capitalize">{rec.leaveType.replace("_", " ")}
                        <span className="ml-2 text-muted-foreground/60">
                          {format(new Date(rec.startDate), "dd MMM")} – {format(new Date(rec.endDate), "dd MMM")}
                        </span>
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] uppercase font-semibold shrink-0">
                      {rec.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Absent Today */}
          <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-600" />
                <h2 className="font-bold text-base">Absent Today</h2>
              </div>
              <button
                onClick={() => setActiveModal("absent")}
                className="bg-red-100 text-red-800 border border-red-200 text-xs font-semibold px-2.5 py-0.5 rounded-full hover:bg-red-200 transition-colors"
              >
                {absent.length} Absent
              </button>
            </div>
            {loadBio || loadBoard ? (
              <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : absent.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No absent personnel today</p>
            ) : (
              <ul className="divide-y max-h-64 overflow-y-auto">
                {absent.map((p) => (
                  <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RankBadge rank={p.rank} />
                        <span className="text-[10px] text-muted-foreground font-mono">{p.beltNumber}</span>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] uppercase font-semibold shrink-0">
                      Absent
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Trend Charts */}
        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-base">Duty Deployment Trends</h2>
            </div>
            <div className="flex rounded-lg border overflow-hidden text-xs font-semibold shrink-0">
              <button
                className={`px-3 py-1.5 transition-colors ${trendDays === 7 ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setTrendDays(7)}
              >
                7 Days
              </button>
              <button
                className={`px-3 py-1.5 transition-colors ${trendDays === 30 ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setTrendDays(30)}
              >
                30 Days
              </button>
            </div>
          </div>
          <div className="p-4">
            {loadTrends ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading trends…</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trends} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => {
                      const parts = d.split("-");
                      return `${parts[2]}/${parts[1]}`;
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(d) => `Date: ${d}`}
                    formatter={(val, name) => [val, name === "onDutyCount" ? "Active Duties" : "New Assignments"]}
                  />
                  <Legend
                    formatter={(value) => value === "onDutyCount" ? "Active Duties" : "New Assignments"}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="onDutyCount" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="totalAssignments" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

      </main>

      {/* Detail modals */}
      <DetailModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        activeEntries={activeEntries}
        available={available}
        leaveToday={leaveToday}
        present={presentList}
        absent={absent}
        allPersonnel={allPersonnel}
      />
    </div>
  );
}
