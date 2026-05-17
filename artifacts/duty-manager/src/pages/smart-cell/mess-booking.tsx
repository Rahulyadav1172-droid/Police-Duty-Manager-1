import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  format, differenceInDays, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameMonth, getDaysInMonth,
} from "date-fns";
import {
  BedDouble, FileText, Plus, Trash2, LogOut, Cpu,
  Phone, User, CalendarRange, Clock, Utensils, IndianRupee,
  Pencil, Search, X, ChevronLeft, ChevronRight,
  CalendarDays, List, MessageCircle, LayoutDashboard,
  CheckCircle2, LogIn, LogOut as CheckOut, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const ROOMS = ["Suite - 1", "Suite - 2", "Suite - 3", "Suite - 4"] as const;
type RoomName = typeof ROOMS[number];
const STORAGE_KEY = "apl_mess_bookings";

const bookingSchema = z.object({
  guestName:      z.string().min(2, "Name must be at least 2 characters"),
  mobile:         z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
  rooms:          z.array(z.enum(ROOMS)).min(1, "Select at least one suite"),
  checkInDate:    z.string().min(1, "Check-in date is required"),
  checkInTime:    z.string().min(1, "Check-in time is required"),
  checkOutDate:   z.string().min(1, "Check-out date is required"),
  checkOutTime:   z.string().min(1, "Check-out time is required"),
  rentPerDay:     z.preprocess((v) => (v === "" || v === undefined || v === null) ? undefined : Number(v), z.number().min(1).optional()),
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
  try {
    const raw: (Booking & { room?: string })[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return raw.map((b) => ({
      ...b,
      rooms: b.rooms ?? (b.room ? [b.room as RoomName] : (["Suite - 1"] as RoomName[])),
    }));
  } catch { return []; }
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
  return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)));
}

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "dd MMM yyyy"); } catch { return iso; }
}

function fmtDateHindi(iso: string) {
  try { return format(parseISO(iso), "dd.MM.yyyy"); } catch { return iso; }
}

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function numHindi(n: number): string {
  return String(n).padStart(2, "0");
}

function printLetter(b: Booking) {
  const bookingDateStr  = fmtDateHindi(b.createdAt.split("T")[0]);
  const checkInStr      = fmtDateHindi(b.checkInDate);
  const checkOutStr     = fmtDateHindi(b.checkOutDate);
  const checkInTimeStr  = fmtTime(b.checkInTime);
  const checkOutTimeStr = fmtTime(b.checkOutTime);
  const foodLine        = b.foodApplicable === "yes" ? "Applicable" : "Not Applicable";
  const roomCount       = numHindi(b.rooms.length);
  const suitesStr       = b.rooms.join(", ");

  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8"/>
<title>Mess Booking - ${b.refNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap"/>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 210mm; min-height: 297mm; background: #fff; }

  .page {
    font-family: 'Noto Sans Devanagari', Arial, sans-serif;
    font-size: 11.5pt;
    line-height: 1.7;
    color: #111;
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Top decorative border strip ── */
  .top-border {
    height: 7px;
    background: linear-gradient(to right, #0f2859 0%, #1a4a9e 40%, #c8960c 40%, #c8960c 60%, #0f2859 60%, #0f2859 100%);
    flex-shrink: 0;
  }

  /* ── Blue header ── */
  .header-bar {
    background: #0f2859;
    color: #fff;
    text-align: center;
    padding: 9px 20px 8px;
    flex-shrink: 0;
  }
  .header-bar h1 { font-size: 13.5pt; font-weight: 700; letter-spacing: .5px; }
  .header-bar p  { font-size: 9.5pt; margin-top: 2px; opacity: .85; }

  /* ── Bottom decorative border strip ── */
  .header-border {
    height: 4px;
    background: linear-gradient(to right, #c8960c, #f0c040, #c8960c);
    flex-shrink: 0;
  }

  /* ── Letter body ── */
  .letter {
    flex: 1;
    padding: 10mm 22mm 8mm 25mm;
    display: flex;
    flex-direction: column;
  }
  .letter-content { flex: 1; }

  /* Ref row */
  .ref-row {
    display: flex;
    justify-content: space-between;
    font-size: 10pt;
    margin-bottom: 9px;
    padding-bottom: 5px;
    border-bottom: 1.5px solid #0f2859;
    color: #222;
  }

  /* To block */
  .to-block { margin-bottom: 7px; line-height: 1.65; }
  .to-block .lbl { }
  .to-block .name { font-weight: 700; padding-left: 1.8em; }
  .to-block .mob  { padding-left: 1.8em; }

  /* Subject */
  .subject-block { margin-bottom: 7px; }
  .subj-label { font-weight: 700; text-decoration: underline; }

  /* Body paragraph */
  .body-para { margin-bottom: 7px; text-align: justify; }

  /* Booking list */
  .booking-title { font-weight: 700; margin-bottom: 3px; }
  .booking-list  { list-style: none; padding-left: 2.5em; margin-bottom: 9px; }
  .booking-list li { position: relative; padding-left: .4em; line-height: 1.65; }
  .booking-list li::before { content: "·"; position: absolute; left: -1em; font-weight: 700; font-size: 14pt; line-height: 1.4; }

  /* Contact & welcome */
  .contact-line { margin-bottom: 5px; }
  .welcome-line { margin-bottom: 0; }

  /* Signature — bottom right */
  .sign-block {
    text-align: center;
    width: 45%;
    margin-left: auto;
    margin-top: 8px;
    margin-bottom: 14px;
    line-height: 1.65;
  }
  .sign-block .cmd { font-weight: 700; font-size: 12pt; }
  .sign-space { display: block; height: 20px; }

  /* Pratialipi */
  .copy-block {
    border-top: 1px solid #444;
    padding-top: 6px;
    font-size: 10.5pt;
    line-height: 1.6;
    text-align: justify;
  }

  /* ── Bottom gold bar ── */
  .bottom-border {
    height: 7px;
    background: linear-gradient(to right, #0f2859 0%, #1a4a9e 40%, #c8960c 40%, #c8960c 60%, #0f2859 60%, #0f2859 100%);
    flex-shrink: 0;
    margin-top: auto;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Top decorative strip -->
  <div class="top-border"></div>

  <!-- Blue header (kept from existing) -->
  <div class="header-bar">
    <h1>पुलिस ऑफिसर्स गेस्ट हाउस — अयोध्या पुलिस लाइन</h1>
    <p>उत्तर प्रदेश पुलिस &nbsp;|&nbsp; Ayodhya Police Line, Uttar Pradesh</p>
  </div>

  <!-- Gold accent line under header -->
  <div class="header-border"></div>

  <!-- Letter body -->
  <div class="letter">
    <div class="letter-content">

      <!-- Ref / Date -->
      <div class="ref-row">
        <span>सं0 / Ref. No.: <strong>${b.refNo}</strong></span>
        <span>दिनांक / Date: <strong>${bookingDateStr}</strong></span>
      </div>

      <!-- To block -->
      <div class="to-block">
        <div class="lbl">सेवा में,</div>
        <div class="name">श्री ${b.guestName}</div>
        <div class="mob">मो0नं0- +91 ${b.mobile}</div>
      </div>

      <!-- Subject -->
      <div class="subject-block">
        <span class="subj-label">विषयः</span>&nbsp;
        पुलिस आफिसर्स गेस्ट हाउस में सूट आरक्षित किये जाने की पुष्टि के संबंध में ।
      </div>

      <!-- Body paragraph -->
      <div class="body-para">
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;महोदय,<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;अवगत कराना है कि पुलिस ऑफिसर्स गेस्ट हाउस में दिनांक <strong>${bookingDateStr}</strong> को आपके प्रवास हेतु <strong>${roomCount} रूम</strong> आरक्षित कर दिया गया है, जिसका विवरण निम्नवत हैः-
      </div>

      <!-- Booking details (bullet list — matches PDF) -->
      <div class="booking-title">बुकिंग विवरणः</div>
      <ul class="booking-list">
        <li>गेस्ट का नामः &nbsp;${b.guestName}</li>
        <li>कब से कब तकः &nbsp;दि0 ${checkInStr} से दि0 ${checkOutStr}</li>
        <li>रूम की संख्याः &nbsp;${roomCount}</li>
        <li>सूट नम्बरः &nbsp;${suitesStr}</li>
        <li>चेक-इन/चेक-आउट की तिथि: &nbsp;${checkInStr} समय : ${checkInTimeStr} / ${checkOutStr} समय : ${checkOutTimeStr}</li>
        <li>कुल दिनः &nbsp;${b.totalDays}</li>
        ${b.rentPerDay ? `<li>प्रति रूम प्रति दिन किरायाः &nbsp;₹${b.rentPerDay.toLocaleString("en-IN")}/-</li>` : ""}
        ${b.foodApplicable === "yes" ? `<li>फूड चार्जः &nbsp;Applicable${b.foodCharge ? ` (₹${b.foodCharge.toLocaleString("en-IN")}/-)` : ""}</li>` : ""}
      </ul>

      <!-- Contact -->
      <div class="contact-line">
        <strong>सम्पर्क सूत्र ऑफिसर्स गेस्ट हाउस</strong>- उ0नि0 यदुनाथ &nbsp; मो0न0-8317041684
      </div>

      <!-- Welcome -->
      <div class="welcome-line">
        हम आपके स्वागत के लिए उत्सुक हैं और आशा करते हैं कि आपका प्रवास सुखद रहेगा ।
      </div>

    </div><!-- /letter-content -->

    <!-- Signature — bottom-left, centred within left block -->
    <div class="sign-block">
      <div>आज्ञा से</div>
      <div class="sign-space">&nbsp;</div>
      <div class="cmd">पुलिस अधीक्षक, अयोध्या</div>
    </div>

    <!-- Pratialipi -->
    <div class="copy-block">
      <strong>प्रतिलिपिः</strong> प्रभारी पुलिस ऑफिसर्स गेस्ट हाउस, पुलिस लाइन, अयोध्या संबंधित से समन्वय स्थापित करते हुए आवश्यक कार्यवाही करें ।
    </div>

  </div><!-- /letter -->

  <!-- Bottom decorative strip -->
  <div class="bottom-border"></div>

</div><!-- /page -->
<script>window.onload=function(){setTimeout(function(){window.print();},900);};</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) { win.document.write(html); win.document.close(); }
}

function shareWhatsApp(b: Booking) {
  const msg =
    `*पुलिस ऑफिसर्स गेस्ट हाउस, अयोध्या पुलिस लाइन*\n` +
    `*Booking Confirmed ✅*\n\n` +
    `Ref No: ${b.refNo}\n` +
    `Guest: ${b.guestName}\n` +
    `Suite(s): ${b.rooms.join(", ")}\n` +
    `Check-in:  ${fmtDate(b.checkInDate)} at ${fmtTime(b.checkInTime)}\n` +
    `Check-out: ${fmtDate(b.checkOutDate)} at ${fmtTime(b.checkOutTime)}\n` +
    `Stay: ${b.totalDays} day(s)\n` +
    `${b.rentPerDay ? `Rent/day: ₹${b.rentPerDay.toLocaleString("en-IN")}\n` : ""}` +
    `Food: ${b.foodApplicable === "yes" ? "Applicable" : "Not Applicable"}\n\n` +
    `Contact: उ0नि0 यदुनाथ — 8317041684\n` +
    `हम आपके स्वागत के लिए उत्सुक हैं 🙏`;

  window.open(
    `https://wa.me/91${b.mobile}?text=${encodeURIComponent(msg)}`,
    "_blank",
  );
}

function printSummary(bookings: Booking[]) {
  const today = format(new Date(), "yyyy-MM-dd");
  const future = bookings
    .filter((b) => b.checkOutDate >= today)
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  const reportDate = format(new Date(), "dd.MM.yyyy");

  const rows = future.map((b, i) => `
    <tr class="${i % 2 === 0 ? "" : "alt"}">
      <td class="center">${i + 1}</td>
      <td class="mono">${b.refNo}</td>
      <td>${b.guestName}</td>
      <td class="center">${b.rooms.join(", ")}</td>
      <td class="center">${fmtDateHindi(b.checkInDate)}</td>
      <td class="center">${fmtDateHindi(b.checkOutDate)}</td>
      <td class="center">${b.totalDays}</td>
      <td class="center">${b.rentPerDay ? `₹${b.rentPerDay.toLocaleString("en-IN")}` : "—"}</td>
      <td class="center">${b.foodApplicable === "yes" ? "✓" : "—"}</td>
    </tr>`).join("");

  const totalRooms = future.reduce((s, b) => s + b.rooms.length, 0);
  const totalDaysAll = future.reduce((s, b) => s + b.totalDays, 0);
  const totalRevenue = future.reduce((s, b) => s + (b.totalRoomCharge ?? 0), 0);

  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8"/>
<title>Booking Summary Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap"/>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:297mm; background:#fff; font-family:'Noto Sans Devanagari',Arial,sans-serif; }
  .page { width:297mm; min-height:210mm; display:flex; flex-direction:column; }
  .top-bar { height:6px; background:linear-gradient(to right,#0f2859 0%,#1a4a9e 40%,#c8960c 40%,#c8960c 60%,#0f2859 60%); }
  .header { background:#0f2859; color:#fff; padding:10px 20px 9px; text-align:center; }
  .header h1 { font-size:14pt; font-weight:700; letter-spacing:.5px; }
  .header p  { font-size:9pt; opacity:.85; margin-top:2px; }
  .gold-bar { height:4px; background:linear-gradient(to right,#c8960c,#f0c040,#c8960c); }
  .body { flex:1; padding:6mm 10mm 5mm; }
  .meta { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px; }
  .meta .title { font-size:13pt; font-weight:700; color:#0f2859; }
  .meta .date  { font-size:9pt; color:#555; }
  .stats { display:flex; gap:10px; margin-bottom:10px; }
  .stat-box { flex:1; background:#f0f4ff; border:1px solid #c5d0ef; border-radius:6px; padding:7px 10px; text-align:center; }
  .stat-box .num  { font-size:16pt; font-weight:700; color:#0f2859; }
  .stat-box .lbl  { font-size:8.5pt; color:#555; margin-top:1px; }
  table { width:100%; border-collapse:collapse; font-size:9pt; }
  th { background:#0f2859; color:#fff; padding:5px 7px; text-align:left; font-weight:600; }
  th.center, td.center { text-align:center; }
  td { padding:4px 7px; border-bottom:1px solid #e8eaf0; vertical-align:top; }
  tr.alt td { background:#f7f9ff; }
  .mono { font-family:monospace; font-size:8pt; }
  .footer { display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px; }
  .footer .note { font-size:8pt; color:#777; font-style:italic; }
  .footer .sign { text-align:center; font-size:9.5pt; line-height:1.6; }
  .footer .sign .cmd { font-weight:700; }
  .bottom-bar { height:6px; background:linear-gradient(to right,#0f2859 0%,#1a4a9e 40%,#c8960c 40%,#c8960c 60%,#0f2859 60%); margin-top:auto; }
</style>
</head>
<body>
<div class="page">
  <div class="top-bar"></div>
  <div class="header">
    <h1>पुलिस ऑफिसर्स गेस्ट हाउस — अयोध्या पुलिस लाइन</h1>
    <p>उत्तर प्रदेश पुलिस &nbsp;|&nbsp; Ayodhya Police Line, Uttar Pradesh</p>
  </div>
  <div class="gold-bar"></div>
  <div class="body">
    <div class="meta">
      <div>
        <div class="title">भविष्य की बुकिंग सारांश रिपोर्ट</div>
        <div style="font-size:9pt;color:#555;margin-top:2px;">Upcoming &amp; Current Bookings Summary</div>
      </div>
      <div class="date">रिपोर्ट दिनांक: <strong>${reportDate}</strong></div>
    </div>
    <div class="stats">
      <div class="stat-box"><div class="num">${future.length}</div><div class="lbl">कुल बुकिंग</div></div>
      <div class="stat-box"><div class="num">${totalRooms}</div><div class="lbl">कुल रूम</div></div>
      <div class="stat-box"><div class="num">${totalDaysAll}</div><div class="lbl">कुल दिन</div></div>
      <div class="stat-box"><div class="num">${totalRevenue > 0 ? "₹" + totalRevenue.toLocaleString("en-IN") : "—"}</div><div class="lbl">अनुमानित आय</div></div>
    </div>
    ${future.length === 0
      ? `<div style="text-align:center;padding:30px;color:#888;font-size:11pt;">कोई भविष्य की बुकिंग नहीं मिली।</div>`
      : `<table>
      <thead>
        <tr>
          <th class="center" style="width:28px;">#</th>
          <th>सं0 / Ref</th>
          <th>गेस्ट का नाम</th>
          <th class="center">सूट</th>
          <th class="center">चेक-इन</th>
          <th class="center">चेक-आउट</th>
          <th class="center">दिन</th>
          <th class="center">किराया/दिन</th>
          <th class="center">भोजन</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`}
    <div class="footer">
      <div class="note">यह रिपोर्ट ${reportDate} को Smart Cell प्रणाली द्वारा स्वतः तैयार की गई है।</div>
      <div class="sign">
        <div>आज्ञा से</div>
        <div>&nbsp;</div>
        <div class="cmd">पुलिस अधीक्षक, अयोध्या</div>
      </div>
    </div>
  </div>
  <div class="bottom-bar"></div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},900);};</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1050,height=700");
  if (win) { win.document.write(html); win.document.close(); }
}

function isRoomBooked(room: string, dateStr: string, bookings: Booking[]): boolean {
  return bookings.some(
    (b) => b.rooms.includes(room as RoomName) && b.checkInDate <= dateStr && b.checkOutDate > dateStr,
  );
}

export default function MessBooking() {
  const { logout } = useAuth();
  const { toast } = useToast();

  const [bookings, setBookings]     = useState<Booking[]>(loadBookings);
  const [formOpen, setFormOpen]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<"dashboard" | "records" | "availability">("dashboard");
  const [calMonth, setCalMonth]     = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoom, setFilterRoom]   = useState<string>("all");
  const [filterFrom, setFilterFrom]   = useState("");
  const [filterTo, setFilterTo]       = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      rooms: ["Suite - 1"],
      checkInTime: "12:00",
      checkOutTime: "11:00",
      foodApplicable: "no",
    },
  });

  const checkInDate    = watch("checkInDate");
  const checkOutDate   = watch("checkOutDate");
  const rentPerDay     = watch("rentPerDay");
  const foodApplicable = watch("foodApplicable");
  const watchedRooms   = watch("rooms") ?? [];

  const totalDays = useMemo(() => calcDays(checkInDate, checkOutDate), [checkInDate, checkOutDate]);
  const totalRoomCharge = rentPerDay ? rentPerDay * totalDays : 0;

  function openNew() {
    reset({ rooms: ["Suite - 1"], checkInTime: "12:00", checkOutTime: "11:00", foodApplicable: "no" });
    setEditingId(null);
    setFormOpen(true);
  }

  function openEdit(b: Booking) {
    reset({
      guestName: b.guestName,
      mobile: b.mobile,
      rooms: b.rooms as [RoomName, ...RoomName[]],
      checkInDate: b.checkInDate,
      checkInTime: b.checkInTime,
      checkOutDate: b.checkOutDate,
      checkOutTime: b.checkOutTime,
      rentPerDay: b.rentPerDay,
      foodApplicable: b.foodApplicable,
      foodCharge: b.foodCharge,
    });
    setEditingId(b.id);
    setFormOpen(true);
  }

  function onSubmit(data: BookingForm) {
    if (editingId) {
      const days = calcDays(data.checkInDate, data.checkOutDate);
      const updated = bookings.map((b) =>
        b.id === editingId
          ? { ...b, ...data, totalDays: days, totalRoomCharge: (data.rentPerDay ?? 0) * days }
          : b,
      );
      saveBookings(updated);
      setBookings(updated);
      toast({ title: "Booking updated", description: `Ref: ${updated.find(b => b.id === editingId)?.refNo}` });
      setEditingId(null);
    } else {
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
    }
    reset();
    setFormOpen(false);
  }

  function deleteBooking(id: string) {
    const updated = bookings.filter((b) => b.id !== id);
    saveBookings(updated);
    setBookings(updated);
    toast({ title: "Booking deleted" });
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (searchQuery && !b.guestName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterRoom !== "all" && !b.rooms.includes(filterRoom as RoomName)) return false;
      if (filterFrom && b.checkOutDate < filterFrom) return false;
      if (filterTo && b.checkInDate > filterTo) return false;
      return true;
    });
  }, [bookings, searchQuery, filterRoom, filterFrom, filterTo]);

  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ROOMS.forEach((r) => { counts[r] = bookings.filter((b) => b.rooms.includes(r)).length; });
    return counts;
  }, [bookings]);

  const calDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  }, [calMonth]);

  const hasActiveFilters = searchQuery || filterRoom !== "all" || filterFrom || filterTo;

  // ── Dashboard computed values ──────────────────────────────────
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const thisMonth = new Date();
  const daysInMonth = getDaysInMonth(thisMonth);
  const monthStart = format(startOfMonth(thisMonth), "yyyy-MM-dd");
  const monthEnd   = format(endOfMonth(thisMonth),   "yyyy-MM-dd");

  const occupiedToday = useMemo(
    () => bookings.filter((b) => b.checkInDate <= todayStr && b.checkOutDate > todayStr),
    [bookings, todayStr],
  );
  const checkingInToday  = useMemo(() => bookings.filter((b) => b.checkInDate === todayStr),  [bookings, todayStr]);
  const checkingOutToday = useMemo(() => bookings.filter((b) => b.checkOutDate === todayStr), [bookings, todayStr]);
  const availableSuitesCount = ROOMS.filter(
    (r) => !occupiedToday.some((b) => b.rooms.includes(r)),
  ).length;

  const occupancyPct = useMemo(() => {
    const pct: Record<string, number> = {};
    ROOMS.forEach((r) => {
      const calDaysM = eachDayOfInterval({ start: startOfMonth(thisMonth), end: endOfMonth(thisMonth) });
      const bookedDays = calDaysM.filter((d) => {
        const ds = format(d, "yyyy-MM-dd");
        return bookings.some((b) => b.rooms.includes(r) && b.checkInDate <= ds && b.checkOutDate > ds);
      }).length;
      pct[r] = Math.round((bookedDays / daysInMonth) * 100);
    });
    return pct;
  }, [bookings]);

  const futureBookings = useMemo(
    () => bookings
      .filter((b) => b.checkOutDate >= todayStr)
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate)),
    [bookings, todayStr],
  );

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
        <button onClick={() => logout()} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">

        {/* Tab bar + New Booking */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${activeTab === "dashboard" ? "bg-emerald-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab("records")}
              className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${activeTab === "records" ? "bg-emerald-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <List className="w-3.5 h-3.5" /> Records
            </button>
            <button
              onClick={() => setActiveTab("availability")}
              className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${activeTab === "availability" ? "bg-emerald-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Availability
            </button>
          </div>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="w-4 h-4" /> New Booking
          </Button>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">

            {/* Today stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Occupied Today</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">{occupiedToday.length}</p>
                <p className="text-xs text-muted-foreground">suite{occupiedToday.length !== 1 ? "s" : ""} in use</p>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <LogIn className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Checking In</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">{checkingInToday.length}</p>
                <p className="text-xs text-muted-foreground">arriving today</p>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <CheckOut className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Checking Out</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">{checkingOutToday.length}</p>
                <p className="text-xs text-muted-foreground">departing today</p>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <BedDouble className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Available</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">{availableSuitesCount}</p>
                <p className="text-xs text-muted-foreground">suites free today</p>
              </div>
            </div>

            {/* Suite occupancy % for current month */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-800">
                  Suite Occupancy — {format(new Date(), "MMMM yyyy")}
                </h3>
                <span className="text-xs text-muted-foreground">{daysInMonth} days in month</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {ROOMS.map((room) => {
                  const pct = occupancyPct[room] ?? 0;
                  const isOccupiedNow = occupiedToday.some((b) => b.rooms.includes(room));
                  return (
                    <div key={room} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BedDouble className={`w-4 h-4 ${isOccupiedNow ? "text-emerald-600" : "text-slate-400"}`} />
                          <span className="text-sm font-semibold">{room}</span>
                        </div>
                        {isOccupiedNow && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">In Use</Badge>}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${pct > 70 ? "bg-emerald-500" : pct > 30 ? "bg-blue-500" : "bg-slate-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct}% occupied</span>
                        <span>{roomCounts[room]} booking{roomCounts[room] !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming bookings + PDF button */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Upcoming & Current Bookings</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{futureBookings.length} booking{futureBookings.length !== 1 ? "s" : ""} from today onwards</p>
                </div>
                <Button
                  onClick={() => printSummary(bookings)}
                  variant="outline"
                  className="gap-2 text-sm border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <Download className="w-4 h-4" /> Download Summary PDF
                </Button>
              </div>

              {futureBookings.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <CalendarDays className="w-10 h-10 opacity-25 mx-auto mb-3" />
                  <p className="font-medium">No upcoming bookings</p>
                  <p className="text-sm mt-1">All current bookings have checked out. Create a new booking to see it here.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {futureBookings.map((b) => {
                    const isToday = b.checkInDate <= todayStr && b.checkOutDate > todayStr;
                    const isCheckingIn  = b.checkInDate  === todayStr;
                    const isCheckingOut = b.checkOutDate === todayStr;
                    return (
                      <div key={b.id} className={`px-5 py-3 flex items-center gap-4 flex-wrap ${isToday ? "bg-emerald-50/60" : ""}`}>
                        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: isToday ? "#10b981" : isCheckingIn ? "#3b82f6" : "#e2e8f0" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{b.guestName}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">{b.refNo}</Badge>
                            {isToday && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Staying</Badge>}
                            {isCheckingIn  && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Check-in Today</Badge>}
                            {isCheckingOut && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Check-out Today</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {b.rooms.join(", ")} &nbsp;·&nbsp; {fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)} &nbsp;·&nbsp; {b.totalDays} day{b.totalDays !== 1 ? "s" : ""}
                            {b.rentPerDay ? ` · ₹${b.totalRoomCharge.toLocaleString("en-IN")} total` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => printLetter(b)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Print letter">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => shareWhatsApp(b)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RECORDS TAB ── */}
        {activeTab === "records" && (
          <>
            {/* Search & filter bar */}
            <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by guest name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                  className="border rounded-md px-3 h-8 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Suites</option>
                  {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="h-8 text-sm w-36"
                  title="From date"
                />
                <Input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="h-8 text-sm w-36"
                  title="To date"
                />
                {hasActiveFilters && (
                  <button
                    onClick={() => { setSearchQuery(""); setFilterRoom("all"); setFilterFrom(""); setFilterTo(""); }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredBookings.length} of {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " (filtered)" : ""}
              </p>
            </div>

            {/* Booking cards */}
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-xl border shadow-sm p-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
                <BedDouble className="w-10 h-10 opacity-30" />
                <p className="font-medium">{bookings.length === 0 ? "No bookings yet" : "No results match your filters"}</p>
                <p className="text-sm">{bookings.length === 0 ? 'Click "New Booking" to create the first reservation.' : "Try adjusting your search or filters."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                          <BedDouble className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{b.guestName}</p>
                          <p className="text-xs text-muted-foreground">{b.mobile} · {b.rooms.join(", ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <Badge variant="outline" className="text-xs font-mono">{b.refNo}</Badge>
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Edit booking">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => printLetter(b)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Print letter">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => shareWhatsApp(b)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors" title="Share via WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteBooking(b.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarRange className="w-3.5 h-3.5" />{fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(b.checkInTime)} – {fmtTime(b.checkOutTime)}</span>
                      <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />₹{b.rentPerDay}/day · {b.totalDays}d = ₹{b.totalRoomCharge.toLocaleString("en-IN")}</span>
                      <span className="flex items-center gap-1"><Utensils className="w-3.5 h-3.5" />Food: {b.foodApplicable === "yes" ? "Applicable" : "N/A"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── AVAILABILITY TAB ── */}
        {activeTab === "availability" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm">{format(calMonth, "MMMM yyyy")}</h3>
              <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-5 py-2 border-b text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border inline-block" /> Available</span>
            </div>

            {/* Calendar grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 bg-slate-50 border-r font-semibold text-muted-foreground w-24 sticky left-0">Suite</th>
                    {calDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={`px-1 py-2 text-center font-medium min-w-[28px] ${isSameMonth(day, new Date()) && format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-muted-foreground"}`}
                      >
                        <div>{format(day, "d")}</div>
                        <div className="text-[10px] opacity-60">{format(day, "EEE").slice(0, 2)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROOMS.map((room, ri) => (
                    <tr key={room} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-3 py-2 font-semibold border-r sticky left-0 bg-inherit whitespace-nowrap">{room}</td>
                      {calDays.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const booked  = isRoomBooked(room, dateStr, bookings);
                        const booking = bookings.find((b) => b.rooms.includes(room) && b.checkInDate <= dateStr && b.checkOutDate > dateStr);
                        return (
                          <td
                            key={dateStr}
                            title={booked ? `${booking?.guestName} (${booking?.refNo})` : "Available"}
                            className={`border-l text-center py-1.5 cursor-default ${booked ? "bg-emerald-500" : "hover:bg-slate-100"}`}
                          >
                            {booked && <span className="block w-1.5 h-1.5 rounded-full bg-white mx-auto" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground px-5 py-2 border-t">Hover over a booked cell to see guest name and ref number.</p>
          </div>
        )}

      </main>

      {/* Booking Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setEditingId(null); } setFormOpen(o); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-emerald-600" />
              {editingId ? "Edit Booking" : "New Mess Room Booking"}
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

            {/* Room selection — multi-checkbox */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <BedDouble className="w-3.5 h-3.5" /> Suite(s) — select one or more
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ROOMS.map((r) => (
                  <label key={r} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 transition-colors ${watchedRooms.includes(r) ? "border-emerald-500 bg-emerald-50" : "border-border hover:bg-muted"}`}>
                    <input
                      type="checkbox"
                      value={r}
                      {...register("rooms")}
                      className="accent-emerald-600"
                    />
                    <span className="text-sm font-medium">{r}</span>
                  </label>
                ))}
              </div>
              {errors.rooms && <p className="text-xs text-red-500 mt-1">{errors.rooms.message}</p>}
              {watchedRooms.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{watchedRooms.length} suite{watchedRooms.length !== 1 ? "s" : ""} selected</p>
              )}
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
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Check-out Date</Label>
                <Input type="date" {...register("checkOutDate")} />
                {errors.checkOutDate && <p className="text-xs text-red-500 mt-1">{errors.checkOutDate.message}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Check-out Time</Label>
                <Input type="time" {...register("checkOutTime")} />
              </div>
            </div>

            {/* Total stay */}
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-emerald-700 font-medium flex items-center gap-1.5"><CalendarRange className="w-4 h-4" /> Total Stay</span>
              <span className="font-bold text-emerald-800">{totalDays} day{totalDays !== 1 ? "s" : ""}</span>
            </div>

            {/* Rent per day — optional */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Room Rent per Day (₹)
                <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Input type="number" min={1} {...register("rentPerDay")} placeholder="Leave blank if not applicable" />
              {errors.rentPerDay && <p className="text-xs text-red-500 mt-1">{errors.rentPerDay.message}</p>}
              {totalDays > 0 && rentPerDay && rentPerDay > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Total: ₹{totalRoomCharge.toLocaleString("en-IN")}/- ({totalDays}d × ₹{rentPerDay})
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
                <Input type="number" min={0} {...register("foodCharge")} placeholder="Food charge amount (₹)" className="mt-2" />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setFormOpen(false); setEditingId(null); }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <FileText className="w-4 h-4" />
                {editingId ? "Save Changes" : "Confirm & Print Letter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
