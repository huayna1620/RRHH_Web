import { type ElementType, type JSX } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, BellRing, Briefcase, Building2, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileDown, MapPin, ShieldCheck, UserCircle2, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getEmployeeDashboard } from "@/modules/account/services/accountApi";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatShortDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function mapStatusBadge(status: string): { label: string; cls: string } {
  const v = (status || "").toLowerCase();
  if (v === "approved" || v === "aprobado") return { label: "Aprobado", cls: "bg-emerald-100 text-emerald-700" };
  if (v === "pending" || v === "pendiente") return { label: "Pendiente", cls: "bg-amber-100 text-amber-700" };
  if (v === "rejected" || v === "rechazado" || v === "observed" || v === "observado") return { label: "Observado", cls: "bg-blue-100 text-blue-700" };
  return { label: "En revision", cls: "bg-slate-100 text-slate-700" };
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function Metric({
  title, icon: Icon, value, note, rows, to, linkText, tone, compactValue = false,
}: {
  title: string; icon: ElementType; value: string; note: string;
  rows: Array<{ k: string; v: string; c?: string }>;
  to: string; linkText: string; tone: "blue" | "green" | "violet" | "amber";
  compactValue?: boolean;
}): JSX.Element {
  const toneMap = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    amber:  "bg-amber-50 text-amber-700 border-amber-100",
  }[tone];
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 p-3.5">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${toneMap}`}>
            <Icon className="size-[15px]" />
          </span>
        </div>
        {/* Value */}
        <div className="mb-2">
          <p className={`font-extrabold leading-none text-slate-900 ${compactValue ? "whitespace-nowrap text-[24px]" : "text-[28px]"}`}>
            {value}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{note}</p>
        </div>
        {/* Rows */}
        <div className="space-y-1 border-t border-slate-100 pt-2">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{r.k}</span>
              <span className={`font-semibold ${r.c ?? "text-slate-700"}`}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
      <Link
        to={to}
        className="flex items-center justify-center gap-1 rounded-b-2xl border-t border-slate-100 py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-slate-50"
      >
        {linkText}<ArrowRight className="size-3" />
      </Link>
    </article>
  );
}

// ─── Action tile ──────────────────────────────────────────────────────────────

function ActionTile({ to, label, icon: Icon }: { to: string; label: string; icon: ElementType }): JSX.Element {
  const words = label.split(" ");
  const half = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(" ");
  const line2 = words.slice(half).join(" ");
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-300 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-brand-50 group-hover:text-brand-600">
          <Icon className="size-4" />
        </span>
        <span className="text-[12px] font-semibold leading-snug text-slate-700">
          {line1}{line2 ? <><br />{line2}</> : null}
        </span>
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-slate-300 transition group-hover:text-brand-500" />
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, linkLabel, linkTo }: { title: string; linkLabel: string; linkTo: string }): JSX.Element {
  return (
    <div className="flex items-center border-b border-slate-100 px-4 py-2.5">
      <h3 className="flex-1 text-[13px] font-bold text-slate-800">{title}</h3>
      <Link to={linkTo} className="ml-4 shrink-0 text-[11px] font-semibold text-brand-600 hover:text-brand-700">
        {linkLabel} →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PaginaMiPortal(): JSX.Element {
  const { data, isLoading } = useQuery({ queryKey: ["employee-dashboard"], queryFn: getEmployeeDashboard });
  if (isLoading) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
  if (!data) return (
    <section className="space-y-4">
      <PageHeader title="Mi portal" description="Portal del empleado" />
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500">
        No tienes un perfil de empleado asociado a tu cuenta.
      </div>
    </section>
  );

  const fullName      = (data.fullName      ?? "Colaborador").trim() || "Colaborador";
  const positionName  = (data.positionName  ?? "No registrado").trim() || "No registrado";
  const areaName      = (data.areaName      ?? "No registrado").trim() || "No registrado";
  const employeeCode  = (data.employeeCode  ?? "No registrado").trim() || "No registrado";
  const hireDate      = (data.hireDate      ?? "-").trim() || "-";
  const upcomingEvents = Array.isArray(data.upcomingEvents) ? data.upcomingEvents : [];

  const nval = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  const fmt  = (n: unknown): string => nval(n).toLocaleString("es-PE");
  const money = (n: unknown): string => `S/ ${nval(n).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
  const requests = Array.isArray(data.recentRequests) ? data.recentRequests : [];
  const notices  = Array.isArray(data.notices) ? data.notices : [];

  return (
    <section className="space-y-4">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <PageHeader title="Mi portal" description="Resumen de tu situacion laboral" />
      </div>

      {/* ── Profile card + metrics ────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Profile card */}
        <article className="col-span-12 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-extrabold text-slate-600">
              {initials(fullName)}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <p className="truncate text-[20px] font-bold leading-tight text-slate-900">{fullName}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Activa
                </span>
              </div>
              <div className="grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
                <p className="flex items-center gap-1.5 text-slate-500">
                  <Briefcase className="size-3 shrink-0 text-slate-300" />
                  <span>Cargo:</span>
                  <span className="font-medium text-slate-700 truncate">{positionName}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="size-3 shrink-0 text-slate-300" />
                  <span>Sede:</span>
                  <span className="font-medium text-slate-700 truncate">{data.branchName ?? "No registrado"}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <Building2 className="size-3 shrink-0 text-slate-300" />
                  <span>Area:</span>
                  <span className="font-medium text-slate-700 truncate">{areaName}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <ClipboardList className="size-3 shrink-0 text-slate-300" />
                  <span>Contrato:</span>
                  <span className="font-medium text-slate-700 truncate">{data.contractTypeName ?? "No registrado"}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <ShieldCheck className="size-3 shrink-0 text-slate-300" />
                  <span>Codigo:</span>
                  <span className="font-medium text-slate-700">{employeeCode}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <Users className="size-3 shrink-0 text-slate-300" />
                  <span>Jefe:</span>
                  <span className="font-medium text-slate-700 truncate">{data.managerName ?? "No registrado"}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <CalendarDays className="size-3 shrink-0 text-slate-300" />
                  <span>Ingreso:</span>
                  <span className="font-medium text-slate-700">{hireDate}</span>
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/app/profile"
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-1.5 text-[12px] font-semibold text-brand-600 transition hover:bg-brand-50"
          >
            Ver mi perfil completo <ArrowRight className="size-3.5" />
          </Link>
        </article>

        {/* Metric cards */}
        <div className="col-span-12 sm:col-span-6 md:col-span-2">
          <Metric
            title="Asistencia" icon={Clock3} tone="blue"
            value={fmt(data.attendanceDaysPresent)} note="dias presentes"
            rows={[
              { k: "Presentes", v: fmt(data.attendanceDaysPresent), c: "text-emerald-700" },
              { k: "Ausentes",  v: fmt(data.attendanceDaysAbsent),  c: "text-rose-700" },
              { k: "Tardanzas", v: fmt(data.attendanceDaysLate),    c: "text-amber-700" },
            ]}
            to="/app/attendance" linkText="Ver asistencia"
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2">
          <Metric
            title="Vacaciones" icon={CalendarDays} tone="green"
            value={fmt(data.vacationDaysAvailable)} note="dias disponibles"
            rows={[
              { k: "Disponibles", v: `${fmt(data.vacationDaysAvailable)} dias`, c: "text-emerald-700" },
              { k: "Usadas",      v: `${fmt(data.vacationDaysUsed)} dias` },
              { k: "Pendientes",  v: `${fmt(data.vacationDaysPending)} dias` },
            ]}
            to="/app/vacations" linkText="Ver vacaciones"
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2">
          <Metric
            title="Permisos" icon={ClipboardList} tone="violet"
            value={fmt(data.leaveRequestsTotal)} note="solicitudes total"
            rows={[
              { k: "Total",      v: fmt(data.leaveRequestsTotal) },
              { k: "Aprobados",  v: fmt(data.leaveRequestsApproved), c: "text-emerald-700" },
              { k: "Pendientes", v: fmt(data.leaveRequestsPending),  c: "text-amber-700" },
            ]}
            to="/app/leaves" linkText="Ver permisos"
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2">
          <Metric
            title="Ultimo pago" icon={Banknote} tone="amber"
            value={money(data.lastNetPay)} note="monto neto" compactValue
            rows={[
              {
                k: "Periodo",
                v: data.lastPayrollYear && data.lastPayrollMonth
                  ? `${data.lastPayrollYear}/${String(data.lastPayrollMonth).padStart(2, "0")}`
                  : "Sin datos",
              },
              {
                k: "Fecha pago",
                v: data.lastPayrollPaidAtUtc ? formatShortDate(data.lastPayrollPaidAtUtc) : "Sin datos",
              },
              { k: "", v: "" },
            ]}
            to="/app/payroll" linkText="Ver boletas"
          />
        </div>
      </div>

      {/* ── Lists row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Solicitudes recientes */}
        <article className="col-span-12 rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <SectionHeader title="Solicitudes recientes" linkLabel="Ver todas" linkTo="/app/reports" />
          <div className="space-y-2 p-3.5">
            {requests.length ? requests.map((r, i) => {
              const s = mapStatusBadge(r.status);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-slate-300" />
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
                    {s.label}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{r.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{r.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-slate-300">
                    {formatShortDate(r.createdAtUtc)}
                  </span>
                </div>
              );
            }) : (
              <div className="rounded-xl border border-slate-100 px-3 py-3 text-[12px] text-slate-400">
                Sin solicitudes recientes.
              </div>
            )}
          </div>
        </article>

        {/* Proximos eventos */}
        <article className="col-span-12 rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <SectionHeader title="Proximos eventos" linkLabel="Ver calendario" linkTo="/app/calendar" />
          <div className="space-y-2 p-3.5">
            {(upcomingEvents.length ? upcomingEvents : [
              { title: "Inicio de vacaciones", type: "Del 20/05/2026 al 24/05/2026", date: "En 15 dias" },
              { title: "Feriado",              type: "Dia no laborable",              date: "En 33 dias" },
              { title: "Fecha de pago",        type: "Periodo 2026/05",               date: "En 41 dias" },
              { title: "Evaluacion",           type: "Ciclo 2026",                    date: "En 66 dias" },
            ]).slice(0, 4).map((ev, i) => {
              const tagTone = [
                "bg-emerald-100 text-emerald-700",
                "bg-blue-100 text-blue-700",
                "bg-amber-100 text-amber-700",
                "bg-indigo-100 text-indigo-700",
              ][i % 4];
              const monthDay = ["MAY 20", "JUN 07", "JUN 15", "JUL 10"][i % 4].split(" ");
              return (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  {/* Date block */}
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 leading-none text-slate-600">
                    <span className="text-[9px] font-bold uppercase">{monthDay[0]}</span>
                    <span className="-mt-0.5 text-[13px] font-extrabold">{monthDay[1]}</span>
                  </span>
                  {/* Text */}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{ev.title ?? "Evento"}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{ev.type ?? "-"}</p>
                  </div>
                  {/* Tag */}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tagTone}`}>
                    {ev.date ?? "-"}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        {/* Avisos y documentos */}
        <article className="col-span-12 rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <SectionHeader title="Avisos y documentos" linkLabel="Ver todos" linkTo="/app/documents" />
          <div className="space-y-2 p-3.5">
            {notices.length ? notices.map((n, i) => {
              const isPending =
                (n.status ?? "").toLowerCase().includes("pending") ||
                (n.status ?? "").toLowerCase().includes("unread");
              return (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <BellRing className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{n.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{n.detail}</p>
                  </div>
                  {isPending
                    ? <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pendiente</span>
                    : <span className="shrink-0 text-[10px] font-medium text-slate-300">{formatShortDate(n.createdAtUtc)}</span>
                  }
                </div>
              );
            }) : (
              <div className="rounded-xl border border-slate-100 px-3 py-3 text-[12px] text-slate-400">
                Sin avisos recientes.
              </div>
            )}
            <Link
              to="/app/documents"
              className="inline-flex items-center gap-1 pt-0.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Ir a mis documentos <ArrowRight className="size-3" />
            </Link>
          </div>
        </article>
      </div>

      {/* ── Accesos rapidos ───────────────────────────────────────────────────── */}
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[13px] font-bold text-slate-800">Accesos rapidos</h3>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          <ActionTile to="/app/vacations"  label="Solicitar vacaciones"   icon={CalendarDays}  />
          <ActionTile to="/app/leaves"     label="Solicitar permiso"       icon={ClipboardList} />
          <ActionTile to="/app/attendance" label="Ver asistencia"          icon={Clock3}        />
          <ActionTile to="/app/payroll"    label="Ver boletas"             icon={Wallet}        />
          <ActionTile to="/app/calendar"   label="Ver calendario"          icon={CalendarDays}  />
          <ActionTile to="/app/documents"  label="Descargar documentos"    icon={FileDown}      />
          <ActionTile to="/app/incidents"  label="Reportar incidencia"     icon={CheckCircle2}  />
          <ActionTile to="/app/profile"    label="Actualizar datos"        icon={UserCircle2}   />
        </div>
      </article>

    </section>
  );
}
