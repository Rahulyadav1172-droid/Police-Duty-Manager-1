import { useState, useMemo } from "react";
import { format } from "date-fns";
import { FileDown, UserCheck, UserX, Users, MapPin, Clock, Info, CheckSquare, Square } from "lucide-react";

import { useListRoster, useListPersonnel } from "@workspace/api-client-react";
import { generateHandoverReport, type HandoverOfficer } from "@/lib/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/rank-badge";
import { useToast } from "@/hooks/use-toast";

const RANKS = ["Constable", "Head Constable", "Sub-Inspector", "Inspector"];

function OfficerPanel({
  label,
  color,
  icon: Icon,
  officer,
  onChange,
  personnelOptions,
}: {
  label: string;
  color: "red" | "green";
  icon: React.ElementType;
  officer: HandoverOfficer & { _personnelId?: string };
  onChange: (val: HandoverOfficer & { _personnelId?: string }) => void;
  personnelOptions: Array<{ id: number; name: string; rank: string; beltNumber: string }>;
}) {
  const borderColor = color === "red" ? "border-red-300" : "border-emerald-300";
  const headerBg    = color === "red" ? "bg-red-700"    : "bg-emerald-700";
  const panelBg     = color === "red" ? "bg-red-50"     : "bg-emerald-50";

  function handlePersonnelSelect(value: string) {
    if (value === "__manual__") {
      onChange({ ...officer, _personnelId: "__manual__", name: "", rank: "", beltNumber: "" });
      return;
    }
    const person = personnelOptions.find((p) => String(p.id) === value);
    if (person) {
      onChange({ ...officer, _personnelId: value, name: person.name, rank: person.rank, beltNumber: person.beltNumber });
    }
  }

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${panelBg} overflow-hidden flex flex-col`}>
      <div className={`${headerBg} text-white px-5 py-3 flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="p-5 space-y-4 flex-1">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select from Personnel List</Label>
          <Select value={officer._personnelId ?? ""} onValueChange={handlePersonnelSelect}>
            <SelectTrigger data-testid={`select-officer-${color}`} className="bg-white">
              <SelectValue placeholder="— choose or fill manually —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__manual__">Enter manually</SelectItem>
              {personnelOptions.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} — {p.rank} ({p.beltNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name *</Label>
            <Input
              value={officer.name}
              onChange={(e) => onChange({ ...officer, name: e.target.value, _personnelId: "__manual__" })}
              placeholder="Officer full name"
              className="bg-white"
              data-testid={`input-officer-name-${color}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rank *</Label>
            <Select
              value={officer.rank}
              onValueChange={(v) => onChange({ ...officer, rank: v, _personnelId: "__manual__" })}
            >
              <SelectTrigger data-testid={`select-rank-${color}`} className="bg-white">
                <SelectValue placeholder="Select rank" />
              </SelectTrigger>
              <SelectContent>
                {RANKS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Belt No.</Label>
            <Input
              value={officer.beltNumber ?? ""}
              onChange={(e) => onChange({ ...officer, beltNumber: e.target.value, _personnelId: "__manual__" })}
              placeholder="e.g. UP1001"
              className="bg-white font-mono"
              data-testid={`input-belt-${color}`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Remarks / Notes</Label>
          <Textarea
            value={officer.remarks ?? ""}
            onChange={(e) => onChange({ ...officer, remarks: e.target.value })}
            placeholder="Any notes about this officer's handover..."
            className="bg-white resize-none text-sm"
            rows={2}
            data-testid={`input-remarks-${color}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function HandoverReport() {
  const { toast } = useToast();
  const { data: roster, isLoading: rosterLoading } = useListRoster();
  const { data: personnel, isLoading: personnelLoading } = useListPersonnel();

  const activeEntries = useMemo(
    () => (roster ?? []).filter((e) => e.status === "active"),
    [roster],
  );

  const [outgoing, setOutgoing] = useState<HandoverOfficer & { _personnelId?: string }>({
    name: "", rank: "", beltNumber: "", remarks: "",
  });
  const [incoming, setIncoming] = useState<HandoverOfficer & { _personnelId?: string }>({
    name: "", rank: "", beltNumber: "", remarks: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [handoverDate, setHandoverDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [witnessName, setWitnessName] = useState("");
  const [witnessRank, setWitnessRank] = useState("");
  const [location, setLocation] = useState("Ayodhya Police Line");

  // Toggle single entry
  function toggleEntry(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Select / deselect all
  function toggleAll() {
    if (selectedIds.size === activeEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeEntries.map((e) => e.id)));
    }
  }

  function handleGenerate() {
    if (!outgoing.name.trim() || !outgoing.rank) {
      toast({ title: "Outgoing officer details are required", variant: "destructive" });
      return;
    }
    if (!incoming.name.trim() || !incoming.rank) {
      toast({ title: "Incoming officer details are required", variant: "destructive" });
      return;
    }
    const selectedEntries = activeEntries.filter((e) => selectedIds.has(e.id));
    generateHandoverReport({
      outgoing,
      incoming,
      entries: selectedEntries,
      handoverDateTime: new Date(handoverDate),
      witnessName: witnessName.trim() || undefined,
      witnessRank: witnessRank.trim() || undefined,
      location: location.trim() || undefined,
    });
    toast({ title: "Handover report downloaded successfully" });
  }

  const canGenerate = outgoing.name.trim() && outgoing.rank && incoming.name.trim() && incoming.rank;

  const isLoading = rosterLoading || personnelLoading;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Duty Handover Report</h1>
          <p className="text-sm text-muted-foreground">
            Specify outgoing and incoming officers, select which duties to hand over, then generate a signed certificate.
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          disabled={!canGenerate || isLoading}
          onClick={handleGenerate}
          data-testid="button-generate-handover"
        >
          <FileDown className="w-4 h-4" />
          Generate Certificate
        </Button>
      </div>

      {/* Handover metadata */}
      <div className="bg-card border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" /> Handover Date &amp; Time
          </Label>
          <Input
            type="datetime-local"
            value={handoverDate}
            onChange={(e) => setHandoverDate(e.target.value)}
            className="bg-background"
            data-testid="input-handover-datetime"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Location
          </Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Ayodhya Police Line"
            data-testid="input-handover-location"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Users className="w-3 h-3" /> Witness / OC (optional)
          </Label>
          <div className="flex gap-2">
            <Input
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              placeholder="Name"
              data-testid="input-witness-name"
            />
            <Select value={witnessRank} onValueChange={setWitnessRank}>
              <SelectTrigger className="w-36" data-testid="select-witness-rank">
                <SelectValue placeholder="Rank" />
              </SelectTrigger>
              <SelectContent>
                {RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Officer panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OfficerPanel
          label="Outgoing Officer (Handing Over)"
          color="red"
          icon={UserX}
          officer={outgoing}
          onChange={setOutgoing}
          personnelOptions={(personnel ?? []).map((p) => ({
            id: p.id, name: p.name, rank: p.rank, beltNumber: p.beltNumber,
          }))}
        />
        <OfficerPanel
          label="Incoming Officer (Taking Over)"
          color="green"
          icon={UserCheck}
          officer={incoming}
          onChange={setIncoming}
          personnelOptions={(personnel ?? []).map((p) => ({
            id: p.id, name: p.name, rank: p.rank, beltNumber: p.beltNumber,
          }))}
        />
      </div>

      {/* Duty assignments checklist */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="bg-muted/60 border-b px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-foreground">Select Duties to Hand Over</h2>
            <p className="text-xs text-muted-foreground">Only active assignments are shown. Check which ones are included in this handover.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} / {activeEntries.length} selected
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-semibold text-primary hover:underline"
              data-testid="button-toggle-all"
            >
              {selectedIds.size === activeEntries.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : activeEntries.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active duty assignments found.</p>
          </div>
        ) : (
          <div className="divide-y">
            {activeEntries.map((entry) => {
              const checked = selectedIds.has(entry.id);
              return (
                <label
                  key={entry.id}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors select-none ${
                    checked ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                  data-testid={`entry-row-${entry.id}`}
                >
                  {/* Checkbox */}
                  <div className="mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleEntry(entry.id)}
                    />
                    {checked
                      ? <CheckSquare className="w-5 h-5 text-primary" />
                      : <Square className="w-5 h-5 text-muted-foreground" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1">
                    {/* Personnel */}
                    <div>
                      <p className="font-bold text-sm text-foreground truncate">{entry.personnel?.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-muted-foreground">#{entry.personnel?.beltNumber}</span>
                        <RankBadge rank={entry.personnel?.rank ?? ""} />
                      </div>
                    </div>

                    {/* Duty point */}
                    <div>
                      <p className="text-sm font-semibold text-foreground truncate">{entry.dutyPoint?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.dutyPoint?.location}</p>
                    </div>

                    {/* Type & time */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        {entry.dutyType === "unlimited"
                          ? <Badge className="bg-red-100 text-red-700 border border-red-200 text-[10px] uppercase">Unlimited</Badge>
                          : <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px] uppercase">Fixed</Badge>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Since {format(new Date(entry.startDateTime), "dd MMM, HH:mm")}
                        {entry.endDateTime
                          ? ` → ${format(new Date(entry.endDateTime), "dd MMM, HH:mm")}`
                          : " → Until released"
                        }
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom generate button */}
      {!canGenerate && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Info className="w-4 h-4 shrink-0" />
          Fill in the name and rank for both outgoing and incoming officers to enable the certificate.
        </div>
      )}

      <div className="flex justify-end pb-4">
        <Button
          size="lg"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!canGenerate || isLoading}
          onClick={handleGenerate}
          data-testid="button-generate-handover-bottom"
        >
          <FileDown className="w-4 h-4" />
          Generate &amp; Download Certificate
        </Button>
      </div>
    </div>
  );
}
