import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { checkIn, checkOut, getAttendance, getAttendanceCatalogs, getAttendanceSummary, justifyAttendance, markAbsent } from "@/modules/attendance/services/attendanceApi";

const pageSize = 10;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(today());
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justifyAttendanceId, setJustifyAttendanceId] = useState<string | null>(null);
  const [justifyText, setJustifyText] = useState("");

  const query = {
    viewMode: "daily" as const,
    referenceDate: date,
    startDateFrom: date,
    startDateTo: date,
    search,
    employeeId,
    areaId,
    isLate: undefined as unknown as boolean,
    isAbsent: undefined as unknown as boolean,
    pageNumber,
    pageSize,
  };

  const catalogsQuery = useQuery({ queryKey: ["attendance-catalogs"], queryFn: getAttendanceCatalogs });
  const listQuery = useQuery({ queryKey: ["attendance", query], queryFn: () => getAttendance(query) });
  const summaryQuery = useQuery({ queryKey: ["attendance-summary", query], queryFn: () => getAttendanceSummary(query) });

  const refreshAll = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["attendance"] });
    await queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
  };

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Ingreso registrado." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo registrar ingreso." }),
  });
  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Salida registrada." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo registrar salida." }),
  });
  const absentMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => markAbsent(id, reason),
    onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Falta registrada." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo marcar falta." }),
  });
  const justifyMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => justifyAttendance(id, text),
    onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Asistencia justificada." }); setJustifyOpen(false); setJustifyText(""); },
    onError: () => setFeedback({ type: "error", message: "No se pudo justificar." }),
  });

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const selectedEmployeeToday = rows.find((r) => r.employeeId === employeeId);
  const canCheckIn = employeeId && !selectedEmployeeToday?.checkInAtUtc && !selectedEmployeeToday?.isAbsent;
  const canCheckOut = employeeId && selectedEmployeeToday?.checkInAtUtc && !selectedEmployeeToday?.checkOutAtUtc;

  return (
    <section className="space-y-4">
      <PageHeader title="Asistencia" description="Registro de ingreso, salida y justificaciones" />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-5">
        <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Seleccionar empleado</option>
          {catalogsQuery.data?.employees?.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </Select>
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} placeholder="Buscar" />
        <Select value={areaId} onChange={(e) => { setAreaId(e.target.value); setPageNumber(1); }}>
          <option value="">Todas las areas</option>
          {catalogsQuery.data?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPageNumber(1); }} />
        <div className="text-sm text-slate-500 self-center">{total} registros</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded border p-2">A tiempo: <b>{summaryQuery.data?.onTime ?? 0}</b></div>
        <div className="rounded border p-2">Tardanzas: <b>{summaryQuery.data?.late ?? 0}</b></div>
        <div className="rounded border p-2">Faltas: <b>{summaryQuery.data?.absent ?? 0}</b></div>
        <div className="rounded border p-2">Justificados: <b>{summaryQuery.data?.justified ?? 0}</b></div>
        <div className="rounded border p-2">Pend. salida: <b>{summaryQuery.data?.pendingCheckOut ?? 0}</b></div>
        <div className="rounded border p-2">Sin registro: <b>{summaryQuery.data?.noRecord ?? 0}</b></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canCheckIn || checkInMutation.isPending} onClick={() => employeeId && checkInMutation.mutate(employeeId)}>Registrar ingreso</Button>
        <Button variant="secondary" disabled={!canCheckOut || checkOutMutation.isPending} onClick={() => selectedEmployeeToday?.id && checkOutMutation.mutate(selectedEmployeeToday.id)}>Registrar salida</Button>
        <Button variant="danger" disabled={!employeeId || absentMutation.isPending} onClick={() => employeeId && absentMutation.mutate({ id: employeeId, reason: "Falta" })}>Marcar falta</Button>
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Ingreso</th>
              <th className="px-3 py-2">Salida</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Accion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2"><div className="font-semibold">{r.employeeName}</div><div className="text-xs text-slate-500">{r.employeeCode} · {r.area}</div></td>
                <td className="px-3 py-2">{r.attendanceDate}</td>
                <td className="px-3 py-2">{r.checkInAtUtc ? new Date(r.checkInAtUtc).toLocaleTimeString() : "-"}</td>
                <td className="px-3 py-2">{r.checkOutAtUtc ? new Date(r.checkOutAtUtc).toLocaleTimeString() : "-"}</td>
                <td className="px-3 py-2">{r.isAbsent ? "Falta" : r.isJustified ? "Justificado" : r.lateMinutes > 0 ? `Tardanza · ${r.lateMinutes} min` : "A tiempo"}</td>
                <td className="px-3 py-2">
                  {r.isAbsent || r.lateMinutes > 0 ? (
                    <Button variant="secondary" size="sm" onClick={() => { setJustifyAttendanceId(r.id); setJustifyOpen(true); }}>Justificar</Button>
                  ) : "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Pagina {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>

      <Modal open={justifyOpen} title="Justificar asistencia" onClose={() => setJustifyOpen(false)}>
        <div className="space-y-3">
          <Textarea value={justifyText} onChange={(e) => setJustifyText(e.target.value)} placeholder="Detalle de justificacion" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setJustifyOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => justifyAttendanceId && justifyMutation.mutate({ id: justifyAttendanceId, text: justifyText || "Justificacion" })}
              disabled={!justifyAttendanceId || justifyMutation.isPending}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

