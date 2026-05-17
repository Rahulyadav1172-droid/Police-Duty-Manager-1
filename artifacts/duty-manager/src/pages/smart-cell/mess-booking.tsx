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

function fmtDateHindi(iso: string) {
  try {
    const d = parseISO(iso);
    return format(d, "dd.MM.yyyy");
  } catch { return iso; }
}

function printLetter(b: Booking) {
  const bookingDateStr = fmtDateHindi(b.createdAt.split("T")[0]);
  const checkInStr    = fmtDateHindi(b.checkInDate);
  const checkOutStr   = fmtDateHindi(b.checkOutDate);
  const checkInTimeStr  = fmtTime(b.checkInTime);
  const checkOutTimeStr = fmtTime(b.checkOutTime);
  const foodLine = b.foodApplicable === "yes" ? "Applicable" : "Not Applicable";

  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8"/>
<title>Mess Booking - ${b.refNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Devanagari', Arial, sans-serif;
    font-size: 13pt;
    line-height: 1.9;
    color: #111;
    background: #fff;
    padding: 30mm 25mm 20mm 30mm;
  }
  .header-bar {
    background: #0f2859;
    color: #fff;
    text-align: center;
    padding: 10px 16px;
    margin-bottom: 18px;
    border-radius: 3px;
  }
  .header-bar h1 { font-size: 15pt; font-weight: 700; letter-spacing: 1px; }
  .header-bar p  { font-size: 10pt; margin-top: 2px; opacity: .85; }
  .ref-row {
    display: flex;
    justify-content: space-between;
    font-size: 11pt;
    margin-bottom: 20px;
    color: #333;
  }
  .to-block { margin-bottom: 16px; }
  .to-block .label { font-size: 12pt; }
  .to-block .name  { font-weight: 700; font-size: 13pt; }
  .subject-block { margin-bottom: 16px; }
  .subject-block .subj-label { font-weight: 700; display: inline; }
  .body-para { text-indent: 2em; margin-bottom: 16px; text-align: justify; }
  .booking-header { font-weight: 700; margin-bottom: 6px; }
  .booking-list { list-style: none; padding-left: 10px; margin-bottom: 16px; }
  .booking-list li { padding: 2px 0; }
  .booking-list li::before { content: "·  "; font-weight: bold; }
  .contact-line { margin-bottom: 12px; }
  .welcome-line  { margin-bottom: 20px; }
  .sign-block { text-align: right; margin-top: 10px; margin-bottom: 22px; line-height: 1.7; }
  .sign-block .cmd { font-weight: 700; }
  .copy-block { border-top: 1px solid #555; padding-top: 10px; font-size: 11pt; }
  @media print {
    body { padding: 15mm 18mm 12mm 22mm; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>

<div class="header-bar">
  <h1>पुलिस ऑफिसर्स गेस्ट हाउस — अयोध्या पुलिस लाइन</h1>
  <p>उत्तर प्रदेश पुलिस &nbsp;|&nbsp; Ayodhya Police Line, Uttar Pradesh</p>
</div>

<div class="ref-row">
  <span>सं0 / Ref. No.: <strong>${b.refNo}</strong></span>
  <span>दिनांक / Date: <strong>${bookingDateStr}</strong></span>
</div>

<div class="to-block">
  <div class="label">सेवा में,</div>
  <div class="name">&nbsp;&nbsp;श्री ${b.guestName}</div>
  <div>&nbsp;&nbsp;मो0नं0- +91 ${b.mobile}</div>
</div>

<div class="subject-block">
  <span class="subj-label">विषयः</span>&nbsp;&nbsp;
  पुलिस आफिसर्स गेस्ट हाउस में सूट आरक्षित किये जाने की पुष्टि के संबंध में ।
</div>

<div class="body-para">
  महोदय,<br/>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;अवगत कराना है कि पुलिस ऑफिसर्स गेस्ट हाउस में दिनांक <strong>${bookingDateStr}</strong> को आपके प्रवास हेतु <strong>01 रूम</strong> आरक्षित कर दिया गया है, जिसका विवरण निम्नवत हैः-
</div>

<div class="booking-header">बुकिंग विवरणः</div>
<ul class="booking-list">
  <li>गेस्ट का नामः &nbsp;श्री ${b.guestName}</li>
  <li>कब से कब तकः &nbsp;दि0 ${checkInStr} से दि0 ${checkOutStr}</li>
  <li>रूम की संख्याः &nbsp;01</li>
  <li>सूट नम्बरः &nbsp;${b.room}</li>
  <li>चेक-इन / चेक-आउट की तिथि: &nbsp;${checkInStr} ${checkInTimeStr} &nbsp;/&nbsp; ${checkOutStr} ${checkOutTimeStr}</li>
  <li>कुल दिनः &nbsp;${b.totalDays}</li>
  <li>प्रति रूम प्रति दिन किरायाः &nbsp;₹${b.rentPerDay.toLocaleString("en-IN")}/-</li>
  <li>फूड चार्जः &nbsp;${foodLine}${b.foodApplicable === "yes" && b.foodCharge ? `  (₹${b.foodCharge.toLocaleString("en-IN")}/-)` : ""}</li>
</ul>

<div class="contact-line">
  <strong>सम्पर्क सूत्र ऑफिसर्स गेस्ट हाउस</strong>- उ0नि0 यदुनाथ &nbsp; मो0न0-8317041684
</div>

<div class="welcome-line">
  हम आपके स्वागत के लिए उत्सुक हैं और आशा करते हैं कि आपका प्रवास सुखद रहेगा ।
</div>

<div class="sign-block">
  <div>आज्ञा से</div>
  <div class="cmd">वरिष्ठ पुलिस अधीक्षक</div>
  <div>अयोध्या</div>
</div>

<div class="copy-block">
  <strong>प्रतिलिपिः</strong> प्रभारी पुलिस ऑफिसर्स गेस्ट हाउस, पुलिस लाइन, अयोध्या संबंधित से समन्वय स्थापित करते हुए आवश्यक कार्यवाही करें ।
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 800);
  };
</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
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
    printLetter(newBooking);
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
                      onClick={() => printLetter(b)}
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
