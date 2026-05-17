import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Trash2, Edit, MapPin, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  useListDutyPoints,
  getListDutyPointsQueryKey,
  useCreateDutyPoint,
  useUpdateDutyPoint,
  useDeleteDutyPoint,
  DutyPoint,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExcelUploadDialog, type ColumnDef } from "@/components/excel-upload-dialog";

const dutyPointSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
});

type DutyPointRow = { name: string; location: string; description: string };

const excelColumns: ColumnDef<DutyPointRow>[] = [
  { key: "name",        header: "Point Name", required: true },
  { key: "location",    header: "Location",   required: true },
  { key: "description", header: "Description (Optional)" },
];

const SAMPLE_ROWS = [
  ["Ram Janmabhoomi Gate", "Ayodhya Dham", "Main entry gate checkpoint"],
  ["Hanuman Garhi Chowk",  "Hanuman Garhi Road", ""],
];

export default function DutyPointsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const { data: dutyPoints, isLoading } = useListDutyPoints();

  const createMutation = useCreateDutyPoint({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDutyPointsQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Duty Point added successfully" });
      },
      onError: () => toast({ title: "Failed to add duty point", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateDutyPoint({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDutyPointsQueryKey() });
        setIsDialogOpen(false);
        setEditingId(null);
        toast({ title: "Duty Point updated successfully" });
      },
      onError: () => toast({ title: "Failed to update duty point", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteDutyPoint({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDutyPointsQueryKey() });
        setDeleteId(null);
        toast({ title: "Duty Point deleted successfully" });
      },
      onError: () => toast({ title: "Failed to delete duty point", variant: "destructive" }),
    },
  });

  const form = useForm<z.infer<typeof dutyPointSchema>>({
    resolver: zodResolver(dutyPointSchema),
    defaultValues: { name: "", location: "", description: "" },
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    form.reset({ name: "", location: "", description: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (point: DutyPoint) => {
    setEditingId(point.id);
    form.reset({ name: point.name, location: point.location, description: point.description || "" });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof dutyPointSchema>) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  const filteredPoints = dutyPoints?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location.toLowerCase().includes(searchTerm.toLowerCase()),
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Duty Points</h1>
          <p className="text-sm text-muted-foreground">Manage locations where personnel can be assigned.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setShowUpload(true)} className="gap-2 shrink-0">
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button onClick={handleOpenAdd} data-testid="btn-add-duty-point" className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Point
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Point Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredPoints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  No duty points found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPoints.map((point) => (
                <TableRow key={point.id}>
                  <TableCell className="font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {point.name}
                    </div>
                  </TableCell>
                  <TableCell>{point.location}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">{point.description || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(point.createdAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(point)} data-testid={`btn-edit-${point.id}`}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(point.id)} data-testid={`btn-delete-${point.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Duty Point" : "Add New Duty Point"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Point Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Checkpost Alpha" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl><Input placeholder="e.g. Ram Path Crossing" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Any specific instructions for this post..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Save Changes" : "Add Duty Point"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the duty point.</AlertDialogDescription>
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

      {/* Bulk Upload */}
      <ExcelUploadDialog<DutyPointRow>
        open={showUpload}
        onOpenChange={setShowUpload}
        title="Bulk Upload Duty Points"
        columns={excelColumns}
        templateFilename="AyodhyaPolice_DutyPoints_Template.xlsx"
        templateSheetName="Duty Points"
        sampleRows={SAMPLE_ROWS}
        onImportRow={(row) =>
          new Promise<void>((resolve, reject) => {
            createMutation.mutate(
              { data: { name: row.name, location: row.location, description: row.description || undefined } },
              { onSuccess: () => resolve(), onError: (e: any) => reject(e) },
            );
          })
        }
        onComplete={() => queryClient.invalidateQueries({ queryKey: getListDutyPointsQueryKey() })}
      />
    </div>
  );
}
