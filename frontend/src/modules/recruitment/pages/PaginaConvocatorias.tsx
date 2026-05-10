import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  closeJobPosting,
  createJobPosting,
  deleteJobPosting,
  getJobPostings,
  updateJobPosting,
} from "@/modules/recruitment/services/jobPostingsApi";
import type { JobPosting, JobPostingStatus } from "@/modules/recruitment/types/recruitment.types";

const pageSize = 10;

const statusLabels: Record<string, string> = { open: "Abierta", paused: "Pausada", closed: "Cerrada" };

const blank = () => ({
  title: "", description: "", areaName: "", positionName: "",
  openedDate: new Date().toISOString().slice(0, 10), requiredCount: "1", notes: "",
});

export function PaginaConvocatorias(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [form, setForm] = useState(blank());
  const [editStatus, setEditStatus] = useState<JobPostingStatus>("open");
  const [editClosedDate, setEditClosedDate] = useState("");

  const params = { search, status: statusFilter, pageNumber, pageSize };
  const listQuery = useQuery({ queryKey: ["job-postings", params], queryFn: () => getJobPostings(params) });

  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["job-postings"] });
  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const createMutation = useMutation({
    mutationFn: createJobPosting,
    onSuccess: async () => { await refresh(); ok("Convocatoria creada."); setOpen(false); setForm(blank()); },
    onError: () => fail("No se pudo crear la convocatoria."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateJobPosting>[1] }) => updateJobPosting(id, payload),
    onSuccess: async () => { await refresh(); ok("Convocatoria actualizada."); setOpen(false); },
    onError: () => fail("No se pudo actualizar."),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeJobPosting(id),
    onSuccess: async () => { await refresh(); ok("Convocatoria cerrada."); },
    onError: () => fail("No se pudo cerrar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJobPosting(id),
    onSuccess: async () => { await refresh(); ok("Convocatoria eliminada."); },
    onError: () => fail("No se pudo eliminar."),
  });

  function openNew(): void {
    setForm(blank()); setIsNew(true); setSelected(null); setOpen(true);
  }

  function openEdit(j: JobPosting): void {
    setForm({ title: j.title, description: j.description ?? "", areaName: j.areaName ?? "", positionName: j.positionName ?? "", openedDate: j.openedDate, requiredCount: String(j.requiredCount), notes: j.notes ?? "" });
    setEditStatus(j.status); setEditClosedDate(j.closedDate ?? "");
    setSelected(j); setIsNew(false); setOpen(true);
  }

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  async function handleExport(format: ExportFormat): Promise<void> {
    try {
      const result = await getJobPostings({ ...params, pageNumber: 1, pageSize: 5000 });
      if (!result.items.length) { fail("No hay convocatorias para exportar con los filtros actuales."); return; }
      const data = result.items.map((r) => ({
        Titulo: r.title,
        Area: r.areaName,
        Puesto: r.positionName,
        Apertura: r.openedDate,
        Vacantes: r.requiredCount,
        Candidatos: r.candidateCount,
        Estado: statusLabels[r.status] ?? r.status,
      }));
      exportRows(format, data, makeFileName("Convocatorias", [statusFilter || null]), "Convocatorias", {
        subtitle: "Convocatorias y puestos vacantes con avance de candidatos.",
        period: "Procesos vigentes",
        filters: [
          { label: "Busqueda", value: search },
          { label: "Estado", value: statusFilter ? statusLabels[statusFilter] ?? statusFilter : "Todos" },
        ],
        metrics: [
          { label: "Total convocatorias", value: result.items.length },
          { label: "Abiertas", value: result.items.filter((item) => item.status === "open").length },
          { label: "Vacantes", value: result.items.reduce((sum, item) => sum + item.requiredCount, 0) },
          { label: "Candidatos", value: result.items.reduce((sum, item) => sum + item.candidateCount, 0) },
        ],
      });
    } catch {
      fail("No se pudo exportar convocatorias.");
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Convocatorias" description="Gestión de puestos vacantes" action={<div className="flex gap-2"><ExportMenu fileName={makeFileName("Convocatorias", [statusFilter || null])} filtersActive={Boolean(search || statusFilter)} resultCount={total} onExport={handleExport} /><Button onClick={openNew}>Nueva convocatoria</Button></div>} />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-3">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} placeholder="Buscar" />
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPageNumber(1); }}>
          <option value="">Todos los estados</option>
          <option value="open">Abierta</option>
          <option value="paused">Pausada</option>
          <option value="closed">Cerrada</option>
        </Select>
        <div className="text-sm text-slate-500 self-center">{total} registros</div>
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Área / Puesto</th>
              <th className="px-3 py-2">Apertura</th>
              <th className="px-3 py-2">Vacantes</th>
              <th className="px-3 py-2">Candidatos</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-semibold">{r.title}</td>
                <td className="px-3 py-2"><div>{r.areaName}</div><div className="text-xs text-slate-500">{r.positionName}</div></td>
                <td className="px-3 py-2">{r.openedDate}</td>
                <td className="px-3 py-2">{r.requiredCount}</td>
                <td className="px-3 py-2">{r.candidateCount}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "open" ? "bg-green-100 text-green-700" : r.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-600"}`}>
                    {statusLabels[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-3 py-2 flex gap-1 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Editar</Button>
                  {r.status === "open" && <Button size="sm" variant="secondary" onClick={() => closeMutation.mutate(r.id)}>Cerrar</Button>}
                  <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(r.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Página {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>

      <Modal open={open} title={isNew ? "Nueva convocatoria" : "Editar convocatoria"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Título del puesto" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={form.areaName} onChange={(e) => setForm((f) => ({ ...f, areaName: e.target.value }))} placeholder="Área" />
            <Input value={form.positionName} onChange={(e) => setForm((f) => ({ ...f, positionName: e.target.value }))} placeholder="Puesto" />
          </div>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción del puesto" />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500">Fecha de apertura</label><Input type="date" value={form.openedDate} onChange={(e) => setForm((f) => ({ ...f, openedDate: e.target.value }))} /></div>
            <div><label className="text-xs text-slate-500">Vacantes requeridas</label><Input type="number" value={form.requiredCount} onChange={(e) => setForm((f) => ({ ...f, requiredCount: e.target.value }))} /></div>
          </div>
          {!isNew && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as JobPostingStatus)}>
                <option value="open">Abierta</option>
                <option value="paused">Pausada</option>
                <option value="closed">Cerrada</option>
              </Select>
              <div><label className="text-xs text-slate-500">Fecha de cierre</label><Input type="date" value={editClosedDate} onChange={(e) => setEditClosedDate(e.target.value)} /></div>
            </div>
          )}
          <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notas" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.title || createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                const base = { title: form.title, description: form.description, areaName: form.areaName, positionName: form.positionName, openedDate: form.openedDate, requiredCount: Number(form.requiredCount), notes: form.notes };
                if (isNew) createMutation.mutate(base);
                else if (selected) updateMutation.mutate({ id: selected.id, payload: { ...base, status: editStatus, closedDate: editClosedDate } });
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
