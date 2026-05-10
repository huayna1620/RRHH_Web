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

  if (format === "pdf") {
    exportPdf(rows, title, fileName);
    return;
  }

  exportPrintable(rows, title, fileName);
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
  downloadBlob(blob, `${fileName}.csv`);
}

function exportPdf(rows: ExportRow[], title: string, fileName: string): void {
  const columns = Object.keys(rows[0] ?? {});
  const lines = [
    title,
    `Generado el ${todayStamp()} - ${rows.length} registros`,
    "",
    columns.join(" | "),
    ...rows.map((row) => columns.map((column) => row[column] ?? "").join(" | ")),
  ];
  const pdf = buildSimplePdf(lines);
  const blob = new Blob([pdf], { type: "application/pdf" });
  downloadBlob(blob, `${fileName}.pdf`);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportPrintable(rows: ExportRow[], title: string, fileName: string): void {
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
        setTimeout(() => window.close(), 500);
      };
    </script>
  `;

  win.document.write(`<!doctype html><html><head><title>${escapeHtml(fileName)}</title>${styles}</head><body>${body}</body></html>`);
  win.document.close();
}

function buildSimplePdf(lines: string[]): string {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 42;
  const startY = 790;
  const lineHeight = 15;
  const maxChars = 92;
  const linesPerPage = 48;
  const wrapped = lines.flatMap((line) => wrapPdfLine(toPdfText(line), maxChars));
  const pages: string[] = [];

  for (let i = 0; i < wrapped.length; i += linesPerPage) {
    const chunk = wrapped.slice(i, i + linesPerPage);
    const text = chunk
      .map((line, index) => `1 0 0 1 ${marginX} ${startY - index * lineHeight} Tm (${escapePdfText(line)}) Tj`)
      .join("\n");
    pages.push(`BT\n/F1 9 Tf\n${text}\nET`);
  }

  if (pages.length === 0) pages.push("BT\n/F1 9 Tf\nET");

  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  const catalogObject = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  void catalogObject;
  addObject("<< /Type /Pages /Kids [] /Count 0 >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((content) => {
    const contentObject = addObject(`<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`);
    const pageObject = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`,
    );
    pageObjectNumbers.push(pageObject);
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((page) => `${page} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>\nendobj\n`;

  function addObject(body: string): number {
    const number = objects.length + 1;
    objects.push(`${number} 0 obj\n${body}\nendobj\n`);
    return number;
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(byteLength(pdf));
    pdf += object;
  }

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function wrapPdfLine(line: string, maxChars: number): string[] {
  if (!line) return [""];
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > maxChars) {
    const index = remaining.lastIndexOf(" ", maxChars);
    const cut = index > 20 ? index : maxChars;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  chunks.push(remaining);
  return chunks;
}

function toPdfText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
