import { useState, type JSX } from "react";
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
  createPayrollConcept,
  deletePayrollConcept,
  getPayrollConcepts,
  updatePayrollConcept,
} from "@/modules/payroll/services/payrollConceptsApi";
import type { PayrollConcept } from "@/modules/payroll/types/payroll.types";

const blank = (): PayrollConcept => ({
  id: "", code: "", name: "", type: "earning", fixedAmount: null, percentage: null,
  isAutomatic: false, isActive: true, description: null,
});

export function PaginaConceptosPlanilla(): JSX.Element {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PayrollConcept>(blank());
  const [isNew, setIsNew] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ["payroll-concepts"], queryFn: getPayrollConcepts });
  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["payroll-concepts"] });

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const saveMutation = useMutation({
    mutationFn: () => isNew
      ? createPayrollConcept({ code: form.code, name: form.name, type: form.type, fixedAmount: form.fixedAmount, percentage: form.percentage, isAutomatic: form.isAutomatic, description: form.description })
      : updatePayrollConcept(form.id, { name: form.name, type: form.type, fixedAmount: form.fixedAmount, percentage: form.percentage, isAutomatic: form.isAutomatic, isActive: form.isActive, description: form.description }),
    onSuccess: async () => { await refresh(); ok(isNew ? "Concepto creado." : "Concepto actualizado."); setOpen(false); },
    onError: () => fail("No se pudo guardar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayrollConcept(id),
    onSuccess: async () => { await refresh(); ok("Concepto eliminado."); setDeleteId(null); },
    onError: () => fail("No se pudo eliminar."),
  });

  function openNew(): void { setForm(blank()); setIsNew(true); setOpen(true); }
  function openEdit(c: PayrollConcept): void { setForm({ ...c }); setIsNew(false); setOpen(true); }

  const rows = listQuery.data ?? [];

  function handleExport(format: ExportFormat): void {
    if (!rows.length) { fail("No hay conceptos para exportar."); return; }
    const data = rows.map((r) => ({
      Codigo: r.code,
      Nombre: r.name,
      Tipo: r.type === "earning" ? "Ingreso" : "Descuento",
      "Monto fijo": r.fixedAmount ?? "",
      Porcentaje: r.percentage != null ? `${r.percentage}%` : "",
      Automatico: r.isAutomatic ? "Si" : "No",
      Activo: r.isActive ? "Si" : "No",
      Descripcion: r.description ?? "",
    }));
    exportRows(format, data, makeFileName("Conceptos"), "Conceptos de planilla", {
      subtitle: "Catalogo de ingresos, descuentos y conceptos automaticos de planilla.",
      period: "Configuracion vigente",
      metrics: [
        { label: "Total conceptos", value: rows.length },
        { label: "Ingresos", value: rows.filter((item) => item.type === "earning").length },
        { label: "Descuentos", value: rows.filter((item) => item.type === "deduction").length },
        { label: "Automaticos", value: rows.filter((item) => item.isAutomatic).length },
      ],
    });
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Conceptos de planilla" description="Configuración de bonificaciones y descuentos" action={<div className="flex gap-2"><ExportMenu fileName={makeFileName("Conceptos")} filtersActive={false} resultCount={rows.length} onExport={handleExport} /><Button onClick={openNew}>Nuevo concepto</Button></div>} />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Monto fijo</th>
              <th className="px-3 py-2">Porcentaje</th>
              <th className="px-3 py-2">Automático</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 capitalize">{r.type === "earning" ? "Ingreso" : "Descuento"}</td>
                <td className="px-3 py-2">{r.fixedAmount != null ? `S/ ${r.fixedAmount}` : "—"}</td>
                <td className="px-3 py-2">{r.percentage != null ? `${r.percentage}%` : "—"}</td>
                <td className="px-3 py-2">{r.isAutomatic ? "Sí" : "No"}</td>
                <td className="px-3 py-2">{r.isActive ? "Sí" : "No"}</td>
                <td className="px-3 py-2 flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteId(r.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={8}>Sin conceptos</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={isNew ? "Nuevo concepto" : "Editar concepto"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          {isNew && <div><label className="text-xs text-slate-500">Código</label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>}
          <div><label className="text-xs text-slate-500">Nombre</label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "earning" | "deduction" }))}>
            <option value="earning">Ingreso</option>
            <option value="deduction">Descuento</option>
          </Select>
          <div><label className="text-xs text-slate-500">Monto fijo</label><Input type="number" value={form.fixedAmount ?? ""} onChange={(e) => setForm((f) => ({ ...f, fixedAmount: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><label className="text-xs text-slate-500">Porcentaje</label><Input type="number" value={form.percentage ?? ""} onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value ? Number(e.target.value) : null }))} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isAutomatic} onChange={(e) => setForm((f) => ({ ...f, isAutomatic: e.target.checked }))} />Automático</label>
          {!isNew && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />Activo</label>}
          <Textarea value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))} placeholder="Descripción" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} title="Confirmar eliminación" onClose={() => setDeleteId(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">¿Eliminar este concepto? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
