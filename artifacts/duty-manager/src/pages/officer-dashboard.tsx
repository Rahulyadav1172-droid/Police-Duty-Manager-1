import { useMemo, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Users, ShieldAlert, CalendarOff, Fingerprint,
  LogOut, Clock, MapPin, CheckCircle2, XCircle,
} from "lucide-react";
import {
  useGetLiveBoard,
  getGetLiveBoardQueryKey,
  useGetRosterStats,
  useGetActiveLeavesToday,
  useGetBiometricToday,
  RosterEntryStatus,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/rank-badge";

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${color} p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums">
      {format(now, "dd MMM yyyy  HH:mm:ss")}
    </span>
  );
}

export default function OfficerDashboard() {
  const { logout } = useAuth();

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

  const presentToday = useMemo(
    () => biometric.filter((r) => !!r.firstIn).length,
    [biometric],
  );

  const onLeaveIds = useMemo(
    () => new Set(leaveToday.map((l) => l.personnelId)),
    [leaveToday],
  );

  const activeEntries = useMemo(
    () => (liveBoard?.onDuty ?? []).filter((e) => e.status === RosterEntryStatus.active),
    [liveBoard],
  );

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
              <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Ayodhya Police Line — Senior Officer View</p>
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

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadStats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard label="Total Strength"      value={stats?.totalPersonnel ?? 0} icon={Users}       color="border-l-blue-500" />
              <StatCard label="On Duty Now"          value={stats?.totalOnDuty ?? 0}    icon={ShieldAlert} color="border-l-green-500" />
              <StatCard label="On Leave Today"       value={leaveToday.length}           icon={CalendarOff} color="border-l-amber-500" />
              <StatCard label="Present (Biometric)"  value={presentToday}               icon={Fingerprint} color="border-l-purple-500" />
            </>
          )}
        </div>

        {/* Live Duty Roster */}
        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-green-600" />
              <h2 className="font-bold text-base">Live Duty Roster</h2>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200 font-semibold">
              {activeEntries.length} Active
            </Badge>
          </div>

          {loadBoard ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : activeEntries.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">No personnel currently on duty</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Personnel</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Duty Point</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Start</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeEntries.map((entry) => {
                    const onLeave = onLeaveIds.has(entry.personnelId);
                    return (
                      <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{entry.personnel?.name ?? "—"}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {entry.personnel?.rank && <RankBadge rank={entry.personnel.rank} />}
                            <span className="text-xs text-muted-foreground font-mono">{entry.personnel?.beltNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{entry.dutyPoint?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.startDateTime
                            ? format(new Date(entry.startDateTime), "dd MMM, HH:mm")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {onLeave ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-semibold uppercase">
                              On Leave
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] font-semibold uppercase">
                              Active
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Leave today & Biometric summary side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Leave today */}
          <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-amber-600" />
              <h2 className="font-bold text-base">On Leave Today</h2>
              <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                {leaveToday.length}
              </span>
            </div>
            {loadLeave ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : leaveToday.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No personnel on leave today</p>
            ) : (
              <ul className="divide-y max-h-64 overflow-y-auto">
                {leaveToday.map((rec) => (
                  <li key={rec.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{rec.personnel?.name ?? `Personnel #${rec.personnelId}`}</p>
                      <p className="text-xs text-muted-foreground capitalize">{rec.leaveType?.replace("_", " ")}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] uppercase font-semibold">
                      {rec.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Biometric today */}
          <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-purple-600" />
              <h2 className="font-bold text-base">Biometric Attendance Today</h2>
            </div>
            {loadBio ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : biometric.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No biometric records for today</p>
            ) : (
              <ul className="divide-y max-h-64 overflow-y-auto">
                {biometric.map((rec) => {
                  const present = !!rec.firstIn;
                  return (
                    <li key={rec.personnelId} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{rec.personnel.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {rec.firstIn ? `In: ${format(new Date(rec.firstIn), "HH:mm")}` : "—"}
                          {rec.lastOut ? `  Out: ${format(new Date(rec.lastOut), "HH:mm")}` : ""}
                        </p>
                      </div>
                      {present ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

      </main>
    </div>
  );
}
