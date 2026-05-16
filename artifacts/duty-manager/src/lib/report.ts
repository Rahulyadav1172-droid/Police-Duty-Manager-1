import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

type RosterEntry = {
  id: number;
  personnelId: number;
  dutyPointId: number;
  dutyType: string;
  startDateTime: string;
  endDateTime: string | null;
  status: string;
  notes?: string | null;
  personnel?: {
    id: number;
    name: string;
    beltNumber: string;
    rank: string;
    mobileNumber: string;
    createdAt: string;
  };
  dutyPoint?: {
    id: number;
    name: string;
    location: string;
    description?: string | null;
    createdAt: string;
  };
};

type ReportOptions = {
  entries: RosterEntry[];
  statusFilter?: string;
  title?: string;
};

export function generateShiftReport({ entries, statusFilter = "all", title }: ReportOptions): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  const NAVY = [13, 27, 62] as [number, number, number];
  const LIGHT_BLUE = [232, 240, 254] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const DARK_TEXT = [30, 30, 30] as [number, number, number];
  const MID_GRAY = [100, 100, 110] as [number, number, number];
  const GREEN = [22, 101, 52] as [number, number, number];
  const RED = [153, 27, 27] as [number, number, number];
  const SLATE = [71, 85, 105] as [number, number, number];

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Emblem placeholder (circle)
  doc.setFillColor(...LIGHT_BLUE);
  doc.circle(18, 14, 9, "F");
  doc.setFillColor(...NAVY);
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("UP", 18, 12.5, { align: "center" });
  doc.text("POLICE", 18, 16.5, { align: "center" });

  // Title block
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("AYODHYA POLICE LINE", pageWidth / 2, 10, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Duty Shift Report — Official Record", pageWidth / 2, 17, { align: "center" });

  // Report title / filter label on right
  const reportLabel = title ?? (statusFilter === "all" ? "All Assignments" : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Assignments`);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(reportLabel.toUpperCase(), pageWidth - 10, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(now, "dd MMM yyyy, HH:mm")}`, pageWidth - 10, 16, { align: "right" });

  // ── Summary strip ─────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(0, 28, pageWidth, 14, "F");

  const totalEntries = entries.length;
  const activeCount = entries.filter(e => e.status === "active").length;
  const releasedCount = entries.filter(e => e.status === "released").length;
  const expiredCount = entries.filter(e => e.status === "expired").length;
  const unlimitedCount = entries.filter(e => e.dutyType === "unlimited").length;
  const fixedCount = entries.filter(e => e.dutyType === "fixed").length;

  const stats = [
    { label: "Total Records", value: String(totalEntries) },
    { label: "Active", value: String(activeCount) },
    { label: "Released", value: String(releasedCount) },
    { label: "Expired", value: String(expiredCount) },
    { label: "Unlimited Duty", value: String(unlimitedCount) },
    { label: "Fixed Duty", value: String(fixedCount) },
  ];

  const statWidth = pageWidth / stats.length;
  stats.forEach((stat, i) => {
    const cx = statWidth * i + statWidth / 2;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(stat.value, cx, 37, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID_GRAY);
    doc.text(stat.label.toUpperCase(), cx, 40, { align: "center" });
  });

  // ── Table ─────────────────────────────────────────────────────────────────
  const rows = entries.map((entry, idx) => {
    const statusLabel = entry.status.toUpperCase();
    const typeLabel = entry.dutyType === "unlimited" ? "UNLIMITED" : "FIXED";
    const startStr = format(new Date(entry.startDateTime), "dd MMM yyyy HH:mm");
    const endStr = entry.endDateTime
      ? format(new Date(entry.endDateTime), "dd MMM yyyy HH:mm")
      : "Until Released";

    return [
      String(idx + 1),
      entry.personnel?.name ?? "—",
      entry.personnel?.beltNumber ?? "—",
      entry.personnel?.rank ?? "—",
      entry.dutyPoint?.name ?? "—",
      entry.dutyPoint?.location ?? "—",
      typeLabel,
      startStr,
      endStr,
      statusLabel,
    ];
  });

  autoTable(doc, {
    startY: 46,
    head: [["S.No", "Personnel Name", "Belt No.", "Rank", "Duty Point", "Location", "Type", "Start Time", "End Time", "Status"]],
    body: rows,
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: DARK_TEXT,
      font: "helvetica",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      halign: "left",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 252] as [number, number, number],
    },
    columnStyles: {
      0:  { cellWidth: 10, halign: "center" },
      1:  { cellWidth: 42 },
      2:  { cellWidth: 20, halign: "center", font: "courier" },
      3:  { cellWidth: 30 },
      4:  { cellWidth: 36 },
      5:  { cellWidth: 36 },
      6:  { cellWidth: 20, halign: "center" },
      7:  { cellWidth: 32, halign: "center" },
      8:  { cellWidth: 32, halign: "center" },
      9:  { cellWidth: 20, halign: "center" },
    },
    didParseCell(data) {
      if (data.column.index === 9 && data.section === "body") {
        const val = String(data.cell.text).trim();
        if (val === "ACTIVE") data.cell.styles.textColor = GREEN;
        else if (val === "EXPIRED") data.cell.styles.textColor = RED;
        else if (val === "RELEASED") data.cell.styles.textColor = SLATE;
      }
      if (data.column.index === 6 && data.section === "body") {
        const val = String(data.cell.text).trim();
        if (val === "UNLIMITED") data.cell.styles.textColor = RED;
        else data.cell.styles.textColor = [29, 78, 216] as [number, number, number];
      }
    },
    margin: { left: 8, right: 8 },
  });

  // ── Footer signature strip ─────────────────────────────────────────────────
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 180;
  const footerY = Math.max(finalY + 16, 185);

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);

  const sigPositions = [30, pageWidth / 2, pageWidth - 30];
  const sigLabels = ["Prepared By", "Checked By", "Officer In Charge"];
  sigPositions.forEach((x, i) => {
    doc.line(x - 25, footerY, x + 25, footerY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(sigLabels[i], x, footerY + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID_GRAY);
    doc.text("Signature & Stamp", x, footerY + 8, { align: "center" });
  });

  // Page number footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID_GRAY);
    doc.text(
      `Page ${i} of ${pageCount}  |  Ayodhya Police Line — Duty Management System  |  CONFIDENTIAL`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" },
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const dateStr = format(now, "yyyyMMdd_HHmm");
  const filterPart = statusFilter === "all" ? "all" : statusFilter;
  doc.save(`AyodhyaPolice_DutyReport_${filterPart}_${dateStr}.pdf`);
}
