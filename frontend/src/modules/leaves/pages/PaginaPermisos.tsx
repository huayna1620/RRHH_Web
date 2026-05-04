import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  getLeaveCatalogs,
  getLeaves,
  rejectLeaveRequest,
} from "@/modules/leaves/services/leavesApi";
import type { LeaveItem } from "@/modules/leaves/types/leave.types";

const pageSize = 10;

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

type BadgeVariant = "success" | "danger" | "neutral" | "warning" | "info";
const statusVariants: Record<string, BadgeVariant> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  cancelled: "neutral",
};

export function PaginaPermisos(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<LeaveItem | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newLeaveType, setNewLeaveType] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newIsPaid, setNewIsPaid] = useState(false);
  const [newReason, setNewReason] = useState("");

  const query = { search, status: status as never, leaveType: leaveType as never, employeeId: "", startDateFrom: "", startDateTo: "", year, pageNumber, pageSize };

  const catalogsQuery = useQuery({ queryKey: ["leave-catalogs"], queryFn: getLeaveCatalogs });
  const listQuery = useQuery({ queryKey: ["leaves", query], queryFn: () => getLeaves(query) });

  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["leaves"] });
  const ok = (message: string): void => setFeedback({ type: "success", message });
  const fail = (message: string): void => setFeedback({ type: "error", message });

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: async () => {
      await refresh(); ok("Permiso creado.");
      setCreateOpen(false); setNewEmployeeId(""); setNewLeaveType(""); setNewStartDate(""); setNewEndDate(""); setNewReason("");
    },
    onError: () => fail("No se pudo crear el permiso."),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => approveLeaveRequest(id, comment),
    onSuccess: async () => { await refresh(); ok("Permiso aprobado."); setReviewOpen(false); },
    onError: () => fail("No se pudo aprobar."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectLeaveRequest(id, comment),
    onSuccess: async () => { await refresh(); ok("Permiso rechazado."); setReviewOpen(false); },
    onError: () => fail("No se pudo rechazar."),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: async () => { await refresh(); ok("Permiso cancelado."); },
    onError: () => fail("No se pudo cancelar."),
  });

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Permisos"
        description="Gestión de solicitudes de permiso"
        action={<Button onClick={() => setCreateOpen(true)}>Nueva solicitud</Button>}
      />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-4">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} placeholder="Buscar empleado" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPageNumber(1); }}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </Select>
        <Select value={leaveType} onChange={(e) => { setLeaveType(e.target.value); setPageNumber(1); }}>
          <option value="">Todos los tipos</option>
          {catalogsQuery.data?.leaveTypes?.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
        </Select>
        <Input type="number" value={year} onChange={(e) => { setYear(Number(e.target.value)); setPageNumber(1); }} />
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Dias</th>
              <th className="px-3 py-2">Remunerado</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-semibold">{r.employeeName}</div>
                  <div className="text-xs text-slate-500">{r.employeeCode} · {r.area}</div>
                </td>
                <td className="px-3 py-2 capitalize">{r.leaveType}</td>
                <td className="px-3 py-2">{r.startDate}</td>
                <td className="px-3 py-2">{r.endDate}</td>
                <td className="px-3 py-2">{r.requestedDays}</td>
                <td className="px-3 py-2"><Badge variant={r.isPaid ? "success" : "neutral"}>{r.isPaid ? "Pagado" : "No pagado"}</Badge></td>
                <td className="px-3 py-2">
                  <Badge variant={statusVariants[r.status] ?? "neutral"}>
                    {statusLabels[r.status] ?? r.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 flex gap-1 flex-wrap">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => { setSelected(r); setReviewComment(""); setReviewOpen(true); }}>Revisar</Button>
                      <Button size="sm" variant="danger" onClick={() => cancelMutation.mutate(r.id)}>Cancelar</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={8}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Página {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>

      <Modal open={createOpen} title="Nueva solicitud de permiso" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <Select value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)}>
            <option value="">Seleccionar empleado</option>
            {catalogsQuery.data?.employees?.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </Select>
          <Select value={newLeaveType} onChange={(e) => setNewLeaveType(e.target.value)}>
            <option value="">Tipo de permiso</option>
            {catalogsQuery.data?.leaveTypes?.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500">Inicio</label><Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} /></div>
            <div><label className="text-xs text-slate-500">Fin</label><Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={newIsPaid} onChange={(e) => setNewIsPaid(e.target.checked)} />
            Remunerado
          </label>
          <Textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Motivo" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              disabled={!newEmployeeId || !newLeaveType || !newStartDate || !newEndDate || createMutation.isPending}
              onClick={() => createMutation.mutate({ employeeId: newEmployeeId, leaveType: newLeaveType, startDate: newStartDate, endDate: newEndDate, isPaid: newIsPaid, reason: newReason })}
            >
              Crear
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={reviewOpen} title="Revisar permiso" onClose={() => setReviewOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            <b>{selected?.employeeName}</b> — {selected?.leaveType} · {selected?.startDate} a {selected?.endDate}
          </p>
          <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Comentario (opcional)" />
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
