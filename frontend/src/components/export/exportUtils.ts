import * as XLSX from "xlsx";

export type ExportFormat = "excel" | "csv" | "pdf" | "print";
export type ExportRow = Record<string, string | number | boolean | null | undefined>;

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function makeFileName(moduleName: string, parts: Array<string | number | null | undefined> = []): string {
  const cleanParts = parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .map((part) => part.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_"));

  return [moduleName, ...cleanParts, todayStamp()].join("_");
}

export function exportRows(format: ExportFormat, rows: ExportRow[], fileName: string, title: string): void {
  if (format === "excel") {
    exportExcel(rows, fileName, title);
    return;
  }

  if (format === "csv") {
    exportCsv(rows, fileName);
    return;
  }

  exportPrintable(rows, title, fileName, format === "print" ? "print" : "pdf");
}

function exportExcel(rows: ExportRow[], fileName: string, sheetName: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

function exportCsv(rows: ExportRow[], fileName: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportPrintable(rows: ExportRow[], title: string, fileName: string, mode: "pdf" | "print"): void {
  const columns = Object.keys(rows[0] ?? {});
  const win = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!win) return;

  const styles = `
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p { color: #64748b; margin: 0 0 18px; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; font-size: 11px; }
      th, td { border: 1px solid #e2e8f0; padding: 7px 8px; text-align: left; vertical-align: top; }
      th { background: #f8fafc; color: #334155; font-weight: 700; }
      tr:nth-child(even) td { background: #fbfdff; }
      @media print { body { margin: 14mm; } }
    </style>
  `;
  const body = `
    <h1>${escapeHtml(title)}</h1>
    <p>Generado el ${todayStamp()} · ${rows.length} registros</p>
    <table>
      <thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(row[c] ?? "")}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
    <script>
      window.onload = () => {
        window.focus();
        window.print();
        ${mode === "pdf" ? "" : "setTimeout(() => window.close(), 500);"}
      };
    </script>
  `;

  win.document.write(`<!doctype html><html><head><title>${escapeHtml(fileName)}</title>${styles}</head><body>${body}</body></html>`);
  win.document.close();
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
