import { useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  createArea, createPosition, deleteArea, deletePosition,
  getAreas, getPositions, updateArea, updatePosition,
} from "@/modules/org-structure/services/orgStructureApi";
import type { OrgItem } from "@/modules/org-structure/types/orgStructure.types";

const defQuery = { search: "", isActive: undefined as unknown as boolean, pageNumber: 1, pageSize: 100, sortBy: "", sortDirection: "asc" as const };

type Tab = "areas" | "positions";

const blank = () => ({ name: "", code: "" });

export function PaginaEstructuraOrg(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("areas");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [selected, setSelected] = useState<OrgItem | null>(null);
  const [form, setForm] = useState(blank());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const areasQuery = useQuery({ queryKey: ["areas"], queryFn: () => getAreas(defQuery) });
  const positionsQuery = useQuery({ queryKey: ["positions"], queryFn: () => getPositions(defQuery) });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["areas"] });
    await queryClient.invalidateQueries({ queryKey: ["positions"] });
  };

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: form.name, code: form.code };
      if (tab === "areas") return isNew ? createArea(payload) : updateArea(selected!.id, payload);
      return isNew ? createPosition(payload) : updatePosition(selected!.id, payload);
    },
    onSuccess: async () => { await refresh(); ok("Guardado."); setOpen(false); },
    onError: () => fail("No se pudo guardar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tab === "areas" ? deleteArea(id) : deletePosition(id),
    onSuccess: async () => { await refresh(); ok("Eliminado."); setDeleteId(null); },
    onError: () => fail("No se pudo eliminar."),
  });

  function openNew(): void { setForm(blank()); setIsNew(true); setSelected(null); setOpen(true); }
  function openEdit(item: OrgItem): void {
    setForm({ name: item.name, code: item.code ?? "" });
    setIsNew(false); setSelected(item); setOpen(true);
  }

  const rows = (tab === "areas" ? areasQuery.data?.items : positionsQuery.data?.items) ?? [];

  return (
    <section className="space-y-4">
      <PageHeader title="Estructura organizacional" description="Gestión de áreas y puestos" />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="flex gap-2 border-b">
        {(["areas", "positions"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "areas" ? "Áreas" : "Puestos"}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={openNew}>Nuevo {tab === "areas" ? "área" : "puesto"}</Button>
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-slate-500">{r.employeesCount} empleados</td>
                <td className="px-3 py-2"><Badge variant={r.isActive ? "success" : "neutral"}>{r.isActive ? "Activo" : "Inactivo"}</Badge></td>
                <td className="px-3 py-2 flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteId(r.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={4}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={isNew ? `Nuevo ${tab === "areas" ? "área" : "puesto"}` : "Editar"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">Nombre</label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-500">Código</label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!form.name || saveMutation.isPending} onClick={() => saveMutation.mutate()}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} title="Confirmar eliminación" onClose={() => setDeleteId(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">¿Eliminar este registro?</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
