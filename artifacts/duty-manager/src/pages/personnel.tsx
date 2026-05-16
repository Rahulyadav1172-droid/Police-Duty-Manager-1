import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { 
  useListPersonnel, 
  getListPersonnelQueryKey,
  useCreatePersonnel,
  useUpdatePersonnel,
  useDeletePersonnel,
  PersonnelRank,
  Personnel
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RankBadge } from "@/components/rank-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const personnelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  beltNumber: z.string().min(1, "Belt number is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  rank: z.enum([PersonnelRank.Constable, PersonnelRank.Head_Constable, PersonnelRank["Sub-Inspector"], PersonnelRank.Inspector]),
});

export default function PersonnelManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: personnel, isLoading } = useListPersonnel();

  const createMutation = useCreatePersonnel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPersonnelQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Personnel added successfully" });
      },
      onError: () => toast({ title: "Failed to add personnel", variant: "destructive" })
    }
  });

  const updateMutation = useUpdatePersonnel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPersonnelQueryKey() });
        setIsDialogOpen(false);
        setEditingId(null);
        toast({ title: "Personnel updated successfully" });
      },
      onError: () => toast({ title: "Failed to update personnel", variant: "destructive" })
    }
  });

  const deleteMutation = useDeletePersonnel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPersonnelQueryKey() });
        setDeleteId(null);
        toast({ title: "Personnel deleted successfully" });
      },
      onError: () => toast({ title: "Failed to delete personnel", variant: "destructive" })
    }
  });

  const form = useForm<z.infer<typeof personnelSchema>>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      name: "",
      beltNumber: "",
      mobileNumber: "",
      rank: PersonnelRank.Constable,
    },
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    form.reset({
      name: "",
      beltNumber: "",
      mobileNumber: "",
      rank: PersonnelRank.Constable,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (person: Personnel) => {
    setEditingId(person.id);
    form.reset({
      name: person.name,
      beltNumber: person.beltNumber,
      mobileNumber: person.mobileNumber,
      rank: person.rank as any,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof personnelSchema>) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  const filteredPersonnel = personnel?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.beltNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mobileNumber.includes(searchTerm)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personnel Management</h1>
          <p className="text-sm text-muted-foreground">Manage all police officers and staff.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search personnel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleOpenAdd} data-testid="btn-add-personnel">
            <Plus className="w-4 h-4 mr-2" />
            Add Personnel
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Belt No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredPersonnel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  No personnel found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPersonnel.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-mono text-sm font-medium">{person.beltNumber}</TableCell>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>
                    <RankBadge rank={person.rank} />
                  </TableCell>
                  <TableCell>{person.mobileNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(person.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(person)} data-testid={`btn-edit-${person.id}`}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(person.id)} data-testid={`btn-delete-${person.id}`}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Personnel" : "Add New Personnel"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="beltNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Belt Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rank</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a rank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(PersonnelRank).map((rank) => (
                          <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Save Changes" : "Add Personnel"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the personnel record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
