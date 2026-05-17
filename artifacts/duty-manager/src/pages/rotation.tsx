import { formatDistanceToNow, parseISO } from "date-fns";
import { RotateCcw, ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { useGetRosterRotation } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/rank-badge";

function fairnessBadge(days: number | null | undefined) {
  if (days == null) return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Never Assigned</Badge>;
  if (days >= 14) return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue ({days}d)</Badge>;
  if (days >= 7) return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Due Soon ({days}d)</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Recent ({days}d ago)</Badge>;
}

export default function RotationFairness() {
  const { data: rotation = [], isLoading } = useGetRosterRotation({
    query: { queryKey: ["getGetRosterRotation"], refetchInterval: 60000 },
  });

  const neverAssigned = rotation.filter((r) => r.lastDutyDate == null);
  const overdue = rotation.filter((r) => r.daysSinceLastDuty != null && r.daysSinceLastDuty >= 14);
  const dueSoon = rotation.filter(
    (r) => r.daysSinceLastDuty != null && r.daysSinceLastDuty >= 7 && r.daysSinceLastDuty < 14,
  );
  const recent = rotation.filter((r) => r.daysSinceLastDuty != null && r.daysSinceLastDuty < 7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="w-6 h-6" /> Duty Rotation Fairness
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personnel sorted by how long since they were last assigned duty — those waiting longest appear first.
        </p>
      </div>

      {/* Summary cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{neverAssigned.length}</p>
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mt-1">Never Assigned</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{overdue.length}</p>
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mt-1">Overdue (14d+)</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{dueSoon.length}</p>
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mt-1">Due Soon (7–14d)</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{recent.length}</p>
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mt-1">Recent (&lt;7d)</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="bg-muted/60 border-b px-5 py-3">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Full Rotation List
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sorted by last duty date — personnel who waited longest are at the top.
          </p>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
          </div>
        ) : rotation.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No personnel found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground text-xs uppercase">
                  <th className="px-3 py-2.5 text-center w-10">#</th>
                  <th className="px-3 py-2.5 text-left">Name</th>
                  <th className="px-3 py-2.5 text-center">PNO</th>
                  <th className="px-3 py-2.5 text-left">Rank</th>
                  <th className="px-3 py-2.5 text-center">Total Duties</th>
                  <th className="px-3 py-2.5 text-left">Last Duty</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rotation.map((entry, idx) => (
                  <tr key={entry.personnel.id} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-3 py-2.5 text-center text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-semibold">{entry.personnel.name}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-muted-foreground">
                      #{entry.personnel.beltNumber}
                    </td>
                    <td className="px-3 py-2.5">
                      <RankBadge rank={entry.personnel.rank} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold">{entry.totalDuties}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {entry.lastDutyDate
                        ? formatDistanceToNow(parseISO(entry.lastDutyDate), { addSuffix: true })
                        : <span className="italic">Never</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {fairnessBadge(entry.daysSinceLastDuty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
