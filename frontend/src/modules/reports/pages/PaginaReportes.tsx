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

// ─── Constantes ───────────────────────────────────────────────────────────────

const CUR_YEAR  = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;

const YEARS  = Array.from({ length: 6 }, (_, i) => CUR_YEAR - i);
const MONTHS = [
  { v: 1, l: "Enero" }, { v: 2,  l: "Febrero"  }, { v: 3,  l: "Marzo"    },
  { v: 4, l: "Abril" }, { v: 5,  l: "Mayo"     }, { v: 6,  l: "Junio"    },
  { v: 7, l: "Julio" }, { v: 8,  l: "Agosto"   }, { v: 9,  l: "Septiembre"},
  { v: 10, l: "Octubre" }, { v: 11, l: "Noviembre" }, { v: 12, l: "Diciembre" },
];

const CHART_COLORS = [
  "#14b8a6","#6366f1","#f59e0b","#f43f5e",
  "#10b981","#8b5cf6","#0ea5e9","#ec4899","#84cc16","#fb923c",
];

// ─── Catálogo de reportes ─────────────────────────────────────────────────────

type ReportStatus = "available" | "coming-soon";

interface CatalogReport {
  id: string;
  name: string;
  desc: string;
  icon: typeof BarChart2;
  status: ReportStatus;
  excelPath?: string;
  category: string;
}

const CATALOG: CatalogReport[] = [
  // Operativos
  { id: "attendance",  name: "Asistencia mensual",     desc: "Registro diario de presencia, tardanzas y ausencias.", icon: Clock,           status: "available",    excelPath: "/api/v1/reports/attendance/excel",   category: "operativos" },
  { id: "vacations",   name: "Vacaciones",              desc: "Solicitudes de vacaciones por estado y días aprobados.", icon: CalendarDays,    status: "available",    excelPath: "/api/v1/reports/vacations/excel",    category: "operativos" },
  { id: "leaves",      name: "Permisos",                desc: "Permisos por tipo, pagados y no pagados.",            icon: BookOpen,         status: "available",    excelPath: "/api/v1/reports/leaves/excel",       category: "operativos" },
  { id: "absenteeism", name: "Ausentismo",              desc: "Tasa de ausentismo y días perdidos por área.",         icon: TrendingUp,       status: "available",    excelPath: "/api/v1/reports/absenteeism/excel",  category: "operativos" },
  { id: "holidays",    name: "Feriados",                desc: "Calendario de feriados activos del año.",             icon: Star,             status: "coming-soon",                                                   category: "operativos" },
  { id: "incidents",   name: "Incidencias de asistencia",desc: "Tardanzas, faltas y salidas anticipadas.",           icon: AlertCircle,      status: "coming-soon",                                                   category: "operativos" },
  // Nómina
  { id: "payroll",     name: "Planilla mensual",        desc: "Totales de haberes, beneficios y deducciones.",       icon: Wallet,           status: "available",    excelPath: "/api/v1/reports/payroll/excel",      category: "nomina"     },
  { id: "labor-cost",  name: "Costo laboral por área",  desc: "Distribución del costo salarial y neto por área.",   icon: BarChart3,        status: "available",    excelPath: "/api/v1/reports/labor-cost/excel",   category: "nomina"     },
  { id: "concepts",    name: "Conceptos de planilla",   desc: "Detalle de conceptos, categorías y montos.",         icon: FileText,         status: "coming-soon",                                                   category: "nomina"     },
  { id: "loans",       name: "Préstamos activos",        desc: "Estado y saldo de préstamos por colaborador.",       icon: Briefcase,        status: "coming-soon",                                                   category: "nomina"     },
  // Talento
  { id: "employees",   name: "Empleados",               desc: "Distribución de empleados activos e inactivos por área.", icon: Users,         status: "available",    excelPath: "/api/v1/reports/employees/excel",    category: "talento"    },
  { id: "rotation",    name: "Rotación de personal",    desc: "Tasa de rotación, ingresos y bajas por área.",       icon: RefreshCw,        status: "available",    excelPath: "/api/v1/reports/rotation/excel",     category: "talento"    },
  { id: "candidates",  name: "Candidatos",              desc: "Postulantes por convocatoria y estado.",             icon: Users,            status: "coming-soon",                                                   category: "talento"    },
  { id: "evaluations", name: "Evaluaciones",            desc: "Resultados de evaluaciones de desempeño.",           icon: CheckCircle2,     status: "coming-soon",                                                   category: "talento"    },
  { id: "onboarding",  name: "Onboarding",              desc: "Avance de incorporación de nuevos colaboradores.",   icon: Zap,              status: "coming-soon",                                                   category: "talento"    },
  // Maestros
  { id: "areas",       name: "Áreas organizacionales",  desc: "Estructura de áreas y dotación por unidad.",         icon: Building2,        status: "coming-soon",                                                   category: "maestros"   },
  { id: "org-chart",   name: "Estructura organizacional",desc: "Organigrama y jerarquía de la empresa.",            icon: Shield,           status: "coming-soon",                                                   category: "maestros"   },
  // Documentos
  { id: "docs-active", name: "Documentos vigentes",     desc: "Documentos en vigencia por colaborador.",            icon: FileText,         status: "coming-soon",                                                   category: "documentos" },
  { id: "docs-expiring",name: "Por vencer",             desc: "Documentos próximos a vencer en los próximos 30 días.", icon: AlertCircle,   status: "coming-soon",                                                   category: "documentos" },
];

const CATEGORIES = [
  { id: "all",        label: "Todos"      },
  { id: "operativos", label: "Operativos" },
  { id: "nomina",     label: "Nómina"     },
  { id: "talento",    label: "Talento"    },
  { id: "maestros",   label: "Maestros"   },
  { id: "documentos", label: "Documentos" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function padMonth(m: number): string {
  return String(m).padStart(2, "0");
}

function monthLabel(m: number): string {
  return MONTHS.find((x) => x.v === m)?.l ?? String(m);
}

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
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBg}`}>
        {icon}
      </div>
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
          : children
        }
      </div>
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, sub }: { icon: JSX.Element; title: string; sub?: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
        {icon}
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {sub && <p className="text-[12px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── CustomTooltip recharts ───────────────────────────────────────────────────

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

// ─── DownloadHistory ─────────────────────────────────────────────────────────

interface HistoryItem { id: string; name: string; format: "excel" | "pdf"; date: Date; module: string }

function DownloadHistoryPanel({ items, onClear }: { items: HistoryItem[]; onClear: () => void }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Download className="size-4 text-indigo-500" />
          <h3 className="text-[13px] font-bold text-slate-700">Historial de exportaciones</h3>
        </div>
        {items.length > 0 && (
          <button onClick={onClear} className="text-[11px] text-slate-400 hover:text-slate-600 transition">Limpiar</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-slate-400">Sin exportaciones en esta sesión</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60 transition">
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${item.format === "excel" ? "bg-emerald-50" : "bg-red-50"}`}>
                {item.format === "excel"
                  ? <FileSpreadsheet className="size-3.5 text-emerald-600" />
                  : <FileText className="size-3.5 text-red-500" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-slate-700">{item.name}</p>
                <p className="text-[10px] text-slate-400">
                  {item.module} · {item.date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${item.format === "excel" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {item.format}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PowerBIPanel ─────────────────────────────────────────────────────────────

function PowerBIPanel(): JSX.Element {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <BarChart2 className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-slate-900">Power BI</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Próximamente</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Conecta Power BI para visualizar dashboards interactivos, tendencias y análisis avanzados del RRHH.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {["Dashboards interactivos en tiempo real", "Exportación de datasets para análisis", "Reportes ejecutivos automáticos", "Integración con Microsoft 365"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-[11px] text-slate-500">
              <CheckCircle2 className="size-3 shrink-0 text-indigo-400" />{f}
            </li>
          ))}
        </ul>
        <button
          disabled
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-indigo-400 shadow-sm cursor-not-allowed"
        >
          <ExternalLink className="size-3.5" />
          Conectar con Power BI
        </button>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Requiere configuración de workspace en Power BI Service. Consulta al equipo técnico.
        </p>
      </div>
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────

function ReportCard({ report, year, month, selected, onSelect, onExcel, onFail }: {
  report: CatalogReport; year: number; month: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onExcel: (item: HistoryItem) => void;
  onFail: (msg: string) => void;
}): JSX.Element {
  const Icon = report.icon;
  const isAvailable = report.status === "available";

  function handleExcel(): void {
    if (!report.excelPath) return;
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    const path = `${report.excelPath}?${params.toString()}`;
    const filename = `${report.name.toLowerCase().replace(/\s+/g, "_")}_${year}_${padMonth(month)}.xlsx`;
    try {
      downloadExcel(path, filename);
      onExcel({ id: crypto.randomUUID(), name: filename, format: "excel", date: new Date(), module: report.name });
    } catch {
      onFail("No se pudo iniciar la descarga.");
    }
  }

  return (
    <div className={`group relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${selected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"} ${!isAvailable ? "opacity-70" : "cursor-pointer"}`}>
      {/* Status badge */}
      {report.status === "coming-soon" && (
        <span className="absolute right-3 top-3 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
          Próximamente
        </span>
      )}
      {isAvailable && (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-600">
          Disponible
        </span>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3 pr-16">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${isAvailable ? "bg-indigo-50" : "bg-slate-100"}`}>
          <Icon className={`size-4 ${isAvailable ? "text-indigo-600" : "text-slate-400"}`} />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800 leading-tight">{report.name}</p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{report.desc}</p>

      {/* Actions */}
      {isAvailable && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
          <button
            onClick={() => onSelect(report.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${selected ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            <ChevronRight className="size-3" />Vista previa
          </button>
          {report.excelPath && (
            <button
              onClick={handleExcel}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <FileSpreadsheet className="size-3" />Excel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PreviewSection ───────────────────────────────────────────────────────────

function PreviewSection({ reportId, year, month, attendanceData, vacationsData, leavesData, payrollData, employeesData, rotationData, absenteeismData, laborCostData, onExcel, onFail }: {
  reportId: string; year: number; month: number;
  attendanceData:   ReturnType<typeof useQuery>["data"] | undefined;
  vacationsData:    ReturnType<typeof useQuery>["data"] | undefined;
  leavesData:       ReturnType<typeof useQuery>["data"] | undefined;
  payrollData:      ReturnType<typeof useQuery>["data"] | undefined;
  employeesData:    ReturnType<typeof useQuery>["data"] | undefined;
  rotationData:     ReturnType<typeof useQuery>["data"] | undefined;
  absenteeismData:  ReturnType<typeof useQuery>["data"] | undefined;
  laborCostData:    ReturnType<typeof useQuery>["data"] | undefined;
  onExcel: (item: HistoryItem) => void;
  onFail: (msg: string) => void;
}): JSX.Element | null {
  const report = CATALOG.find((r) => r.id === reportId);
  if (!report) return null;

  function handleExcel(): void {
    if (!report?.excelPath) return;
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    const path = `${report.excelPath}?${params.toString()}`;
    const filename = `${report.name.toLowerCase().replace(/\s+/g, "_")}_${year}_${padMonth(month)}.xlsx`;
    downloadExcel(path, filename);
    onExcel({ id: crypto.randomUUID(), name: filename, format: "excel", date: new Date(), module: report.name });
  }

  // ── Attendance preview ──
  if (reportId === "attendance") {
    const d = attendanceData as { year: number; month: number; totalRecords: number; presentRecords: number; absentRecords: number; lateRecords: number; averageLateMinutes: number; daily: { date: string; totalRecords: number; presentRecords: number; absentRecords: number; lateRecords: number }[] } | undefined;
    const rows = d?.daily ?? [];
    return (
      <PreviewWrapper title="Asistencia mensual" period={`${monthLabel(month)} ${year}`} onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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

  // ── Vacations preview ──
  if (reportId === "vacations") {
    const d = vacationsData as { year: number; totalRequests: number; pendingRequests: number; approvedRequests: number; rejectedRequests: number; totalRequestedDays: number; approvedDays: number; byStatus: { status: string; requests: number; requestedDays: number }[] } | undefined;
    const STATUS_LABEL: Record<string, string> = { pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado", cancelled: "Cancelado" };
    const rows = d?.byStatus ?? [];
    return (
      <PreviewWrapper title="Vacaciones" period={`Año ${year}`} onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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

  // ── Leaves preview ──
  if (reportId === "leaves") {
    const d = leavesData as { year: number; totalRequests: number; pendingRequests: number; approvedRequests: number; rejectedRequests: number; paidRequests: number; unpaidRequests: number; byType: { leaveType: string; requests: number; requestedDays: number }[] } | undefined;
    const TYPE_LABEL: Record<string, string> = { personal: "Personal", medical: "Médico", study: "Estudio", maternity_paternity: "Maternidad/Paternidad", other: "Otro" };
    const rows = d?.byType ?? [];
    return (
      <PreviewWrapper title="Permisos" period={`Año ${year}`} onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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

  // ── Employees preview ──
  if (reportId === "employees") {
    const d = employeesData as { totalEmployees: number; activeEmployees: number; inactiveEmployees: number; byArea: { areaId: string; areaName: string; totalEmployees: number; activeEmployees: number }[] } | undefined;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Empleados por área" period="Actualidad" onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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

  // ── Payroll preview ──
  if (reportId === "payroll") {
    const d = payrollData as { year: number; month: number; recordsCount: number; totalBaseSalary: number; totalBonuses: number; totalDeductions: number; totalNetPay: number; averageNetPay: number; topNetPays: { employeeId: string; employeeCode: string; employeeName: string; netPay: number }[] } | undefined;
    const rows = d?.topNetPays ?? [];
    return (
      <PreviewWrapper title="Planilla — Top empleados por sueldo neto" period={`${monthLabel(month)} ${year}`} onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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
                <td className="px-4 py-2 text-[12px] font-bold text-indigo-700">{fmtCurrency(r.netPay)}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyTableRow cols={4} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={3} className="px-4 py-2.5 text-[12px] font-bold text-slate-700">Total neto planilla</td>
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-indigo-700">{fmtCurrency(d?.totalNetPay ?? 0)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  // ── Rotation preview ──
  if (reportId === "rotation") {
    const d = rotationData as { year: number; totalActiveAtStart: number; hiredCount: number; inactivatedCount: number; turnoverRate: number; byArea: { areaId: string; areaName: string; hiredCount: number; inactivatedCount: number }[] } | undefined;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Rotación de personal" period={`Año ${year}`} onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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
              <td colSpan={2} className="px-4 py-2.5 text-[13px] font-extrabold text-indigo-700">{fmtPct(d?.turnoverRate ?? 0)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  // ── Absenteeism preview ──
  if (reportId === "absenteeism") {
    const d = absenteeismData as { year: number; month: number; totalEmployees: number; totalAbsenceDays: number; absenteeismRate: number; byArea: { areaId: string; areaName: string; employeeCount: number; absenceDays: number; absenteeismRate: number }[] } | undefined;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Ausentismo por área" period={`${monthLabel(month)} ${year}`} onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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
                  <span className={`font-bold ${r.absenteeismRate > 10 ? "text-rose-600" : r.absenteeismRate > 5 ? "text-amber-600" : "text-emerald-600"}`}>
                    {fmtPct(r.absenteeismRate)}
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
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-indigo-700">{fmtPct(d?.absenteeismRate ?? 0)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  // ── Labor cost preview ──
  if (reportId === "labor-cost") {
    const d = laborCostData as { year: number; month: number; recordCount: number; totalBaseSalary: number; totalBonuses: number; totalDeductions: number; totalGrossIncome: number; totalNetPay: number; averageNetPay: number; byArea: { areaId: string; areaName: string; employeeCount: number; totalBaseSalary: number; totalBonuses: number; totalDeductions: number; totalNetPay: number }[] } | undefined;
    const rows = d?.byArea ?? [];
    return (
      <PreviewWrapper title="Costo laboral por área" period={`${monthLabel(month)} ${year}`} onExcel={report.excelPath ? handleExcel : undefined} count={rows.length}>
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
                <td className="px-4 py-2 text-[12px] font-bold text-indigo-700">{fmtCurrency(r.totalNetPay)}</td>
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
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-indigo-700">{fmtCurrency(d?.totalNetPay ?? 0)}</td>
            </tr></tfoot>
          )}
        </table>
      </PreviewWrapper>
    );
  }

  return null;
}

// ─── PreviewWrapper ───────────────────────────────────────────────────────────

function PreviewWrapper({ title, period, count, onExcel, children }: {
  title: string; period: string; count: number; onExcel?: () => void; children: JSX.Element;
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-indigo-50/50 px-5 py-3.5">
        <div>
          <p className="text-[14px] font-bold text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-400">{period} · {count} filas</p>
        </div>
        {onExcel && (
          <button
            onClick={onExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 transition"
          >
            <FileSpreadsheet className="size-3.5" />Exportar Excel
          </button>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function EmptyTableRow({ cols }: { cols: number }): JSX.Element {
  return (
    <tr><td colSpan={cols} className="px-4 py-8 text-center text-[12px] text-slate-400">Sin datos para el período seleccionado</td></tr>
  );
}

// ─── PaginaReportes ───────────────────────────────────────────────────────────

export function PaginaReportes(): JSX.Element {
  const now = new Date();
  const [year,  setYear]  = useState(CUR_YEAR);
  const [month, setMonth] = useState(CUR_MONTH);
  const [appliedYear,  setAppliedYear]  = useState(CUR_YEAR);
  const [appliedMonth, setAppliedMonth] = useState(CUR_MONTH);
  const [catTab,   setCatTab]   = useState("all");
  const [catSearch, setCatSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [toast,    setToast]    = useState<ToastState>(null);
  const [history,  setHistory]  = useState<HistoryItem[]>([]);

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

  // ── Queries (todas usando el período aplicado) ──
  const empQ = useQuery({
    queryKey: ["report-employees"],
    queryFn: getEmployeesReport,
  });
  const attQ = useQuery({
    queryKey: ["report-attendance", appliedYear, appliedMonth],
    queryFn: () => getAttendanceReport(appliedYear, appliedMonth, {
      startDate: `${appliedYear}-${mm}-01`,
      endDate:   `${appliedYear}-${mm}-31`,
    }),
  });
  const vacQ = useQuery({
    queryKey: ["report-vacations", appliedYear],
    queryFn: () => getVacationsReport(appliedYear),
  });
  const leaQ = useQuery({
    queryKey: ["report-leaves", appliedYear],
    queryFn: () => getLeavesReport(appliedYear),
  });
  const payQ = useQuery({
    queryKey: ["report-payroll", appliedYear, appliedMonth],
    queryFn: () => getPayrollReport(appliedYear, appliedMonth),
  });
  const rotQ = useQuery({
    queryKey: ["report-rotation", appliedYear],
    queryFn: () => getRotationReport(appliedYear),
  });
  const absQ = useQuery({
    queryKey: ["report-absenteeism", appliedYear, appliedMonth],
    queryFn: () => getAbsenteeismReport(appliedYear, appliedMonth),
  });
  const labQ = useQuery({
    queryKey: ["report-labor-cost", appliedYear, appliedMonth],
    queryFn: () => getLaborCostReport(appliedYear, appliedMonth),
  });

  const anyLoading = empQ.isLoading || attQ.isLoading || vacQ.isLoading || leaQ.isLoading || payQ.isLoading;

  // ── KPI values ──
  const kpiEmp     = empQ.data?.activeEmployees ?? 0;
  const kpiAtt     = attQ.data?.totalRecords ?? 0;
  const kpiPct     = kpiAtt > 0 ? (((attQ.data?.presentRecords ?? 0) / kpiAtt) * 100).toFixed(1) : "—";
  const kpiVac     = vacQ.data?.totalRequests ?? 0;
  const kpiLea     = leaQ.data?.totalRequests ?? 0;
  const kpiNet     = payQ.data?.totalNetPay ?? 0;
  const kpiAbs     = absQ.data?.absenteeismRate ?? 0;

  // ── Chart data ──
  const dailyChartData = useMemo(() =>
    (attQ.data?.daily ?? []).map((d) => ({
      dia:       parseInt(d.date.split("-")[2]),
      Presentes: d.presentRecords,
      Ausentes:  d.absentRecords,
      Tardanzas: d.lateRecords,
    })),
  [attQ.data]);

  const empByAreaData = useMemo(() =>
    (empQ.data?.byArea ?? []).map((a) => ({
      name:  a.areaName,
      value: a.activeEmployees,
    })),
  [empQ.data]);

  const labByAreaData = useMemo(() =>
    (labQ.data?.byArea ?? [])
      .map((a) => ({ area: a.areaName.length > 14 ? a.areaName.slice(0, 12) + "…" : a.areaName, Neto: a.totalNetPay }))
      .sort((a, b) => b.Neto - a.Neto)
      .slice(0, 8),
  [labQ.data]);

  const vacStatusData = useMemo(() => {
    const STATUS_LABEL: Record<string, string> = { pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado", cancelled: "Cancelado" };
    return (vacQ.data?.byStatus ?? []).map((s) => ({
      estado:     STATUS_LABEL[s.status] ?? s.status,
      Solicitudes: s.requests,
    }));
  }, [vacQ.data]);

  // ── Catalog filter ──
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6 pb-10">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-600/30">
            <BarChart2 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Reportes</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">Centro de reportes, análisis y exportación</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              const path = `/api/v1/reports/attendance/excel?year=${appliedYear}&month=${appliedMonth}`;
              const name = `asistencia_${appliedYear}_${mm}.xlsx`;
              downloadExcel(path, name);
              addHistory({ id: crypto.randomUUID(), name, format: "excel", date: new Date(), module: "Asistencia" });
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" />
            Excel rápido
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <FileText className="size-4 text-rose-400" />
            Imprimir
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Año</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Aplicar
            </button>
            <button
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <X className="size-3.5" />Limpiar
            </button>
          </div>
          <p className="ml-auto self-end text-[12px] text-slate-400">
            Mostrando: <b className="text-slate-600">{monthLabel(appliedMonth)} {appliedYear}</b>
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Empleados activos" value={kpiEmp}          loading={empQ.isLoading}   iconBg="bg-indigo-50 shadow-indigo-100" icon={<Users className="size-5 text-indigo-600" />}       sub="en el sistema" />
        <KpiCard label="Asistencias"       value={kpiAtt}          loading={attQ.isLoading}   iconBg="bg-teal-50 shadow-teal-100"     icon={<Clock className="size-5 text-teal-600" />}          sub={`${monthLabel(appliedMonth)}`} />
        <KpiCard label="Puntualidad"       value={`${kpiPct}%`}   loading={attQ.isLoading}   iconBg="bg-emerald-50 shadow-emerald-100" icon={<CheckCircle2 className="size-5 text-emerald-600" />} sub="del mes" />
        <KpiCard label="Vacaciones"        value={kpiVac}          loading={vacQ.isLoading}   iconBg="bg-sky-50 shadow-sky-100"        icon={<CalendarDays className="size-5 text-sky-600" />}    sub={`año ${appliedYear}`} />
        <KpiCard label="Permisos"          value={kpiLea}          loading={leaQ.isLoading}   iconBg="bg-violet-50 shadow-violet-100"  icon={<BookOpen className="size-5 text-violet-600" />}     sub={`año ${appliedYear}`} />
        <KpiCard label="Planilla neta"     value={kpiNet > 0 ? fmtCurrency(kpiNet) : "—"}  loading={payQ.isLoading} iconBg="bg-amber-50 shadow-amber-100" icon={<Wallet className="size-5 text-amber-600" />} sub="total mes" />
        <KpiCard label="Ausentismo"        value={kpiAbs > 0 ? fmtPct(kpiAbs) : "—"}       loading={absQ.isLoading} iconBg="bg-rose-50 shadow-rose-100"    icon={<AlertCircle className="size-5 text-rose-500" />} sub="tasa del mes" />
      </div>

      {/* ── Gráficos ── */}
      <div>
        <SectionTitle icon={<TrendingUp className="size-4" />} title="Analítica del período" sub={`${monthLabel(appliedMonth)} ${appliedYear}`} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">

          {/* Asistencia diaria */}
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

          {/* Empleados por área */}
          <ChartCard title="Empleados activos por área" sub="distribución actual" loading={empQ.isLoading}>
            {empByAreaData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-400">Sin datos de áreas</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={empByAreaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {empByAreaData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Empleados"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Costo laboral por área */}
          <ChartCard title="Costo laboral neto por área" sub={`${monthLabel(appliedMonth)} ${appliedYear} · S/.`} loading={labQ.isLoading}>
            {labByAreaData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-400">Sin datos de planilla</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={labByAreaData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `S/ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="area" tick={{ fontSize: 10, fill: "#64748b" }} width={80} />
                  <Tooltip content={<ChartTooltip currency />} />
                  <Bar dataKey="Neto" fill="#6366f1" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Vacaciones por estado */}
          <ChartCard title="Vacaciones por estado" sub={`Año ${appliedYear}`} loading={vacQ.isLoading}>
            {vacStatusData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-400">Sin solicitudes de vacaciones</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={vacStatusData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="estado" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Solicitudes" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

        </div>
      </div>

      {/* ── Catálogo de reportes ── */}
      <div>
        <SectionTitle icon={<FileText className="size-4" />} title="Catálogo de reportes" sub="Accede, previsualiza y exporta cualquier reporte del sistema" />

        {/* Tabs + buscador */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatTab(c.id)}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${catTab === c.id ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Buscar reporte..."
              className="h-8 w-52 rounded-xl border border-slate-200 pl-9 pr-3 text-[12px] text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* Report cards grid */}
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
                year={appliedYear}
                month={appliedMonth}
                selected={previewId === r.id}
                onSelect={togglePreview}
                onExcel={addHistory}
                onFail={handleFail}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Vista previa del reporte ── */}
      {previewId && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <SectionTitle icon={<BarChart3 className="size-4" />} title="Vista previa del reporte" />
            <button
              onClick={() => setPreviewId(null)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition"
            >
              <X className="size-3" />Cerrar
            </button>
          </div>
          {anyLoading
            ? <div className="flex items-center justify-center gap-2 py-12 text-slate-400"><Loader2 className="size-5 animate-spin" /><span className="text-[13px]">Cargando datos…</span></div>
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
                onExcel={addHistory}
                onFail={handleFail}
              />
          }
        </div>
      )}

      {/* ── Panel inferior ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PowerBIPanel />
        <DownloadHistoryPanel items={history} onClear={() => setHistory([])} />
      </div>

    </section>
  );
}
