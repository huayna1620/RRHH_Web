import { type ElementType, type JSX } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, BellRing, Briefcase, Building2, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileDown, FileText, MapPin, ShieldCheck, UserCircle2, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getEmployeeDashboard } from "@/modules/account/services/accountApi";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function Metric({
  title, icon: Icon, value, note, rows, to, linkText, tone,
}: {
  title: string; icon: ElementType; value: string; note: string; rows: Array<{ k: string; v: string; c?: string }>; to: string; linkText: string; tone: "blue" | "green" | "violet" | "amber";
}): JSX.Element {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  }[tone];
  return (
    <article className="min-h-[255px] rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <span className={`flex size-10 items-center justify-center rounded-xl border ${toneMap}`}><Icon className="size-4" /></span>
        </div>
        <div className="mb-3 flex items-end gap-2">
          <p className="text-[38px] font-extrabold leading-none text-slate-900">{value}</p>
          <p className="pb-0.5 text-xs text-slate-500">{note}</p>
        </div>
        <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
          {rows.map((r) => <div key={r.k} className="flex items-center justify-between text-xs"><span className="text-slate-500">{r.k}</span><span className={`font-semibold ${r.c ?? "text-slate-800"}`}>{r.v}</span></div>)}
        </div>
      </div>
      <Link to={to} className="flex items-center justify-center gap-1 border-t border-slate-100 py-2 text-xs font-semibold text-brand-600 hover:bg-slate-50">{linkText}<ArrowRight className="size-3.5" /></Link>
    </article>
  );
}

function ActionTile({ to, label, icon: Icon }: { to: string; label: string; icon: ElementType }): JSX.Element {
  const [a, b] = label.split(" ", 2);
  return (
    <Link to={to} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-brand-300 hover:shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-700"><Icon className="size-4" /></span>
        <span className="text-xs font-semibold leading-tight text-slate-700">{a}<br />{label.replace(`${a} `, "") || b || ""}</span>
      </div>
      <ArrowRight className="size-3.5 text-slate-400 group-hover:text-brand-600" />
    </Link>
  );
}

export function PaginaMiPortal(): JSX.Element {
  const { data, isLoading } = useQuery({ queryKey: ["employee-dashboard"], queryFn: getEmployeeDashboard });
  if (isLoading) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
  if (!data) return <section className="space-y-4"><PageHeader title="Mi portal" description="Portal del empleado" /><div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500">No tienes un perfil de empleado asociado a tu cuenta.</div></section>;

  const fullName = (data.fullName ?? "Colaborador").trim() || "Colaborador";
  const positionName = (data.positionName ?? "No registrado").trim() || "No registrado";
  const areaName = (data.areaName ?? "No registrado").trim() || "No registrado";
  const employeeCode = (data.employeeCode ?? "No registrado").trim() || "No registrado";
  const hireDate = (data.hireDate ?? "-").trim() || "-";
  const upcomingEvents = Array.isArray(data.upcomingEvents) ? data.upcomingEvents : [];

  const nval = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  const fmt = (n: unknown): string => nval(n).toLocaleString("es-PE");
  const money = (n: unknown): string => `S/ ${nval(n).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
  const requests = [
    { s: "Aprobado", sc: "bg-emerald-100 text-emerald-700", t: "Vacaciones", d: "Del 20/05/2026 al 24/05/2026", f: "05/05/2026" },
    { s: "Pendiente", sc: "bg-amber-100 text-amber-700", t: "Permiso personal", d: "23/05/2026 (1 dia)", f: "03/05/2026" },
    { s: "Observado", sc: "bg-blue-100 text-blue-700", t: "Permiso por cita medica", d: "15/05/2026 (medio dia)", f: "02/05/2026" },
    { s: "Aprobado", sc: "bg-emerald-100 text-emerald-700", t: "Trabajo remoto", d: "12/05/2026", f: "28/04/2026" },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <PageHeader title="Mi portal" description="Resumen de tu situacion laboral" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <article className="col-span-12 min-h-[255px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-4">
          <div className="flex items-start gap-3">
            <div className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-lg font-extrabold text-slate-700">{initials(fullName)}</div>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <p className="truncate text-[36px] font-bold leading-tight text-slate-900">{fullName}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Activa</span>
              </div>
              <div className="grid gap-x-6 gap-y-1.5 text-xs text-slate-600 sm:grid-cols-2">
                <p className="flex items-center gap-2"><Briefcase className="size-3.5" />Cargo: {positionName}</p>
                <p className="flex items-center gap-2"><MapPin className="size-3.5" />Sede: Lima Principal</p>
                <p className="flex items-center gap-2"><Building2 className="size-3.5" />Area: {areaName}</p>
                <p className="flex items-center gap-2"><ClipboardList className="size-3.5" />Contrato: Indefinido</p>
                <p className="flex items-center gap-2"><ShieldCheck className="size-3.5" />Codigo: {employeeCode}</p>
                <p className="flex items-center gap-2"><Users className="size-3.5" />Jefe directo: Gerencia General</p>
                <p className="flex items-center gap-2"><CalendarDays className="size-3.5" />Ingreso: {hireDate}</p>
              </div>
            </div>
          </div>
          <Link to="/app/profile" className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-cyan-50/60 py-2 text-xs font-semibold text-brand-600 hover:bg-cyan-100/60">Ver mi perfil completo <ArrowRight className="size-3.5" /></Link>
        </article>

        <div className="col-span-12 sm:col-span-6 md:col-span-2"><Metric title="Asistencia" icon={Clock3} tone="blue" value={fmt(data.attendanceDaysPresent)} note="dia presente" rows={[{ k: "Presentes", v: fmt(data.attendanceDaysPresent), c: "text-emerald-700" }, { k: "Ausentes", v: fmt(data.attendanceDaysAbsent), c: "text-rose-700" }, { k: "Tardanzas", v: fmt(data.attendanceDaysLate), c: "text-amber-700" }]} to="/app/attendance" linkText="Ver asistencia" /></div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2"><Metric title="Vacaciones" icon={CalendarDays} tone="green" value={fmt(data.vacationDaysAvailable)} note="dias disponibles" rows={[{ k: "Disponibles", v: `${fmt(data.vacationDaysAvailable)} dias`, c: "text-emerald-700" }, { k: "Usadas", v: `${fmt(data.vacationDaysUsed)} dias` }, { k: "Pendientes", v: `${fmt(data.vacationDaysPending)} dias` }]} to="/app/vacations" linkText="Ver vacaciones" /></div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2"><Metric title="Permisos" icon={ClipboardList} tone="violet" value={fmt(data.leaveRequestsTotal)} note="permiso total" rows={[{ k: "Total", v: fmt(data.leaveRequestsTotal) }, { k: "Aprobados", v: fmt(data.leaveRequestsApproved), c: "text-emerald-700" }, { k: "Pendientes", v: fmt(data.leaveRequestsPending), c: "text-amber-700" }]} to="/app/leaves" linkText="Ver permisos" /></div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2"><Metric title="Ultimo pago" icon={Banknote} tone="amber" value={money(data.lastNetPay)} note="monto neto" rows={[{ k: "Periodo", v: data.lastPayrollYear && data.lastPayrollMonth ? `${data.lastPayrollYear}/${String(data.lastPayrollMonth).padStart(2, "0")}` : "Sin datos" }, { k: "Fecha de pago", v: "15/05/2026" }, { k: "", v: "" }]} to="/app/payroll" linkText="Ver boletas" /></div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <article className="col-span-12 min-h-[312px] rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-bold text-slate-800">Solicitudes recientes</h3><Link to="/app/reports" className="text-xs font-semibold text-brand-600">Ver todas</Link></div>
          <div className="space-y-2 p-4">
            {requests.map((r, i) => <div key={i} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span className="size-2 rounded-full bg-slate-300" /><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.sc}`}>{r.s}</span><div><p className="text-sm font-semibold text-slate-800">{r.t}</p><p className="text-xs text-slate-500">{r.d}</p></div><span className="text-[11px] font-semibold text-slate-500">{r.f}</span></div>)}
          </div>
        </article>

        <article className="col-span-12 min-h-[312px] rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-bold text-slate-800">Proximos eventos</h3><Link to="/app/calendar" className="text-xs font-semibold text-brand-600">Ver calendario</Link></div>
          <div className="space-y-2 p-4">
            {(upcomingEvents.length ? upcomingEvents : [{ title: "Inicio de vacaciones", type: "Del 20/05/2026 al 24/05/2026", date: "En 15 dias" }, { title: "Feriado", type: "Dia no laborable", date: "En 33 dias" }, { title: "Fecha de pago", type: "Periodo 2026/05", date: "En 41 dias" }, { title: "Evaluacion", type: "Ciclo 2026", date: "En 66 dias" }]).slice(0, 4).map((ev, i) => {
              const tagTone = ["bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700", "bg-indigo-100 text-indigo-700"][i % 4];
              const monthDay = ["MAY 20", "JUN 07", "JUN 15", "JUL 10"][i % 4].split(" ");
              return <div key={i} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600"><span>{monthDay[0]}</span><span className="-mt-1 text-sm">{monthDay[1]}</span></span><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><CalendarDays className="size-4" /></span><div><p className="text-sm font-semibold text-slate-800">{ev.title ?? "Evento"}</p><p className="text-xs text-slate-500">{ev.type ?? "-"}</p></div><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagTone}`}>{ev.date ?? "-"}</span></div>;
            })}
          </div>
        </article>

        <article className="col-span-12 min-h-[312px] rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-bold text-slate-800">Avisos y documentos</h3><Link to="/app/documents" className="text-xs font-semibold text-brand-600">Ver todos</Link></div>
          <div className="space-y-2 p-4">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Wallet className="size-4" /></span><div><p className="text-sm font-semibold text-slate-800">Boleta de pago disponible</p><p className="text-xs text-slate-500">Periodo 2026/04</p></div><span className="text-[11px] font-semibold text-slate-500">15/05/2026</span></div>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700"><BellRing className="size-4" /></span><div><p className="text-sm font-semibold text-slate-800">Comunicado</p><p className="text-xs text-slate-500">Revisa las nuevas disposiciones</p></div><span className="text-[11px] font-semibold text-slate-500">12/05/2026</span></div>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700"><FileText className="size-4" /></span><div><p className="text-sm font-semibold text-slate-800">Documento pendiente</p><p className="text-xs text-slate-500">Firma el anexo de confidencialidad</p></div><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Pendiente</span></div>
            <Link to="/app/documents" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">Ir a mis documentos <ArrowRight className="size-3.5" /></Link>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Accesos rapidos</h3>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          <ActionTile to="/app/vacations" label="Solicitar vacaciones" icon={CalendarDays} />
          <ActionTile to="/app/leaves" label="Solicitar permiso" icon={ClipboardList} />
          <ActionTile to="/app/attendance" label="Ver asistencia" icon={Clock3} />
          <ActionTile to="/app/payroll" label="Ver boletas" icon={Wallet} />
          <ActionTile to="/app/calendar" label="Ver calendario" icon={CalendarDays} />
          <ActionTile to="/app/documents" label="Descargar documentos" icon={FileDown} />
          <ActionTile to="/app/incidents" label="Reportar incidencia" icon={CheckCircle2} />
          <ActionTile to="/app/profile" label="Actualizar datos" icon={UserCircle2} />
        </div>
      </article>
    </section>
  );
}
