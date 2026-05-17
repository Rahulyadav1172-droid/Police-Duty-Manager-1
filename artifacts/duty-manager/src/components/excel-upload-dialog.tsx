import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ColumnDef<T> = {
  key: keyof T;
  header: string;
  required?: boolean;
  transform?: (val: string) => string;
  validate?: (val: string) => string | null; // return error string or null
};

type RowResult<T> = {
  data: T;
  status: "pending" | "success" | "error";
  error?: string;
};

type Props<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: ColumnDef<T>[];
  templateFilename: string;
  templateSheetName?: string;
  sampleRows: string[][];
  onImportRow: (row: T) => Promise<void>;
  onComplete: () => void;
};

export function ExcelUploadDialog<T extends Record<string, string>>({
  open,
  onOpenChange,
  title,
  columns,
  templateFilename,
  templateSheetName = "Template",
  sampleRows,
  onImportRow,
  onComplete,
}: Props<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RowResult<T>[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  function downloadTemplate() {
    const headers = columns.map((c) => c.header);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

    // Column widths
    ws["!cols"] = headers.map(() => ({ wch: 24 }));

    XLSX.utils.book_append_sheet(wb, ws, templateSheetName);
    XLSX.writeFile(wb, templateFilename);
  }

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (raw.length < 2) {
        setRows([]);
        return;
      }

      // First row = headers, skip it
      const dataRows = raw.slice(1).filter((r) => r.some((cell) => String(cell).trim() !== ""));

      const parsed: RowResult<T>[] = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        let rowError: string | null = null;

        columns.forEach((col, idx) => {
          const raw = String(row[idx] ?? "").trim();
          const val = col.transform ? col.transform(raw) : raw;
          obj[col.key as string] = val;

          if (col.required && !val) {
            rowError = `"${col.header}" is required`;
          } else if (col.validate && val) {
            const err = col.validate(val);
            if (err && !rowError) rowError = err;
          }
        });

        return {
          data: obj as T,
          status: rowError ? "error" : "pending",
          error: rowError ?? undefined,
        };
      });

      setRows(parsed);
      setDone(false);
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setImporting(true);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === "error") continue;
      try {
        await onImportRow(updated[i].data);
        updated[i] = { ...updated[i], status: "success" };
      } catch (err: any) {
        updated[i] = {
          ...updated[i],
          status: "error",
          error: err?.message ?? "Import failed",
        };
      }
      setRows([...updated]);
    }

    setImporting(false);
    setDone(true);
    onComplete();
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const errorCount   = rows.filter((r) => r.status === "error").length;
  const successCount = rows.filter((r) => r.status === "success").length;

  function handleClose() {
    if (importing) return;
    setRows([]);
    setDone(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Step 1: Download template */}
          <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-dashed">
            <div>
              <p className="text-sm font-semibold">Step 1 — Download the template</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in the Excel template and upload it below. Column order must match.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
              <Download className="w-4 h-4" />
              Template
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-primary/5",
            )}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to upload Excel file</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files only</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold">Preview — {rows.length} row{rows.length !== 1 ? "s" : ""} found</p>
                <div className="flex gap-2 ml-auto text-xs">
                  {pendingCount > 0  && <Badge variant="secondary">{pendingCount} ready</Badge>}
                  {successCount > 0  && <Badge className="bg-green-100 text-green-800">{successCount} imported</Badge>}
                  {errorCount > 0    && <Badge variant="destructive">{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>}
                </div>
              </div>
              <div className="border rounded-lg overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      {columns.map((c) => (
                        <TableHead key={String(c.key)}>{c.header}</TableHead>
                      ))}
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i} className={row.status === "error" ? "bg-red-50/50" : row.status === "success" ? "bg-green-50/50" : ""}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        {columns.map((c) => (
                          <TableCell key={String(c.key)} className="text-sm max-w-[180px] truncate">
                            {row.data[c.key as string] || <span className="text-muted-foreground italic">empty</span>}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row.status === "success" && (
                            <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                          {row.status === "pending" && (
                            <span className="text-muted-foreground text-xs">Ready</span>
                          )}
                          {row.status === "error" && (
                            <span className="flex items-center gap-1 text-red-600 text-xs" title={row.error}>
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[80px]">{row.error}</span>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && pendingCount > 0 && (
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Importing…" : `Import ${pendingCount} Record${pendingCount !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
