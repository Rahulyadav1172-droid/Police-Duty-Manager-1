import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isWithinInterval } from "date-fns";
import {
  Plus, Search, Trash2, Edit, CalendarOff,
  Stethoscope, Briefcase, Coffee, UserX, Clock
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  useListLeave,
  useCreateLeave,
  useUpdateLeave,
  useDeleteLeave,
  useListPersonnel,
  getListLeaveQueryKey,
  getGetActiveLeavesTodayQueryKey,
  LeaveRecord,
  LeaveInputLeaveType,
  LeaveInputStatus,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SearchableCombobox } from "@/components/searchable-combobox";

// ── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES: { value: LeaveInputLeaveType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "sick_leave",    label: "Sick Leave",    icon: Stethoscope, color: "bg-red-100 text-red-800 border-red-200" },
  { value: "earned_leave",  label: "Earned Leave",  icon: Briefcase,   color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "casual_leave",  label: "Casual Leave",  icon: Coffee,      color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "absent",        label: "Absent (AWOL)", icon: UserX,       color: "bg-gray-200 text-gray-800 border-gray-300" },
];

const STATUS_OPTS: { value: LeaveInputStatus; label: string; color: string }[] = [
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "pending",  label: "Pending",  color: "bg-yellow-100 text-yellow-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
];

function leaveTypeInfo(type: string) {
  return LEAVE_TYPES.find((t) => t.value === type) ?? LEAVE_TYPES[3];
}

function LeaveBadge({ type }: { type: string }) {
  const info = leaveTypeInfo(type);
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${info.color}`}>
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_OPTS.find((o) => o.value === status) ?? STATUS_OPTS[0];
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>{s.label}</span>;
}

function isOnLeaveToday(record: LeaveRecord) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    return (
      record.status === "approved" &&
      isWithinInterval(today, {
        start: parseISO(record.startDate),
        end: parseISO(record.endDate),
      })
    );
  } catch { return false; }
}

// ── Form schema ──────────────────────────────────────────────────────────────

const leaveSchema = z.object({
  personnelId: z.coerce.number().min(1, "Personnel is required"),
  leaveType: z.enum(["sick_leave", "earned_leave", "casual_leave", "absent"] as const),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(["pending", "approved", "rejected"] as const),
  reason: z.string().optional(),
});

// ── Component ────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

export default function LeaveManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: records = [], isLoading } = useListLeave();
  const { data: personnel = [] } = useListPersonnel();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListLeaveQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetActiveLeavesTodayQueryKey() });
  };

  const createMutation = useCreateLeave({
    mutation: {
      onSuccess: () => { invalidate(); setIsDialogOpen(false); toast({ title: "Leave record added" }); },
      onError: () => toast({ title: "Failed to add leave record", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateLeave({
    mutation: {
      onSuccess: () => { invalidate(); setIsDialogOpen(false); setEditingId(null); toast({ title: "Leave record updated" }); },
      onError: () => toast({ title: "Failed to update leave record", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteLeave({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Leave record deleted" }); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      personnelId: undefined,
      leaveType: "sick_leave",
      startDate: today,
      endDate: today,
      status: "approved",
      reason: "",
    },
  });

  function handleOpenAdd() {
    setEditingId(null);
    form.reset({ personnelId: undefined, leaveType: "sick_leave", startDate: today, endDate: today, status: "approved", reason: "" });
    setIsDialogOpen(true);
  }

  function handleOpenEdit(rec: LeaveRecord) {
    setEditingId(rec.id);
    form.reset({
      personnelId: rec.personnelId,
      leaveType: rec.leaveType as any,
      startDate: rec.startDate,
      endDate: rec.endDate,
      status: rec.status as any,
      reason: rec.reason ?? "",
    });
    setIsDialogOpen(true);
  }

  function onSubmit(values: z.infer<typeof leaveSchema>) {
    if (values.startDate > values.endDate) {
      form.setError("endDate", { message: "End date must be on or after start date" });
      return;
    }
    const payload = { ...values, reason: values.reason || undefined };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  }

  // ── Filtered list ──
  const filtered = records.filter((r) => {
    const name = r.personnel?.name?.toLowerCase() ?? "";
    const belt = r.personnel?.beltNumber?.toLowerCase() ?? "";
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || name.includes(q) || belt.includes(q);
    const matchType   = filterType === "all"   || r.leaveType === filterType;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // ── Stats ──
  const onLeaveToday   = records.filter(isOnLeaveToday).length;
  const sickToday      = records.filter((r) => isOnLeaveToday(r) && r.leaveType === "sick_leave").length;
  const earnedToday    = records.filter((r) => isOnLeaveToday(r) && r.leaveType === "earned_leave").length;
  const casualToday    = records.filter((r) => isOnLeaveToday(r) && r.leaveType === "casual_leave").length;
  const absentToday    = records.filter((r) => isOnLeaveToday(r) && r.leaveType === "absent").length;
  const pendingCount   = records.filter((r) => r.status === "pending").length;

  // ── Personnel options for combobox ──
  const personnelOptions = personnel.map((p) => ({
    value: String(p.id),
    label: p.name,
    sublabel: `${p.beltNumber} · ${p.rank}`,
  }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave & Absence Register</h1>
          <p className="text-sm text-muted-foreground">Track sick leave, earned leave, casual leave, and absences.</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add Leave Record
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "On Leave Today", value: onLeaveToday, icon: CalendarOff, cls: "border-l-4 border-l-primary" },
          { label: "Sick Leave",     value: sickToday,    icon: Stethoscope, cls: "border-l-4 border-l-red-500" },
          { label: "Earned Leave",   value: earnedToday,  icon: Briefcase,   cls: "border-l-4 border-l-blue-500" },
          { label: "Casual Leave",   value: casualToday,  icon: Coffee,      cls: "border-l-4 border-l-amber-500" },
          { label: "Absent",         value: absentToday,  icon: UserX,       cls: "border-l-4 border-l-gray-500" },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className={`bg-card rounded-lg border p-4 ${cls}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <Clock className="w-4 h-4 shrink-0" />
          <span><strong>{pendingCount}</strong> leave request{pendingCount !== 1 ? "s" : ""} pending approval.</span>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setFilterStatus("pending")}>
            View
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or belt number…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {LEAVE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Personnel</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                  No leave records found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rec) => {
                const start = parseISO(rec.startDate);
                const end   = parseISO(rec.endDate);
                const days  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
                const onLeave = isOnLeaveToday(rec);
                return (
                  <TableRow key={rec.id} className={onLeave ? "bg-red-50/40" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{rec.personnel?.name ?? `ID ${rec.personnelId}`}</p>
                        <p className="text-xs text-muted-foreground font-mono">{rec.personnel?.beltNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell><LeaveBadge type={rec.leaveType} /></TableCell>
                    <TableCell className="text-sm">{format(start, "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{format(end, "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{days}d</TableCell>
                    <TableCell><StatusBadge status={rec.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate" title={rec.reason ?? ""}>
                      {rec.reason || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(rec)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(rec.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Leave Record" : "Add Leave Record"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField control={form.control} name="personnelId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Personnel</FormLabel>
                  <FormControl>
                    <SearchableCombobox
                      options={personnelOptions}
                      value={field.value ? String(field.value) : undefined}
                      onChange={(v) => field.onChange(parseInt(v))}
                      placeholder="Search by name or belt no."
                      searchPlaceholder="Type name or belt number…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="leaveType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {LEAVE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {STATUS_OPTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason / Remarks <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="e.g. Fever, family emergency, planned vacation…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Save Changes" : "Add Record"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this leave record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
