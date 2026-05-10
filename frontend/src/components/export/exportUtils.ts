import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportFormat = "excel" | "csv" | "pdf" | "print";
export type ExportRow = Record<string, string | number | boolean | null | undefined>;
export type ReportMetric = { label: string; value: string | number; helper?: string };
export type ReportFilter = { label: string; value: string | number | null | undefined };
export type ReportOptions = {
  title?: string;
  subtitle?: string;
  generatedBy?: string;
  period?: string;
  filters?: ReportFilter[];
  metrics?: ReportMetric[];
};

type ReportModel = {
  title: string;
  subtitle: string;
  generatedAt: string;
  generatedBy: string;
  period: string;
  filters: Array<{ label: string; value: string }>;
  metrics: ReportMetric[];
};

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

export function exportRows(format: ExportFormat, rows: ExportRow[], fileName: string, title: string, options: ReportOptions = {}): void {
  if (format === "excel") {
    exportExcel(rows, fileName, title);
    return;
  }

  if (format === "csv") {
    exportCsv(rows, fileName);
    return;
  }

  if (format === "pdf") {
    exportPdf(rows, title, fileName, options);
    return;
  }

  exportPrintable(rows, title, fileName, options);
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

function exportPdf(rows: ExportRow[], title: string, fileName: string, options: ReportOptions): void {
  const columns = Object.keys(rows[0] ?? {});
  const report = normalizeReport(rows, title, options);
  const doc = new jsPDF({ orientation: columns.length > 7 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 86, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SAE - RRHH", margin, 28);
  doc.setFontSize(18);
  doc.text(report.title, margin, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(report.subtitle, margin, 72, { maxWidth: pageWidth - margin * 2 });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Datos de emision", margin, 112);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha y hora: ${report.generatedAt}`, margin, 130);
  doc.text(`Generado por: ${report.generatedBy}`, margin, 146);
  doc.text(`Periodo: ${report.period}`, margin, 162);

  let currentY = 186;
  if (report.filters.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Filtros aplicados", margin, currentY);
    currentY += 10;
    autoTable(doc, {
      startY: currentY,
      theme: "plain",
      margin: { left: margin, right: margin },
      body: chunk(report.filters, 3).map((group) => group.map((filter) => `${filter.label}: ${filter.value}`)),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: [71, 85, 105], fillColor: [248, 250, 252] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 22;
  }

  if (report.metrics.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Resumen ejecutivo", margin, currentY);
    currentY += 10;
    autoTable(doc, {
      startY: currentY,
      theme: "plain",
      margin: { left: margin, right: margin },
      body: [report.metrics.map((metric) => `${metric.label}\n${metric.value}${metric.helper ? `\n${metric.helper}` : ""}`)],
      styles: { font: "helvetica", fontSize: 8, cellPadding: 8, lineColor: [226, 232, 240], lineWidth: 0.5, textColor: [51, 65, 85], fillColor: [240, 253, 250] },
    });
    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 24;
  }

  autoTable(doc, {
    startY: currentY,
    head: [columns],
    body: rows.map((row) => columns.map((column) => formatCell(row[column]))),
    margin: { left: margin, right: margin, bottom: 42 },
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 5, overflow: "linebreak", textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.4 },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => drawPdfFooter(doc, report.title),
  });

  doc.save(`${fileName}.pdf`);
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

function exportPrintable(rows: ExportRow[], title: string, fileName: string, options: ReportOptions): void {
  const columns = Object.keys(rows[0] ?? {});
  const report = normalizeReport(rows, title, options);
  const win = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!win) return;

  const styles = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 0; background: #f1f5f9; }
      .page { width: min(1120px, calc(100% - 40px)); margin: 24px auto; background: white; box-shadow: 0 20px 60px rgba(15,23,42,.12); }
      .hero { background: #0f766e; color: white; padding: 28px 34px 24px; }
      .system { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .9; }
      h1 { font-size: 28px; line-height: 1.1; margin: 10px 0 8px; }
      .subtitle { color: #ccfbf1; margin: 0; max-width: 780px; font-size: 13px; }
      .content { padding: 26px 34px 34px; }
      .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
      .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
      .label { color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
      .value { color: #0f172a; font-size: 13px; font-weight: 700; }
      .section-title { font-size: 13px; font-weight: 900; color: #0f172a; margin: 22px 0 10px; }
      .filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
      .metric { border: 1px solid #99f6e4; background: #f0fdfa; border-radius: 12px; padding: 13px; }
      .metric .value { font-size: 20px; color: #0f766e; }
      .metric .helper { color: #64748b; font-size: 11px; margin-top: 3px; }
      table { border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 8px; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 9px 8px; text-align: left; vertical-align: top; }
      th { background: #0f766e; color: white; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
      tbody tr:nth-child(even) td { background: #f8fafc; }
      .footer { display: flex; justify-content: space-between; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; }
      @media print {
        body { background: white; }
        .page { width: auto; margin: 0; box-shadow: none; }
        @page { size: A4 landscape; margin: 12mm; }
        thead { display: table-header-group; }
        tr, .box, .metric { break-inside: avoid; page-break-inside: avoid; }
      }
    </style>
  `;
  const body = `
    <main class="page">
      <header class="hero">
        <div class="system">SAE - RRHH</div>
        <h1>${escapeHtml(report.title)}</h1>
        <p class="subtitle">${escapeHtml(report.subtitle)}</p>
      </header>
      <section class="content">
        <div class="meta">
          <div class="box"><div class="label">Fecha y hora</div><div class="value">${escapeHtml(report.generatedAt)}</div></div>
          <div class="box"><div class="label">Generado por</div><div class="value">${escapeHtml(report.generatedBy)}</div></div>
          <div class="box"><div class="label">Periodo</div><div class="value">${escapeHtml(report.period)}</div></div>
        </div>
        ${report.filters.length ? `<h2 class="section-title">Filtros aplicados</h2><div class="filters">${report.filters.map((filter) => `<div class="box"><div class="label">${escapeHtml(filter.label)}</div><div class="value">${escapeHtml(filter.value)}</div></div>`).join("")}</div>` : ""}
        ${report.metrics.length ? `<h2 class="section-title">Resumen ejecutivo</h2><div class="metrics">${report.metrics.map((metric) => `<div class="metric"><div class="label">${escapeHtml(metric.label)}</div><div class="value">${escapeHtml(metric.value)}</div>${metric.helper ? `<div class="helper">${escapeHtml(metric.helper)}</div>` : ""}</div>`).join("")}</div>` : ""}
        <h2 class="section-title">Detalle del reporte</h2>
        <table>
          <thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(formatCell(row[c]))}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
        <footer class="footer"><span>${escapeHtml(report.title)}</span><span>Emitido por SAE - RRHH - ${escapeHtml(report.generatedAt)}</span></footer>
      </section>
    </main>
    <script>
      window.onload = () => {
        window.focus();
        window.print();
      };
    </script>
  `;

  win.document.write(`<!doctype html><html><head><title>${escapeHtml(fileName)}</title>${styles}</head><body>${body}</body></html>`);
  win.document.close();
}

function normalizeReport(rows: ExportRow[], title: string, options: ReportOptions): ReportModel {
  const generatedAt = new Date().toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
  const filters = (options.filters ?? []).filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() !== "");
  const metrics = options.metrics?.length ? options.metrics : [{ label: "Total registros", value: rows.length.toLocaleString("es-PE") }];
  return {
    title: options.title ?? title,
    subtitle: options.subtitle ?? "Reporte generado con los criterios y filtros actuales del sistema.",
    generatedAt,
    generatedBy: options.generatedBy ?? getStoredUserName(),
    period: options.period ?? "Segun filtros aplicados",
    filters: filters.map((item) => ({ label: item.label, value: String(item.value) })),
    metrics,
  };
}

function drawPdfFooter(doc: jsPDF, title: string): void {
  const pageCount = doc.getNumberOfPages();
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${title} - SAE - RRHH`, 36, pageHeight - 22);
  doc.text(`Pagina ${currentPage} de ${pageCount}`, pageWidth - 96, pageHeight - 22);
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

function formatCell(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString("es-PE");
  if (typeof value === "boolean") return value ? "Si" : "No";
  return String(value ?? "");
}

function getStoredUserName(): string {
  try {
    const raw = localStorage.getItem("hrms_user");
    if (!raw) return "Usuario del sistema";
    const user = JSON.parse(raw) as { fullName?: string; userName?: string; email?: string };
    return user.fullName || user.userName || user.email || "Usuario del sistema";
  } catch {
    return "Usuario del sistema";
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
