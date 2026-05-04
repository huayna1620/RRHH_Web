import { useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  createBranch,
  createContractType,
  deleteBranch,
  deleteContractType,
  getBranches,
  getContractTypes,
  getGeneralSettings,
  updateBranch,
  updateContractType,
  upsertGeneralSetting,
} from "@/modules/configuration/services/configurationApi";
import type { ConfigurationCatalogItem, GeneralSettingItem } from "@/modules/configuration/types/configuration.types";

const defQuery = { search: "", isActive: undefined as unknown as boolean, pageNumber: 1, pageSize: 50, sortBy: "", sortDirection: "asc" as const };

type Tab = "branches" | "contracts" | "settings";

const blank = () => ({ name: "", code: "" });

export function PaginaConfiguracion(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("branches");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [selected, setSelected] = useState<ConfigurationCatalogItem | null>(null);
  const [form, setForm] = useState(blank());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<Tab>("branches");

  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [settingDesc, setSettingDesc] = useState("");
  const [settingOpen, setSettingOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<GeneralSettingItem | null>(null);

  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: () => getBranches(defQuery) });
  const contractsQuery = useQuery({ queryKey: ["contract-types"], queryFn: () => getContractTypes(defQuery) });
  const settingsQuery = useQuery({ queryKey: ["general-settings"], queryFn: getGeneralSettings });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["branches"] });
    await queryClient.invalidateQueries({ queryKey: ["contract-types"] });
    await queryClient.invalidateQueries({ queryKey: ["general-settings"] });
  };

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: form.name, code: form.code };
      if (tab === "branches") return isNew ? createBranch(payload) : updateBranch(selected!.id, payload);
      return isNew ? createContractType(payload) : updateContractType(selected!.id, payload);
    },
    onSuccess: async () => { await refresh(); ok("Guardado."); setOpen(false); },
    onError: () => fail("No se pudo guardar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteType === "branches" ? deleteBranch(id) : deleteContractType(id),
    onSuccess: async () => { await refresh(); ok("Eliminado."); setDeleteId(null); },
    onError: () => fail("No se pudo eliminar."),
  });

  const settingMutation = useMutation({
    mutationFn: () => upsertGeneralSetting(settingKey, { value: settingValue, description: settingDesc, isSensitive: false }),
    onSuccess: async () => { await refresh(); ok("Configuración guardada."); setSettingOpen(false); },
    onError: () => fail("No se pudo guardar."),
  });

  function openNew(): void { setForm(blank()); setIsNew(true); setSelected(null); setOpen(true); }
  function openEdit(item: ConfigurationCatalogItem): void {
    setForm({ name: item.name, code: item.code ?? "" });
    setIsNew(false); setSelected(item); setOpen(true);
  }
  function openDeleteItem(id: string, type: Tab): void { setDeleteId(id); setDeleteType(type); }
  function openEditSetting(s: GeneralSettingItem): void {
    setSettingKey(s.key); setSettingValue(s.value); setSettingDesc(s.description ?? "");
    setEditingSetting(s); setSettingOpen(true);
  }

  const branches = branchesQuery.data?.items ?? [];
  const contracts = contractsQuery.data?.items ?? [];
  const settings = settingsQuery.data ?? [];

  return (
    <section className="space-y-4">
      <PageHeader title="Configuración" description="Gestión de catálogos y ajustes del sistema" />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="flex gap-2 border-b">
        {(["branches", "contracts", "settings"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "branches" ? "Sedes" : t === "contracts" ? "Tipos de contrato" : "Configuraciones generales"}
          </button>
        ))}
      </div>

      {(tab === "branches" || tab === "contracts") && (
        <>
          <div className="flex justify-end">
            <Button onClick={openNew}>Nuevo {tab === "branches" ? "sede" : "tipo de contrato"}</Button>
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
                {(tab === "branches" ? branches : contracts).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2 text-slate-500">{r.employeesCount} empleados</td>
                    <td className="px-3 py-2"><Badge variant={r.isActive ? "success" : "neutral"}>{r.isActive ? "Activo" : "Inactivo"}</Badge></td>
                    <td className="px-3 py-2 flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={() => openDeleteItem(r.id, tab)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
                {(tab === "branches" ? branches : contracts).length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={4}>Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "settings" && (
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Clave</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{s.key}</td>
                  <td className="px-3 py-2">{s.value}</td>
                  <td className="px-3 py-2 text-slate-500">{s.description ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="secondary" onClick={() => openEditSetting(s)}>Editar</Button>
                  </td>
                </tr>
              ))}
              {settings.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={4}>Sin configuraciones</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={isNew ? "Nuevo registro" : "Editar registro"} onClose={() => setOpen(false)}>
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

      <Modal open={settingOpen} title="Editar configuración" onClose={() => setSettingOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">Clave</label><Input value={settingKey} onChange={(e) => setSettingKey(e.target.value)} disabled={!!editingSetting} /></div>
          <div><label className="text-xs text-slate-500">Valor</label><Input value={settingValue} onChange={(e) => setSettingValue(e.target.value)} /></div>
          <div><label className="text-xs text-slate-500">Descripción</label><Input value={settingDesc} onChange={(e) => setSettingDesc(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSettingOpen(false)}>Cancelar</Button>
            <Button disabled={!settingKey || settingMutation.isPending} onClick={() => settingMutation.mutate()}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
