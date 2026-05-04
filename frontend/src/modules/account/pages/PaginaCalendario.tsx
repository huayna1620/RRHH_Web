import { useMemo, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Flag,
  Star,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getCalendarEvents } from "@/modules/account/services/accountApi";
import type { CalendarEvent } from "@/modules/account/services/accountApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ─── Event type config ─────────────────────────────────────────────────────────

type EventKey = "holiday" | "vacation" | "leave" | "incident" | "payroll" | "evaluation" | "other";

const EVENT_CFG: Record<EventKey, { label: string; dot: string; bg: string; text: string; border: string }> = {
  holiday:    { label: "Feriado",     dot: "bg-rose-500",    bg: "bg-rose-50",    text: "text-rose-700",   border: "border-rose-200" },
  vacation:   { label: "Vacaciones",  dot: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  leave:      { label: "Permiso",     dot: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200" },
  incident:   { label: "Incidencia",  dot: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
  payroll:    { label: "Pago",        dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200" },
  evaluation: { label: "Evaluación",  dot: "bg-teal-500",    bg: "bg-teal-50",    text: "text-teal-700",   border: "border-teal-200" },
  other:      { label: "Otro",        dot: "bg-slate-400",   bg: "bg-slate-50",   text: "text-slate-600",  border: "border-slate-200" },
};

function resolveKey(type: string): EventKey {
  const t = type.toLowerCase();
  if (t.includes("holiday") || t.includes("feriado")) return "holiday";
  if (t.includes("vacation") || t.includes("vacacion")) return "vacation";
  if (t.includes("leave") || t.includes("permiso")) return "leave";
  if (t.includes("incident") || t.includes("incidencia")) return "incident";
  if (t.includes("payroll") || t.includes("pago") || t.includes("payment")) return "payroll";
  if (t.includes("evaluation") || t.includes("evaluacion")) return "evaluation";
  return "other";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function eventsForDay(events: CalendarEvent[], iso: string): CalendarEvent[] {
  return events.filter((e) => e.startDate <= iso && iso <= e.endDate);
}

function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type Filter = EventKey | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",        label: "Todos" },
  { key: "holiday",    label: "Feriados" },
  { key: "vacation",   label: "Vacaciones" },
  { key: "leave",      label: "Permisos" },
  { key: "incident",   label: "Incidencias" },
  { key: "payroll",    label: "Pagos" },
  { key: "evaluation", label: "Evaluaciones" },
];

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}): JSX.Element {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3.5 bg-white shadow-sm ${color}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/70">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[22px] font-extrabold leading-none">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium opacity-75 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ─── Day detail panel ─────────────────────────────────────────────────────────

function DayPanel({ selectedDay, events, upcoming }: {
  selectedDay: string | null;
  events: CalendarEvent[];
  upcoming: CalendarEvent[];
}): JSX.Element {
  if (selectedDay) {
    const dayEvents = eventsForDay(events, selectedDay);
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-500">Día seleccionado</p>
          <p className="mt-0.5 text-sm font-bold capitalize text-slate-800">{formatLong(selectedDay)}</p>
        </div>

        {dayEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center">
            <CalendarDays className="mx-auto mb-2 size-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">Sin eventos este día</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev, i) => {
              const cfg = EVENT_CFG[resolveKey(ev.type)];
              const isRange = ev.startDate !== ev.endDate;
              return (
                <div key={i} className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
                        {ev.status && (
                          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{ev.status}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{ev.title}</p>
                      {ev.employeeName && <p className="text-xs text-slate-500">{ev.employeeName}</p>}
                      {isRange && (
                        <p className="mt-0.5 text-[11px] text-slate-400">{formatShort(ev.startDate)} → {formatShort(ev.endDate)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // No day selected → show upcoming
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Próximos eventos</p>
        <p className="mt-0.5 text-xs text-slate-500">Haz clic en un día para ver su detalle</p>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center">
          <CalendarDays className="mx-auto mb-2 size-8 text-slate-300" />
          <p className="text-sm text-slate-400">Sin eventos próximos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((ev, i) => {
            const cfg = EVENT_CFG[resolveKey(ev.type)];
            return (
              <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
                <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border border-white bg-white text-center shadow-sm">
                  <span className="text-[10px] font-bold uppercase leading-none text-slate-400">
                    {new Date(ev.startDate + "T00:00:00").toLocaleDateString("es-PE", { month: "short" })}
                  </span>
                  <span className="text-base font-extrabold leading-none text-slate-800">
                    {ev.startDate.slice(8)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                  <p className="truncate text-sm font-semibold text-slate-800">{ev.title}</p>
                  {ev.employeeName && <p className="truncate text-xs text-slate-500">{ev.employeeName}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

function CalendarGrid({ year, month, events, selectedDay, onSelectDay }: {
  year: number; month: number;
  events: CalendarEvent[];
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}): JSX.Element {
  const todayIso = toIso(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  );

  const { cells } = useMemo(() => {
    const firstDate = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    // getDay(): 0=Sun…6=Sat → convert to Mon-first: 0=Mon…6=Sun
    const rawStart = firstDate.getDay();
    const offset = rawStart === 0 ? 6 : rawStart - 1;
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;

    const cells: Array<{ iso: string; day: number; currentMonth: boolean }> = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(year, month - 1, 1 - offset + i);
      cells.push({
        iso: toIso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
        day: d.getDate(),
        currentMonth: d.getMonth() === month - 1,
      });
    }
    return { cells };
  }, [year, month]);

  return (
    <div>
      {/* Week headers */}
      <div className="mb-1 grid grid-cols-7">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
        {cells.map((cell) => {
          const dayEvents = eventsForDay(events, cell.iso);
          const isToday = cell.iso === todayIso;
          const isSelected = cell.iso === selectedDay;
          const visible = dayEvents.slice(0, 3);
          const extra = dayEvents.length - visible.length;

          return (
            <button
              key={cell.iso}
              onClick={() => onSelectDay(cell.iso === selectedDay ? "" : cell.iso)}
              className={[
                "relative flex min-h-[72px] flex-col gap-0.5 bg-white p-1.5 text-left transition-colors hover:bg-slate-50 focus:outline-none",
                !cell.currentMonth && "opacity-35",
                isSelected && "ring-2 ring-inset ring-brand-400 bg-brand-50/60 hover:bg-brand-50/60",
              ].filter(Boolean).join(" ")}
            >
              {/* Day number */}
              <span className={[
                "flex size-6 items-center justify-center rounded-full text-[12px] font-bold leading-none self-end",
                isToday
                  ? "bg-brand-500 text-white"
                  : isSelected
                    ? "bg-brand-100 text-brand-700"
                    : "text-slate-600",
              ].join(" ")}>
                {cell.day}
              </span>

              {/* Event chips */}
              <div className="flex flex-col gap-0.5 w-full">
                {visible.map((ev, i) => {
                  const cfg = EVENT_CFG[resolveKey(ev.type)];
                  return (
                    <span key={i} className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight ${cfg.bg} ${cfg.text}`}>
                      {ev.title}
                    </span>
                  );
                })}
                {extra > 0 && (
                  <span className="rounded px-1 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100">
                    +{extra} más
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PaginaCalendario(): JSX.Element {
  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", year, month],
    queryFn: () => getCalendarEvents(year, month),
  });

  const allEvents = eventsQuery.data ?? [];

  const events = useMemo(() =>
    activeFilter === "all"
      ? allEvents
      : allEvents.filter((e) => resolveKey(e.type) === activeFilter),
    [allEvents, activeFilter],
  );

  // Upcoming = events whose startDate >= today, sorted asc, max 5
  const upcoming = useMemo(() =>
    [...events]
      .filter((e) => e.startDate >= todayIso)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 5),
    [events, todayIso],
  );

  // Count how many days in the current month an event spans
  function countDaysInMonth(events: CalendarEvent[], key: EventKey): number {
    const firstIso = toIso(year, month, 1);
    const lastDay = new Date(year, month, 0).getDate();
    const lastIso = toIso(year, month, lastDay);
    let days = 0;
    for (const e of events) {
      if (resolveKey(e.type) !== key) continue;
      const start = e.startDate > firstIso ? e.startDate : firstIso;
      const end   = e.endDate   < lastIso  ? e.endDate   : lastIso;
      if (start > end) continue;
      const [sy, sm, sd] = start.split("-").map(Number);
      const [ey, em, ed] = end.split("-").map(Number);
      const diff = Math.round(
        (new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000
      ) + 1;
      days += diff;
    }
    return days;
  }

  // Summary counts (always from full unfiltered data)
  const counts = useMemo(() => ({
    holiday:  countDaysInMonth(allEvents, "holiday"),
    vacation: countDaysInMonth(allEvents, "vacation"),
    leave:    countDaysInMonth(allEvents, "leave"),
    total:    allEvents.length,
  }), [allEvents, year, month]);

  function prev(): void {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }

  function next(): void {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }

  function goToday(): void {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDay(todayIso);
  }

  const handleSelectDay = (iso: string): void => {
    setSelectedDay(iso || null);
  };

  return (
    <section className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <PageHeader
          title="Calendario"
          description="Eventos, vacaciones, feriados y fechas importantes"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={goToday}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Hoy
          </button>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
            <button onClick={prev} className="flex h-9 w-9 items-center justify-center rounded-l-lg hover:bg-slate-50">
              <ChevronLeft className="size-4 text-slate-600" />
            </button>
            <span className="min-w-[140px] px-2 text-center text-[13px] font-bold text-slate-800">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={next} className="flex h-9 w-9 items-center justify-center rounded-r-lg hover:bg-slate-50">
              <ChevronRight className="size-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Feriados del mes"      value={counts.holiday}  icon={Flag}         color="text-rose-700 border-rose-100" />
        <SummaryCard label="Vacaciones del mes"    value={counts.vacation} icon={CalendarDays} color="text-blue-700 border-blue-100" />
        <SummaryCard label="Permisos del mes"      value={counts.leave}    icon={ClipboardList} color="text-violet-700 border-violet-100" />
        <SummaryCard label="Total de eventos"      value={counts.total}    icon={Star}         color="text-slate-600 border-slate-200" />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const cfg = f.key !== "all" ? EVENT_CFG[f.key as EventKey] : null;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={[
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-all",
                isActive
                  ? cfg
                    ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                    : "bg-slate-800 text-white border-slate-800"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
              ].join(" ")}
            >
              {cfg && <span className={`size-2 rounded-full ${cfg.dot}`} />}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Main grid: calendar + panel ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Calendar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {eventsQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Cargando eventos...</div>
          ) : (
            <CalendarGrid
              year={year}
              month={month}
              events={events}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
            />
          )}
        </div>

        {/* Detail panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <DayPanel
            selectedDay={selectedDay}
            events={events}
            upcoming={upcoming}
          />
        </div>
      </div>

      {/* ── Bottom zone ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* Upcoming events compact list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Clock className="size-4 text-brand-500" /> Próximos eventos
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-400">Sin eventos próximos este mes.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev, i) => {
                const cfg = EVENT_CFG[resolveKey(ev.type)];
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className={`size-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-slate-800">{ev.title}</p>
                      <p className="text-[11px] text-slate-400">{formatShort(ev.startDate)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Leyenda</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {(Object.entries(EVENT_CFG) as [EventKey, typeof EVENT_CFG[EventKey]][]).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-2">
                <span className={`size-2.5 shrink-0 rounded-full ${cfg.dot}`} />
                <span className="text-[12px] text-slate-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Wallet className="size-4 text-brand-500" /> Accesos rápidos
          </h3>
          <div className="space-y-1.5">
            {[
              { to: "/app/vacations", label: "Solicitar vacaciones",  icon: CalendarDays },
              { to: "/app/leaves",    label: "Solicitar permiso",     icon: ClipboardList },
              { to: "/app/attendance",label: "Ver asistencia",        icon: Clock },
              { to: "/app/holidays",  label: "Ver feriados",          icon: Flag },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  <span className="flex items-center gap-2"><Icon className="size-3.5" />{a.label}</span>
                  <ArrowRight className="size-3.5 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
