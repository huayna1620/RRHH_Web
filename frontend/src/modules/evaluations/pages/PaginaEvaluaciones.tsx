import { useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  activateCycle, closeCycle, createCycle,
  getAssignments, getCycles,
} from "@/modules/evaluations/services/evaluationsApi";
import type { EvaluationCycle } from "@/modules/evaluations/types/evaluations.types";

const statusLabels: Record<string, string> = { draft: "Borrador", active: "Activo", closed: "Cerrado" };

export function PaginaEvaluaciones(): JSX.Element {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<EvaluationCycle | null>(null);
  const [form, setForm] = useState({ name: "", period: "", year: new Date().getFullYear(), startDate: "", endDate: "" });

  const cyclesQuery = useQuery({ queryKey: ["evaluation-cycles"], queryFn: getCycles });
  const assignmentsQuery = useQuery({
    queryKey: ["evaluation-assignments", selectedCycle?.id],
    queryFn: () => getAssignments(selectedCycle!.id, ""),
    enabled: !!selectedCycle,
  });

  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["evaluation-cycles"] });
  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const createMutation = useMutation({
    mutationFn: createCycle,
    onSuccess: async () => { await refresh(); ok("Ciclo creado."); setCreateOpen(false); setForm({ name: "", period: "", year: new Date().getFullYear(), startDate: "", endDate: "" }); },
    onError: () => fail("No se pudo crear el ciclo."),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateCycle(id),
    onSuccess: async () => { await refresh(); ok("Ciclo activado."); },
    onError: () => fail("No se pudo activar."),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeCycle(id),
    onSuccess: async () => { await refresh(); ok("Ciclo cerrado."); },
    onError: () => fail("No se pudo cerrar."),
  });

  const cycles = cyclesQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];

  function handleExport(format: ExportFormat): void {
    if (!cycles.length) { fail("No hay ciclos para exportar."); return; }
    const data = cycles.map((c) => ({
      Nombre: c.name,
      Periodo: c.period,
      Inicio: c.startDate,
      Fin: c.endDate,
      Asignaciones: `${c.finalizedAssignments}/${c.totalAssignments}`,
      Estado: statusLabels[c.status] ?? c.status,
    }));
    exportRows(format, data, makeFileName("Evaluaciones"), "Evaluaciones", {
      subtitle: "Ciclos de evaluacion de desempeno y avance de asignaciones.",
      period: "Ciclos registrados",
      metrics: [
        { label: "Total ciclos", value: cycles.length },
        { label: "Activos", value: cycles.filter((item) => item.status === "active").length },
        { label: "Cerrados", value: cycles.filter((item) => item.status === "closed").length },
        { label: "Asignaciones", value: cycles.reduce((sum, item) => sum + item.totalAssignments, 0) },
      ],
    });
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Evaluaciones" description="Ciclos de evaluación de desempeño" action={<div className="flex gap-2"><ExportMenu fileName={makeFileName("Evaluaciones")} filtersActive={false} resultCount={cycles.length} onExport={handleExport} /><Button onClick={() => setCreateOpen(true)}>Nuevo ciclo</Button></div>} />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Período</th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Asignaciones</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-semibold">{c.name}</td>
                <td className="px-3 py-2">{c.period}</td>
                <td className="px-3 py-2">{c.startDate}</td>
                <td className="px-3 py-2">{c.endDate}</td>
                <td className="px-3 py-2">{c.finalizedAssignments}/{c.totalAssignments}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : c.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"}`}>
                    {statusLabels[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-3 py-2 flex gap-1 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => setSelectedCycle(selectedCycle?.id === c.id ? null : c)}>
                    {selectedCycle?.id === c.id ? "Ocultar" : "Ver asignaciones"}
                  </Button>
                  {c.status === "draft" && <Button size="sm" onClick={() => activateMutation.mutate(c.id)}>Activar</Button>}
                  {c.status === "active" && <Button size="sm" variant="danger" onClick={() => closeMutation.mutate(c.id)}>Cerrar</Button>}
                </td>
              </tr>
            ))}
            {cycles.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Sin ciclos de evaluación</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedCycle && (
        <div className="space-y-2">
          <h2 className="font-semibold text-slate-700">Asignaciones — {selectedCycle.name}</h2>
          <div className="overflow-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Evaluador</th>
                  <th className="px-3 py-2">Autoevaluación</th>
                  <th className="px-3 py-2">Evaluador</th>
                  <th className="px-3 py-2">Puntaje final</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2">{a.employeeName}</td>
                    <td className="px-3 py-2">{a.evaluatorName ?? "—"}</td>
                    <td className="px-3 py-2">{a.selfScore ?? "Pendiente"}</td>
                    <td className="px-3 py-2">{a.evaluatorScore ?? "Pendiente"}</td>
                    <td className="px-3 py-2 font-semibold">{a.finalScore ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{a.status}</td>
                  </tr>
                ))}
                {assignments.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sin asignaciones</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={createOpen} title="Nuevo ciclo de evaluación" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">Nombre</label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-500">Período (ej. Q1-2025)</label><Input value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-500">Año</label><Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500">Inicio</label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
            <div><label className="text-xs text-slate-500">Fin</label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={!form.name || !form.startDate || createMutation.isPending} onClick={() => createMutation.mutate(form)}>Crear</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
