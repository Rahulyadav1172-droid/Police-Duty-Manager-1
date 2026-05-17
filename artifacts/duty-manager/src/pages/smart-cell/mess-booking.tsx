import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  BedDouble, FileText, Plus, Trash2, LogOut, Cpu,
  Phone, User, CalendarRange, Clock, Utensils, IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ROOMS = ["Suite - 1", "Suite - 2", "Suite - 3", "Suite - 4"] as const;
const STORAGE_KEY = "apl_mess_bookings";

const bookingSchema = z.object({
  guestName:      z.string().min(2, "Name must be at least 2 characters"),
  mobile:         z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
  room:           z.enum(ROOMS),
  checkInDate:    z.string().min(1, "Check-in date is required"),
  checkInTime:    z.string().min(1, "Check-in time is required"),
  checkOutDate:   z.string().min(1, "Check-out date is required"),
  checkOutTime:   z.string().min(1, "Check-out time is required"),
  rentPerDay:     z.coerce.number().min(1, "Rent per day must be at least 1"),
  foodApplicable: z.enum(["yes", "no"]),
  foodCharge:     z.coerce.number().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.checkOutDate < data.checkInDate) {
    ctx.addIssue({ code: "custom", path: ["checkOutDate"], message: "Check-out must be after check-in" });
  }
});

type BookingForm = z.infer<typeof bookingSchema>;

interface Booking extends BookingForm {
  id: string;
  refNo: string;
  createdAt: string;
  totalDays: number;
  totalRoomCharge: number;
}

function loadBookings(): Booking[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function saveBookings(b: Booking[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
}

function nextRefNo(bookings: Booking[]): string {
  const year = new Date().getFullYear();
  const seq = bookings.filter((b) => b.refNo.includes(`/${year}/`)).length + 1;
  return `APL/MESS/${year}/${String(seq).padStart(3, "0")}`;
}

function calcDays(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d = differenceInDays(parseISO(checkOut), parseISO(checkIn));
  return Math.max(0, d);
}

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "dd MMM yyyy"); } catch { return iso; }
}

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function generatePDF(b: Booking) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 40, 90);
  doc.rect(0, 0, pw, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("AYODHYA POLICE LINE", pw / 2, 10, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Uttar Pradesh Police  |  Officer's Mess", pw / 2, 17, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ROOM BOOKING CONFIRMATION LETTER", pw / 2, 24, { align: "center" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref. No.: ${b.refNo}`, 14, 36);
  doc.text(`Date: ${fmtDate(b.createdAt.split("T")[0])}`, pw - 14, 36, { align: "right" });

  doc.setFontSize(10);
  doc.text("To,", 14, 46);
  doc.setFont("helvetica", "bold");
  doc.text(b.guestName, 14, 52);
  doc.setFont("helvetica", "normal");
  doc.text(`Mobile: ${b.mobile}`, 14, 58);

  doc.setFont("helvetica", "bold");
  doc.text("Subject:", 14, 68);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Confirmation of room booking at Officer's Mess, Ayodhya Police Line.`,
    14, 74,
  );

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "With reference to the above subject, it is hereby confirmed that the following room has been reserved for your stay:",
    14, 82, { maxWidth: pw - 28 },
  );

  autoTable(doc, {
    startY: 90,
    head: [["BOOKING DETAILS", ""]],
    body: [
      ["Room Allotted", b.room],
      ["Check-in Date", fmtDate(b.checkInDate)],
      ["Check-in Time", fmtTime(b.checkInTime)],
      ["Check-out Date", fmtDate(b.checkOutDate)],
      ["Check-out Time", fmtTime(b.checkOutTime)],
      ["Total Duration of Stay", `${b.totalDays} Day(s)`],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 40, 90], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 65 } },
    margin: { left: 14, right: 14 },
  });

  const afterBooking = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: afterBooking,
    head: [["CHARGES", ""]],
    body: [
      ["Room Rent per Day", `Rs. ${b.rentPerDay.toLocaleString("en-IN")}/-`],
      [
        `Total Room Charges (${b.totalDays} day${b.totalDays !== 1 ? "s" : ""} × Rs. ${b.rentPerDay.toLocaleString("en-IN")})`,
        `Rs. ${b.totalRoomCharge.toLocaleString("en-IN")}/-`,
      ],
      ["Food Charges", b.foodApplicable === "yes" ? "Applicable" : "Not Applicable"],
      ...(b.foodApplicable === "yes" && b.foodCharge
        ? [["Food Charge Amount", `Rs. ${b.foodCharge.toLocaleString("en-IN")}/-`]]
        : []),
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 40, 90], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 } },
    margin: { left: 14, right: 14 },
  });

  const afterCharges = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS:", 14, afterCharges);
  doc.setFont("helvetica", "normal");
  const terms = [
    "1. Booking is subject to availability and official approval.",
    "2. Please carry a valid identity card (service ID) at the time of check-in.",
    "3. Check-in and check-out times are as mentioned above. Late check-out may attract additional charges.",
    "4. The management reserves the right to cancel the booking in case of any official emergency.",
    "5. Guests are requested to maintain the decorum of the mess premises.",
  ];
  let ty = afterCharges + 6;
  terms.forEach((t) => {
    doc.text(t, 14, ty, { maxWidth: pw - 28 });
    ty += 6;
  });

  const sigY = ty + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("(Authorised Signatory)", pw - 14, sigY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Officer Commanding", pw - 14, sigY + 6, { align: "right" });
  doc.text("Ayodhya Police Line", pw - 14, sigY + 12, { align: "right" });
  doc.text("Uttar Pradesh Police", pw - 14, sigY + 18, { align: "right" });

  doc.setDrawColor(15, 40, 90);
  doc.setLineWidth(0.5);
  doc.line(14, sigY - 2, pw - 14, sigY - 2);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}  |  Booking Ref: ${b.refNo}`,
    pw / 2, doc.internal.pageSize.getHeight() - 8,
    { align: "center" },
  );

  doc.save(`Mess_Booking_${b.refNo.replace(/\//g, "-")}.pdf`);
}

export default function MessBooking() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(loadBookings);
  const [formOpen, setFormOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      room: "Suite - 1",
      checkInTime: "12:00",
      checkOutTime: "11:00",
      foodApplicable: "no",
    },
  });

  const checkInDate  = watch("checkInDate");
  const checkOutDate = watch("checkOutDate");
  const rentPerDay   = watch("rentPerDay");
  const foodApplicable = watch("foodApplicable");

  const totalDays = useMemo(() => calcDays(checkInDate, checkOutDate), [checkInDate, checkOutDate]);
  const totalRoomCharge = (rentPerDay ?? 0) * totalDays;

  function onSubmit(data: BookingForm) {
    const newBooking: Booking = {
      ...data,
      id: crypto.randomUUID(),
      refNo: nextRefNo(bookings),
      createdAt: new Date().toISOString(),
      totalDays,
      totalRoomCharge,
    };
    const updated = [newBooking, ...bookings];
    saveBookings(updated);
    setBookings(updated);
    toast({ title: "Booking confirmed", description: `Ref: ${newBooking.refNo}` });
    generatePDF(newBooking);
    reset();
    setFormOpen(false);
  }

  function deleteBooking(id: string) {
    const updated = bookings.filter((b) => b.id !== id);
    saveBookings(updated);
    setBookings(updated);
    toast({ title: "Booking deleted" });
  }

  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ROOMS.forEach((r) => { counts[r] = bookings.filter((b) => b.room === r).length; });
    return counts;
  }, [bookings]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white px-6 py-4 shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Smart Cell</h1>
            <p className="text-emerald-300 text-xs">Officer's Mess — Ayodhya Police Line</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">

        {/* Suite availability cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ROOMS.map((room) => (
            <div key={room} className="bg-white rounded-xl border shadow-sm p-4 flex flex-col items-center gap-2">
              <BedDouble className="w-7 h-7 text-emerald-600" />
              <p className="font-bold text-sm text-center">{room}</p>
              <Badge variant="secondary" className="text-xs">
                {roomCounts[room]} booking{roomCounts[room] !== 1 ? "s" : ""}
              </Badge>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Booking Records</h2>
          <Button
            onClick={() => { reset(); setFormOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </Button>
        </div>

        {/* Bookings list */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <BedDouble className="w-10 h-10 opacity-30" />
            <p className="font-medium">No bookings yet</p>
            <p className="text-sm">Click "New Booking" to create the first reservation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <BedDouble className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{b.guestName}</p>
                      <p className="text-xs text-muted-foreground">{b.mobile} · {b.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs font-mono">{b.refNo}</Badge>
                    <button
                      onClick={() => generatePDF(b)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Download PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBooking(b.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete booking"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarRange className="w-3.5 h-3.5" />{fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(b.checkInTime)} – {fmtTime(b.checkOutTime)}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />Rs.{b.rentPerDay}/day · {b.totalDays} day(s) = Rs.{b.totalRoomCharge.toLocaleString("en-IN")}</span>
                  <span className="flex items-center gap-1"><Utensils className="w-3.5 h-3.5" />Food: {b.foodApplicable === "yes" ? "Applicable" : "N/A"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Booking Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-emerald-600" />
              New Mess Room Booking
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">

            {/* Guest Name */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5" /> Guest Name
              </Label>
              <Input {...register("guestName")} placeholder="Full name of officer / guest" />
              {errors.guestName && <p className="text-xs text-red-500 mt-1">{errors.guestName.message}</p>}
            </div>

            {/* Mobile */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Mobile Number
              </Label>
              <Input {...register("mobile")} placeholder="10-digit mobile number" maxLength={10} />
              {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
            </div>

            {/* Room */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <BedDouble className="w-3.5 h-3.5" /> Room
              </Label>
              <select
                {...register("room")}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Check-in / Check-out */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Check-in Date</Label>
                <Input type="date" {...register("checkInDate")} />
                {errors.checkInDate && <p className="text-xs text-red-500 mt-1">{errors.checkInDate.message}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Check-in Time</Label>
                <Input type="time" {...register("checkInTime")} />
                {errors.checkInTime && <p className="text-xs text-red-500 mt-1">{errors.checkInTime.message}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Check-out Date</Label>
                <Input type="date" {...register("checkOutDate")} />
                {errors.checkOutDate && <p className="text-xs text-red-500 mt-1">{errors.checkOutDate.message}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Check-out Time</Label>
                <Input type="time" {...register("checkOutTime")} />
                {errors.checkOutTime && <p className="text-xs text-red-500 mt-1">{errors.checkOutTime.message}</p>}
              </div>
            </div>

            {/* Total stay — auto-calculated */}
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4" /> Total Stay
              </span>
              <span className="font-bold text-emerald-800">
                {totalDays} day{totalDays !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Rent per day */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Room Rent per Day (Rs.)
              </Label>
              <Input type="number" min={1} {...register("rentPerDay")} placeholder="e.g. 500" />
              {errors.rentPerDay && <p className="text-xs text-red-500 mt-1">{errors.rentPerDay.message}</p>}
              {totalDays > 0 && (rentPerDay ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Total room charge: Rs. {totalRoomCharge.toLocaleString("en-IN")}/-
                </p>
              )}
            </div>

            {/* Food charges */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Utensils className="w-3.5 h-3.5" /> Food Charges
              </Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="yes" {...register("foodApplicable")} className="accent-emerald-600" />
                  <span className="text-sm">Applicable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="no" {...register("foodApplicable")} className="accent-emerald-600" />
                  <span className="text-sm">Not Applicable</span>
                </label>
              </div>
              {foodApplicable === "yes" && (
                <div className="mt-2">
                  <Input
                    type="number"
                    min={0}
                    {...register("foodCharge")}
                    placeholder="Food charge amount (Rs.)"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <FileText className="w-4 h-4" />
                Confirm & Download PDF
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
