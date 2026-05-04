import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  approveIncident,
  getIncidents,
  rejectIncident,
  submitJustification,
} from "@/modules/incidents/services/incidentsApi";
import type { AttendanceIncident } from "@/modules/incidents/types/incident.types";

type BadgeVariant = "success" | "danger" | "neutral" | "warning" | "info";
const incidentStatusVariants: Record<string, BadgeVariant> = {
  open: "warning",
  justified: "success",
  rejected: "danger",
  expired: "neutral",
};
const incidentStatusLabels: Record<string, string> = {
  open: "Abierto",
  justified: "Justificado",
  rejected: "Rechazado",
  expired: "Expirado",
};
const incidentTypeLabels: Record<string, string> = {
  absence: "Falta",
  late: "Tardanza",
  early_leave: "Salida anticipada",
};

const pageSize = 10;

export function PaginaIncidencias(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [justifyOpen, setJustifyOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<AttendanceIncident | null>(null);
  const [justifyText, setJustifyText] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const query = { employeeId: "", search, status, incidentType, fromDate, toDate, pageNumber, pageSize };
  const listQuery = useQuery({ queryKey: ["incidents", query], queryFn: () => getIncidents(query) });

  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["incidents"] });
  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const justifyMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => submitJustification(id, text),
    onSuccess: async () => { await refresh(); ok("Justificación enviada."); setJustifyOpen(false); },
    onError: () => fail("No se pudo justificar."),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => approveIncident(id, comment),
    onSuccess: async () => { await refresh(); ok("Incidencia aprobada."); setReviewOpen(false); },
    onError: () => fail("No se pudo aprobar."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectIncident(id, comment),
    onSuccess: async () => { await refresh(); ok("Incidencia rechazada."); setReviewOpen(false); },
    onError: () => fail("No se pudo rechazar."),
  });

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <section className="space-y-4">
      <PageHeader title="Incidencias de asistencia" description="Gestión de tardanzas y faltas" />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-5">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} placeholder="Buscar" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPageNumber(1); }}>
          <option value="">Todos los estados</option>
          <option value="open">Abierto</option>
          <option value="justified">Justificado</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
          <option value="expired">Expirado</option>
        </Select>
        <Select value={incidentType} onChange={(e) => { setIncidentType(e.target.value); setPageNumber(1); }}>
          <option value="">Todos los tipos</option>
          <option value="absence">Falta</option>
          <option value="late">Tardanza</option>
          <option value="early_leave">Salida anticipada</option>
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPageNumber(1); }} />
        <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPageNumber(1); }} />
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Justificación</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-semibold">{r.employeeName}</div>
                  <div className="text-xs text-slate-500">{r.employeeCode}</div>
                </td>
                <td className="px-3 py-2"><Badge variant="info">{incidentTypeLabels[r.incidentType] ?? r.incidentType}</Badge></td>
                <td className="px-3 py-2">{r.incidentDate}</td>
                <td className="px-3 py-2">
                  <Badge variant={incidentStatusVariants[r.status] ?? "neutral"}>
                    {incidentStatusLabels[r.status] ?? r.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 max-w-xs truncate text-xs text-slate-500">{r.justificationText ?? "—"}</td>
                <td className="px-3 py-2 flex gap-1 flex-wrap">
                  {r.status === "open" && (
                    <Button size="sm" variant="secondary" onClick={() => { setSelected(r); setJustifyText(""); setJustifyOpen(true); }}>Justificar</Button>
                  )}
                  {r.status === "justified" && (
                    <Button size="sm" onClick={() => { setSelected(r); setReviewComment(""); setReviewOpen(true); }}>Revisar</Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Página {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>

      <Modal open={justifyOpen} title="Enviar justificación" onClose={() => setJustifyOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{selected?.employeeName} — {selected?.incidentType} · {selected?.incidentDate}</p>
          <Textarea value={justifyText} onChange={(e) => setJustifyText(e.target.value)} placeholder="Detalle de la justificación" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setJustifyOpen(false)}>Cancelar</Button>
            <Button disabled={!justifyText || justifyMutation.isPending} onClick={() => selected && justifyMutation.mutate({ id: selected.id, text: justifyText })}>Enviar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={reviewOpen} title="Revisar justificación" onClose={() => setReviewOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{selected?.employeeName} — {selected?.justificationText}</p>
          <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Comentario del revisor" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>Cancelar</Button>
            <Button variant="danger" disabled={rejectMutation.isPending} onClick={() => selected && rejectMutation.mutate({ id: selected.id, comment: reviewComment })}>Rechazar</Button>
            <Button disabled={approveMutation.isPending} onClick={() => selected && approveMutation.mutate({ id: selected.id, comment: reviewComment })}>Aprobar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
