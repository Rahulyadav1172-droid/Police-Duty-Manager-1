import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetPersonnel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, UserCheck, Building2, ArrowRightLeft, AlertCircle } from "lucide-react";
import { generateTransferReceipt, type TransferReceiptData } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";

const RANKS = [
  { value: "constable",       label: "Constable" },
  { value: "head_constable",  label: "Head Constable" },
  { value: "sub_inspector",   label: "Sub-Inspector (SI)" },
  { value: "inspector",       label: "Inspector" },
];

const ISSUING_RANKS = [
  "Inspector",
  "Sub-Inspector",
  "Head Constable",
  "Additional SP",
  "Deputy SP",
  "SP",
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-base">{title}</h3>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {children}
      </div>
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);

export default function TransferReceipt() {
  const { toast } = useToast();
  const { data: personnelList } = useGetPersonnel();

  // Mode: "manual" or "lookup"
  const [mode, setMode] = useState<"manual" | "lookup">("manual");
  const [selectedId, setSelectedId] = useState<string>("");

  // Form state
  const [form, setForm] = useState<TransferReceiptData>({
    name: "",
    beltNumber: "",
    rank: "",
    mobileNumber: "",
    transferFrom: "Police Line, Ayodhya",
    transferTo: "",
    orderNumber: "",
    orderDate: today,
    reportingDate: today,
    designationAtNewPost: "",
    remarks: "",
    issuingOfficerName: "",
    issuingOfficerRank: "",
  });

  function set<K extends keyof TransferReceiptData>(key: K, value: TransferReceiptData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPersonnel(id: string) {
    const person = personnelList?.find((p) => String(p.id) === id);
    if (!person) return;
    setForm((prev) => ({
      ...prev,
      name: person.name,
      beltNumber: person.beltNumber,
      rank: person.rank,
      mobileNumber: person.mobileNumber,
    }));
    setSelectedId(id);
  }

  function handleGenerate() {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Please enter the personnel's full name.", variant: "destructive" });
      return;
    }
    if (!form.beltNumber.trim()) {
      toast({ title: "Belt number required", description: "Please enter the belt / PNO number.", variant: "destructive" });
      return;
    }
    if (!form.rank) {
      toast({ title: "Rank required", description: "Please select the rank.", variant: "destructive" });
      return;
    }
    if (!form.transferTo.trim()) {
      toast({ title: "Destination required", description: "Please enter the transfer destination.", variant: "destructive" });
      return;
    }
    generateTransferReceipt(form);
    toast({ title: "Receipt generated", description: "Your PDF has been downloaded." });
  }

  const isValid = form.name.trim() && form.beltNumber.trim() && form.rank && form.transferTo.trim();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transfer Receipt</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate an official transfer receipt / Sthanantaran Praman Patra.
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={!isValid}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Download Receipt
        </Button>
      </div>

      {/* Lookup toggle */}
      <div className="bg-card border rounded-xl p-5">
        <p className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
          Fill personnel details
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("manual")}
          >
            Type Manually
          </Button>
          <Button
            variant={mode === "lookup" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("lookup")}
          >
            Pick from Roster
          </Button>
        </div>

        {mode === "lookup" && (
          <div className="mt-4">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Select Personnel
            </Label>
            <Select value={selectedId} onValueChange={(v) => applyPersonnel(v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Search and select personnel…" />
              </SelectTrigger>
              <SelectContent>
                {personnelList?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.rank.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} — {p.name} ({p.beltNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedId && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Details auto-filled from roster. You can still edit below.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section 1: Personnel details */}
      <SectionCard icon={UserCheck} title="1. Personnel Details">
        <Field label="Full Name" required>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Ram Kumar Singh"
          />
        </Field>
        <Field label="Belt / PNO Number" required>
          <Input
            value={form.beltNumber}
            onChange={(e) => set("beltNumber", e.target.value)}
            placeholder="e.g. UP12345"
          />
        </Field>
        <Field label="Rank" required>
          <Select value={form.rank} onValueChange={(v) => set("rank", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select rank…" />
            </SelectTrigger>
            <SelectContent>
              {RANKS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Mobile Number">
          <Input
            value={form.mobileNumber ?? ""}
            onChange={(e) => set("mobileNumber", e.target.value)}
            placeholder="10-digit mobile"
            maxLength={10}
          />
        </Field>
      </SectionCard>

      {/* Section 2: Transfer details */}
      <SectionCard icon={ArrowRightLeft} title="2. Transfer Details">
        <Field label="Transfer From" required>
          <Input
            value={form.transferFrom}
            onChange={(e) => set("transferFrom", e.target.value)}
            placeholder="e.g. Police Line, Ayodhya"
          />
        </Field>
        <Field label="Transfer To (District / Station / Office)" required>
          <Input
            value={form.transferTo}
            onChange={(e) => set("transferTo", e.target.value)}
            placeholder="e.g. Kotwali PS, Lucknow"
          />
        </Field>
        <Field label="Transfer Order Number">
          <Input
            value={form.orderNumber}
            onChange={(e) => set("orderNumber", e.target.value)}
            placeholder="e.g. ADG/2026/TR/4521"
          />
        </Field>
        <Field label="Date of Transfer Order">
          <Input
            type="date"
            value={form.orderDate}
            onChange={(e) => set("orderDate", e.target.value)}
          />
        </Field>
        <Field label="Date of Reporting at New Post">
          <Input
            type="date"
            value={form.reportingDate}
            onChange={(e) => set("reportingDate", e.target.value)}
          />
        </Field>
        <Field label="Designation at New Post">
          <Input
            value={form.designationAtNewPost ?? ""}
            onChange={(e) => set("designationAtNewPost", e.target.value)}
            placeholder="e.g. Beat Officer, Guard Duty"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Remarks / Additional Notes">
            <Textarea
              rows={3}
              value={form.remarks ?? ""}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="e.g. Personnel is being relieved with all dues cleared. No pending cases."
            />
          </Field>
        </div>
      </SectionCard>

      {/* Section 3: Issuing authority */}
      <SectionCard icon={Building2} title="3. Issuing Authority (for signature block)">
        <Field label="Issuing Officer Name">
          <Input
            value={form.issuingOfficerName ?? ""}
            onChange={(e) => set("issuingOfficerName", e.target.value)}
            placeholder="e.g. Rajendra Prasad"
          />
        </Field>
        <Field label="Issuing Officer Rank">
          <Select
            value={form.issuingOfficerRank ?? ""}
            onValueChange={(v) => set("issuingOfficerRank", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rank…" />
            </SelectTrigger>
            <SelectContent>
              {ISSUING_RANKS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </SectionCard>

      {/* Generate button (bottom) */}
      <div className="flex justify-end">
        <Button size="lg" onClick={handleGenerate} disabled={!isValid} className="gap-2 w-full md:w-auto">
          <FileText className="w-4 h-4" />
          Download Transfer Receipt PDF
        </Button>
      </div>
    </div>
  );
}
