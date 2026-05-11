import { useEffect, useMemo, useState, type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  AlertCircle, BarChart2, BarChart3, BookOpen, Briefcase,
  Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Download, ExternalLink, FileSpreadsheet, FileText,
  Loader2, RefreshCw, Search, Shield, Star,
  TrendingUp, Users, Wallet, X, Zap,
} from "lucide-react";
import type {
  AttendanceReport, VacationsReport, LeavesReport, PayrollReport,
  EmployeesReport, RotationReport, AbsenteeismReport, LaborCostReport,
} from "@/modules/reports/types/reports.types";
import {
  downloadExcel,
  getAbsenteeismReport,
  getAttendanceReport,
  getEmployeesReport,
  getLaborCostReport,
  getLeavesReport,
  getPayrollReport,
  getRotationReport,
  getVacationsReport,
} from "@/modules/reports/services/reportsApi";
import { exportRows, type ExportRow } from "@/components/export/exportUtils";
import { getHolidays } from "@/modules/holidays/services/holidaysApi";
import { getIncidents, getIncidentStats } from "@/modules/incidents/services/incidentsApi";
import { getPayrollConcepts } from "@/modules/payroll/services/payrollConceptsApi";
import { getPayrollLoans } from "@/modules/payroll/services/payrollLoansApi";
import { getRecruitmentCandidates } from "@/modules/recruitment/services/recruitmentApi";
import { getCycles } from "@/modules/evaluations/services/evaluationsApi";
import { getOnboardingProcesses } from "@/modules/onboarding/services/onboardingApi";
import { getAreas, getPositions } from "@/modules/org-structure/services/orgStructureApi";
import { getDocuments } from "@/modules/documents/services/documentsApi";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CUR_YEAR  = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;

const YEARS  = Array.from({ length: 6 }, (_, i) => CUR_YEAR - i);
const MONTHS = [
  { v: 1,  l: "Enero"      }, { v: 2,  l: "Febrero"    }, { v: 3,  l: "Marzo"      },
  { v: 4,  l: "Abril"      }, { v: 5,  l: "Mayo"       }, { v: 6,  l: "Junio"      },
  { v: 7,  l: "Julio"      }, { v: 8,  l: "Agosto"     }, { v: 9,  l: "Septiembre" },
  { v: 10, l: "Octubre"    }, { v: 11, l: "Noviembre"  }, { v: 12, l: "Diciembre"  },
];

const CHART_COLORS = [
  "#14b8a6","#0f766e","#f59e0b","#f43f5e",
  "#10b981","#8b5cf6","#0ea5e9","#ec4899","#84cc16","#fb923c",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number): string { return `${n.toFixed(1)}%`; }
function padMonth(m: number): string { return String(m).padStart(2, "0"); }
function monthLabel(m: number): string { return MONTHS.find((x) => x.v === m)?.l ?? String(m); }
function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("es-PE");
}
function daysUntil(value: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

// ─── Export helpers ────────────────────────────────────────────────────────────

interface ExportData {
  title: string;
  period: string;
  headers: string[];
  rows: string[][];
  footerRow?: string[];
  summary?: string;
  metrics?: Array<{ label: string; value: string | number; helper?: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado", cancelled: "Cancelado",
  open: "Abierto", justified: "Justificado", expired: "Vencido",
  draft: "Borrador", pending_signature: "Pendiente de firma", signed: "Firmado",
  new: "Nuevo", screening: "Preselección", interview: "Entrevista", offered: "Oferta", hired: "Contratado",
  active: "Activo", closed: "Cerrado", paid: "Pagado",
};
const TYPE_LABEL: Record<string, string> = {
  personal: "Personal", medical: "Médico", study: "Estudio",
  maternity_paternity: "Maternidad / paternidad", other: "Otro",
  tardanza: "Tardanza", falta: "Falta", salida_anticipada: "Salida anticipada", no_marcacion: "No marcación",
  earning: "Ingreso", deduction: "Descuento", loan: "Préstamo", advance: "Adelanto",
};

const REPORT_FILE_BASE: Record<string, string> = {
  attendance: "Asistencia_Mensual",
  vacations: "Reporte_de_Vacaciones",
  leaves: "Reporte_de_Permisos",
  absenteeism: "Reporte_de_Ausentismo",
  holidays: "Feriados",
  incidents: "Incidencias_de_Asistencia",
  payroll: "Planilla",
  "labor-cost": "Costo_Laboral_por_Area",
  concepts: "Conceptos_de_Planilla",
  loans: "Prestamos_Activos",
  employees: "Reporte_de_Empleados",
  rotation: "Rotacion_de_Personal",
  candidates: "Candidatos",
  evaluations: "Evaluaciones",
  onboarding: "Onboarding",
  areas: "Areas_Organizacionales",
  "org-chart": "Estructura_Organizacional",
  "docs-active": "Documentos_Vigentes",
  "docs-expiring": "Documentos_por_Vencer",
};

function reportFileName(reportId: string, year: number, month: number, extension: string): string {
  const base = REPORT_FILE_BASE[reportId] ?? "Reporte";
  const needsMonth = ["attendance", "payroll", "labor-cost", "absenteeism"].includes(reportId);
  return `${base}_${needsMonth ? `${monthLabel(month)}_` : ""}${year}.${extension}`;
}

function getExportData(
  reportId: string, year: number, month: number,
  att?: AttendanceReport, vac?: VacationsReport, lea?: LeavesReport,
  pay?: PayrollReport, emp?: EmployeesReport, rot?: RotationReport,
  abs?: AbsenteeismReport, lab?: LaborCostReport,
): ExportData | null {
  if (reportId === "attendance" && att) {
    return {
      title: "Reporte de Asistencia Mensual",
      period: `${monthLabel(month)} ${year}`,
      headers: ["Fecha", "Total", "Presentes", "Ausentes", "Tardanzas"],
      rows: (att.daily ?? []).map((r) => [r.date, String(r.totalRecords), String(r.presentRecords), String(r.absentRecords), String(r.lateRecords)]),
      footerRow: ["TOTAL", String(att.totalRecords), String(att.presentRecords), String(att.absentRecords), String(att.lateRecords)],
    };
  }
  if (reportId === "vacations" && vac) {
    return {
      title: "Reporte de Vacaciones",
      period: `Año ${year}`,
      headers: ["Estado", "Solicitudes", "Días solicitados"],
      rows: (vac.byStatus ?? []).map((r) => [STATUS_LABEL[r.status] ?? r.status, String(r.requests), String(r.requestedDays)]),
      footerRow: ["TOTAL", String(vac.totalRequests), String(vac.totalRequestedDays)],
    };
  }
  if (reportId === "leaves" && lea) {
    return {
      title: "Reporte de Permisos",
      period: `Año ${year}`,
      headers: ["Tipo", "Solicitudes", "Días"],
      rows: (lea.byType ?? []).map((r) => [TYPE_LABEL[r.leaveType] ?? r.leaveType, String(r.requests), String(r.requestedDays)]),
      footerRow: ["TOTAL", String(lea.totalRequests), "—"],
    };
  }
  if (reportId === "employees" && emp) {
    return {
      title: "Reporte de Empleados por Área",
      period: "Actualidad",
      headers: ["Área", "Total", "Activos", "Inactivos", "% Activos"],
      rows: (emp.byArea ?? []).map((r) => {
        const inactive = r.totalEmployees - r.activeEmployees;
        const pct = r.totalEmployees > 0 ? `${((r.activeEmployees / r.totalEmployees) * 100).toFixed(0)}%` : "0%";
        return [r.areaName, String(r.totalEmployees), String(r.activeEmployees), String(inactive), pct];
      }),
      footerRow: ["TOTAL", String(emp.totalEmployees), String(emp.activeEmployees), String(emp.inactiveEmployees), "—"],
    };
  }
  if (reportId === "payroll" && pay) {
    return {
      title: "Reporte de Planilla Mensual",
      period: `${monthLabel(month)} ${year}`,
      headers: ["#", "Código", "Empleado", "Sueldo Neto"],
      rows: (pay.topNetPays ?? []).map((r, i) => [String(i + 1), r.employeeCode, r.employeeName, fmtCurrency(r.netPay)]),
      footerRow: ["", "", "TOTAL NETO", fmtCurrency(pay.totalNetPay)],
    };
  }
  if (reportId === "rotation" && rot) {
    return {
      title: "Reporte de Rotación de Personal",
      period: `Año ${year}`,
      headers: ["Área", "Ingresos", "Salidas"],
      rows: (rot.byArea ?? []).map((r) => [r.areaName, String(r.hiredCount), String(r.inactivatedCount)]),
      footerRow: [`Tasa global: ${fmtPct(rot.turnoverRate * 100)}`, String(rot.hiredCount), String(rot.inactivatedCount)],
    };
  }
  if (reportId === "absenteeism" && abs) {
    return {
      title: "Reporte de Ausentismo",
      period: `${monthLabel(month)} ${year}`,
      headers: ["Área", "Empleados", "Días ausencia", "Tasa (%)"],
      rows: (abs.byArea ?? []).map((r) => [r.areaName, String(r.employeeCount), String(r.absenceDays), fmtPct(r.absenteeismRate * 100)]),
      footerRow: ["GLOBAL", String(abs.totalEmployees), String(abs.totalAbsenceDays), fmtPct(abs.absenteeismRate * 100)],
    };
  }
  if (reportId === "labor-cost" && lab) {
    return {
      title: "Reporte de Costo Laboral por Área",
      period: `${monthLabel(month)} ${year}`,
      headers: ["Área", "Empl.", "Salario base", "Bonificaciones", "Deducciones", "Neto total"],
      rows: (lab.byArea ?? []).map((r) => [r.areaName, String(r.employeeCount), fmtCurrency(r.totalBaseSalary), fmtCurrency(r.totalBonuses), fmtCurrency(r.totalDeductions), fmtCurrency(r.totalNetPay)]),
      footerRow: ["TOTAL", "—", fmtCurrency(lab.totalBaseSalary), fmtCurrency(lab.totalBonuses), fmtCurrency(lab.totalDeductions), fmtCurrency(lab.totalNetPay)],
    };
  }
  return null;
}

function buildCsv(data: ExportData): string {
  const escape = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = [
    data.headers.map(escape).join(","),
    ...data.rows.map((r) => r.map(escape).join(",")),
    ...(data.footerRow ? [data.footerRow.map(escape).join(",")] : []),
  ];
  return "﻿" + lines.join("\n"); // BOM para Excel
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function openPrintWindow(data: ExportData): void {
  const w = window.open("", "_blank", "width=1000,height=720");
  if (!w) { alert("Habilita las ventanas emergentes en tu navegador para exportar PDF."); return; }

  const ths = data.headers.map((h) => `<th>${h}</th>`).join("");
  const tbody = data.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  const tfoot = data.footerRow
    ? `<tfoot><tr>${data.footerRow.map((c) => `<td>${c}</td>`).join("")}</tr></tfoot>`
    : "";

  w.document.write(`<!DOCTYPE html><html lang="es"><head>
  <meta charset="utf-8"><title>${data.title}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;margin:28px}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:18px;border-bottom:2px solid #1e3a5f;padding-bottom:12px}
    .logo-box{width:36px;height:36px;background:#1e3a5f;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px}
    .logo-text h2{margin:0;font-size:15px;color:#1e3a5f}
    .logo-text p{margin:0;font-size:10px;color:#64748b}
    h1{font-size:17px;color:#1e3a5f;margin:0 0 3px}
    .meta{font-size:11px;color:#64748b;margin:0 0 4px}
    .gen{font-size:9px;color:#94a3b8;margin:0 0 16px}
    table{border-collapse:collapse;width:100%;font-size:11px;margin-top:10px}
    thead th{background:#1e3a5f;color:#fff;padding:8px 10px;text-align:left;white-space:nowrap;font-size:10px;letter-spacing:.05em;text-transform:uppercase}
    tbody td{padding:6px 10px;border-bottom:1px solid #e2e8f0}
    tbody tr:nth-child(even) td{background:#f8fafc}
    tbody tr:hover td{background:#eff6ff}
    tfoot td{background:#dbeafe;font-weight:bold;padding:7px 10px;border-top:2px solid #93c5fd}
    .footer{margin-top:20px;font-size:9px;color:#94a3b8;text-align:right;border-top:1px solid #e2e8f0;padding-top:8px}
    @media print{@page{margin:1.5cm}body{margin:0}.no-print{display:none}}
  </style>
</head><body>
  <div class="logo">
    <div class="logo-box">R</div>
    <div class="logo-text"><h2>Sistema RRHH</h2><p>Recursos Humanos</p></div>
  </div>
  <h1>${data.title}</h1>
  <p class="meta">Período: ${data.period}</p>
  <p class="gen">Generado: ${new Date().toLocaleString("es-PE")} — ${data.rows.length} registro(s)</p>
  <table>
    <thead><tr>${ths}</tr></thead>
    <tbody>${tbody}</tbody>
    ${tfoot}
  </table>
  <div class="footer">Sistema de Recursos Humanos · ${new Date().toLocaleDateString("es-PE")}</div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},400)})<\/script>
</body></html>`);
  w.document.close();
}

// ─── Catálogo de reportes ─────────────────────────────────────────────────────

type ReportStatus = "available" | "requires-backend";

interface CatalogReport {
  id: string; name: string; desc: string;
  icon: typeof BarChart2; status: ReportStatus;
  excelPath?: string; category: string; unavailableReason?: string;
}

const CATALOG: CatalogReport[] = [
  { id: "attendance",  name: "Asistencia mensual",       desc: "Registro diario de presencia, tardanzas y ausencias.",             icon: Clock,         status: "available",   excelPath: "/api/v1/reports/attendance/excel",  category: "operativos" },
  { id: "vacations",   name: "Vacaciones",                desc: "Solicitudes de vacaciones por estado y días aprobados.",           icon: CalendarDays,  status: "available",   excelPath: "/api/v1/reports/vacations/excel",   category: "operativos" },
  { id: "leaves",      name: "Permisos",                  desc: "Permisos por tipo, pagados y no pagados.",                        icon: BookOpen,      status: "available",   excelPath: "/api/v1/reports/leaves/excel",      category: "operativos" },
  { id: "absenteeism", name: "Ausentismo",                desc: "Tasa de ausentismo y días perdidos por área.",                    icon: TrendingUp,    status: "available",   excelPath: "/api/v1/reports/absenteeism/excel", category: "operativos" },
  { id: "holidays",    name: "Feriados",                  desc: "Calendario de feriados activos del año.",                         icon: Star,          status: "available",                                                    category: "operativos" },
  { id: "incidents",   name: "Incidencias de asistencia", desc: "Tardanzas, faltas y salidas anticipadas.",                        icon: AlertCircle,   status: "available",                                                    category: "operativos" },
  { id: "payroll",     name: "Planilla mensual",          desc: "Totales de haberes, beneficios y deducciones.",                   icon: Wallet,        status: "available",   excelPath: "/api/v1/reports/payroll/excel",     category: "nomina"     },
  { id: "labor-cost",  name: "Costo laboral por área",   desc: "Distribución del costo salarial y neto por área.",                icon: BarChart3,     status: "available",   excelPath: "/api/v1/reports/labor-cost/excel",  category: "nomina"     },
  { id: "concepts",    name: "Conceptos de planilla",     desc: "Detalle de conceptos, categorías y montos.",                      icon: FileText,      status: "available",                                                    category: "nomina"     },
  { id: "loans",       name: "Préstamos activos",         desc: "Estado y saldo de préstamos por colaborador.",                    icon: Briefcase,     status: "available",                                                    category: "nomina"     },
  { id: "employees",   name: "Empleados",                 desc: "Distribución de empleados activos e inactivos por área.",         icon: Users,         status: "available",   excelPath: "/api/v1/reports/employees/excel",   category: "talento"    },
  { id: "rotation",    name: "Rotación de personal",      desc: "Tasa de rotación, ingresos y bajas por área.",                   icon: RefreshCw,     status: "available",   excelPath: "/api/v1/reports/rotation/excel",    category: "talento"    },
  { id: "candidates",  name: "Candidatos",                desc: "Postulantes por convocatoria y estado.",                         icon: Users,         status: "available",                                                    category: "talento"    },
  { id: "evaluations", name: "Evaluaciones",              desc: "Resultados de evaluaciones de desempeño.",                       icon: CheckCircle2,  status: "available",                                                    category: "talento"    },
  { id: "onboarding",  name: "Onboarding",                desc: "Avance de incorporación de nuevos colaboradores.",               icon: Zap,           status: "available",                                                    category: "talento"    },
  { id: "areas",       name: "Áreas organizacionales",   desc: "Estructura de áreas y dotación por unidad.",                     icon: Building2,     status: "available",                                                    category: "maestros"   },
  { id: "org-chart",   name: "Estructura organizacional", desc: "Organigrama y jerarquía de la empresa.",                         icon: Shield,        status: "available",                                                    category: "maestros"   },
  { id: "docs-active", name: "Documentos vigentes",       desc: "Documentos en vigencia por colaborador.",                        icon: FileText,      status: "available",                                                    category: "documentos" },
  { id: "docs-expiring",name: "Por vencer",               desc: "Documentos próximos a vencer en los próximos 30 días.",         icon: AlertCircle,   status: "available",                                                    category: "documentos" },
];

const CATEGORIES = [
  { id: "all",        label: "Todos"      },
  { id: "operativos", label: "Operativos" },
  { id: "nomina",     label: "Nómina"     },
  { id: "talento",    label: "Talento"    },
  { id: "maestros",   label: "Maestros"   },
  { id: "documentos", label: "Documentos" },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { variant: "success" | "error"; message: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }): JSX.Element | null {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const ok = toast.variant === "success";
  return (
    <div className={`fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <p className="flex-1 text-[13px] font-medium leading-snug">{toast.message}</p>
      <button onClick={onClose} className="shrink-0 opacity-50 transition hover:opacity-100"><X className="size-3.5" /></button>
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, loading, iconBg, icon, trend }: {
  label: string; value: string | number; sub?: string;
  loading?: boolean; iconBg: string; icon: JSX.Element; trend?: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:shadow-md">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        {loading
          ? <div className="mt-1 h-6 w-14 animate-pulse rounded bg-slate-200" />
          : <p className="mt-0.5 text-[22px] font-extrabold leading-none text-slate-900">{value}</p>
        }
        {trend && <p className="mt-0.5 text-[10px] text-slate-400">{trend}</p>}
        {sub && !trend && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── ChartCard ───────────────────────────────────────────────────────────────

function ChartCard({ title, sub, loading, children }: {
  title: string; sub?: string; loading?: boolean; children: JSX.Element;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <p className="text-[13px] font-bold text-slate-800">{title}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      <div className="p-4">
        {loading
          ? <div className="flex h-48 items-center justify-center text-slate-400"><Loader2 className="size-5 animate-spin" /></div>
          : children}
      </div>
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, sub }: { icon: JSX.Element; title: string; sub?: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">{icon}</div>
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {sub && <p className="text-[12px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── ChartTooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currency = false }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[];
  label?: string; currency?: boolean;
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-[12px]">
      {label && <p className="mb-1 font-semibold text-slate-600">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {currency ? fmtCurrency(p.value) : p.value.toLocaleString("es-PE")}
        </p>
      ))}
    </div>
  );
}

// ─── ExportFormatButtons ──────────────────────────────────────────────────────

function ExportFormatButtons({ onExcel, onCsv, onPdf, compact = false }: {
  onExcel?: () => void; onCsv?: () => void; onPdf?: () => void; compact?: boolean;
}): JSX.Element {
  const btn = compact
    ? "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition"
    : "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition shadow-sm";
  return (
    <div className="flex items-center gap-1.5">
      {onExcel && (
        <button onClick={onExcel} title="Exportar Excel"
          className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
          <FileSpreadsheet className="size-3" />
          {!compact && "Excel"}
          {compact && "XLS"}
        </button>
      )}
      {onCsv && (
        <button onClick={onCsv} title="Exportar CSV"
          className={`${btn} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100`}>
          <Download className="size-3" />
          CSV
        </button>
      )}
      {onPdf && (
        <button onClick={onPdf} title="Imprimir / Guardar PDF"
          className={`${btn} border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}>
          <FileText className="size-3" />
          PDF
        </button>
      )}
    </div>
  );
}

// ─── DownloadHistory ─────────────────────────────────────────────────────────

interface HistoryItem { id: string; name: string; format: "excel" | "csv" | "pdf"; date: Date; module: string }

const FORMAT_STYLE: Record<HistoryItem["format"], { bg: string; text: string; icon: JSX.Element }> = {
  excel: { bg: "bg-emerald-50", text: "text-emerald-700", icon: <FileSpreadsheet className="size-3.5 text-emerald-600" /> },
  csv:   { bg: "bg-sky-50",     text: "text-sky-700",     icon: <Download className="size-3.5 text-sky-600" /> },
  pdf:   { bg: "bg-red-50",     text: "text-red-500",     icon: <FileText className="size-3.5 text-red-500" /> },
};

function DownloadHistoryPanel({ items, onClear }: { items: HistoryItem[]; onClear: () => void }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Download className="size-4 text-brand-500" />
          <h3 className="text-[13px] font-bold text-slate-700">Historial de exportaciones</h3>
          {items.length > 0 && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-600">{items.length}</span>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={onClear} className="text-[11px] text-slate-400 hover:text-slate-600 transition">Limpiar</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-slate-400">Sin exportaciones en esta sesión</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {items.map((item) => {
            const s = FORMAT_STYLE[item.format];
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60 transition">
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>{s.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-slate-700">{item.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {item.module} · {item.date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${s.bg} ${s.text}`}>
                  {item.format}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PowerBIPanel ─────────────────────────────────────────────────────────────

function PowerBIConfigurationReference(): JSX.Element {
  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white shadow-sm">
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
            <BarChart2 className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-slate-900">Power BI</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Requiere configuración</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Conecta Power BI para visualizar dashboards interactivos, tendencias y análisis avanzados del RRHH.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {["Dashboards interactivos en tiempo real", "Exportación de datasets para análisis", "Reportes ejecutivos automáticos", "Integración con Microsoft 365"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-[11px] text-slate-500">
              <CheckCircle2 className="size-3 shrink-0 text-brand-400" />{f}
            </li>
          ))}
        </ul>
        <button disabled
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-brand-400 shadow-sm cursor-not-allowed"
        >
          <ExternalLink className="size-3.5" />Conectar con Power BI
        </button>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Requiere configuración de workspace en Power BI Service.
        </p>
      </div>
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────

function PowerBIPanel(): JSX.Element {
  const powerBiUrl = (import.meta.env.VITE_POWER_BI_REPORT_URL as string | undefined)?.trim();
  const isConfigured = Boolean(powerBiUrl);

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white shadow-sm">
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
            <BarChart2 className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-slate-900">Power BI</h3>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${isConfigured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {isConfigured ? "Configurado" : "Requiere configuración"}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              {isConfigured
                ? "Abre el dashboard corporativo configurado para analisis avanzado de RRHH."
                : "Para habilitar dashboards reales se necesita un enlace o embed seguro de Power BI configurado en el entorno."}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {[
            "VITE_POWER_BI_REPORT_URL con el enlace publicado o embebido",
            "Workspace, report id, dataset y permisos definidos en Power BI Service",
            "Backend con token embebido si el reporte no es publico",
            "Usuarios autorizados antes de abrir informacion sensible",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-slate-500">
              <CheckCircle2 className="size-3 shrink-0 text-brand-400" />{item}
            </li>
          ))}
        </ul>
        <button
          disabled={!isConfigured}
          onClick={() => { if (powerBiUrl) window.open(powerBiUrl, "_blank", "noopener,noreferrer"); }}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-semibold shadow-sm transition ${
            isConfigured
              ? "border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
              : "border-brand-200 bg-white text-brand-400 cursor-not-allowed"
          }`}
        >
          <ExternalLink className="size-3.5" />{isConfigured ? "Abrir dashboard Power BI" : "Power BI pendiente de configuracion"}
        </button>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          No se muestran dashboards simulados ni datos inventados.
        </p>
      </div>
    </div>
  );
}

function ReportCard({ report, selected, onSelect, onExcel, onCsv, onPdf }: {
  report: CatalogReport; selected: boolean;
  onSelect: (id: string) => void;
  onExcel?: () => void; onCsv?: () => void; onPdf?: () => void;
}): JSX.Element {
  const Icon = report.icon;
  const isAvailable = report.status === "available";

  return (
    <div className={`group relative flex min-h-[208px] flex-col rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200"} ${!isAvailable ? "opacity-80" : ""}`}>
      {isAvailable && (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-600">Disponible</span>
      )}
      {!isAvailable && (
        <span className="absolute right-3 top-3 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Requiere backend</span>
      )}

      <div className="flex items-center gap-3 pr-20">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${isAvailable ? "bg-brand-50 shadow-brand-100" : "bg-slate-100"}`}>
          <Icon className={`size-4 ${isAvailable ? "text-brand-600" : "text-slate-400"}`} />
        </div>
        <p className="text-[13px] font-bold text-slate-800 leading-tight">{report.name}</p>
      </div>

      <p className="mt-3 min-h-[38px] text-[11px] leading-relaxed text-slate-500">{report.desc}</p>
      {!isAvailable && report.unavailableReason && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] font-medium leading-relaxed text-amber-700">{report.unavailableReason}</p>
      )}

      {isAvailable && (
        <div className="mt-auto space-y-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => onSelect(report.id)}
            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border text-[11px] font-semibold transition ${selected ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            <ChevronRight className="size-3" />Vista previa
          </button>
          <div className="flex justify-center gap-1">
            <ExportFormatButtons compact onExcel={onExcel} onCsv={onCsv} onPdf={onPdf} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PreviewWrapper ───────────────────────────────────────────────────────────

function PreviewWrapper({ title, period, count, summary, metrics, onExcel, onCsv, onPdf, children }: {
  title: string; period: string; count: number;
  summary?: string;
  metrics?: Array<{ label: string; value: string | number; helper?: string }>;
  onExcel?: () => void; onCsv?: () => void; onPdf?: () => void;
  children: JSX.Element;
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-brand-50/50 px-5 py-3.5">
        <div>
          <p className="text-[14px] font-bold text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-400">{period} · {count} filas</p>
        </div>
        <ExportFormatButtons onExcel={onExcel} onCsv={onCsv} onPdf={onPdf} />
      </div>
      {(summary || metrics?.length) && (
        <div className="border-b border-slate-100 px-5 py-4">
          {summary && <p className="text-[12px] leading-relaxed text-slate-500">{summary}</p>}
          {metrics?.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-[18px] font-extrabold leading-none text-slate-900">{metric.value}</p>
                  {metric.helper && <p className="mt-1 text-[10px] text-slate-400">{metric.helper}</p>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function EmptyTableRow({ cols }: { cols: number }): JSX.Element {
  return (
    <tr><td colSpan={cols} className="px-4 py-8 text-center text-[12px] text-slate-400">Sin datos para el período seleccionado</td></tr>
  );
}

// ─── PreviewSection ───────────────────────────────────────────────────────────

function PreviewSection({ reportId, year, month,
  attendanceData, vacationsData, leavesData, payrollData,
  employeesData, rotationData, absenteeismData, laborCostData,
  genericData, onExcel, onCsv, onPdf,
}: {
  reportId: string; year: number; month: number;
  attendanceData?: AttendanceReport; vacationsData?: VacationsReport;
  leavesData?: LeavesReport; payrollData?: PayrollReport;
  employeesData?: EmployeesReport; rotationData?: RotationReport;
  absenteeismData?: AbsenteeismReport; laborCostData?: LaborCostReport;
  genericData?: ExportData | null;
  onExcel: () => void; onCsv: () => void; onPdf: () => void;
}): JSX.Element | null {

  if (reportId === "attendance") {
    const d = attendanceData;
    const rows = d?.daily ?? [];
    return (
      <PreviewWrapper title="Asistencia mensual" period={`${monthLabel(month)} ${year}`} count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["Fecha","Total","Presentes","Ausentes","Tardanzas"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.date} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{r.date}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{r.totalRecords}</td>
                <td className="px-4 py-2 text-[12px] text-emerald-600 font-semibold">{r.presentRecords}</td>
                <td className="px-4 py-2 text-[12px] text-rose-600 font-semibold">{r.absentRecords}</td>
                <td className="px-4 py-2 text-[12px] text-amber-600 font-semibold">{r.lateRecords}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={5} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Total</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{d?.totalRecords ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-emerald-700">{d?.presentRecords ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-rose-700">{d?.absentRecords ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-amber-700">{d?.lateRecords ?? 0}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (reportId === "vacations") {
    const d = vacationsData;
    const rows = d?.byStatus ?? [];
    return (
      <PreviewWrapper title="Vacaciones" period={`Año ${year}`} count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["Estado","Solicitudes","Días solicitados"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.status} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{STATUS_LABEL[r.status] ?? r.status}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{r.requests}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{r.requestedDays}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={3} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Total</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{d?.totalRequests ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{d?.totalRequestedDays ?? 0} días</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (reportId === "leaves") {
    const d = leavesData;
    const rows = d?.byType ?? [];
    return (
      <PreviewWrapper title="Permisos" period={`Año ${year}`} count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["Tipo de permiso","Solicitudes","Días"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.leaveType} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{TYPE_LABEL[r.leaveType] ?? r.leaveType}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{r.requests}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{r.requestedDays}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={3} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Total</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{d?.totalRequests ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">—</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (reportId === "employees") {
    const d = employeesData;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Empleados por área" period="Actualidad" count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["Área","Total","Activos","Inactivos","% Activos"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const inactive = r.totalEmployees - r.activeEmployees;
              const pct = r.totalEmployees > 0 ? ((r.activeEmployees / r.totalEmployees) * 100).toFixed(0) : "0";
              return (
                <tr key={r.areaId} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{r.areaName}</td>
                  <td className="px-4 py-2 text-[12px] text-slate-600">{r.totalEmployees}</td>
                  <td className="px-4 py-2 text-[12px] text-emerald-600 font-semibold">{r.activeEmployees}</td>
                  <td className="px-4 py-2 text-[12px] text-rose-600">{inactive}</td>
                  <td className="px-4 py-2 text-[12px] text-slate-600">{pct}%</td>
                </tr>
              );
            })}
            {rows.length === 0 && <EmptyTableRow cols={5} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Total</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{d?.totalEmployees ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-emerald-700">{d?.activeEmployees ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-rose-700">{d?.inactiveEmployees ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">—</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (reportId === "payroll") {
    const d = payrollData;
    const rows = d?.topNetPays ?? [];
    return (
      <PreviewWrapper title="Planilla — Top por sueldo neto" period={`${monthLabel(month)} ${year}`} count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["#","Código","Empleado","Sueldo neto"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2 text-[12px] text-slate-400 font-medium">{i + 1}</td>
                <td className="px-4 py-2 text-[12px] text-slate-500">{r.employeeCode}</td>
                <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{r.employeeName}</td>
                <td className="px-4 py-2 text-[12px] font-bold text-brand-700">{fmtCurrency(r.netPay)}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={4} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={3} className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Total neto planilla</td>
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-brand-700">{fmtCurrency(d?.totalNetPay ?? 0)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (reportId === "rotation") {
    const d = rotationData;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Rotación de personal" period={`Año ${year}`} count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["Área","Ingresos","Bajas"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.areaId} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{r.areaName}</td>
                <td className="px-4 py-2 text-[12px] text-emerald-600 font-semibold">+{r.hiredCount}</td>
                <td className="px-4 py-2 text-[12px] text-rose-600 font-semibold">-{r.inactivatedCount}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={3} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Tasa de rotación</td>
              <td colSpan={2} className="px-4 py-2.5 text-[13px] font-extrabold text-brand-700">{fmtPct((d?.turnoverRate ?? 0) * 100)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (reportId === "absenteeism") {
    const d = absenteeismData;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Ausentismo por área" period={`${monthLabel(month)} ${year}`} count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["Área","Empleados","Días ausencia","Tasa"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.areaId} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{r.areaName}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{r.employeeCount}</td>
                <td className="px-4 py-2 text-[12px] text-rose-600 font-semibold">{r.absenceDays}</td>
                <td className="px-4 py-2 text-[12px]">
                  <span className={`font-bold ${r.absenteeismRate > 0.1 ? "text-rose-600" : r.absenteeismRate > 0.05 ? "text-amber-600" : "text-emerald-600"}`}>
                    {fmtPct(r.absenteeismRate * 100)}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={4} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Global</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{d?.totalEmployees ?? 0}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-rose-700">{d?.totalAbsenceDays ?? 0} días</td>
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-brand-700">{fmtPct((d?.absenteeismRate ?? 0) * 100)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (reportId === "labor-cost") {
    const d = laborCostData;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Costo laboral por área" period={`${monthLabel(month)} ${year}`} count={rows.length} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {["Área","Empl.","Salario base","Bonificaciones","Deducciones","Neto"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.areaId} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2 text-[12px] font-medium text-slate-700">{r.areaName}</td>
                <td className="px-4 py-2 text-[12px] text-slate-500">{r.employeeCount}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{fmtCurrency(r.totalBaseSalary)}</td>
                <td className="px-4 py-2 text-[12px] text-emerald-600">{fmtCurrency(r.totalBonuses)}</td>
                <td className="px-4 py-2 text-[12px] text-rose-600">{fmtCurrency(r.totalDeductions)}</td>
                <td className="px-4 py-2 text-[12px] font-bold text-brand-700">{fmtCurrency(r.totalNetPay)}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={6} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={2} className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Total</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{fmtCurrency(d?.totalBaseSalary ?? 0)}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-emerald-700">{fmtCurrency(d?.totalBonuses ?? 0)}</td>
              <td className="px-4 py-2.5 text-[12px] font-bold text-rose-700">{fmtCurrency(d?.totalDeductions ?? 0)}</td>
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-brand-700">{fmtCurrency(d?.totalNetPay ?? 0)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  if (genericData) {
    return (
      <PreviewWrapper title={genericData.title} period={genericData.period} count={genericData.rows.length} summary={genericData.summary} metrics={genericData.metrics} onExcel={onExcel} onCsv={onCsv} onPdf={onPdf}>
        <table className="min-w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">
            {genericData.headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {genericData.rows.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50/60 transition">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="px-4 py-2 text-[12px] text-slate-600">{cell || "-"}</td>
                ))}
              </tr>
            ))}
            {genericData.rows.length === 0 && <EmptyTableRow cols={genericData.headers.length} />}
          </tbody>
          {genericData.footerRow && genericData.rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              {genericData.footerRow.map((cell, index) => (
                <td key={index} className="px-4 py-2.5 text-[12px] font-bold text-slate-700">{cell || ""}</td>
              ))}
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  return null;
}

// ─── PaginaReportes ───────────────────────────────────────────────────────────

export function PaginaReportes(): JSX.Element {
  const [year,  setYear]  = useState(CUR_YEAR);
  const [month, setMonth] = useState(CUR_MONTH);
  const [appliedYear,  setAppliedYear]  = useState(CUR_YEAR);
  const [appliedMonth, setAppliedMonth] = useState(CUR_MONTH);
  const [catTab,    setCatTab]    = useState("all");
  const [catSearch, setCatSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [toast,    setToast]    = useState<ToastState>(null);
  const [history,  setHistory]  = useState<HistoryItem[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function addHistory(item: HistoryItem): void {
    setHistory((h) => [item, ...h].slice(0, 15));
    setToast({ variant: "success", message: `Descarga iniciada: ${item.name}` });
  }

  function handleFail(msg: string): void {
    setToast({ variant: "error", message: msg });
  }

  function applyFilters(): void {
    setAppliedYear(year); setAppliedMonth(month); setPreviewId(null);
  }

  function clearFilters(): void {
    setYear(CUR_YEAR); setMonth(CUR_MONTH);
    setAppliedYear(CUR_YEAR); setAppliedMonth(CUR_MONTH);
    setPreviewId(null);
  }

  const mm = padMonth(appliedMonth);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const empQ = useQuery({ queryKey: ["report-employees"], queryFn: getEmployeesReport });
  const attQ = useQuery({
    queryKey: ["report-attendance", appliedYear, appliedMonth],
    queryFn: () => getAttendanceReport(appliedYear, appliedMonth, { startDate: `${appliedYear}-${mm}-01`, endDate: `${appliedYear}-${mm}-31` }),
  });
  const vacQ = useQuery({ queryKey: ["report-vacations", appliedYear], queryFn: () => getVacationsReport(appliedYear) });
  const leaQ = useQuery({ queryKey: ["report-leaves", appliedYear], queryFn: () => getLeavesReport(appliedYear) });
  const payQ = useQuery({ queryKey: ["report-payroll", appliedYear, appliedMonth], queryFn: () => getPayrollReport(appliedYear, appliedMonth) });
  const rotQ = useQuery({ queryKey: ["report-rotation", appliedYear], queryFn: () => getRotationReport(appliedYear) });
  const absQ = useQuery({ queryKey: ["report-absenteeism", appliedYear, appliedMonth], queryFn: () => getAbsenteeismReport(appliedYear, appliedMonth) });
  const labQ = useQuery({ queryKey: ["report-labor-cost", appliedYear, appliedMonth], queryFn: () => getLaborCostReport(appliedYear, appliedMonth) });
  const holQ = useQuery({ queryKey: ["report-holidays"], queryFn: getHolidays });
  const incQ = useQuery({
    queryKey: ["report-incidents", appliedYear],
    queryFn: () => getIncidents({ employeeId: "", incidentType: "", status: "", fromDate: `${appliedYear}-01-01`, toDate: `${appliedYear}-12-31`, search: "", pageNumber: 1, pageSize: 5000 }),
  });
  const incStatsQ = useQuery({
    queryKey: ["report-incidents-stats", appliedYear],
    queryFn: () => getIncidentStats({ employeeId: "", incidentType: "", status: "", fromDate: `${appliedYear}-01-01`, toDate: `${appliedYear}-12-31`, search: "", pageNumber: 1, pageSize: 1 }),
  });
  const conceptsQ = useQuery({ queryKey: ["report-concepts"], queryFn: getPayrollConcepts });
  const loansQ = useQuery({ queryKey: ["report-loans"], queryFn: () => getPayrollLoans({ employeeId: "", activeOnly: true, pageNumber: 1, pageSize: 5000 }) });
  const candidatesQ = useQuery({ queryKey: ["report-candidates"], queryFn: () => getRecruitmentCandidates({ search: "", status: "" as never, isPotentialHire: undefined as unknown as boolean, isActive: undefined as unknown as boolean, jobPostingId: "", pageNumber: 1, pageSize: 5000 }) });
  const evalQ = useQuery({ queryKey: ["report-evaluations"], queryFn: getCycles });
  const onboardingQ = useQuery({ queryKey: ["report-onboarding"], queryFn: () => getOnboardingProcesses() });
  const areasQ = useQuery({ queryKey: ["report-areas"], queryFn: () => getAreas({ search: "", pageNumber: 1, pageSize: 5000, sortBy: "name", sortDirection: "asc" }) });
  const positionsQ = useQuery({ queryKey: ["report-positions"], queryFn: () => getPositions({ search: "", pageNumber: 1, pageSize: 5000, sortBy: "name", sortDirection: "asc" }) });
  const docsQ = useQuery({ queryKey: ["report-documents"], queryFn: () => getDocuments("", "") });

  const anyLoading = empQ.isLoading || attQ.isLoading || vacQ.isLoading || leaQ.isLoading || payQ.isLoading
    || rotQ.isLoading || absQ.isLoading || labQ.isLoading || holQ.isLoading || incQ.isLoading
    || conceptsQ.isLoading || loansQ.isLoading || candidatesQ.isLoading || evalQ.isLoading
    || onboardingQ.isLoading || areasQ.isLoading || positionsQ.isLoading || docsQ.isLoading;

  // ── KPI values ──────────────────────────────────────────────────────────────

  const kpiEmp = empQ.data?.activeEmployees ?? 0;
  const kpiAtt = attQ.data?.totalRecords ?? 0;
  const kpiPct = kpiAtt > 0 ? (((attQ.data?.presentRecords ?? 0) / kpiAtt) * 100).toFixed(1) : "—";
  const kpiVac = vacQ.data?.totalRequests ?? 0;
  const kpiLea = leaQ.data?.totalRequests ?? 0;
  const kpiNet = payQ.data?.totalNetPay ?? 0;
  const kpiAbs = absQ.data?.absenteeismRate ?? 0;

  // ── Chart data ──────────────────────────────────────────────────────────────

  const dailyChartData = useMemo(() =>
    (attQ.data?.daily ?? []).map((d) => ({
      dia:       parseInt(d.date.split("-")[2]),
      Presentes: d.presentRecords,
      Ausentes:  d.absentRecords,
      Tardanzas: d.lateRecords,
    })),
  [attQ.data]);

  const empByAreaData = useMemo(() =>
    (empQ.data?.byArea ?? []).map((a) => ({ name: a.areaName, value: a.activeEmployees })),
  [empQ.data]);

  const labByAreaData = useMemo(() =>
    (labQ.data?.byArea ?? [])
      .map((a) => ({ area: a.areaName.length > 14 ? a.areaName.slice(0, 12) + "…" : a.areaName, Neto: a.totalNetPay }))
      .sort((a, b) => b.Neto - a.Neto).slice(0, 8),
  [labQ.data]);

  const vacStatusData = useMemo(() =>
    (vacQ.data?.byStatus ?? []).map((s) => ({
      estado: STATUS_LABEL[s.status] ?? s.status,
      Solicitudes: s.requests,
    })),
  [vacQ.data]);

  // ── Catalog filter ───────────────────────────────────────────────────────────

  const filteredCatalog = useMemo(() =>
    CATALOG.filter((r) => {
      if (catTab !== "all" && r.category !== catTab) return false;
      if (catSearch && !r.name.toLowerCase().includes(catSearch.toLowerCase())) return false;
      return true;
    }),
  [catTab, catSearch]);

  function togglePreview(id: string): void {
    setPreviewId((p) => (p === id ? null : id));
  }

  function getReportData(reportId: string): ExportData | null {
    const baseData = getExportData(reportId, appliedYear, appliedMonth, attQ.data, vacQ.data, leaQ.data, payQ.data, empQ.data, rotQ.data, absQ.data, labQ.data);
    if (baseData) return baseData;
    if (reportId === "holidays") {
      const rows = (holQ.data ?? []).filter((item) => item.date.startsWith(String(appliedYear)));
      const recurring = rows.filter((item) => item.isRecurring).length;
      return { title: "Feriados", period: `Año ${appliedYear}`, headers: ["Fecha", "Nombre", "Tipo"], rows: rows.map((item) => [item.date, item.name, item.isRecurring ? "Recurrente" : "Único"]), footerRow: ["TOTAL", String(rows.length), ""], summary: "Calendario anual de feriados registrados para planificación operativa y control de asistencia.", metrics: [{ label: "Feriados", value: rows.length }, { label: "Recurrentes", value: recurring }, { label: "Únicos", value: rows.length - recurring }] };
    }
    if (reportId === "incidents") {
      const rows = incQ.data?.items ?? [];
      const totalMinutes = rows.reduce((sum, item) => sum + item.minutesImpacted, 0);
      return { title: "Incidencias de Asistencia", period: `Año ${appliedYear}`, headers: ["Fecha", "Empleado", "Código", "Área", "Tipo", "Minutos", "Estado", "Responsable"], rows: rows.map((item) => [item.incidentDate, item.employeeName, item.employeeCode, item.area, TYPE_LABEL[item.incidentType] ?? item.incidentType, String(item.minutesImpacted), STATUS_LABEL[item.status] ?? item.status, item.reviewedByUserName ?? "Pendiente"]), footerRow: ["TOTAL", String(incStatsQ.data?.total ?? rows.length), "", "", "", String(totalMinutes), "", ""], summary: "Incidencias registradas, impacto en minutos y estado de revisión para seguimiento de asistencia.", metrics: [{ label: "Incidencias", value: incStatsQ.data?.total ?? rows.length }, { label: "Minutos", value: totalMinutes.toLocaleString("es-PE") }, { label: "Abiertas", value: rows.filter((item) => item.status === "open").length }, { label: "Justificadas", value: rows.filter((item) => item.status === "justified").length }] };
    }
    if (reportId === "concepts") {
      const rows = conceptsQ.data ?? [];
      return { title: "Conceptos de Planilla", period: "Configuración vigente", headers: ["Código", "Nombre", "Tipo", "Monto fijo", "Porcentaje", "Automático", "Activo"], rows: rows.map((item) => [item.code, item.name, TYPE_LABEL[item.type] ?? item.type, item.fixedAmount != null ? fmtCurrency(item.fixedAmount) : "", item.percentage != null ? `${item.percentage}%` : "", item.isAutomatic ? "Sí" : "No", item.isActive ? "Sí" : "No"]), footerRow: ["TOTAL", String(rows.length), "", "", "", "", ""], summary: "Catálogo vigente de conceptos que alimentan el cálculo de planilla.", metrics: [{ label: "Conceptos", value: rows.length }, { label: "Activos", value: rows.filter((item) => item.isActive).length }, { label: "Automáticos", value: rows.filter((item) => item.isAutomatic).length }] };
    }
    if (reportId === "loans") {
      const rows = loansQ.data?.items ?? [];
      const balance = rows.reduce((sum, item) => sum + item.remainingAmount, 0);
      return { title: "Préstamos Activos", period: "Cartera vigente", headers: ["Empleado", "Código", "Tipo", "Monto total", "Cuota mensual", "Cuotas pagadas", "Cuotas pendientes", "Saldo"], rows: rows.map((item) => [item.employeeName, item.employeeCode, TYPE_LABEL[item.loanType] ?? item.loanType, fmtCurrency(item.totalAmount), fmtCurrency(item.monthlyInstallment), String(item.paidInstallments), String(item.remainingInstallments), fmtCurrency(item.remainingAmount)]), footerRow: ["TOTAL", String(rows.length), "", "", "", "", "", fmtCurrency(balance)], summary: "Cartera activa de préstamos y adelantos con saldo pendiente por colaborador.", metrics: [{ label: "Préstamos", value: rows.length }, { label: "Saldo total", value: fmtCurrency(balance) }, { label: "Cuotas pendientes", value: rows.reduce((sum, item) => sum + item.remainingInstallments, 0) }] };
    }
    if (reportId === "candidates") {
      const rows = candidatesQ.data?.items ?? [];
      return { title: "Candidatos", period: "Proceso de reclutamiento vigente", headers: ["Candidato", "Correo", "Teléfono", "Puesto", "Fecha", "Estado"], rows: rows.map((item) => [item.fullName, item.email, item.phoneNumber, item.positionApplied, item.applicationDate, STATUS_LABEL[item.currentStatus] ?? item.currentStatus]), footerRow: ["TOTAL", String(rows.length), "", "", "", ""], summary: "Pipeline de postulantes por puesto y estado actual del proceso.", metrics: [{ label: "Candidatos", value: rows.length }, { label: "Entrevista", value: rows.filter((item) => item.currentStatus === "interview").length }, { label: "Contratados", value: rows.filter((item) => item.currentStatus === "hired").length }] };
    }
    if (reportId === "evaluations") {
      const rows = evalQ.data ?? [];
      const totalAssignments = rows.reduce((sum, item) => sum + item.totalAssignments, 0);
      const finalizedAssignments = rows.reduce((sum, item) => sum + item.finalizedAssignments, 0);
      return { title: "Evaluaciones", period: "Ciclos registrados", headers: ["Nombre", "Periodo", "Inicio", "Fin", "Asignaciones", "Estado"], rows: rows.map((item) => [item.name, item.period, item.startDate, item.endDate, `${item.finalizedAssignments}/${item.totalAssignments}`, STATUS_LABEL[item.status] ?? item.status]), footerRow: ["TOTAL", String(rows.length), "", "", `${finalizedAssignments}/${totalAssignments}`, ""], summary: "Ciclos de evaluación con avance de asignaciones y estado operativo.", metrics: [{ label: "Ciclos", value: rows.length }, { label: "Asignaciones", value: totalAssignments }, { label: "Finalizadas", value: finalizedAssignments }] };
    }
    if (reportId === "onboarding") {
      const rows = onboardingQ.data ?? [];
      return { title: "Onboarding", period: "Procesos registrados", headers: ["Empleado", "Código", "Plantilla", "Inicio", "Avance", "Estado"], rows: rows.map((item) => [item.employeeName, item.employeeCode, item.templateName, fmtDate(item.startedAtUtc), `${item.completedTasks}/${item.totalTasks} (${item.progressPercent}%)`, item.isActive ? "Activo" : "Cerrado"]), footerRow: ["TOTAL", String(rows.length), "", "", "", ""], summary: "Procesos de incorporación y avance de tareas por colaborador.", metrics: [{ label: "Procesos", value: rows.length }, { label: "Activos", value: rows.filter((item) => item.isActive).length }, { label: "Progreso promedio", value: `${Math.round(rows.reduce((sum, item) => sum + item.progressPercent, 0) / Math.max(rows.length, 1))}%` }] };
    }
    if (reportId === "areas") {
      const rows = areasQ.data?.items ?? [];
      const employees = rows.reduce((sum, item) => sum + item.employeesCount, 0);
      return { title: "Áreas Organizacionales", period: "Estructura vigente", headers: ["Código", "Área", "Responsable", "Cargo responsable", "Empleados", "Estado"], rows: rows.map((item) => [item.code, item.name, item.responsibleName ?? "", item.responsiblePosition ?? "", String(item.employeesCount), item.isActive ? "Activo" : "Inactivo"]), footerRow: ["TOTAL", String(rows.length), "", "", String(employees), ""], summary: "Mapa de áreas activas, responsables y dotación registrada por unidad.", metrics: [{ label: "Áreas", value: rows.length }, { label: "Activas", value: rows.filter((item) => item.isActive).length }, { label: "Empleados", value: employees }] };
    }
    if (reportId === "org-chart") {
      const rows = positionsQ.data?.items ?? [];
      return { title: "Estructura Organizacional", period: "Organigrama vigente", headers: ["Código", "Puesto", "Área", "Nivel", "Reporta a", "Empleados", "Estado"], rows: rows.map((item) => [item.code, item.name, item.areaName ?? "", item.level ?? "", item.reportsToName ?? "", String(item.employeesCount), item.isActive ? "Activo" : "Inactivo"]), footerRow: ["TOTAL", String(rows.length), "", "", "", "", ""], summary: "Puestos, niveles jerárquicos y relación de reporte dentro de la organización.", metrics: [{ label: "Puestos", value: rows.length }, { label: "Activos", value: rows.filter((item) => item.isActive).length }, { label: "Con jefe asignado", value: rows.filter((item) => Boolean(item.reportsToName)).length }] };
    }
    if (reportId === "docs-active") {
      const rows = (docsQ.data ?? []).filter((item) => item.status === "signed" || item.status === "pending_signature");
      return { title: "Documentos Vigentes", period: "Repositorio documental", headers: ["Empleado", "Código", "Título", "Tipo", "Estado", "Fecha", "Vencimiento"], rows: rows.map((item) => [item.employeeName, item.employeeCode, item.title, item.type, STATUS_LABEL[item.status] ?? item.status, fmtDate(item.createdAtUtc), item.expiresAtUtc ? fmtDate(item.expiresAtUtc) : "Sin vencimiento"]), footerRow: ["TOTAL", String(rows.length), "", "", "", "", ""], summary: "Documentos laborales vigentes o pendientes de firma, con trazabilidad de vencimiento cuando aplica.", metrics: [{ label: "Documentos", value: rows.length }, { label: "Firmados", value: rows.filter((item) => item.status === "signed").length }, { label: "Pendientes", value: rows.filter((item) => item.status === "pending_signature").length }, { label: "Con vencimiento", value: rows.filter((item) => Boolean(item.expiresAtUtc)).length }] };
    }
    if (reportId === "docs-expiring") {
      const rows = (docsQ.data ?? [])
        .filter((item) => Boolean(item.expiresAtUtc))
        .filter((item) => item.status === "signed" || item.status === "pending_signature")
        .map((item) => ({ ...item, remainingDays: daysUntil(item.expiresAtUtc!) }))
        .filter((item) => item.remainingDays >= 0 && item.remainingDays <= 30)
        .sort((a, b) => a.remainingDays - b.remainingDays);
      return { title: "Documentos por Vencer", period: "Próximos 30 días", headers: ["Empleado", "Código", "Título", "Tipo", "Estado", "Vencimiento", "Días restantes"], rows: rows.map((item) => [item.employeeName, item.employeeCode, item.title, item.type, STATUS_LABEL[item.status] ?? item.status, fmtDate(item.expiresAtUtc), String(item.remainingDays)]), footerRow: ["TOTAL", String(rows.length), "", "", "", "", ""], summary: "Documentos con fecha de vencimiento dentro de los próximos 30 días para gestión preventiva.", metrics: [{ label: "Por vencer", value: rows.length }, { label: "Vencen hoy", value: rows.filter((item) => item.remainingDays === 0).length }, { label: "7 días", value: rows.filter((item) => item.remainingDays <= 7).length }, { label: "30 días", value: rows.filter((item) => item.remainingDays <= 30).length }] };
    }
    return null;
  }

  function exportDataRows(data: ExportData): ExportRow[] {
    const rows = data.rows.map((row) => Object.fromEntries(data.headers.map((header, index) => [header, row[index] ?? ""]))) as ExportRow[];
    if (data.footerRow) rows.push(Object.fromEntries(data.headers.map((header, index) => [header, data.footerRow?.[index] ?? ""])) as ExportRow);
    return rows;
  }

  // ── Export handlers (usable from card AND preview) ───────────────────────────

  function handleExcelExport(reportId: string): void {
    const report = CATALOG.find((r) => r.id === reportId);
    if (!report || report.status !== "available") { handleFail(report?.unavailableReason ?? "Reporte no disponible."); return; }
    const filename = reportFileName(reportId, appliedYear, appliedMonth, "xlsx");

    if (!report.excelPath) {
      const data = getReportData(reportId);
      if (!data) { handleFail("Datos aun no cargados. Espera un momento."); return; }
      if (data.rows.length === 0) { handleFail("Sin datos para el periodo seleccionado."); return; }
      exportRows("excel", exportDataRows(data), filename.replace(/\.xlsx$/i, ""), data.title, {
        title: data.title,
        period: data.period,
        subtitle: data.summary,
        metrics: data.metrics ?? [{ label: "Filas", value: data.rows.length }],
      });
      addHistory({ id: crypto.randomUUID(), name: filename, format: "excel", date: new Date(), module: data.title });
      return;
    }
    const params = new URLSearchParams({ year: String(appliedYear), month: String(appliedMonth) });
    const path = `${report.excelPath}?${params.toString()}`;
    try {
      downloadExcel(path, filename);
      addHistory({ id: crypto.randomUUID(), name: filename, format: "excel", date: new Date(), module: report.name });
    } catch {
      handleFail("No se pudo iniciar la descarga.");
    }
  }

  function handleCsvExport(reportId: string): void {
    {
      const report = CATALOG.find((r) => r.id === reportId);
      if (!report || report.status !== "available") { handleFail(report?.unavailableReason ?? "Reporte no disponible."); return; }
      const data = getReportData(reportId);
      if (!data) { handleFail("Datos aun no cargados. Espera un momento."); return; }
      if (data.rows.length === 0) { handleFail("Sin datos para el periodo seleccionado."); return; }
      const csv = buildCsv(data);
      const filename = reportFileName(reportId, appliedYear, appliedMonth, "csv");
      downloadText(csv, filename);
      addHistory({ id: crypto.randomUUID(), name: filename, format: "csv", date: new Date(), module: data.title });
      setToast({ variant: "success", message: `CSV generado: ${filename}` });
      return;
    }
    const data = getExportData(reportId, appliedYear, appliedMonth,
      attQ.data, vacQ.data, leaQ.data, payQ.data, empQ.data, rotQ.data, absQ.data, labQ.data);
    if (!data) { handleFail("Datos aún no cargados. Espera un momento."); return; }
    if (data.rows.length === 0) { handleFail("Sin datos para el período seleccionado."); return; }
    const csv = buildCsv(data);
    const filename = `${reportId}_${appliedYear}_${mm}.csv`;
    downloadText(csv, filename);
    addHistory({ id: crypto.randomUUID(), name: filename, format: "csv", date: new Date(), module: data.title });
    setToast({ variant: "success", message: `CSV generado: ${filename}` });
  }

  function handlePdfExport(reportId: string): void {
    {
      const report = CATALOG.find((r) => r.id === reportId);
      if (!report || report.status !== "available") { handleFail(report?.unavailableReason ?? "Reporte no disponible."); return; }
      const data = getReportData(reportId);
      if (!data) { handleFail("Datos aun no cargados. Espera un momento."); return; }
      if (data.rows.length === 0) { handleFail("Sin datos para el periodo seleccionado."); return; }
      const filename = reportFileName(reportId, appliedYear, appliedMonth, "pdf");
      exportRows("pdf", exportDataRows(data), filename.replace(/\.pdf$/i, ""), data.title, {
        title: data.title,
        period: data.period,
        subtitle: data.summary,
        metrics: data.metrics ?? [{ label: "Filas", value: data.rows.length }],
      });
      addHistory({ id: crypto.randomUUID(), name: filename, format: "pdf", date: new Date(), module: data.title });
      return;
    }
    const data = getExportData(reportId, appliedYear, appliedMonth,
      attQ.data, vacQ.data, leaQ.data, payQ.data, empQ.data, rotQ.data, absQ.data, labQ.data);
    if (!data) { handleFail("Datos aún no cargados. Espera un momento."); return; }
    if (data.rows.length === 0) { handleFail("Sin datos para el período seleccionado."); return; }
    openPrintWindow(data);
    const filename = `${reportId}_${appliedYear}_${mm}.pdf`;
    addHistory({ id: crypto.randomUUID(), name: filename, format: "pdf", date: new Date(), module: data.title });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6 pb-10">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/30">
            <BarChart2 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Reportes</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">Centro de reportes, análisis y exportación</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportFormatButtons
            onExcel={() => handleExcelExport("attendance")}
            onCsv={() => handleCsvExport("attendance")}
            onPdf={() => handlePdfExport("attendance")}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Año</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Mes</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
              {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={applyFilters}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-700 transition">
              Aplicar
            </button>
            <button onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition">
              <X className="size-3.5" />Limpiar
            </button>
          </div>
          <p className="ml-auto self-end text-[12px] text-slate-400">
            Mostrando: <b className="text-slate-600">{monthLabel(appliedMonth)} {appliedYear}</b>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Empleados activos" value={kpiEmp}        loading={empQ.isLoading} iconBg="bg-brand-50 shadow-brand-100" icon={<Users className="size-5 text-brand-600" />}        sub="en el sistema" />
        <KpiCard label="Asistencias"       value={kpiAtt}        loading={attQ.isLoading} iconBg="bg-teal-50 shadow-teal-100"     icon={<Clock className="size-5 text-teal-600" />}           sub={monthLabel(appliedMonth)} />
        <KpiCard label="Puntualidad"       value={`${kpiPct}%`} loading={attQ.isLoading} iconBg="bg-emerald-50 shadow-emerald-100" icon={<CheckCircle2 className="size-5 text-emerald-600" />} sub="del mes" />
        <KpiCard label="Vacaciones"        value={kpiVac}        loading={vacQ.isLoading} iconBg="bg-sky-50 shadow-sky-100"        icon={<CalendarDays className="size-5 text-sky-600" />}     sub={`año ${appliedYear}`} />
        <KpiCard label="Permisos"          value={kpiLea}        loading={leaQ.isLoading} iconBg="bg-violet-50 shadow-violet-100"  icon={<BookOpen className="size-5 text-violet-600" />}      sub={`año ${appliedYear}`} />
        <KpiCard label="Planilla neta"     value={kpiNet > 0 ? fmtCurrency(kpiNet) : "—"} loading={payQ.isLoading} iconBg="bg-amber-50 shadow-amber-100" icon={<Wallet className="size-5 text-amber-600" />} sub="total mes" />
        <KpiCard label="Ausentismo"        value={kpiAbs > 0 ? fmtPct(kpiAbs * 100) : "—"} loading={absQ.isLoading} iconBg="bg-rose-50 shadow-rose-100" icon={<AlertCircle className="size-5 text-rose-500" />} sub="tasa del mes" />
      </div>

      {/* Gráficos */}
      <div>
        <SectionTitle icon={<TrendingUp className="size-4" />} title="Analítica del período" sub={`${monthLabel(appliedMonth)} ${appliedYear}`} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">

          <ChartCard title="Asistencia diaria" sub={`${monthLabel(appliedMonth)} ${appliedYear} · por día`} loading={attQ.isLoading}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyChartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Presentes" fill="#14b8a6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Ausentes"  fill="#f43f5e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Tardanzas" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Empleados activos por área" sub="distribución actual" loading={empQ.isLoading}>
            {empByAreaData.length === 0
              ? <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-400">Sin datos de áreas</div>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={empByAreaData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {empByAreaData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, "Empleados"]} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </ChartCard>

          <ChartCard title="Costo laboral neto por área" sub={`${monthLabel(appliedMonth)} ${appliedYear} · S/.`} loading={labQ.isLoading}>
            {labByAreaData.length === 0
              ? <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-400">Sin datos de planilla</div>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={labByAreaData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `S/ ${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="area" tick={{ fontSize: 10, fill: "#64748b" }} width={80} />
                    <Tooltip content={<ChartTooltip currency />} />
                    <Bar dataKey="Neto" fill="#0f766e" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </ChartCard>

          <ChartCard title="Vacaciones por estado" sub={`Año ${appliedYear}`} loading={vacQ.isLoading}>
            {vacStatusData.length === 0
              ? <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-400">Sin solicitudes de vacaciones</div>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={vacStatusData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="estado" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Solicitudes" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </ChartCard>

        </div>
      </div>

      {/* Catálogo de reportes */}
      <div>
        <SectionTitle icon={<FileText className="size-4" />} title="Catálogo de reportes" sub="Accede, previsualiza y exporta en Excel, CSV o PDF" />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCatTab(c.id)}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${catTab === c.id ? "bg-brand-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input type="text" value={catSearch} onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Buscar reporte..."
              className="h-8 w-52 rounded-xl border border-slate-200 pl-9 pr-3 text-[12px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </div>
        </div>

        {/* Leyenda de formatos */}
        <div className="mt-3 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
          <p className="text-[11px] font-semibold text-slate-500">Formatos disponibles:</p>
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-700">XLS</span>
            <span className="text-[10px] text-slate-400">— Excel del servidor, con formato completo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="size-3.5 text-sky-600" />
            <span className="text-[11px] font-semibold text-sky-700">CSV</span>
            <span className="text-[10px] text-slate-400">— Compatible con Excel, Google Sheets</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5 text-rose-500" />
            <span className="text-[11px] font-semibold text-rose-600">PDF</span>
            <span className="text-[10px] text-slate-400">— Impresión / guardar PDF desde el navegador</span>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCatalog.length === 0 ? (
            <div className="col-span-4 rounded-2xl border border-slate-200 bg-white py-10 text-center text-[13px] text-slate-400">
              Sin reportes que coincidan con la búsqueda
            </div>
          ) : (
            filteredCatalog.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                selected={previewId === r.id}
                onSelect={togglePreview}
                onExcel={r.status === "available" ? () => handleExcelExport(r.id) : undefined}
                onCsv={r.status === "available" ? () => handleCsvExport(r.id) : undefined}
                onPdf={r.status === "available" ? () => handlePdfExport(r.id) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Vista previa */}
      {previewId && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <SectionTitle icon={<BarChart3 className="size-4" />} title="Vista previa del reporte" />
            <button onClick={() => setPreviewId(null)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition">
              <X className="size-3" />Cerrar
            </button>
          </div>
          {anyLoading
            ? <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-[13px]">Cargando datos…</span>
              </div>
            : <PreviewSection
                reportId={previewId}
                year={appliedYear}
                month={appliedMonth}
                attendanceData={attQ.data}
                vacationsData={vacQ.data}
                leavesData={leaQ.data}
                payrollData={payQ.data}
                employeesData={empQ.data}
                rotationData={rotQ.data}
                absenteeismData={absQ.data}
                laborCostData={labQ.data}
                genericData={getReportData(previewId)}
                onExcel={() => handleExcelExport(previewId)}
                onCsv={() => handleCsvExport(previewId)}
                onPdf={() => handlePdfExport(previewId)}
              />
          }
        </div>
      )}

      {/* Panel inferior */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PowerBIPanel />
        <DownloadHistoryPanel items={history} onClear={() => setHistory([])} />
      </div>

    </section>
  );
}
