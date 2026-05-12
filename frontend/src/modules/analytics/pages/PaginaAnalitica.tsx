import { useMemo, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { exportRows, makeFileName, type ExportFormat, type ExportRow } from "@/components/export/exportUtils";
import {
  getAnalyticsSummary,
  getAreaDistribution,
  getAttendanceTrend,
  getHeadcountTrend,
  getLaborCostTrend,
  getTurnoverRisk,
} from "@/modules/analytics/services/analyticsApi";
import type {
  AreaDistribution,
  AttendanceTrend,
  HeadcountTrend,
  LaborCostTrend,
  TurnoverRisk,
} from "@/modules/analytics/types/analytics.types";

type Tone = "teal" | "blue" | "violet" | "emerald" | "amber" | "rose";
type SelectOption = { value: string; label: string };
type Insight = { title: string; description: string; tone: Tone };

const MONTH_OPTIONS: SelectOption[] = [
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
  { value: "18", label: "Últimos 18 meses" },
  { value: "24", label: "Últimos 24 meses" },
];

const STATIC_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "Todos" },
  { value: "prepared", label: "Preparado para backend" },
];

const AREA_COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#16a34a", "#f59e0b", "#e11d48", "#0891b2"];
const RISK_COLORS: Record<"high" | "medium" | "low", string> = {
  high: "#e11d48",
  medium: "#f59e0b",
  low: "#16a34a",
};

const TONE_STYLE: Record<Tone, { soft: string; icon: string; text: string; chip: string; line: string }> = {
  teal: { soft: "bg-brand-50", icon: "text-brand-700", text: "text-brand-700", chip: "bg-brand-100 text-brand-700", line: "bg-brand-500" },
  blue: { soft: "bg-blue-50", icon: "text-blue-700", text: "text-blue-700", chip: "bg-blue-100 text-blue-700", line: "bg-blue-500" },
  violet: { soft: "bg-violet-50", icon: "text-violet-700", text: "text-violet-700", chip: "bg-violet-100 text-violet-700", line: "bg-violet-500" },
  emerald: { soft: "bg-emerald-50", icon: "text-emerald-700", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700", line: "bg-emerald-500" },
  amber: { soft: "bg-amber-50", icon: "text-amber-700", text: "text-amber-700", chip: "bg-amber-100 text-amber-700", line: "bg-amber-500" },
  rose: { soft: "bg-rose-50", icon: "text-rose-700", text: "text-rose-700", chip: "bg-rose-100 text-rose-700", line: "bg-rose-500" },
};

function fmtNumber(value: number | undefined | null): string {
  return typeof value === "number" ? value.toLocaleString("es-PE") : "—";
}

function fmtCurrency(value: number | undefined | null): string {
  return typeof value === "number"
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(value)
    : "—";
}

function fmtPercent(value: number | undefined | null): string {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "—";
}

function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function variation(current?: number, previous?: number, unit: "%" | "pp" = "%"): string {
  if (typeof current !== "number" || typeof previous !== "number") return "Sin periodo anterior";
  const delta = current - previous;
  if (unit === "pp") return `${delta >= 0 ? "▲" : "▼"} ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pp vs mes anterior`;
  if (previous === 0) return current > 0 ? "▲ +100.0% vs mes anterior" : "0.0% vs mes anterior";
  const pct = (delta / previous) * 100;
  return `${pct >= 0 ? "▲" : "▼"} ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs mes anterior`;
}

function trendClass(text: string): string {
  if (text.startsWith("▼")) return "text-rose-600";
  if (text.startsWith("▲")) return "text-emerald-600";
  return "text-slate-400";
}

function chartCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `S/ ${(value / 1_000_000).toFixed(1)} M`;
  if (Math.abs(value) >= 1_000) return `S/ ${(value / 1_000).toFixed(0)} k`;
  return `S/ ${value}`;
}

function getLatest<T>(items: T[]): T | undefined {
  return items.length ? items[items.length - 1] : undefined;
}

function getPrevious<T>(items: T[]): T | undefined {
  return items.length > 1 ? items[items.length - 2] : undefined;
}

function EmptyChart({ label = "Sin datos disponibles" }: { label?: string }): JSX.Element {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-[13px] font-medium text-slate-400">
      {label}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="flex min-w-[150px] flex-1 flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ActionButton({ children, icon, variant = "secondary", onClick }: {
  children: string;
  icon: JSX.Element;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        variant === "primary"
          ? "inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
          : "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      }
    >
      {icon}
      {children}
    </button>
  );
}

function KpiCard({ label, value, change, icon, tone }: {
  label: string;
  value: string;
  change: string;
  icon: JSX.Element;
  tone: Tone;
}): JSX.Element {
  const style = TONE_STYLE[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${style.soft}`}>
          <span className={style.icon}>{icon}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>Mensual</span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className={`mt-2 text-[11px] font-semibold ${trendClass(change)}`}>{change}</p>
    </div>
  );
}

function ChartCard({ title, children, className = "", selector = "Mensual" }: {
  title: string;
  children: JSX.Element;
  className?: string;
  selector?: string;
}): JSX.Element {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">Datos conectados al backend de Analítica</p>
        </div>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">{selector}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AnalyticsTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-xl">
      <p className="mb-1 font-bold text-slate-700">{label}</p>
      {payload.map((item, index) => (
        <p key={`${item.name}-${index}`} className="font-semibold" style={{ color: item.color }}>
          {item.name}: {typeof item.value === "number" ? item.value.toLocaleString("es-PE") : item.value}
        </p>
      ))}
    </div>
  );
}

function buildExportRows(
  headcount: HeadcountTrend[],
  laborCost: LaborCostTrend[],
  attendance: AttendanceTrend[],
  areas: AreaDistribution[],
  risk: TurnoverRisk[],
): ExportRow[] {
  return [
    ...headcount.map((item) => ({
      Seccion: "Headcount",
      Periodo: item.label,
      Indicador: "Activos",
      Valor: item.activeCount,
      Detalle: `Ingresos: ${item.hiresCount} · Bajas: ${item.terminationsCount}`,
    })),
    ...laborCost.map((item) => ({
      Seccion: "Costo laboral",
      Periodo: item.label,
      Indicador: "Costo total",
      Valor: item.totalCost,
      Detalle: `Promedio: ${fmtCurrency(item.averageCost)}`,
    })),
    ...attendance.map((item) => ({
      Seccion: "Asistencia",
      Periodo: item.label,
      Indicador: "Tasa de asistencia",
      Valor: `${item.attendancePercent}%`,
      Detalle: `Presentes: ${item.presentCount} · Ausentes: ${item.absentCount} · Tardanzas: ${item.lateCount}`,
    })),
    ...areas.map((item) => ({
      Seccion: "Áreas",
      Periodo: "Actual",
      Indicador: item.areaName,
      Valor: item.employeeCount,
      Detalle: `Costo total: ${fmtCurrency(item.totalCost)} · Salario promedio: ${fmtCurrency(item.averageSalary)}`,
    })),
    ...risk.map((item) => ({
      Seccion: "Riesgo de rotación",
      Periodo: "Últimos 6 meses",
      Indicador: item.employeeName,
      Valor: item.riskScore,
      Detalle: `${item.areaName} · ${item.riskLevel === "high" ? "Alto" : item.riskLevel === "medium" ? "Medio" : "Bajo"}`,
    })),
  ];
}

export function PaginaAnalitica(): JSX.Element {
  const [period, setPeriod] = useState("12");
  const [area, setArea] = useState("all");
  const [site, setSite] = useState("all");
  const [contractType, setContractType] = useState("all");
  const [filtersTouched, setFiltersTouched] = useState(false);

  const months = Number(period);
  const powerBiUrl = (import.meta.env.VITE_POWER_BI_REPORT_URL as string | undefined)?.trim();

  const summary = useQuery({ queryKey: ["analytics-summary"], queryFn: getAnalyticsSummary });
  const headcount = useQuery({ queryKey: ["headcount-trend", months], queryFn: () => getHeadcountTrend(months) });
  const laborCost = useQuery({ queryKey: ["labor-cost-trend", months], queryFn: () => getLaborCostTrend(months) });
  const attendance = useQuery({ queryKey: ["attendance-trend", months], queryFn: () => getAttendanceTrend(months) });
  const areas = useQuery({ queryKey: ["area-distribution"], queryFn: getAreaDistribution });
  const risk = useQuery({ queryKey: ["turnover-risk"], queryFn: () => getTurnoverRisk(50) });

  const headcountData = headcount.data ?? [];
  const laborCostData = laborCost.data ?? [];
  const attendanceData = attendance.data ?? [];
  const areaData = areas.data ?? [];
  const riskData = risk.data ?? [];

  const areaOptions = useMemo<SelectOption[]>(() => [
    { value: "all", label: "Todas las áreas" },
    ...areaData.map((item) => ({ value: item.areaName, label: item.areaName })),
  ], [areaData]);

  const visibleAreas = useMemo(() => {
    const base = area === "all" ? areaData : areaData.filter((item) => item.areaName === area);
    return base.slice().sort((a, b) => b.employeeCount - a.employeeCount);
  }, [area, areaData]);

  const visibleRisk = useMemo(() => {
    return area === "all" ? riskData : riskData.filter((item) => item.areaName === area);
  }, [area, riskData]);

  const totalAreaEmployees = visibleAreas.reduce((sum, item) => sum + item.employeeCount, 0);
  const totalAreaCost = visibleAreas.reduce((sum, item) => sum + item.totalCost, 0);
  const topCostAreas = visibleAreas.slice().sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);
  const maxAreaCost = Math.max(...topCostAreas.map((item) => item.totalCost), 1);

  const latestHeadcount = getLatest(headcountData);
  const previousHeadcount = getPrevious(headcountData);
  const latestLaborCost = getLatest(laborCostData);
  const previousLaborCost = getPrevious(laborCostData);
  const latestAttendance = getLatest(attendanceData);
  const previousAttendance = getPrevious(attendanceData);

  const currentRotation = safeRate(summary.data?.terminationsThisMonth ?? latestHeadcount?.terminationsCount ?? 0, summary.data?.activeEmployees ?? latestHeadcount?.activeCount ?? 0);
  const previousRotation = previousHeadcount ? safeRate(previousHeadcount.terminationsCount, previousHeadcount.activeCount) : undefined;

  const riskSummary = useMemo(() => {
    const high = visibleRisk.filter((item) => item.riskLevel === "high").length;
    const medium = visibleRisk.filter((item) => item.riskLevel === "medium").length;
    const low = visibleRisk.filter((item) => item.riskLevel === "low").length;
    return [
      { name: "Alto", value: high, key: "high" as const },
      { name: "Medio", value: medium, key: "medium" as const },
      { name: "Bajo", value: low, key: "low" as const },
    ];
  }, [visibleRisk]);

  const insights = useMemo<Insight[]>(() => {
    const items: Insight[] = [];
    const topAvgSalary = areaData.slice().sort((a, b) => b.averageSalary - a.averageSalary)[0];
    const topRisk = riskData.find((item) => item.riskLevel === "high");
    const latest = getLatest(attendanceData);
    const prev = getPrevious(attendanceData);
    const topCost = areaData.slice().sort((a, b) => b.totalCost - a.totalCost)[0];

    if (topAvgSalary) {
      items.push({
        title: `${topAvgSalary.areaName} presenta el mayor salario promedio por colaborador.`,
        description: `Promedio actual: ${fmtCurrency(topAvgSalary.averageSalary)}.`,
        tone: "teal",
      });
    }
    if (topRisk) {
      items.push({
        title: `${topRisk.areaName} concentra un colaborador con riesgo alto de rotación.`,
        description: `${topRisk.employeeName} registra score ${topRisk.riskScore.toFixed(1)}.`,
        tone: "rose",
      });
    }
    if (latest && prev) {
      items.push({
        title: latest.attendancePercent >= prev.attendancePercent
          ? "La tasa de asistencia muestra una tendencia positiva sostenida."
          : "La tasa de asistencia requiere seguimiento frente al periodo anterior.",
        description: `${latest.label}: ${fmtPercent(latest.attendancePercent)} frente a ${fmtPercent(prev.attendancePercent)}.`,
        tone: latest.attendancePercent >= prev.attendancePercent ? "emerald" : "amber",
      });
    }
    if (topCost) {
      items.push({
        title: `${topCost.areaName} lidera el costo laboral total.`,
        description: `Representa ${fmtPercent(safeRate(topCost.totalCost, Math.max(totalAreaCost, 1)))} del costo registrado por área.`,
        tone: "blue",
      });
    }

    return items.slice(0, 4);
  }, [areaData, attendanceData, riskData, totalAreaCost]);

  const isLoading = summary.isLoading || headcount.isLoading || laborCost.isLoading || attendance.isLoading || areas.isLoading || risk.isLoading;
  const exportRowsData = buildExportRows(headcountData, laborCostData, attendanceData, areaData, riskData);

  function handleExport(format: ExportFormat): void {
    if (!exportRowsData.length) return;
    exportRows(format, exportRowsData, makeFileName("Analitica_RRHH", [period]), "Analítica RRHH", {
      subtitle: "Métricas y tendencias del capital humano conectadas al backend de Analítica.",
      period: MONTH_OPTIONS.find((item) => item.value === period)?.label,
      filters: [
        { label: "Área", value: area === "all" ? "Todas" : area },
        { label: "Sede", value: site === "all" ? "Todas" : "Preparado para backend" },
        { label: "Tipo de contrato", value: contractType === "all" ? "Todos" : "Preparado para backend" },
      ],
      metrics: [
        { label: "Empleados activos", value: fmtNumber(summary.data?.activeEmployees) },
        { label: "Tasa de asistencia", value: fmtPercent(summary.data?.attendanceRate) },
        { label: "Costo planilla", value: fmtCurrency(summary.data?.totalPayrollCost) },
        { label: "Riesgos evaluados", value: visibleRisk.length },
      ],
    });
  }

  function clearFilters(): void {
    setPeriod("12");
    setArea("all");
    setSite("all");
    setContractType("all");
    setFiltersTouched(false);
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 shadow-sm shadow-brand-600/25">
              <BarChart3 className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight text-slate-950">Analítica</h1>
              <p className="mt-0.5 text-[14px] text-slate-500">Métricas y tendencias del capital humano</p>
            </div>
          </div>
          {filtersTouched && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
              <AlertTriangle className="size-3.5" />
              Área se aplica de forma visual. Sede y contrato requieren filtros backend para afectar todas las métricas.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton icon={<FileSpreadsheet className="size-4" />} onClick={() => handleExport("excel")}>Exportar informe</ActionButton>
          <ActionButton icon={<FileText className="size-4" />} onClick={() => handleExport("pdf")}>Descargar PDF</ActionButton>
          <ActionButton
            icon={<ExternalLink className="size-4" />}
            variant="primary"
            onClick={() => {
              if (powerBiUrl) window.open(powerBiUrl, "_blank", "noopener,noreferrer");
              else setFiltersTouched(true);
            }}
          >
            Abrir en Power BI
          </ActionButton>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <SelectField label="Período" value={period} options={MONTH_OPTIONS} onChange={setPeriod} />
          <SelectField label="Área" value={area} options={areaOptions} onChange={setArea} />
          <SelectField label="Sede" value={site} options={STATIC_FILTER_OPTIONS} onChange={setSite} />
          <SelectField label="Tipo de contrato" value={contractType} options={STATIC_FILTER_OPTIONS} onChange={setContractType} />
          <button
            type="button"
            onClick={() => setFiltersTouched(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Filter className="size-4" />
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X className="size-4" />
            Limpiar
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-8 text-slate-400">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-[13px] font-medium">Cargando analítica...</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Empleados activos" value={fmtNumber(summary.data?.activeEmployees)} change={variation(latestHeadcount?.activeCount, previousHeadcount?.activeCount)} icon={<Users className="size-5" />} tone="teal" />
        <KpiCard label="Nuevos este mes" value={fmtNumber(summary.data?.newHiresThisMonth)} change={variation(latestHeadcount?.hiresCount, previousHeadcount?.hiresCount)} icon={<BriefcaseBusiness className="size-5" />} tone="blue" />
        <KpiCard label="Tasa de asistencia" value={fmtPercent(summary.data?.attendanceRate)} change={variation(latestAttendance?.attendancePercent, previousAttendance?.attendancePercent, "pp")} icon={<CalendarCheck className="size-5" />} tone="emerald" />
        <KpiCard label="Rotación mensual" value={fmtPercent(currentRotation)} change={variation(currentRotation, previousRotation, "pp")} icon={<RefreshCw className="size-5" />} tone="violet" />
        <KpiCard label="Costo total planilla" value={fmtCurrency(summary.data?.totalPayrollCost)} change={variation(latestLaborCost?.totalCost, previousLaborCost?.totalCost)} icon={<Wallet className="size-5" />} tone="amber" />
        <KpiCard label="Costo prom. por colaborador" value={fmtCurrency(summary.data?.averagePayrollCost)} change={variation(latestLaborCost?.averageCost, previousLaborCost?.averageCost)} icon={<TrendingUp className="size-5" />} tone="teal" />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <ChartCard title="Tendencia de headcount" className="xl:col-span-7">
          {headcountData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={headcountData} margin={{ top: 10, right: 18, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="activeCount" name="Activos" stroke="#0f766e" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="hiresCount" name="Ingresos" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="terminationsCount" name="Bajas" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Distribución por área" className="xl:col-span-5" selector="Actual">
          {visibleAreas.length ? (
            <div className="grid items-center gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="relative h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={visibleAreas} dataKey="employeeCount" nameKey="areaName" innerRadius={68} outerRadius={98} paddingAngle={2}>
                      {visibleAreas.map((_, index) => <Cell key={index} fill={AREA_COLORS[index % AREA_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-extrabold text-slate-900">{totalAreaEmployees}</p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                </div>
              </div>
              <div className="space-y-2">
                {visibleAreas.slice(0, 6).map((item, index) => (
                  <div key={item.areaName} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: AREA_COLORS[index % AREA_COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-700">{item.areaName}</span>
                    <span className="text-[12px] font-bold text-slate-900">{item.employeeCount}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Tendencia de costo laboral" className="xl:col-span-7">
          {laborCostData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={laborCostData} margin={{ top: 10, right: 20, left: -6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis yAxisId="left" tickFormatter={chartCurrency} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={chartCurrency} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="totalCost" name="Costo total" fill="#14b8a6" radius={[7, 7, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="averageCost" name="Costo promedio" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Riesgo de rotación" className="xl:col-span-5" selector="Top evaluados">
          {visibleRisk.length ? (
            <div>
              <div className="grid items-center gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskSummary} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} startAngle={180} endAngle={-180} paddingAngle={3}>
                        {riskSummary.map((item) => <Cell key={item.key} fill={RISK_COLORS[item.key]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {riskSummary.map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[item.key] }} />
                        {item.name}
                      </span>
                      <span className="text-[13px] font-extrabold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-[13px] font-semibold text-brand-700">
                Total evaluados: {visibleRisk.length} colaboradores
              </div>
            </div>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Tendencia de asistencia" className="xl:col-span-7">
          {attendanceData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={attendanceData} margin={{ top: 10, right: 18, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Area type="monotone" dataKey="attendancePercent" name="Asistencia" stroke="#0f766e" strokeWidth={3} fill="url(#attendanceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Áreas con mayor costo laboral" className="xl:col-span-5" selector="Ranking">
          {topCostAreas.length ? (
            <div className="space-y-3">
              {topCostAreas.map((item, index) => {
                const pct = safeRate(item.totalCost, Math.max(totalAreaCost, 1));
                return (
                  <div key={item.areaName} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-extrabold text-brand-700">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-slate-800">{item.areaName}</p>
                        <p className="text-[11px] text-slate-400">{fmtPercent(pct)} del total</p>
                      </div>
                      <span className="text-[13px] font-extrabold text-slate-900">{fmtCurrency(item.totalCost)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(6, (item.totalCost / maxAreaCost) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-brand-600" />
            <h2 className="text-[15px] font-bold text-slate-900">Indicadores clave</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Ausentismo", value: latestAttendance ? fmtPercent(safeRate(latestAttendance.absentCount, latestAttendance.totalRecords)) : "—", icon: <TrendingDown className="size-4" />, tone: "rose" as Tone },
              { label: "Tardanzas", value: fmtPercent(summary.data?.lateRate), icon: <Clock3 className="size-4" />, tone: "amber" as Tone },
              { label: "Vacaciones pendientes", value: fmtNumber(summary.data?.pendingVacations), icon: <CalendarCheck className="size-4" />, tone: "blue" as Tone },
              { label: "Permisos pendientes", value: fmtNumber(summary.data?.pendingLeaves), icon: <FileText className="size-4" />, tone: "violet" as Tone },
              { label: "Reclutamientos abiertos", value: fmtNumber(summary.data?.openRecruitments), icon: <BriefcaseBusiness className="size-4" />, tone: "emerald" as Tone },
              { label: "Documentos pendientes", value: fmtNumber(summary.data?.pendingDocuments), icon: <FileText className="size-4" />, tone: "teal" as Tone },
            ].map((item) => {
              const style = TONE_STYLE[item.tone];
              return (
                <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className={`mb-2 flex size-8 items-center justify-center rounded-lg ${style.soft} ${style.icon}`}>{item.icon}</div>
                  <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-900">{item.value}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Tiempo promedio de cobertura y capacitación por colaborador requieren endpoints específicos.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon className="size-4 text-brand-600" />
            <h2 className="text-[15px] font-bold text-slate-900">Insights destacados</h2>
          </div>
          {insights.length ? (
            <div className="space-y-3">
              {insights.map((item) => {
                const style = TONE_STYLE[item.tone];
                return (
                  <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex gap-3">
                      <span className={`mt-1 h-8 w-1.5 shrink-0 rounded-full ${style.line}`} />
                      <div>
                        <p className="text-[13px] font-bold leading-snug text-slate-800">{item.title}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Link to="/app/reports" className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-600 hover:text-brand-700">
                Ver todos los hallazgos
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          ) : <EmptyChart label="No hay datos suficientes para generar hallazgos" />}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <Download className="size-4 text-brand-600" />
            <h2 className="text-[15px] font-bold text-slate-900">Reportes disponibles</h2>
          </div>
          <div className="space-y-3">
            <button onClick={() => handleExport("excel")} className="flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-left transition hover:bg-emerald-100">
              <FileSpreadsheet className="size-5 text-emerald-700" />
              <span className="text-[13px] font-bold text-emerald-800">Excel</span>
            </button>
            <button onClick={() => handleExport("pdf")} className="flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-left transition hover:bg-rose-100">
              <FileText className="size-5 text-rose-700" />
              <span className="text-[13px] font-bold text-rose-800">PDF</span>
            </button>
            <button
              onClick={() => {
                if (powerBiUrl) window.open(powerBiUrl, "_blank", "noopener,noreferrer");
                else setFiltersTouched(true);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-3 py-3 text-left transition hover:bg-brand-100"
            >
              <ExternalLink className="size-5 text-brand-700" />
              <span className="text-[13px] font-bold text-brand-800">Power BI</span>
            </button>
            {!powerBiUrl && (
              <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
                Configura `VITE_POWER_BI_REPORT_URL` para abrir el dashboard real.
              </p>
            )}
            <Link to="/app/reports" className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-600 hover:text-brand-700">
              Ver todos los reportes
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
