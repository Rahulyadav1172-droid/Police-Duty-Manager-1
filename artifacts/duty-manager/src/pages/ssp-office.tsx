import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search, Plus, Edit, Trash2, Upload, LogOut, KeyRound, Building2,
  User, Phone, Users, Calendar, Briefcase, Hash, MapPin, Home,
  Eye, EyeOff, RefreshCw, ImagePlus, FileImage, X,
} from "lucide-react";
import {
  useListEmployeeProfiles,
  useCreateEmployeeProfile,
  useUpdateEmployeeProfile,
  useDeleteEmployeeProfile,
  getListEmployeeProfilesQueryKey,
  type EmployeeProfile,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ExcelUploadDialog, type ColumnDef } from "@/components/excel-upload-dialog";
import { Separator } from "@/components/ui/separator";

const RANKS = [
  "Constable", "Head Constable", "Sub-Inspector", "Inspector",
  "Assistant Sub-Inspector (ASI)", "Deputy Superintendent (DySP)",
  "Additional Superintendent (ASP)", "Superintendent (SP)",
  "Senior Superintendent (SSP)", "Deputy Inspector General (DIG)",
];

const profileSchema = z.object({
  pno: z.string().min(1, "PNO is required"),
  name: z.string().min(1, "Name is required"),
  mobileNumber: z.string().min(10, "Valid mobile number required"),
  fatherName: z.string().min(1, "Father's name is required"),
  motherName: z.string().min(1, "Mother's name is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().min(1, "Date of birth is required"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  dateOfCurrentPosting: z.string().min(1, "Date of current posting is required"),
  rank: z.string().min(1, "Rank is required"),
  ehrmsCode: z.string().optional(),
  photoUrl: z.string().optional(),
  characterRollPhotoUrl: z.string().optional(),
  permanentAddress: z.string().optional(),
  pinCode: z.string().optional(),
  policeStation: z.string().optional(),
  homeDistrict: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

type ExcelRow = {
  pno: string; name: string; mobileNumber: string; fatherName: string;
  motherName: string; gender: string; dob: string; dateOfJoining: string;
  dateOfCurrentPosting: string; rank: string; ehrmsCode?: string;
  permanentAddress?: string; pinCode?: string; policeStation?: string; homeDistrict?: string;
};

const excelColumns: ColumnDef<ExcelRow>[] = [
  { key: "pno",                  header: "PNO Number",              required: true },
  { key: "name",                 header: "Full Name",               required: true },
  { key: "mobileNumber",         header: "Mobile Number",           required: true, validate: (v) => v.replace(/\D/g,"").length < 10 ? "Must be 10 digits" : null },
  { key: "fatherName",           header: "Father Name",             required: true },
  { key: "motherName",           header: "Mother Name",             required: true },
  { key: "gender",               header: "Gender",                  required: true, validate: (v) => ["Male","Female","Other"].includes(v) ? null : "Must be Male/Female/Other" },
  { key: "dob",                  header: "Date of Birth",           required: true },
  { key: "dateOfJoining",        header: "Date of Joining",         required: true },
  { key: "dateOfCurrentPosting", header: "Date of Current Posting", required: true },
  { key: "rank",                 header: "Rank",                    required: true },
  { key: "ehrmsCode",            header: "EHRMS Code",              required: false },
  { key: "permanentAddress",     header: "Permanent Address",       required: false },
  { key: "pinCode",              header: "Pin Code",                required: false },
  { key: "policeStation",        header: "Police Station",          required: false },
  { key: "homeDistrict",         header: "Home District",           required: false },
];

const SAMPLE_ROWS = [
  ["UP12345", "Ram Kumar Singh", "9876543210", "Ramesh Singh", "Sunita Devi", "Male", "1985-01-15", "2010-03-10", "2022-04-01", "Sub-Inspector", "EH123456", "Ward 5, Ayodhya", "224001", "Kotwali", "Ayodhya"],
  ["UP12346", "Priya Sharma", "9876543211", "Hari Sharma", "Rekha Sharma", "Female", "1990-06-20", "2015-07-01", "2021-01-15", "Constable", "", "", "", "", ""],
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-purple-600" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function SspOffice() {
  const { logout, changePassword } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchPno, setSearchPno] = useState("");
  const [queriedPno, setQueriedPno] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [passFields, setPassFields] = useState({ current: "", next: "", confirm: "" });
  const [showPassCurrent, setShowPassCurrent] = useState(false);
  const [showPassNext, setShowPassNext] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [crPhotoPreview, setCrPhotoPreview] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const crPhotoInputRef = useRef<HTMLInputElement>(null);

  const { data: profiles = [], isLoading } = useListEmployeeProfiles(
    queriedPno ? { pno: queriedPno } : undefined,
  );

  const found: EmployeeProfile | undefined = profiles[0];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListEmployeeProfilesQueryKey() });

  const createMutation = useCreateEmployeeProfile({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Profile created" }); },
      onError: (e: any) => {
        const msg = e?.response?.data?.error ?? "Failed to save profile";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateEmployeeProfile({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); setEditingId(null); toast({ title: "Profile updated" }); },
      onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteEmployeeProfile({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); setQueriedPno(undefined); toast({ title: "Profile deleted" }); },
      onError: () => toast({ title: "Failed to delete profile", variant: "destructive" }),
    },
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      pno: "", name: "", mobileNumber: "", fatherName: "", motherName: "",
      gender: "Male", dob: "", dateOfJoining: "", dateOfCurrentPosting: "",
      rank: "Constable", ehrmsCode: "", photoUrl: "", characterRollPhotoUrl: "",
      permanentAddress: "", pinCode: "", policeStation: "", homeDistrict: "",
    },
  });

  function openAdd() {
    setEditingId(null);
    setPhotoPreview(null);
    setCrPhotoPreview(null);
    form.reset({
      pno: searchPno, name: "", mobileNumber: "", fatherName: "", motherName: "",
      gender: "Male", dob: "", dateOfJoining: "", dateOfCurrentPosting: "",
      rank: "Constable", ehrmsCode: "", photoUrl: "", characterRollPhotoUrl: "",
      permanentAddress: "", pinCode: "", policeStation: "", homeDistrict: "",
    });
    setDialogOpen(true);
  }

  function openEdit(p: EmployeeProfile) {
    setEditingId(p.id);
    setPhotoPreview(p.photoUrl ?? null);
    setCrPhotoPreview(p.characterRollPhotoUrl ?? null);
    form.reset({
      pno: p.pno, name: p.name, mobileNumber: p.mobileNumber,
      fatherName: p.fatherName, motherName: p.motherName,
      gender: p.gender as "Male" | "Female" | "Other",
      dob: p.dob, dateOfJoining: p.dateOfJoining,
      dateOfCurrentPosting: p.dateOfCurrentPosting,
      rank: p.rank, ehrmsCode: p.ehrmsCode ?? "",
      photoUrl: p.photoUrl ?? "", characterRollPhotoUrl: p.characterRollPhotoUrl ?? "",
      permanentAddress: p.permanentAddress ?? "", pinCode: p.pinCode ?? "",
      policeStation: p.policeStation ?? "", homeDistrict: p.homeDistrict ?? "",
    });
    setDialogOpen(true);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, field: "photoUrl" | "characterRollPhotoUrl") {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    form.setValue(field, b64);
    if (field === "photoUrl") setPhotoPreview(b64);
    else setCrPhotoPreview(b64);
  }

  function onSubmit(values: ProfileForm) {
    const payload = {
      ...values,
      photoUrl: values.photoUrl || undefined,
      characterRollPhotoUrl: values.characterRollPhotoUrl || undefined,
      ehrmsCode: values.ehrmsCode || undefined,
      permanentAddress: values.permanentAddress || undefined,
      pinCode: values.pinCode || undefined,
      policeStation: values.policeStation || undefined,
      homeDistrict: values.homeDistrict || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchPno.trim()) return;
    setQueriedPno(searchPno.trim());
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passFields.next !== passFields.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    const result = changePassword(passFields.current, passFields.next, "ssp-office");
    if (result.success) {
      toast({ title: "Password changed successfully" });
      setChangePassOpen(false);
      setPassFields({ current: "", next: "", confirm: "" });
    } else {
      toast({ title: result.error ?? "Failed to change password", variant: "destructive" });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white border flex items-center justify-center shrink-0">
              <img src="/up-police-logo.png" alt="UP Police" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-foreground">SSP Office Portal</h1>
              <p className="text-[11px] text-muted-foreground">Employee Profile Management · Ayodhya Police</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="gap-2 hidden sm:flex">
              <Upload className="w-3.5 h-3.5" />
              Bulk Upload
            </Button>
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Profile
            </Button>
            <button
              onClick={() => setChangePassOpen(true)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Change Password"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={() => logout()}
              className="p-2 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Search bar */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Search className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="font-semibold text-foreground">Search Employee by PNO</h2>
          </div>
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              placeholder="Enter PNO number (e.g. UP12345)"
              value={searchPno}
              onChange={(e) => setSearchPno(e.target.value)}
              className="flex-1 h-11 text-base font-mono"
            />
            <Button type="submit" className="h-11 px-6 bg-purple-600 hover:bg-purple-500 text-white shrink-0">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            {queriedPno && (
              <Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => { setQueriedPno(undefined); setSearchPno(""); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </form>
        </div>

        {/* Results */}
        {queriedPno && (
          isLoading ? (
            <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Searching…</p>
            </div>
          ) : !found ? (
            <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-semibold text-foreground mb-1">No profile found for PNO: {queriedPno}</p>
              <p className="text-sm text-muted-foreground mb-5">This employee has no profile in the system yet.</p>
              <Button onClick={openAdd} className="bg-purple-600 hover:bg-purple-500 text-white gap-2">
                <Plus className="w-4 h-4" />
                Create Profile
              </Button>
            </div>
          ) : (
            <EmployeeCard
              profile={found}
              onEdit={() => openEdit(found)}
              onDelete={() => setDeleteId(found.id)}
              onViewPhoto={(src) => setLightboxSrc(src)}
            />
          )
        )}

        {/* Default state — no search yet */}
        {!queriedPno && (
          <div className="bg-white rounded-2xl border shadow-sm p-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="font-bold text-xl text-foreground mb-2">SSP Office Employee Portal</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Search by PNO number to view or edit an employee's complete profile,
              or use <strong>Add Profile</strong> to create a new record.
            </p>
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Employee Profile" : "Add New Employee Profile"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Section: Personal Details */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-4">Personal Details</p>

                {/* Photo uploads */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Profile Photo</Label>
                    <div
                      className="h-32 border-2 border-dashed border-muted rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all overflow-hidden relative"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPhotoPreview(null); form.setValue("photoUrl", ""); }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-7 h-7 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Upload photo</span>
                        </>
                      )}
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "photoUrl")} />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Character Roll (1st Page)</Label>
                    <div
                      className="h-32 border-2 border-dashed border-muted rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all overflow-hidden relative"
                      onClick={() => crPhotoInputRef.current?.click()}
                    >
                      {crPhotoPreview ? (
                        <>
                          <img src={crPhotoPreview} alt="Character Roll" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCrPhotoPreview(null); form.setValue("characterRollPhotoUrl", ""); }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <FileImage className="w-7 h-7 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Upload character roll</span>
                        </>
                      )}
                    </div>
                    <input ref={crPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "characterRollPhotoUrl")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="pno" render={({ field }) => (
                    <FormItem>
                      <FormLabel>PNO Number *</FormLabel>
                      <FormControl><Input placeholder="e.g. UP12345" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rank" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rank *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select rank" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input placeholder="Enter full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField control={form.control} name="fatherName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Name *</FormLabel>
                      <FormControl><Input placeholder="Father's full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="motherName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Name *</FormLabel>
                      <FormControl><Input placeholder="Mother's full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
                      <FormControl><Input placeholder="10-digit mobile" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dob" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ehrmsCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>EHRMS Code</FormLabel>
                      <FormControl><Input placeholder="EHRMS code" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfJoining" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Joining *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfCurrentPosting" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Current Posting *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Section: Address */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-4">Permanent Address</p>
                <div className="space-y-4">
                  <FormField control={form.control} name="permanentAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input placeholder="House/Ward/Village, Street" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="pinCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pin Code</FormLabel>
                        <FormControl><Input placeholder="6-digit pin" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="policeStation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Police Station</FormLabel>
                        <FormControl><Input placeholder="PS name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="homeDistrict" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home District</FormLabel>
                        <FormControl><Input placeholder="District name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-500 text-white">
                  {editingId ? "Save Changes" : "Create Profile"}
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
            <AlertDialogTitle>Delete Employee Profile?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove all profile data and uploaded photos. This cannot be undone.</AlertDialogDescription>
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

      {/* Bulk Upload */}
      <ExcelUploadDialog<ExcelRow>
        open={showUpload}
        onOpenChange={setShowUpload}
        title="Bulk Upload Employee Profiles"
        columns={excelColumns}
        templateFilename="AyodhyaPolice_EmployeeProfiles_Template.xlsx"
        templateSheetName="Profiles"
        sampleRows={SAMPLE_ROWS}
        onImportRow={(row) =>
          new Promise<void>((resolve, reject) => {
            createMutation.mutate(
              {
                data: {
                  pno: row.pno, name: row.name, mobileNumber: row.mobileNumber,
                  fatherName: row.fatherName, motherName: row.motherName,
                  gender: row.gender as "Male" | "Female" | "Other",
                  dob: row.dob, dateOfJoining: row.dateOfJoining,
                  dateOfCurrentPosting: row.dateOfCurrentPosting,
                  rank: row.rank,
                  ehrmsCode: row.ehrmsCode || undefined,
                  permanentAddress: row.permanentAddress || undefined,
                  pinCode: row.pinCode || undefined,
                  policeStation: row.policeStation || undefined,
                  homeDistrict: row.homeDistrict || undefined,
                },
              },
              { onSuccess: () => resolve(), onError: (e: any) => reject(e) },
            );
          })
        }
        onComplete={() => queryClient.invalidateQueries({ queryKey: getListEmployeeProfilesQueryKey() })}
      />

      {/* Change Password Dialog */}
      <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change SSP Office Password</DialogTitle></DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
            <div>
              <Label className="text-sm font-medium">Current Password</Label>
              <div className="relative mt-1.5">
                <Input type={showPassCurrent ? "text" : "password"} value={passFields.current} onChange={(e) => setPassFields(f => ({ ...f, current: e.target.value }))} placeholder="Current password" required className="pr-10" />
                <button type="button" onClick={() => setShowPassCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">New Password</Label>
              <div className="relative mt-1.5">
                <Input type={showPassNext ? "text" : "password"} value={passFields.next} onChange={(e) => setPassFields(f => ({ ...f, next: e.target.value }))} placeholder="Min. 6 characters" required minLength={6} className="pr-10" />
                <button type="button" onClick={() => setShowPassNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Confirm New Password</Label>
              <Input type="password" value={passFields.confirm} onChange={(e) => setPassFields(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" required className="mt-1.5" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setChangePassOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!passFields.current || !passFields.next || !passFields.confirm} className="bg-purple-600 hover:bg-purple-500 text-white">Update Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain shadow-2xl" />
          <button className="absolute top-4 right-4 text-white hover:text-red-300" onClick={() => setLightboxSrc(null)}>
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}

function EmployeeCard({
  profile: p,
  onEdit,
  onDelete,
  onViewPhoto,
}: {
  profile: EmployeeProfile;
  onEdit: () => void;
  onDelete: () => void;
  onViewPhoto: (src: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {p.photoUrl ? (
            <button
              onClick={() => onViewPhoto(p.photoUrl!)}
              className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/40 shrink-0 hover:border-white transition-colors"
              title="View full photo"
            >
              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border-2 border-white/20">
              <User className="w-8 h-8 text-white/70" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{p.name}</h2>
            <p className="text-purple-100 text-sm font-medium">{p.rank}</p>
            <p className="text-purple-200 text-xs font-mono mt-0.5">PNO: {p.pno}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5">
            <Edit className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="bg-red-500/20 border-red-300/30 text-red-100 hover:bg-red-500/40 gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Section 1: Personal Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600 pb-2 border-b">Personal Information</h3>
          <InfoRow icon={Hash}       label="EHRMS Code"              value={p.ehrmsCode} />
          <InfoRow icon={Phone}      label="Mobile Number"           value={p.mobileNumber} />
          <InfoRow icon={Users}      label="Gender"                  value={p.gender} />
          <InfoRow icon={Calendar}   label="Date of Birth"           value={p.dob} />
          <InfoRow icon={User}       label="Father's Name"           value={p.fatherName} />
          <InfoRow icon={User}       label="Mother's Name"           value={p.motherName} />
          <InfoRow icon={Calendar}   label="Date of Joining"         value={p.dateOfJoining} />
          <InfoRow icon={Briefcase}  label="Date of Current Posting" value={p.dateOfCurrentPosting} />

          {/* Character Roll Photo */}
          {p.characterRollPhotoUrl && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Character Roll (1st Page)</p>
              <button
                onClick={() => onViewPhoto(p.characterRollPhotoUrl!)}
                className="w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-purple-200 hover:border-purple-400 transition-colors relative group"
                title="Click to view full size"
              >
                <img src={p.characterRollPhotoUrl} alt="Character Roll" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Address */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600 pb-2 border-b">Permanent Address</h3>
          <InfoRow icon={Home}    label="Address"        value={p.permanentAddress} />
          <InfoRow icon={MapPin}  label="Pin Code"       value={p.pinCode} />
          <InfoRow icon={Building2} label="Police Station" value={p.policeStation} />
          <InfoRow icon={MapPin}  label="Home District"  value={p.homeDistrict} />

          {!p.permanentAddress && !p.pinCode && !p.policeStation && !p.homeDistrict && (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm italic">No address information on record.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
