import { type ElementType, type JSX } from "react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Flag,
  MapPin,
  Settings,
  Sparkles,
  UserCheck,
  UserPlus,
  UserRoundMinus,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsSummary, getAreaDistribution } from "@/modules/analytics/services/analyticsApi";
import { getAttendanceSummary } from "@/modules/attendance/services/attendanceApi";
import { getCalendarEvents } from "@/modules/account/services/accountApi";
import { getAuditLogs } from "@/modules/audit/services/auditApi";

type Tone = "teal" | "green" | "blue" | "rose" | "amber" | "violet";

type EventTone = { icon: ElementType; color: string; label: string };

const kpiTone: Record<Tone, { ring: string; soft: string; iconBg: string; icon: string; chip: string }> = {
  teal: { ring: "ring-teal-200", soft: "from-teal-50 to-white", iconBg: "bg-teal-100", icon: "text-teal-700", chip: "text-teal-700 bg-teal-100" },
  green: { ring: "ring-emerald-200", soft: "from-emerald-50 to-white", iconBg: "bg-emerald-100", icon: "text-emerald-700", chip: "text-emerald-700 bg-emerald-100" },
  blue: { ring: "ring-blue-200", soft: "from-blue-50 to-white", iconBg: "bg-blue-100", icon: "text-blue-700", chip: "text-blue-700 bg-blue-100" },
  rose: { ring: "ring-rose-200", soft: "from-rose-50 to-white", iconBg: "bg-rose-100", icon: "text-rose-700", chip: "text-rose-700 bg-rose-100" },
  amber: { ring: "ring-amber-200", soft: "from-amber-50 to-white", iconBg: "bg-amber-100", icon: "text-amber-700", chip: "text-amber-700 bg-amber-100" },
  violet: { ring: "ring-violet-200", soft: "from-violet-50 to-white", iconBg: "bg-violet-100", icon: "text-violet-700", chip: "text-violet-700 bg-violet-100" },
};

const donutPalette = ["#14b8a6", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#22c55e"];

function fmt(n: number | undefined): string {
  return n !== undefined ? n.toLocaleString("es-PE") : "-";
}

function safePercent(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "-";
  const normalized = n <= 1 ? n * 100 : n;
  const clamped = Math.max(0, Math.min(normalized, 100));
  return `${clamped.toFixed(1)}%`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthAndYearNow(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function parseAuditTimestamp(timestamp: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp);
  if (hasTimezone) return new Date(timestamp);
  return new Date(`${timestamp}Z`);
}

function timeAgoLabel(timestamp: string): string {
  const raw = parseAuditTimestamp(timestamp);
  const now = new Date();
  const d = raw.getTime() > now.getTime() ? now : raw;
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === y.toDateString();
  const hhmm = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (sameDay) return `Hoy, ${hhmm}`;
  if (isYesterday) return `Ayer, ${hhmm}`;
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" }) + `, ${hhmm}`;
}

function toSpanishAction(action: string | undefined): string {
  const a = (action ?? "").toLowerCase();
  if (a === "approve") return "Aprobacion registrada";
  if (a === "reject") return "Rechazo registrado";
  if (a === "justify") return "Justificacion enviada";
  if (a === "create") return "Registro creado";
  if (a === "update") return "Registro actualizado";
  if (a === "delete") return "Registro eliminado";
  if (a === "generate") return "Proceso generado";
  return action && action.trim().length > 0 ? action : "Actividad registrada";
}

function toSpanishDetail(module: string | undefined, entityType: string | undefined, details: string | undefined): string {
  if (details && details.trim().length > 0) return details;

  const m = (module ?? "").toLowerCase();
  const e = (entityType ?? "").toLowerCase();

  if (m.includes("vacation") || e.includes("vacationrequest")) return "Vacaciones - Solicitud";
  if (m.includes("leave") || e.includes("leaverequest")) return "Permisos - Solicitud";
  if (m.includes("incident") || e.includes("incident")) return "Incidencias - Revision";
  if (m.includes("attendance") || e.includes("attendance")) return "Asistencia - Movimiento";
  if (m.includes("payroll") || e.includes("payroll")) return "Planilla - Proceso";
  if (m.includes("employee") || e.includes("employee")) return "Empleado - Actualizacion";

  if (module && entityType) return `${module} - ${entityType}`;
  if (module) return module;
  if (entityType) return entityType;
  return "Sin detalle";
}

function eventTone(type: string): EventTone {
  const t = type.toLowerCase();
  if (t.includes("holiday") || t.includes("feriado")) return { icon: Flag, color: "bg-blue-50 text-blue-700", label: "Feriado" };
  if (t.includes("vacation") || t.includes("vacacion")) return { icon: CalendarDays, color: "bg-emerald-50 text-emerald-700", label: "Vacaciones" };
  if (t.includes("birthday") || t.includes("cumple")) return { icon: Sparkles, color: "bg-rose-50 text-rose-700", label: "Cumpleanos" };
  return { icon: CalendarClock, color: "bg-violet-50 text-violet-700", label: "Evento" };
}

function Kpi({ title, value, sub, icon: Icon, tone, badge }: { title: string; value: string; sub: string; icon: ElementType; tone: Tone; badge: string }): JSX.Element {
  const t = kpiTone[tone];
  return (
    <Card className={`overflow-hidden border-slate-200 bg-gradient-to-br ${t.soft} ring-1 ${t.ring}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-1 text-[32px] font-extrabold leading-none text-slate-900">{value}</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-[11px] text-slate-500">{sub}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.chip}`}>{badge}</span>
            </div>
          </div>
          <div className={`flex size-12 items-center justify-center rounded-2xl ${t.iconBg}`}>
            <Icon className={`size-5 ${t.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionTile({ to, label, icon: Icon }: { to: string; label: string; icon: ElementType }): JSX.Element {
  return (
    <Link to={to} className="group rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-slate-600 transition group-hover:text-brand-600" />
        <ArrowRight className="size-3.5 text-slate-400 transition group-hover:text-brand-600" />
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
    </Link>
  );
}

function MiniSpark({ tone }: { tone: "emerald" | "rose" | "blue" | "violet" }): JSX.Element {
  const bars = [22, 35, 18, 54, 31, 27, 42, 19, 28, 46, 24, 37, 21];
  const cls = {
    emerald: "bg-emerald-400/80",
    rose: "bg-rose-400/80",
    blue: "bg-blue-400/80",
    violet: "bg-violet-400/80",
  }[tone];
  return (
    <div className="mt-2 flex h-9 items-end gap-1">
      {bars.map((h, i) => <span key={`${tone}-${i}`} className={`w-1.5 rounded-sm ${cls}`} style={{ height: `${h}%` }} />)}
    </div>
  );
}

export function PaginaDashboard(): JSX.Element {
  const location = useLocation();
  const analyticsQuery = useQuery({ queryKey: ["analytics-summary"], queryFn: getAnalyticsSummary });
  const attendanceQuery = useQuery({
    queryKey: ["attendance-summary-dashboard", todayIso()],
    queryFn: () => getAttendanceSummary({
      viewMode: "daily",
      referenceDate: todayIso(),
      startDateFrom: todayIso(),
      startDateTo: todayIso(),
      search: "",
      employeeId: "",
      areaId: "",
      isLate: undefined as unknown as boolean,
      isAbsent: undefined as unknown as boolean,
      pageNumber: 1,
      pageSize: 10,
    }),
  });
  const areaQuery = useQuery({ queryKey: ["area-distribution-dashboard"], queryFn: getAreaDistribution });
  const auditQuery = useQuery({
    queryKey: ["dashboard-audit-feed"],
    queryFn: () => getAuditLogs({ search: "", module: "", action: "", userId: "", from: "", to: "", pageNumber: 1, pageSize: 4 }),
    refetchInterval: 15000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const refetchAudit = auditQuery.refetch;

  useEffect(() => {
    void refetchAudit();
  }, [location.pathname, refetchAudit]);

  const { year, month } = monthAndYearNow();
  const eventsQuery = useQuery({ queryKey: ["calendar-events-dashboard", year, month], queryFn: () => getCalendarEvents(year, month) });

  const isLoading = analyticsQuery.isLoading || attendanceQuery.isLoading || areaQuery.isLoading;
  const analytics = analyticsQuery.data;
  const attendance = attendanceQuery.data;
  const areas = (areaQuery.data ?? []).slice(0, 6);
  const events = (eventsQuery.data ?? []).slice(0, 4);
  const auditItems = (auditQuery.data?.items ?? []).filter((a) => {
    const action = (a.action ?? "").toLowerCase();
    const details = (a.details ?? "").toLowerCase();
    const module = (a.module ?? "").toLowerCase();

    const isTechnicalGenerate = action === "generate" || details.includes("new=") || details.includes("updated=");
    const isPayrollProcess = module.includes("payroll") && action === "update";

    return !isTechnicalGenerate && !isPayrollProcess;
  });

  const pending = [
    { label: "Vacaciones", detail: "Solicitudes de vacaciones", value: analytics?.pendingVacations ?? 0, to: "/app/vacations" },
    { label: "Permisos", detail: "Solicitudes de permisos", value: analytics?.pendingLeaves ?? 0, to: "/app/leaves" },
    { label: "Documentos", detail: "Documentos por validar", value: analytics?.pendingDocuments ?? 0, to: "/app/documents" },
    { label: "Incidencias", detail: "Incidencias reportadas", value: attendance?.justified ?? 0, to: "/app/incidents" },
  ];

  const totalPending = pending.reduce((a, b) => a + b.value, 0);
  const activityFeed = auditItems.map((a, i) => {
    const color = ["bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"][i % 4];
    return {
      t: timeAgoLabel(a.timestamp),
      title: toSpanishAction(a.action),
      d: toSpanishDetail(a.module, a.entityType, a.details),
      c: color,
    };
  });

  const totalArea = areas.reduce((a, b) => a + b.employeeCount, 0);
  let start = 0;
  const donut = areas.map((a, i) => {
    const pct = totalArea ? (a.employeeCount / totalArea) * 100 : 0;
    const s = start;
    start += pct;
    return { ...a, pct, start: s, color: donutPalette[i % donutPalette.length] };
  });

  if (isLoading) {
    return (
      <section className="space-y-5">
        <PageHeader title="Dashboard" description="Resumen general del sistema RRHH" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 sm:p-5">
        <PageHeader
          title="Dashboard"
          description={`Resumen general del sistema RRHH · ${new Date().toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`}
          action={
            <>
              <Link to="/app/employees" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-[13px] font-semibold text-white hover:bg-brand-700"><UserPlus className="size-4" />Nuevo empleado</Link>
              <Link to="/app/attendance" className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-[13px] font-semibold text-blue-700 hover:bg-blue-50"><Clock3 className="size-4" />Registrar asistencia</Link>
              <Link to="/app/vacations" className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 text-[13px] font-semibold text-violet-700 hover:bg-violet-50"><FileCheck2 className="size-4" />Aprobar solicitudes</Link>
              <Link to="/app/reports" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><ClipboardList className="size-4" />Ver reportes</Link>
            </>
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi title="Empleados totales" value={fmt(analytics?.totalEmployees)} sub="En toda la organizacion" icon={Users} tone="teal" badge="Global" />
        <Kpi title="Activos" value={fmt(analytics?.activeEmployees)} sub="Con vinculo vigente" icon={UserCheck} tone="green" badge={safePercent((analytics?.activeEmployees ?? 0) / Math.max(analytics?.totalEmployees ?? 1, 1))} />
        <Kpi title="Nuevos este mes" value={fmt(analytics?.newHiresThisMonth)} sub="Altas del mes" icon={UserPlus} tone="blue" badge="Mes" />
        <Kpi title="Bajas este mes" value={fmt(analytics?.terminationsThisMonth)} sub="Bajas del mes" icon={UserRoundMinus} tone="rose" badge="Mes" />
        <Kpi title="Asistencia hoy" value={safePercent(analytics?.attendanceRate)} sub={`${fmt(attendance?.present)} registros`} icon={Clock3} tone="amber" badge={`Tardanza ${safePercent(analytics?.lateRate)}`} />
        <Kpi title="Pendientes" value={fmt(totalPending)} sub="Solicitudes por revisar" icon={FileCheck2} tone="violet" badge="Prioridad" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-200 min-h-[420px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-800"><FileCheck2 className="size-4 text-violet-600" />Pendientes de aprobacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 py-4">
            {pending.map((p) => (
              <div key={p.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                  <p className="text-[11px] text-slate-500">{p.detail}</p>
                </div>
                <span className="text-xl font-extrabold text-slate-900">{fmt(p.value)}</span>
                <Link to={p.to} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:text-brand-700">Revisar<ArrowRight className="size-3.5" /></Link>
              </div>
            ))}
            <Link to="/app/reports" className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-[12px] font-semibold text-orange-700 hover:bg-orange-100">Ver todas las solicitudes<ArrowRight className="size-3.5" /></Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-h-[360px]">
          <CardHeader className="pb-3">
            <div className="flex w-full items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-slate-800"><Activity className="size-4 text-emerald-600" />Actividad reciente</CardTitle>
              <Link to="/app/audit-log" className="shrink-0 text-[12px] font-semibold text-brand-600 hover:text-brand-700">Ver todo</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 py-4">
            {(activityFeed.length ? activityFeed : [
              { t: "Hoy", title: "Sin actividad reciente", d: "No hay registros de auditoria para mostrar.", c: "bg-slate-100 text-slate-600" },
            ]).map((item, i, arr) => (
              <div key={item.title} className="grid grid-cols-[auto_1fr] gap-3">
                <div className="flex flex-col items-center"><span className={`mt-0.5 flex size-7 items-center justify-center rounded-full ${item.c}`}><Circle className="size-2.5 fill-current" /></span>{i < arr.length - 1 && <span className="mt-1 h-full min-h-8 w-px bg-slate-200" />}</div>
                <div className="rounded-xl border border-slate-100 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{item.title}</p><span className="text-[11px] font-semibold text-slate-500">{item.t}</span></div>
                  <p className="mt-1 text-[12px] text-slate-500">{item.d}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-h-[360px]">
          <CardHeader className="pb-3">
            <div className="flex w-full items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-slate-800"><CalendarClock className="size-4 text-amber-600" />Proximos eventos</CardTitle>
              <Link to="/app/calendar" className="shrink-0 text-[12px] font-semibold text-brand-600 hover:text-brand-700">Ver calendario</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 py-4">
            {events.length ? events.map((ev, i) => {
              const tone = eventTone(ev.type); const Icon = tone.icon;
              return (
                <div key={`${ev.title}-${i}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                  <span className={`flex size-8 items-center justify-center rounded-lg ${tone.color}`}><Icon className="size-4" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{ev.title}</p><p className="truncate text-[11px] text-slate-500">{ev.employeeName ?? tone.label}</p></div>
                  <span className="text-[11px] font-bold text-slate-700">{ev.startDate}</span>
                </div>
              );
            }) : <p className="rounded-xl border border-slate-100 bg-slate-50/60 py-6 text-center text-sm text-slate-400">Sin eventos proximos.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 min-h-[360px]">
          <CardHeader className="pb-3">
            <div className="flex w-full items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-slate-800"><MapPin className="size-4 text-teal-600" />Distribucion del personal</CardTitle>
              <Link to="/app/analytics" className="shrink-0 text-[12px] font-semibold text-brand-600 hover:text-brand-700">Ver distribucion completa</Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 px-5 py-5 lg:grid-cols-[280px_1fr]">
            <div className="mx-auto grid place-items-center">
              {donut.length ? <div className="relative size-[230px] rounded-full" style={{ background: `conic-gradient(${donut.map((s) => `${s.color} ${s.start.toFixed(2)}% ${(s.start + s.pct).toFixed(2)}%`).join(", ")})` }}><div className="absolute inset-[30px] grid place-items-center rounded-full bg-white shadow-inner"><p className="text-4xl font-extrabold text-slate-900">{fmt(totalArea)}</p><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p></div></div> : <p className="text-sm text-slate-400">Sin datos</p>}
            </div>
            <div className="space-y-3 pt-2">
              {donut.map((a) => <div key={a.areaName} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-md px-3 py-2.5 hover:bg-slate-50"><span className="size-3 rounded-full" style={{ backgroundColor: a.color }} /><span className="truncate text-[17px] font-medium text-slate-700">{a.areaName}</span><span className="text-lg font-bold text-slate-900">{fmt(a.employeeCount)}</span><span className="text-[13px] font-semibold text-slate-500">{a.pct.toFixed(1)}%</span></div>)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-h-[360px]">
          <CardHeader className="pb-3">
            <div className="flex w-full items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-slate-800"><Clock3 className="size-4 text-blue-600" />Resumen de asistencia</CardTitle>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">Hoy</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[{ n: "Tardanzas hoy", v: fmt(attendance?.late), c: "text-emerald-700 border-emerald-100 bg-emerald-50", t: "emerald" as const }, { n: "Faltas hoy", v: fmt(attendance?.absent), c: "text-rose-700 border-rose-100 bg-rose-50", t: "rose" as const }, { n: "Permisos activos", v: fmt(analytics?.pendingLeaves), c: "text-blue-700 border-blue-100 bg-blue-50", t: "blue" as const }, { n: "Ausencias", v: fmt((attendance?.noRecord ?? 0) + (attendance?.justified ?? 0)), c: "text-violet-700 border-violet-100 bg-violet-50", t: "violet" as const }].map((x) => (
                <div key={x.n} className={`rounded-xl border p-3 ${x.c}`}>
                  <p className="text-[11px] font-semibold">{x.n}</p>
                  <p className="mt-1 text-3xl font-extrabold">{x.v}</p>
                  <MiniSpark tone={x.t} />
                </div>
              ))}
            </div>
            <div className="grid gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 sm:grid-cols-3">
              <div><p className="text-[11px] text-slate-500">Asistencia promedio</p><p className="text-lg font-extrabold text-emerald-700">{safePercent(analytics?.attendanceRate)}</p></div>
              <div><p className="text-[11px] text-slate-500">Mejor indicador</p><p className="text-lg font-extrabold text-blue-700">{safePercent(100 - (analytics?.lateRate ?? 0))}</p></div>
              <div><p className="text-[11px] text-slate-500">Pendientes hoy</p><p className="text-lg font-extrabold text-violet-700">{fmt(totalPending)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3"><CardTitle className="text-slate-800">Accesos rapidos</CardTitle></CardHeader>
        <CardContent className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ActionTile to="/app/employees" label="Nuevo empleado" icon={UserPlus} />
          <ActionTile to="/app/attendance" label="Registrar asistencia" icon={Clock3} />
          <ActionTile to="/app/vacations" label="Aprobar vacaciones" icon={CalendarDays} />
          <ActionTile to="/app/payroll" label="Ver planilla" icon={FileText} />
          <ActionTile to="/app/reports" label="Ver reportes" icon={ClipboardList} />
          <ActionTile to="/app/configuration" label="Configuracion" icon={Settings} />
        </CardContent>
      </Card>
    </section>
  );
}
