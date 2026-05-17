import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isPast, isToday } from "date-fns";
import {
  CalendarDays, Plus, Pencil, Trash2, Users, MapPin, FileText, AlertTriangle,
} from "lucide-react";
import {
  useListEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  getListEventsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EventItem = {
  id: number;
  name: string;
  date: string;
  location?: string | null;
  description?: string | null;
  requiredHeadcount: number;
  createdAt: string;
};

type FormState = {
  name: string;
  date: string;
  location: string;
  description: string;
  requiredHeadcount: string;
};

const emptyForm = (): FormState => ({
  name: "",
  date: "",
  location: "",
  description: "",
  requiredHeadcount: "0",
});

function statusBadge(date: string) {
  const d = parseISO(date);
  if (isToday(d)) return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Today</Badge>;
  if (isPast(d)) return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Past</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Upcoming</Badge>;
}

export default function EventsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: events = [], isLoading } = useListEvents();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });

  const createMutation = useCreateEvent({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Event created" }); },
      onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateEvent({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); setEditing(null); toast({ title: "Event updated" }); },
      onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteEvent({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Event deleted" }); },
      onError: () => toast({ title: "Failed to delete event", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(ev: EventItem) {
    setEditing(ev);
    setForm({
      name: ev.name,
      date: ev.date,
      location: ev.location ?? "",
      description: ev.description ?? "",
      requiredHeadcount: String(ev.requiredHeadcount),
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      date: form.date,
      location: form.location || undefined,
      description: form.description || undefined,
      requiredHeadcount: parseInt(form.requiredHeadcount) || 0,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const upcoming = events.filter((e) => !isPast(parseISO(e.date)) || isToday(parseISO(e.date)));
  const past = events.filter((e) => isPast(parseISO(e.date)) && !isToday(parseISO(e.date)));

  function EventCard({ ev }: { ev: EventItem }) {
    return (
      <div className="bg-card border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base truncate">{ev.name}</h3>
              {statusBadge(ev.date)}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              {format(parseISO(ev.date), "dd MMMM yyyy")}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ev)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(ev.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {ev.location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ev.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{ev.requiredHeadcount} personnel required</span>
          </div>
        </div>

        {ev.description && (
          <p className="text-xs text-muted-foreground border-t pt-2 line-clamp-2 flex items-start gap-1">
            <FileText className="w-3 h-3 mt-0.5 shrink-0" />
            {ev.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Special Events & Festivals</h1>
          <p className="text-sm text-muted-foreground">
            Plan additional deployments for festivals, VIP visits, and special occasions.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-xl">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No events planned yet.</p>
          {isAdmin && (
            <Button variant="outline" className="mt-4 gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add First Event
            </Button>
          )}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Upcoming / Today ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcoming.map((ev) => <EventCard key={ev.id} ev={ev as EventItem} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Past Events ({past.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
                {past.map((ev) => <EventCard key={ev.id} ev={ev as EventItem} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Add Special Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="font-semibold">Event Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ramnavami Mela, Republic Day"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Ram Ki Paidi, Town Hall"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">Personnel Required</Label>
              <Input
                type="number"
                min="0"
                value={form.requiredHeadcount}
                onChange={(e) => setForm((f) => ({ ...f, requiredHeadcount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">Description / Instructions</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Special instructions, threat level, logistics notes..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update Event" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Delete Event?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
