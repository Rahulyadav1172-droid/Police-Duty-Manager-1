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

// ─────────────────────────────────────────────────────────────────────────────
// HANDOVER REPORT
// ─────────────────────────────────────────────────────────────────────────────

export type HandoverOfficer = {
  name: string;
  rank: string;
  beltNumber?: string;
  remarks?: string;
};

export type HandoverOptions = {
  outgoing: HandoverOfficer;
  incoming: HandoverOfficer;
  entries: RosterEntry[];
  handoverDateTime?: Date;
  witnessName?: string;
  witnessRank?: string;
  location?: string;
};

export function generateHandoverReport(opts: HandoverOptions): void {
  const { outgoing, incoming, entries, witnessName, witnessRank, location } = opts;
  const now = opts.handoverDateTime ?? new Date();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const NAVY   = [13, 27, 62]   as [number, number, number];
  const GOLD   = [180, 140, 40] as [number, number, number];
  const WHITE  = [255, 255, 255] as [number, number, number];
  const LIGHT  = [240, 244, 255] as [number, number, number];
  const DARK   = [20, 20, 30]   as [number, number, number];
  const GRAY   = [100, 100, 110] as [number, number, number];
  const GREEN  = [22, 101, 52]  as [number, number, number];
  const RED    = [153, 27, 27]  as [number, number, number];
  const BLUE   = [29, 78, 216]  as [number, number, number];
  const AMBER  = [146, 64, 14]  as [number, number, number];

  // ── Top header ────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 36, "F");

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 34, pageWidth, 2, "F");

  // Emblem circle left
  doc.setFillColor(...WHITE);
  doc.circle(20, 18, 10, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("AYODHYA", 20, 15, { align: "center" });
  doc.text("POLICE", 20, 19, { align: "center" });
  doc.text("LINE", 20, 23, { align: "center" });

  // Emblem circle right (mirror)
  doc.setFillColor(...WHITE);
  doc.circle(pageWidth - 20, 18, 10, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("AYODHYA", pageWidth - 20, 15, { align: "center" });
  doc.text("POLICE", pageWidth - 20, 19, { align: "center" });
  doc.text("LINE", pageWidth - 20, 23, { align: "center" });

  // Main title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("DUTY HANDOVER CERTIFICATE", pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Ayodhya Police Line — Official Shift Handover Record", pageWidth / 2, 22, { align: "center" });
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text(`Date & Time: ${format(now, "dd MMMM yyyy, HH:mm")}${location ? `   |   Location: ${location}` : ""}`, pageWidth / 2, 29, { align: "center" });

  // ── Two-column officer block ───────────────────────────────────────────────
  const colPad = 10;
  const colW   = (pageWidth - colPad * 3) / 2;
  const topY   = 42;
  const boxH   = 38;

  // Outgoing officer — left box
  doc.setFillColor(...LIGHT);
  doc.roundedRect(colPad, topY, colW, boxH, 3, 3, "F");
  doc.setFillColor(...RED);
  doc.roundedRect(colPad, topY, colW, 8, 3, 3, "F");
  doc.rect(colPad, topY + 5, colW, 3, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("OUTGOING OFFICER  (Handing Over)", colPad + colW / 2, topY + 5.5, { align: "center" });

  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(outgoing.name || "—", colPad + 5, topY + 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(outgoing.rank || "—", colPad + 5, topY + 24);
  if (outgoing.beltNumber) {
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text(`Belt: ${outgoing.beltNumber}`, colPad + 5, topY + 30);
  }
  if (outgoing.remarks) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...AMBER);
    doc.text(`Note: ${outgoing.remarks}`, colPad + 5, topY + 36, { maxWidth: colW - 8 });
  }

  // Incoming officer — right box
  const rightX = colPad * 2 + colW;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(rightX, topY, colW, boxH, 3, 3, "F");
  doc.setFillColor(...GREEN);
  doc.roundedRect(rightX, topY, colW, 8, 3, 3, "F");
  doc.rect(rightX, topY + 5, colW, 3, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("INCOMING OFFICER  (Taking Over)", rightX + colW / 2, topY + 5.5, { align: "center" });

  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(incoming.name || "—", rightX + 5, topY + 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(incoming.rank || "—", rightX + 5, topY + 24);
  if (incoming.beltNumber) {
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text(`Belt: ${incoming.beltNumber}`, rightX + 5, topY + 30);
  }
  if (incoming.remarks) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...AMBER);
    doc.text(`Note: ${incoming.remarks}`, rightX + 5, topY + 36, { maxWidth: colW - 8 });
  }

  // ── Section heading ────────────────────────────────────────────────────────
  const tableStartY = topY + boxH + 8;
  doc.setFillColor(...NAVY);
  doc.rect(colPad, tableStartY - 5, pageWidth - colPad * 2, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(`DUTIES BEING HANDED OVER  (${entries.length} assignment${entries.length !== 1 ? "s" : ""})`, pageWidth / 2, tableStartY - 0.5, { align: "center" });

  // ── Assignments table ──────────────────────────────────────────────────────
  const rows = entries.map((entry, idx) => {
    const typeLabel = entry.dutyType === "unlimited" ? "UNLIMITED" : "FIXED";
    const startStr  = format(new Date(entry.startDateTime), "dd MMM yyyy, HH:mm");
    const endStr    = entry.endDateTime
      ? format(new Date(entry.endDateTime), "dd MMM yyyy, HH:mm")
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
    ];
  });

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [["#", "Personnel Name", "Belt No.", "Rank", "Duty Point", "Location", "Type", "Start Time", "End Time"]],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: DARK,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [247, 249, 255] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 38 },
      2: { cellWidth: 20, halign: "center", font: "courier" },
      3: { cellWidth: 28 },
      4: { cellWidth: 30 },
      5: { cellWidth: 30 },
      6: { cellWidth: 18, halign: "center" },
      7: { cellWidth: 26, halign: "center" },
      8: { cellWidth: 26, halign: "center" },
    },
    didParseCell(data) {
      if (data.column.index === 6 && data.section === "body") {
        const val = String(data.cell.text).trim();
        data.cell.styles.textColor = val === "UNLIMITED" ? RED : BLUE;
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: colPad, right: colPad },
  });

  // ── No entries message ─────────────────────────────────────────────────────
  if (entries.length === 0) {
    const emptyY = tableStartY + 14;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    doc.text("No duty assignments selected for handover.", pageWidth / 2, emptyY, { align: "center" });
  }

  // ── Signature block ────────────────────────────────────────────────────────
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 180;
  const sigY   = Math.min(finalY + 18, 240);

  // Gold divider
  doc.setFillColor(...GOLD);
  doc.rect(colPad, sigY - 4, pageWidth - colPad * 2, 0.5, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("SIGNATURES", pageWidth / 2, sigY, { align: "center" });

  const sigBoxW = 50;
  const sigBoxH = 22;
  const sigPairs: Array<{ x: number; label: string; sub: string }> = [
    { x: colPad + 5,                   label: "OUTGOING OFFICER", sub: `${outgoing.name}\n${outgoing.rank}` },
    { x: pageWidth / 2 - sigBoxW / 2,  label: witnessName ? "WITNESS" : "OFFICER IN CHARGE", sub: witnessName ? `${witnessName}${witnessRank ? `\n${witnessRank}` : ""}` : "Signature & Stamp" },
    { x: pageWidth - colPad - 5 - sigBoxW, label: "INCOMING OFFICER", sub: `${incoming.name}\n${incoming.rank}` },
  ];

  sigPairs.forEach(({ x, label, sub }) => {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, sigY + 4, sigBoxW, sigBoxH, 2, 2, "F");
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.line(x + 4, sigY + 19, x + sigBoxW - 4, sigY + 19);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(label, x + sigBoxW / 2, sigY + 23, { align: "center" });

    const subLines = sub.split("\n");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    subLines.forEach((line, li) => {
      doc.text(line, x + sigBoxW / 2, sigY + 26 + li * 3.5, { align: "center" });
    });
  });

  // ── Certification text ────────────────────────────────────────────────────
  const certY = sigY + sigBoxH + 14;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(colPad, certY, pageWidth - colPad * 2, 18, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...DARK);
  const certText = `I, ${outgoing.name} (${outgoing.rank}), hereby certify that I have handed over the above duty assignments to ${incoming.name} (${incoming.rank}) on ${format(now, "dd MMMM yyyy")} at ${format(now, "HH:mm")} hours. All duties listed above have been communicated and acknowledged.`;
  doc.text(certText, colPad + 5, certY + 7, { maxWidth: pageWidth - colPad * 2 - 10 });

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, doc.internal.pageSize.getHeight() - 8, pageWidth, 8, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...WHITE);
    doc.text(
      `Ayodhya Police Line — Duty Handover Certificate  |  CONFIDENTIAL  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 3,
      { align: "center" },
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const dateStr = format(now, "yyyyMMdd_HHmm");
  doc.save(`AyodhyaPolice_Handover_${dateStr}.pdf`);
}
