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
  createRecruitmentCandidate,
  deleteRecruitmentCandidate,
  getRecruitmentCandidates,
  getRecruitmentCatalogs,
  updateRecruitmentStatus,
} from "@/modules/recruitment/services/recruitmentApi";
import type { RecruitmentCandidateListItem, RecruitmentStatus } from "@/modules/recruitment/types/recruitment.types";

const pageSize = 10;

const statusLabels: Record<string, string> = {
  new: "Nuevo", screening: "Preselección", interview: "Entrevista",
  offered: "Oferta", hired: "Contratado", rejected: "Rechazado",
};

const blankForm = {
  fullName: "", email: "", phoneNumber: "", positionApplied: "", expectedSalary: "",
  source: "", currentStatus: "new" as RecruitmentStatus, isPotentialHire: false,
  applicationDate: new Date().toISOString().slice(0, 10), nextStepDate: "", notes: "", jobPostingId: "",
};

export function PaginaReclutamiento(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<RecruitmentCandidateListItem | null>(null);
  const [newStatus, setNewStatus] = useState<RecruitmentStatus>("screening");
  const [statusNotes, setStatusNotes] = useState("");
  const [form, setForm] = useState({ ...blankForm });

  const query = { search, status: status as RecruitmentStatus, isPotentialHire: undefined as unknown as boolean, isActive: undefined as unknown as boolean, jobPostingId: "", pageNumber, pageSize };
  const catalogsQuery = useQuery({ queryKey: ["recruitment-catalogs"], queryFn: getRecruitmentCatalogs });
  const listQuery = useQuery({ queryKey: ["recruitment", query], queryFn: () => getRecruitmentCandidates(query) });

  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["recruitment"] });
  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const createMutation = useMutation({
    mutationFn: createRecruitmentCandidate,
    onSuccess: async () => { await refresh(); ok("Candidato registrado."); setCreateOpen(false); setForm({ ...blankForm }); },
    onError: () => fail("No se pudo registrar el candidato."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: RecruitmentStatus }) =>
      updateRecruitmentStatus(id, { status: s, nextStepDate: "", isPotentialHire: false, notes: statusNotes, rejectionReason: "" }),
    onSuccess: async () => { await refresh(); ok("Estado actualizado."); setStatusOpen(false); },
    onError: () => fail("No se pudo actualizar el estado."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecruitmentCandidate,
    onSuccess: async () => { await refresh(); ok("Candidato eliminado."); },
    onError: () => fail("No se pudo eliminar."),
  });

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <section className="space-y-4">
      <PageHeader title="Reclutamiento" description="Gestión de candidatos" action={<Button onClick={() => setCreateOpen(true)}>Nuevo candidato</Button>} />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-3">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} placeholder="Buscar candidato" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPageNumber(1); }}>
          <option value="">Todos los estados</option>
          {catalogsQuery.data?.statuses?.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </Select>
        <div className="text-sm text-slate-500 self-center">{total} registros</div>
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Candidato</th>
              <th className="px-3 py-2">Puesto</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-semibold">{r.fullName}</div>
                  <div className="text-xs text-slate-500">{r.email} · {r.phoneNumber}</div>
                </td>
                <td className="px-3 py-2">{r.positionApplied}</td>
                <td className="px-3 py-2">{r.applicationDate}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.currentStatus === "hired" ? "success" : r.currentStatus === "rejected" ? "danger" : "info"}>
                    {statusLabels[r.currentStatus] ?? r.currentStatus}
                  </Badge>
                </td>
                <td className="px-3 py-2 flex gap-1">
                  <Button size="sm" onClick={() => { setSelected(r); setNewStatus(r.currentStatus); setStatusNotes(""); setStatusOpen(true); }}>Estado</Button>
                  <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(r.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={5}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Página {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>

      <Modal open={createOpen} title="Nuevo candidato" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Nombre completo" />
          <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Correo" type="email" />
          <Input value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} placeholder="Teléfono" />
          <Input value={form.positionApplied} onChange={(e) => setForm((f) => ({ ...f, positionApplied: e.target.value }))} placeholder="Puesto al que aplica" />
          <Input type="number" value={form.expectedSalary} onChange={(e) => setForm((f) => ({ ...f, expectedSalary: e.target.value }))} placeholder="Pretensión salarial" />
          <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="Fuente (LinkedIn, referido, etc.)" />
          <div><label className="text-xs text-slate-500">Fecha de aplicación</label><Input type="date" value={form.applicationDate} onChange={(e) => setForm((f) => ({ ...f, applicationDate: e.target.value }))} /></div>
          <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notas" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.fullName || !form.email || createMutation.isPending}
              onClick={() => createMutation.mutate({ ...form, expectedSalary: Number(form.expectedSalary) || 0, nextStepDate: form.nextStepDate || "" })}
            >
              Registrar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={statusOpen} title="Cambiar estado" onClose={() => setStatusOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">{selected?.fullName}</p>
          <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as RecruitmentStatus)}>
            {catalogsQuery.data?.statuses?.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
          <Textarea value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} placeholder="Notas" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancelar</Button>
            <Button disabled={statusMutation.isPending} onClick={() => selected && statusMutation.mutate({ id: selected.id, status: newStatus })}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
