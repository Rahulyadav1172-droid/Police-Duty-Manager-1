import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  FileDown,
  Users,
  ShieldCheck,
  Clock,
  AlignLeft,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";

import { useListPersonnel, useGetLiveBoard } from "@workspace/api-client-react";
import { generateMusterRoll } from "@/lib/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/rank-badge";
import { useToast } from "@/hooks/use-toast";

const RANKS = ["Constable", "Head Constable", "Sub-Inspector", "Inspector"];

const RANK_ORDER: Record<string, number> = {
  Inspector: 1,
  "Sub-Inspector": 2,
  "Head Constable": 3,
  Constable: 4,
};

export default function MusterRoll() {
  const { toast } = useToast();
  const { data: personnel, isLoading: personnelLoading } = useListPersonnel();
  const { data: liveBoard, isLoading: liveBoardLoading } = useGetLiveBoard();

  const [paradeDate, setParadeDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [paradeName, setParadeName] = useState("Morning Parade");
  const [commandingOfficerName, setCommandingOfficerName] = useState("");
  const [commandingOfficerRank, setCommandingOfficerRank] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rankFilter, setRankFilter] = useState("all");

  const isLoading = personnelLoading || liveBoardLoading;

  // Map personnel id → active roster entry (from live board)
  const dutyMap = useMemo(() => {
    const map = new Map<number, NonNullable<typeof liveBoard>["onDuty"][number]>();
    liveBoard?.onDuty?.forEach((entry) => {
      map.set(entry.personnelId, entry);
    });
    return map;
  }, [liveBoard]);

  // Sorted & filtered for preview table
  const sortedPersonnel = useMemo(() => {
    const all = personnel ?? [];
    const filtered = rankFilter === "all" ? all : all.filter((p) => p.rank === rankFilter);
    return [...filtered].sort((a, b) => {
      const ro = (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9);
      return ro !== 0 ? ro : a.name.localeCompare(b.name);
    });
  }, [personnel, rankFilter]);

  const totalPersonnel = personnel?.length ?? 0;
  const onDutyCount    = liveBoard?.onDuty?.length ?? 0;
  const availCount     = totalPersonnel - onDutyCount;

  function handleGenerate() {
    if (!personnel || !liveBoard) return;

    // Build enriched active roster with personnelId attached
    const activeRoster = (liveBoard.onDuty ?? []).map((entry) => ({
      ...entry,
      personnelId: entry.personnelId,
      startDateTime: entry.startDateTime,
      endDateTime: entry.endDateTime ?? null,
      dutyPoint: entry.dutyPoint
        ? { name: entry.dutyPoint.name, location: entry.dutyPoint.location }
        : undefined,
    }));

    generateMusterRoll({
      personnel: personnel.map((p) => ({
        id: p.id,
        name: p.name,
        beltNumber: p.beltNumber,
        rank: p.rank,
        mobileNumber: p.mobileNumber,
        createdAt: p.createdAt,
      })),
      activeRoster,
      paradeDateTime: new Date(paradeDate),
      paradeName: paradeName.trim() || undefined,
      commandingOfficerName: commandingOfficerName.trim() || undefined,
      commandingOfficerRank: commandingOfficerRank || undefined,
      remarks: remarks.trim() || undefined,
    });
    toast({ title: "Muster roll downloaded successfully" });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Muster Roll</h1>
          <p className="text-sm text-muted-foreground">
            Configure parade details and generate a printable attendance register for signature.
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          disabled={isLoading || totalPersonnel === 0}
          onClick={handleGenerate}
          data-testid="button-generate-muster"
        >
          <FileDown className="w-4 h-4" />
          Download Muster Roll
        </Button>
      </div>
      {/* Live strength summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Strength", value: totalPersonnel, icon: Users,       bg: "bg-card",        val: "text-foreground" },
          { label: "On Duty",        value: onDutyCount,    icon: ShieldCheck, bg: "bg-red-50",      val: "text-red-700"   },
          { label: "Available",      value: availCount,     icon: CheckCircle2, bg: "bg-emerald-50",  val: "text-emerald-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-xl px-5 py-4 flex items-center gap-4`} data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>
            <s.icon className={`w-7 h-7 ${s.val} opacity-80 shrink-0`} />
            <div>
              <p className={`text-3xl font-extrabold ${s.val}`}>{isLoading ? "—" : s.value}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Rank-wise breakdown */}
      {!isLoading && (
        <div className="bg-card border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RANKS.map((rank) => {
            const total   = (personnel ?? []).filter((p) => p.rank === rank).length;
            const onDuty  = (liveBoard?.onDuty ?? []).filter((e) => e.personnel?.rank === rank).length;
            const avail   = total - onDuty;
            return (
              <div key={rank} className="text-center">
                <RankBadge rank={rank} />
                <div className="mt-2 flex justify-center gap-3 text-xs">
                  <span className="text-red-600 font-bold">{onDuty} on duty</span>
                  <span className="text-emerald-600 font-bold">{avail} free</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">of {total} total</p>
              </div>
            );
          })}
        </div>
      )}
      {/* Parade configuration */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
          <AlignLeft className="w-4 h-4" /> रात्रि गणना
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" /> रात्रि गणना
            </Label>
            <Input
              type="datetime-local"
              value={paradeDate}
              onChange={(e) => setParadeDate(e.target.value)}
              data-testid="input-parade-datetime"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3 h-3" /> रात्रि गणना / Register Name
            </Label>
            <Input
              value={paradeName}
              onChange={(e) => setParadeName(e.target.value)}
              placeholder="e.g. Morning Parade, Evening Muster"
              data-testid="input-parade-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commanding Officer</Label>
            <div className="flex gap-2">
              <Input
                value={commandingOfficerName}
                onChange={(e) => setCommandingOfficerName(e.target.value)}
                placeholder="Name"
                data-testid="input-co-name"
              />
              <Select value={commandingOfficerRank} onValueChange={setCommandingOfficerRank}>
                <SelectTrigger className="w-36" data-testid="select-co-rank">
                  <SelectValue placeholder="Rank" />
                </SelectTrigger>
                <SelectContent>
                  {RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">General Remarks (printed on register)</Label>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Extra vigilance due to Ramnavami; 2 personnel on medical leave..."
            rows={2}
            className="resize-none text-sm"
            data-testid="input-remarks"
          />
        </div>
      </div>
      {/* Preview table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="bg-muted/60 border-b px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-foreground">Attendance Preview</h2>
            <p className="text-xs text-muted-foreground">This is how the register will look. All personnel are listed by rank seniority.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs text-muted-foreground">Filter:</Label>
            <div className="relative">
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="text-xs border border-input rounded-md px-2.5 py-1.5 bg-background pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="select-rank-filter"
              >
                <option value="all">All Ranks</option>
                {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
          </div>
        ) : sortedPersonnel.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No personnel found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground text-xs uppercase">
                  <th className="px-3 py-2.5 text-center w-10">S.No</th>
                  <th className="px-3 py-2.5 text-left">Name</th>
                  <th className="px-3 py-2.5 text-center">PNO No.</th>
                  <th className="px-3 py-2.5 text-left">Rank</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-left">Duty Point</th>
                  <th className="px-3 py-2.5 text-center">Type</th>
                  <th className="px-3 py-2.5 text-center">Since</th>
                  <th className="px-3 py-2.5 text-center min-w-[80px]">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedPersonnel.map((person, idx) => {
                  const duty = dutyMap.get(person.id);
                  return (
                    <tr
                      key={person.id}
                      className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                      data-testid={`muster-row-${person.id}`}
                    >
                      <td className="px-3 py-2.5 text-center text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold">{person.name}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-muted-foreground">#{person.beltNumber}</td>
                      <td className="px-3 py-2.5">
                        <RankBadge rank={person.rank} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {duty ? (
                          <Badge className="bg-red-100 text-red-700 border border-red-200 text-[10px] uppercase gap-1">
                            <ShieldCheck className="w-3 h-3" /> On Duty
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] uppercase gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Available
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        {duty ? (
                          <div>
                            <p className="font-medium">{duty.dutyPoint?.name}</p>
                            <p className="text-xs text-muted-foreground">{duty.dutyPoint?.location}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {duty ? (
                          duty.dutyType === "unlimited"
                            ? <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] uppercase">Unlimited</Badge>
                            : <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] uppercase">Fixed</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                        {duty ? format(new Date(duty.startDateTime), "HH:mm") : "—"}
                      </td>
                      {/* Blank signature column */}
                      <td className="px-3 py-2.5 border-l border-dashed border-muted">
                        <div className="h-6 border-b border-muted-foreground/30 mx-2" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer — count */}
        {!isLoading && sortedPersonnel.length > 0 && (
          <div className="bg-muted/40 border-t px-5 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{sortedPersonnel.length} personnel shown</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> {onDutyCount} on duty</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {availCount} available</span>
            </div>
          </div>
        )}
      </div>
      {/* Bottom generate button */}
      <div className="flex justify-end pb-4">
        <Button
          size="lg"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isLoading || totalPersonnel === 0}
          onClick={handleGenerate}
          data-testid="button-generate-muster-bottom"
        >
          <FileDown className="w-4 h-4" />
          Download Muster Roll PDF
        </Button>
      </div>
    </div>
  );
}
