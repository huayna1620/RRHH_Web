import { useState, type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getCalendarEvents } from "@/modules/account/services/accountApi";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const typeColors: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-700",
  leave: "bg-purple-100 text-purple-700",
  holiday: "bg-green-100 text-green-700",
  attendance: "bg-slate-100 text-slate-600",
};

export function PaginaCalendario(): JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", year, month],
    queryFn: () => getCalendarEvents(year, month),
  });

  const events = eventsQuery.data ?? [];

  function prev(): void {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function next(): void {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Calendario" description="Eventos, vacaciones y feriados" />

      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={prev}>&#8249;</Button>
        <h2 className="text-lg font-semibold text-slate-700 min-w-40 text-center">{MONTHS[month - 1]} {year}</h2>
        <Button variant="secondary" onClick={next}>&#8250;</Button>
      </div>

      <div className="space-y-2">
        {events.length === 0 && !eventsQuery.isLoading && (
          <div className="rounded-lg border bg-white p-8 text-center text-slate-500 text-sm">Sin eventos este mes</div>
        )}
        {events.map((ev, i) => (
          <div key={i} className="rounded-lg border bg-white p-3 flex items-start gap-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${typeColors[ev.type] ?? "bg-slate-100 text-slate-600"}`}>
              {ev.type}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-700">{ev.title}</p>
              {ev.employeeName && <p className="text-xs text-slate-500">{ev.employeeName}</p>}
              {ev.status && <p className="text-xs text-slate-400">Estado: {ev.status}</p>}
            </div>
            <div className="text-xs text-slate-400 flex-shrink-0">
              <div>{ev.startDate}</div>
              {ev.endDate !== ev.startDate && <div>→ {ev.endDate}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
