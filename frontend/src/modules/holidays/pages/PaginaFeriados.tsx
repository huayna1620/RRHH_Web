import { useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, todayStamp, type ExportFormat } from "@/components/export/exportUtils";
import { createHoliday, deleteHoliday, getHolidays, updateHoliday } from "@/modules/holidays/services/holidaysApi";
import type { HolidayItem } from "@/modules/holidays/types/holiday.types";

const blank = (): { date: string; name: string; isRecurring: boolean } => ({
  date: "", name: "", isRecurring: false,
});

export function PaginaFeriados(): JSX.Element {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [selected, setSelected] = useState<HolidayItem | null>(null);
  const [form, setForm] = useState(blank());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ["holidays"], queryFn: getHolidays });
  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["holidays"] });

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const saveMutation = useMutation({
    mutationFn: () => isNew
      ? createHoliday(form)
      : updateHoliday(selected!.id, form),
    onSuccess: async () => { await refresh(); ok(isNew ? "Feriado creado." : "Feriado actualizado."); setOpen(false); },
    onError: () => fail("No se pudo guardar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: async () => { await refresh(); ok("Feriado eliminado."); setDeleteId(null); },
    onError: () => fail("No se pudo eliminar."),
  });

  function openNew(): void { setForm(blank()); setIsNew(true); setSelected(null); setOpen(true); }
  function openEdit(h: HolidayItem): void { setForm({ date: h.date, name: h.name, isRecurring: h.isRecurring }); setIsNew(false); setSelected(h); setOpen(true); }

  const rows = listQuery.data ?? [];
  const exportFileName = makeFileName("Feriados");

  function handleExport(format: ExportFormat): void {
    if (rows.length === 0) {
      fail("No hay datos para exportar con los filtros actuales.");
      return;
    }

    const data = rows.map((r) => ({
      Fecha: r.date,
      Nombre: r.name,
      Recurrente: r.isRecurring ? "Si" : "No",
      Activo: r.isActive ? "Si" : "No",
    }));

    exportRows(format, data, exportFileName, "Feriados", {
      subtitle: "Calendario de feriados configurados para la organizacion.",
      period: "Calendario vigente",
      metrics: [
        { label: "Total feriados", value: rows.length },
        { label: "Recurrentes", value: rows.filter((item) => item.isRecurring).length },
        { label: "Unicos", value: rows.filter((item) => !item.isRecurring).length },
        { label: "Proximos", value: rows.filter((item) => item.date >= todayStamp()).length },
      ],
    });
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Feriados" description="Gestión de días feriados" action={<Button onClick={openNew}>Nuevo feriado</Button>} />

      <div className="flex justify-end">
        <ExportMenu
          fileName={exportFileName}
          filtersActive={false}
          resultCount={rows.length}
          updatedAtLabel="Actualizado hoy"
          onExport={handleExport}
        />
      </div>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Recurrente</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.isRecurring ? "Sí" : "No"}</td>
                <td className="px-3 py-2">{r.isActive ? "Sí" : "No"}</td>
                <td className="px-3 py-2 flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteId(r.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={5}>Sin feriados registrados</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={isNew ? "Nuevo feriado" : "Editar feriado"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">Fecha</label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-500">Nombre</label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre del feriado" /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))} />
            Se repite cada año
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!form.date || !form.name || saveMutation.isPending} onClick={() => saveMutation.mutate()}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} title="Confirmar eliminación" onClose={() => setDeleteId(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">¿Eliminar este feriado?</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
