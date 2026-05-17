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

// ─────────────────────────────────────────────────────────────────────────────
// MUSTER ROLL / DAILY ATTENDANCE REGISTER
// ─────────────────────────────────────────────────────────────────────────────

export type MusterPersonnel = {
  id: number;
  name: string;
  beltNumber: string;
  rank: string;
  mobileNumber: string;
  createdAt: string;
};

export type MusterRosterEntry = {
  id: number;
  dutyType: string;
  startDateTime: string;
  endDateTime: string | null;
  status: string;
  dutyPoint?: {
    name: string;
    location: string;
  };
};

export type MusterOptions = {
  personnel: MusterPersonnel[];
  activeRoster: MusterRosterEntry[];
  paradeDateTime?: Date;
  paradeName?: string;
  commandingOfficerName?: string;
  commandingOfficerRank?: string;
  remarks?: string;
};

const RANK_ORDER: Record<string, number> = {
  Inspector: 1,
  "Sub-Inspector": 2,
  "Head Constable": 3,
  Constable: 4,
};

export function generateMusterRoll(opts: MusterOptions): void {
  const {
    personnel,
    activeRoster,
    paradeName,
    commandingOfficerName,
    commandingOfficerRank,
    remarks,
  } = opts;
  const now = opts.paradeDateTime ?? new Date();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const NAVY  = [13, 27, 62]    as [number, number, number];
  const GOLD  = [180, 140, 40]  as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const LIGHT = [240, 244, 255] as [number, number, number];
  const DARK  = [20, 20, 30]    as [number, number, number];
  const GRAY  = [100, 100, 110] as [number, number, number];
  const GREEN = [22, 101, 52]   as [number, number, number];
  const RED   = [153, 27, 27]   as [number, number, number];

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 38, pageWidth, 2, "F");

  // Emblem circles
  [16, pageWidth - 16].forEach((cx) => {
    doc.setFillColor(...WHITE);
    doc.circle(cx, 20, 11, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("AYODHYA", cx, 17, { align: "center" });
    doc.text("POLICE", cx, 21, { align: "center" });
    doc.text("LINE", cx, 25, { align: "center" });
  });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("AYODHYA POLICE LINE", pageWidth / 2, 13, { align: "center" });
  doc.setFontSize(11);
  doc.text(paradeName ? paradeName.toUpperCase() : "DAILY MUSTER ROLL", pageWidth / 2, 22, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GOLD);
  doc.text(
    `Date: ${format(now, "dd MMMM yyyy (EEEE)")}   |   Parade Time: ${format(now, "HH:mm")} hrs`,
    pageWidth / 2,
    31,
    { align: "center" },
  );

  // ── Summary stat strip ────────────────────────────────────────────────────
  const onDutyIds = new Set(activeRoster.map((r) => r.id));

  const totalStrength = personnel.length;
  const onDutyCount   = activeRoster.length;
  const availCount    = totalStrength - onDutyCount;

  const rankGroups = Object.keys(RANK_ORDER);
  const rankBreakdown = rankGroups.map((rank) => ({
    rank,
    total:   personnel.filter((p) => p.rank === rank).length,
    onDuty:  activeRoster.filter((r) => {
      const p = personnel.find((pe) => pe.id === (r as MusterRosterEntry & { personnelId?: number }).personnelId);
      return p?.rank === rank;
    }).length,
  }));

  doc.setFillColor(...LIGHT);
  doc.rect(0, 40, pageWidth, 18, "F");

  const statCols = [
    { label: "TOTAL STRENGTH", value: String(totalStrength) },
    { label: "ON DUTY",        value: String(onDutyCount),   color: RED   },
    { label: "AVAILABLE",      value: String(availCount),    color: GREEN },
  ];
  const statW = pageWidth / statCols.length;
  statCols.forEach((s, i) => {
    const cx = statW * i + statW / 2;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(s.color ?? NAVY));
    doc.text(s.value, cx, 51, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(s.label, cx, 55, { align: "center" });
  });

  // ── Rank-wise breakdown bar ───────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 58, pageWidth, 7, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);

  const rankW = pageWidth / rankBreakdown.length;
  rankBreakdown.forEach((rb, i) => {
    const cx = rankW * i + rankW / 2;
    const shortRank = rb.rank === "Sub-Inspector" ? "SI" : rb.rank === "Head Constable" ? "HC" : rb.rank.substring(0, 4).toUpperCase();
    doc.text(`${shortRank}: ${rb.onDuty}/${rb.total}`, cx, 63, { align: "center" });
  });

  // ── Personnel table ───────────────────────────────────────────────────────
  // Sort by rank order then by name
  const activeRosterMap = new Map<number, MusterRosterEntry>();
  activeRoster.forEach((r) => {
    const entry = r as MusterRosterEntry & { personnelId?: number };
    if (entry.personnelId) activeRosterMap.set(entry.personnelId, r);
  });

  const sorted = [...personnel].sort((a, b) => {
    const ro = (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9);
    return ro !== 0 ? ro : a.name.localeCompare(b.name);
  });

  const rows = sorted.map((p, idx) => {
    const duty = activeRosterMap.get(p.id);
    const statusLabel = duty ? "ON DUTY" : "AVAILABLE";
    const dutyPointName = duty?.dutyPoint?.name ?? "—";
    const dutyType = duty
      ? duty.dutyType === "unlimited" ? "UNLIMITED" : "FIXED"
      : "—";
    const startTime = duty
      ? format(new Date(duty.startDateTime), "dd/MM HH:mm")
      : "—";
    const endTime = duty
      ? duty.endDateTime
        ? format(new Date(duty.endDateTime), "dd/MM HH:mm")
        : "—"
      : "—";

    return [
      String(idx + 1),
      p.name,
      p.beltNumber,
      p.rank,
      statusLabel,
      dutyPointName,
      dutyType,
      startTime,
      endTime,
      "",    // signature column — left blank for physical signing
    ];
  });

  autoTable(doc, {
    startY: 70,
    head: [["S.No", "Name", "Belt No.", "Rank", "Status", "Duty Post", "Type", "Start", "End", "Signature"]],
    body: rows,
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
      textColor: DARK,
      lineColor: [200, 210, 230] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [247, 249, 255] as [number, number, number],
    },
    columnStyles: {
      0:  { cellWidth: 8,  halign: "center" },
      1:  { cellWidth: 34 },
      2:  { cellWidth: 16, halign: "center", font: "courier" },
      3:  { cellWidth: 22 },
      4:  { cellWidth: 16, halign: "center", fontStyle: "bold" },
      5:  { cellWidth: 28 },
      6:  { cellWidth: 15, halign: "center" },
      7:  { cellWidth: 16, halign: "center" },
      8:  { cellWidth: 16, halign: "center" },
      9:  { cellWidth: 22 },
    },
    didParseCell(data) {
      if (data.column.index === 4 && data.section === "body") {
        const val = String(data.cell.text).trim();
        data.cell.styles.textColor = val === "ON DUTY" ? RED : GREEN;
      }
      if (data.column.index === 6 && data.section === "body") {
        const val = String(data.cell.text).trim();
        if (val === "UNLIMITED") data.cell.styles.textColor = RED;
        else if (val === "FIXED") data.cell.styles.textColor = [29, 78, 216] as [number, number, number];
      }
    },
    margin: { left: 8, right: 8 },
  });

  // ── Remarks block ─────────────────────────────────────────────────────────
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 220;
  let currentY = finalY + 8;

  if (remarks && remarks.trim()) {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(8, currentY, pageWidth - 16, 14, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("REMARKS:", 13, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(remarks, 37, currentY + 6, { maxWidth: pageWidth - 50 });
    currentY += 20;
  }

  // ── Certification + Signature strip ───────────────────────────────────────
  const sigY = Math.min(currentY + 4, pageHeight - 52);

  doc.setFillColor(...GOLD);
  doc.rect(8, sigY, pageWidth - 16, 0.5, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...DARK);
  const cert = `Certified that the above muster roll is correct and all personnel have been accounted for as on ${format(now, "dd MMMM yyyy")} at ${format(now, "HH:mm")} hours.`;
  doc.text(cert, pageWidth / 2, sigY + 7, { align: "center", maxWidth: pageWidth - 40 });

  // Signature boxes
  const sigBoxW = 50;
  const sigBoxH = 22;
  const sigItems: Array<{ x: number; label: string; sub: string }> = [
    { x: 10,                              label: "PREPARED BY",          sub: "Duty Writer / Clerk" },
    { x: pageWidth / 2 - sigBoxW / 2,    label: commandingOfficerName ? commandingOfficerName.toUpperCase() : "COMMANDING OFFICER",
      sub: commandingOfficerRank ?? "Signature & Stamp" },
    { x: pageWidth - 10 - sigBoxW,       label: "OFFICER IN CHARGE",     sub: "Reserve Inspector / Adjutant" },
  ];

  sigItems.forEach(({ x, label, sub }) => {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, sigY + 14, sigBoxW, sigBoxH, 2, 2, "F");
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.line(x + 4, sigY + 28, x + sigBoxW - 4, sigY + 28);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(label, x + sigBoxW / 2, sigY + 32, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(sub, x + sigBoxW / 2, sigY + 35.5, { align: "center" });
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageHeight - 8, pageWidth, 8, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...WHITE);
    doc.text(
      `Ayodhya Police Line — Muster Roll  |  ${format(now, "dd MMM yyyy")}  |  OFFICIAL RECORD  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 3,
      { align: "center" },
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const dateStr = format(now, "yyyyMMdd_HHmm");
  doc.save(`AyodhyaPolice_MusterRoll_${dateStr}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFER RECEIPT
// ─────────────────────────────────────────────────────────────────────────────

export type TransferReceiptData = {
  // Personnel
  name: string;
  beltNumber: string;
  rank: string;
  mobileNumber?: string;
  // Transfer details
  transferFrom: string;
  transferTo: string;
  orderNumber: string;
  orderDate: string;          // ISO date string
  reportingDate: string;      // ISO date string
  designationAtNewPost?: string;
  remarks?: string;
  // Issuing authority
  issuingOfficerName?: string;
  issuingOfficerRank?: string;
};

export function generateTransferReceipt(data: TransferReceiptData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth  = doc.internal.pageSize.getWidth();   // 210
  const pageHeight = doc.internal.pageSize.getHeight();  // 297
  const now = new Date();

  const NAVY       = [13,  27,  62]  as [number, number, number];
  const GOLD       = [180, 140, 40]  as [number, number, number];
  const LIGHT_BLUE = [232, 240, 254] as [number, number, number];
  const WHITE      = [255, 255, 255] as [number, number, number];
  const DARK_TEXT  = [20,  20,  20]  as [number, number, number];
  const MID_GRAY   = [100, 100, 110] as [number, number, number];
  const BORDER_GRAY= [200, 205, 215] as [number, number, number];

  // Auto receipt number: TR-YYYYMMDD-XXXX
  const receiptNo = `TR-${format(now, "yyyyMMdd")}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 36, "F");

  // Left emblem
  doc.setFillColor(...LIGHT_BLUE);
  doc.circle(20, 18, 11, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("UP",     20, 15.5, { align: "center" });
  doc.text("POLICE", 20, 19.5, { align: "center" });
  doc.text("",       20, 23,   { align: "center" });

  // Right emblem
  doc.setFillColor(...LIGHT_BLUE);
  doc.circle(pageWidth - 20, 18, 11, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("UP",     pageWidth - 20, 15.5, { align: "center" });
  doc.text("POLICE", pageWidth - 20, 19.5, { align: "center" });

  // Title
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("AYODHYA POLICE LINE", pageWidth / 2, 11, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Uttar Pradesh Police — Ayodhya District", pageWidth / 2, 18, { align: "center" });

  // Gold divider + Hindi/English subtitle
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(40, 22, pageWidth - 40, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text("TRANSFER RECEIPT  /  STHANANTARAN PRAMAN PATRA", pageWidth / 2, 30, { align: "center" });

  // ── Receipt meta row ───────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(0, 36, pageWidth, 12, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(`Receipt No.: ${receiptNo}`, 12, 44);
  doc.text(`Issued On: ${format(now, "dd MMM yyyy, HH:mm")}`, pageWidth / 2, 44, { align: "center" });
  doc.text(`Order No.: ${data.orderNumber || "—"}`, pageWidth - 12, 44, { align: "right" });

  // ── Section helper ─────────────────────────────────────────────────────────
  let cursorY = 56;
  const margin = 12;
  const contentW = pageWidth - margin * 2;

  function sectionHeader(title: string) {
    doc.setFillColor(...NAVY);
    doc.rect(margin, cursorY, contentW, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(title.toUpperCase(), margin + 4, cursorY + 5);
    cursorY += 7;
  }

  function fieldRow(label: string, value: string, col2Label?: string, col2Value?: string) {
    const rowH = 9;
    // border
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.3);
    doc.rect(margin, cursorY, contentW, rowH);
    if (col2Label !== undefined) {
      doc.line(margin + contentW / 2, cursorY, margin + contentW / 2, cursorY + rowH);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MID_GRAY);
    doc.text(label, margin + 3, cursorY + 3.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.text(value || "—", margin + 3, cursorY + 7.5);

    if (col2Label !== undefined) {
      const col2X = margin + contentW / 2 + 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...MID_GRAY);
      doc.text(col2Label, col2X, cursorY + 3.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...DARK_TEXT);
      doc.text(col2Value || "—", col2X, cursorY + 7.5);
    }

    cursorY += rowH;
  }

  // ── Section 1: Personnel Details ───────────────────────────────────────────
  sectionHeader("1. Personnel Details");
  fieldRow("Full Name", data.name.toUpperCase(), "Belt / PNO Number", data.beltNumber.toUpperCase());
  fieldRow("Rank", data.rank.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), "Mobile Number", data.mobileNumber || "Not Provided");

  cursorY += 4;

  // ── Section 2: Transfer Details ────────────────────────────────────────────
  sectionHeader("2. Transfer Details");
  fieldRow("Transfer From", data.transferFrom, "Transfer To", data.transferTo);
  fieldRow(
    "Date of Transfer Order",
    data.orderDate ? format(new Date(data.orderDate), "dd MMMM yyyy") : "—",
    "Date of Reporting at New Post",
    data.reportingDate ? format(new Date(data.reportingDate), "dd MMMM yyyy") : "—",
  );
  if (data.designationAtNewPost) {
    fieldRow("Designation / Post at New Station", data.designationAtNewPost);
  }

  cursorY += 4;

  // ── Section 3: Remarks ─────────────────────────────────────────────────────
  sectionHeader("3. Remarks / Additional Notes");
  const remarkH = 18;
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.3);
  doc.rect(margin, cursorY, contentW, remarkH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);
  const remarkText = data.remarks?.trim() || "No additional remarks.";
  const remarkLines = doc.splitTextToSize(remarkText, contentW - 6);
  doc.text(remarkLines, margin + 3, cursorY + 5);
  cursorY += remarkH + 6;

  // ── Certification paragraph ─────────────────────────────────────────────────
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, cursorY, contentW, 22, "F");
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.3);
  doc.rect(margin, cursorY, contentW, 22);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_TEXT);
  const certText =
    `This is to certify that ${data.rank.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} ` +
    `${data.name.toUpperCase()} (Belt No. ${data.beltNumber.toUpperCase()}) has been duly transferred from ` +
    `${data.transferFrom} to ${data.transferTo} vide Order No. ${data.orderNumber || "—"} ` +
    `dated ${data.orderDate ? format(new Date(data.orderDate), "dd MMMM yyyy") : "—"}. ` +
    `He / She is hereby relieved of all duties and responsibilities at this unit with effect from the date of this receipt. ` +
    `The receiving office is requested to acknowledge the joining of the above personnel.`;
  const certLines = doc.splitTextToSize(certText, contentW - 8);
  doc.text(certLines, margin + 4, cursorY + 6);
  cursorY += 22 + 10;

  // ── Signature blocks ────────────────────────────────────────────────────────
  const sigW = (contentW - 10) / 3;
  const sigH = 28;
  const sigBoxes = [
    { label: "ISSUING OFFICER", name: data.issuingOfficerName, rank: data.issuingOfficerRank },
    { label: "COMMANDING OFFICER", name: "Police Line, Ayodhya", rank: "" },
    { label: "RECEIVING OFFICE STAMP", name: "", rank: "" },
  ];

  sigBoxes.forEach((box, i) => {
    const x = margin + i * (sigW + 5);
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.3);
    doc.rect(x, cursorY, sigW, sigH);

    // signature line
    doc.setDrawColor(...MID_GRAY);
    doc.setLineWidth(0.4);
    doc.line(x + 6, cursorY + sigH - 14, x + sigW - 6, cursorY + sigH - 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(box.label, x + sigW / 2, cursorY + sigH - 10, { align: "center" });

    if (box.name) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...DARK_TEXT);
      doc.text(box.name, x + sigW / 2, cursorY + sigH - 6, { align: "center" });
    }
    if (box.rank) {
      doc.setFontSize(7);
      doc.setTextColor(...MID_GRAY);
      doc.text(box.rank, x + sigW / 2, cursorY + sigH - 2, { align: "center" });
    }
  });

  cursorY += sigH + 6;

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, pageHeight - 10, pageWidth, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(
    `CONFIDENTIAL — AYODHYA POLICE LINE | Receipt No.: ${receiptNo} | ${format(now, "dd MMM yyyy HH:mm")}`,
    pageWidth / 2,
    pageHeight - 4,
    { align: "center" },
  );

  // ── Save ────────────────────────────────────────────────────────────────────
  const safeName = data.name.replace(/\s+/g, "_").toUpperCase();
  doc.save(`AyodhyaPolice_TransferReceipt_${safeName}_${format(now, "yyyyMMdd")}.pdf`);
}
