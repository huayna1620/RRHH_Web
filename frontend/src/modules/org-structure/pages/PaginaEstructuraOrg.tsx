import { useMemo, useState, type JSX, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleSlash,
  Eye,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import {
  createArea,
  createPosition,
  getAreas,
  getPositions,
  updateArea,
  updateAreaStatus,
  updatePosition,
  updatePositionStatus,
} from "@/modules/org-structure/services/orgStructureApi";
import type { OrgItem, OrgPayload, OrgQuery } from "@/modules/org-structure/types/orgStructure.types";

type Tab = "areas" | "positions";
type StatusFilter = "all" | "active" | "inactive";
type Feedback = { type: "success" | "error"; message: string };
type FormState = { name: string; code: string };
type ChangeLog = { id: string; action: string; target: string; timestamp: Date };

const pageSize = 100;
const emptyForm: FormState = { name: "", code: "" };

function buildQuery(search: string, status: StatusFilter): OrgQuery {
  return {
    search: search.trim(),
    isActive: status === "all" ? undefined : status === "active",
    pageNumber: 1,
    pageSize,
    sortBy: "name",
    sortDirection: "asc",
  };
}

function normalizeCode(value: string): string {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

function initials(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export function PaginaEstructuraOrg(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("areas");
  const [areaSearch, setAreaSearch] = useState("");
  const [positionSearch, setPositionSearch] = useState("");
  const [areaStatus, setAreaStatus] = useState<StatusFilter>("all");
  const [positionStatus, setPositionStatus] = useState<StatusFilter>("all");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<OrgItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLog[]>([]);

  const areaQuery = useMemo(() => buildQuery(areaSearch, areaStatus), [areaSearch, areaStatus]);
  const positionQuery = useMemo(() => buildQuery(positionSearch, positionStatus), [positionSearch, positionStatus]);

  const areasQuery = useQuery({ queryKey: ["areas", areaQuery], queryFn: () => getAreas(areaQuery) });
  const positionsQuery = useQuery({ queryKey: ["positions", positionQuery], queryFn: () => getPositions(positionQuery) });

  const areas = areasQuery.data?.items ?? [];
  const positions = positionsQuery.data?.items ?? [];
  const rows = tab === "areas" ? areas : positions;
  const currentSearch = tab === "areas" ? areaSearch : positionSearch;
  const currentStatus = tab === "areas" ? areaStatus : positionStatus;
  const isLoading = tab === "areas" ? areasQuery.isFetching : positionsQuery.isFetching;
  const isAreas = tab === "areas";
  const noun = isAreas ? "área" : "puesto";
  const nounPlural = isAreas ? "áreas" : "puestos";

  const allAreasQuery = useQuery({ queryKey: ["areas", "summary"], queryFn: () => getAreas(buildQuery("", "all")) });
  const allPositionsQuery = useQuery({ queryKey: ["positions", "summary"], queryFn: () => getPositions(buildQuery("", "all")) });
  const allAreas = allAreasQuery.data?.items ?? areas;
  const allPositions = allPositionsQuery.data?.items ?? positions;

  const activeAreas = allAreas.filter((item) => item.isActive).length;
  const activePositions = allPositions.filter((item) => item.isActive).length;
  const inactiveTotal = allAreas.filter((item) => !item.isActive).length + allPositions.filter((item) => !item.isActive).length;
  const totalEmployees = allAreas.reduce((sum, item) => sum + (item.employeesCount ?? 0), 0);
  const unusedAreas = allAreas.filter((item) => item.isActive && (item.employeesCount ?? 0) === 0).length;
  const distribution = [...allAreas].sort((a, b) => (b.employeesCount ?? 0) - (a.employeesCount ?? 0)).slice(0, 5);

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["areas"] }),
      queryClient.invalidateQueries({ queryKey: ["positions"] }),
    ]);
  };

  function registerChange(action: string, target: string): void {
    setChangeLog((prev) => [{ id: crypto.randomUUID(), action, target, timestamp: new Date() }, ...prev].slice(0, 5));
  }

  function openCreate(): void {
    setSelected(null);
    setForm(emptyForm);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(item: OrgItem): void {
    setSelected(item);
    setForm({ name: item.name, code: item.code ?? "" });
    setFormError(null);
    setModalMode("edit");
  }

  function validateForm(): OrgPayload | null {
    const name = form.name.trim();
    const code = normalizeCode(form.code);
    const collection = isAreas ? allAreas : allPositions;
    const duplicatedName = collection.some((item) => item.id !== selected?.id && item.name.trim().toLowerCase() === name.toLowerCase());
    const duplicatedCode = code && collection.some((item) => item.id !== selected?.id && (item.code ?? "").trim().toLowerCase() === code.toLowerCase());

    if (!name) {
      setFormError("El nombre es obligatorio.");
      return null;
    }

    if (code && !/^[A-Z0-9-]{2,12}$/.test(code)) {
      setFormError("El código debe tener entre 2 y 12 caracteres: letras, números o guiones.");
      return null;
    }

    if (duplicatedName) {
      setFormError(`Ya existe ${isAreas ? "un área" : "un puesto"} con ese nombre.`);
      return null;
    }

    if (duplicatedCode) {
      setFormError("Ya existe un registro con ese código.");
      return null;
    }

    setFormError(null);
    return { name, code };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = validateForm();
      if (!payload) throw new Error("validation");
      if (isAreas) return modalMode === "create" ? createArea(payload) : updateArea(selected!.id, payload);
      return modalMode === "create" ? createPosition(payload) : updatePosition(selected!.id, payload);
    },
    onSuccess: async (item) => {
      await refresh();
      registerChange(modalMode === "create" ? "Creado" : "Actualizado", item.name);
      setFeedback({ type: "success", message: `${isAreas ? "Área" : "Puesto"} guardado correctamente.` });
      setModalMode(null);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "validation") return;
      setFeedback({ type: "error", message: `No se pudo guardar ${isAreas ? "el área" : "el puesto"}.` });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (item: OrgItem) => (isAreas ? updateAreaStatus(item.id, !item.isActive) : updatePositionStatus(item.id, !item.isActive)),
    onSuccess: async (_, item) => {
      await refresh();
      const action = item.isActive ? "Desactivado" : "Activado";
      registerChange(action, item.name);
      setFeedback({ type: "success", message: `${item.name} ${item.isActive ? "desactivado" : "activado"} correctamente.` });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar el estado." }),
  });

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-cyan-50/60 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Organización</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Estructura organizacional</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">Gestión de áreas y puestos</p>
            </div>
          </div>
          <Button variant="secondary" onClick={refresh} disabled={areasQuery.isFetching || positionsQuery.isFetching}>
            <RefreshCw className={cn("size-4", (areasQuery.isFetching || positionsQuery.isFetching) && "animate-spin")} />
            Refrescar
          </Button>
        </div>
      </div>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} label="Áreas activas" value={activeAreas} helper={`${allAreas.length} áreas registradas`} tone="cyan" />
        <KpiCard icon={BriefcaseBusiness} label="Puestos activos" value={activePositions} helper={`${allPositions.length} puestos registrados`} tone="indigo" />
        <KpiCard icon={Users} label="Colaboradores asignados" value={totalEmployees} helper="Según distribución por áreas" tone="emerald" />
        <KpiCard icon={CircleSlash} label="Alertas de estructura" value={unusedAreas + inactiveTotal} helper={`${unusedAreas} áreas sin colaboradores`} tone="amber" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          <TabButton active={tab === "areas"} icon={Layers3} title="Áreas" subtitle={`${activeAreas} activas`} onClick={() => setTab("areas")} />
          <TabButton active={tab === "positions"} icon={BriefcaseBusiness} title="Puestos" subtitle={`${activePositions} activos`} onClick={() => setTab("positions")} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">{isAreas ? "Directorio de áreas" : "Catálogo de puestos"}</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {rows.length} resultado{rows.length === 1 ? "" : "s"} para administrar {nounPlural}.
                </p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Nuevo {noun}
              </Button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  value={currentSearch}
                  onChange={(event) => (isAreas ? setAreaSearch(event.target.value) : setPositionSearch(event.target.value))}
                  placeholder={`Buscar ${nounPlural} por nombre o código`}
                />
              </label>
              <Select
                value={currentStatus}
                onChange={(event) => (isAreas ? setAreaStatus(event.target.value as StatusFilter) : setPositionStatus(event.target.value as StatusFilter))}
              >
                <option value="all">Todos los estados</option>
                <option value="active">Solo activos</option>
                <option value="inactive">Solo inactivos</option>
              </Select>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{isAreas ? "Área" : "Puesto"}</th>
                  <th className="px-4 py-3">Colaboradores</th>
                  <th className="px-4 py-3">Contexto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                          {item.code ? item.code.slice(0, 3).toUpperCase() : initials(item.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{item.code ? `Código ${item.code}` : "Sin código corto"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200">
                        <Users className="size-3.5 text-slate-400" />
                        {item.employeesCount ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {isAreas
                        ? `${item.employeesCount ?? 0} colaborador${item.employeesCount === 1 ? "" : "es"} asignado${item.employeesCount === 1 ? "" : "s"}`
                        : "Puesto disponible para asignación de colaboradores"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.isActive ? "success" : "neutral"}>{item.isActive ? "Activo" : "Inactivo"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <IconButton title="Ver detalle" onClick={() => { setSelected(item); setModalMode("view"); }}>
                          <Eye className="size-4" />
                        </IconButton>
                        <IconButton title="Editar" onClick={() => openEdit(item)}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton
                          title={item.isActive ? "Desactivar" : "Activar"}
                          onClick={() => statusMutation.mutate(item)}
                          disabled={statusMutation.isPending}
                        >
                          {item.isActive ? <CircleSlash className="size-4" /> : <CheckCircle2 className="size-4" />}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={5}>
                      No se encontraron {nounPlural} con los filtros actuales.
                    </td>
                  </tr>
                ) : null}
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={5}>
                      Cargando {nounPlural}...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Distribución por áreas</h3>
                <p className="text-sm text-slate-500">{totalEmployees} colaboradores en total</p>
              </div>
              <Activity className="size-5 text-cyan-600" />
            </div>
            <div className="mt-4 space-y-3">
              {distribution.map((item) => {
                const percent = totalEmployees > 0 ? Math.round(((item.employeesCount ?? 0) / totalEmployees) * 100) : 0;
                return (
                  <div key={item.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-semibold text-slate-700">{item.name}</span>
                      <span className="text-slate-500">{percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {distribution.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Sin datos para distribuir.</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Últimos cambios</h3>
                <p className="text-sm text-slate-500">Actividad de esta sesión</p>
              </div>
              <ShieldCheck className="size-5 text-emerald-600" />
            </div>
            <div className="mt-4 space-y-3">
              {changeLog.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <div className="mt-0.5 size-2 rounded-full bg-cyan-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.action}: {item.target}</p>
                    <p className="text-xs text-slate-500">Ahora, {formatTime(item.timestamp)}</p>
                  </div>
                </div>
              ))}
              {changeLog.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Los cambios aparecerán aquí al guardar o cambiar estados.</p> : null}
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={modalMode === "create" || modalMode === "edit"}
        title={modalMode === "create" ? `Nuevo ${noun}` : `Editar ${noun}`}
        onClose={() => setModalMode(null)}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 ring-1 ring-slate-200">
                {isAreas ? <Building2 className="size-5" /> : <BriefcaseBusiness className="size-5" />}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{modalMode === "create" ? "Crear registro" : "Actualizar registro"}</p>
                <p className="mt-0.5 text-sm text-slate-500">Define un nombre claro y un código corto para identificarlo rápidamente.</p>
              </div>
            </div>
          </div>

          {formError ? <Alert variant="error" message={formError} /> : null}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <FormField label="Nombre" required>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={isAreas ? "Ej. Finanzas" : "Ej. Analista de RRHH"} />
            </FormField>
            <FormField label="Código corto">
              <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder={isAreas ? "FIN" : "AN-RRHH"} maxLength={12} />
            </FormField>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Los campos de responsable, descripción, área asociada y nivel se pueden sumar cuando el API los exponga para esta pantalla.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setModalMode(null)}>Cancelar</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalMode === "view" && !!selected} title={`Detalle de ${noun}`} onClose={() => setModalMode(null)}>
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                {selected.code ? selected.code.slice(0, 3).toUpperCase() : initials(selected.name)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{selected.name}</h3>
                <p className="text-sm text-slate-500">{selected.code ? `Código ${selected.code}` : "Sin código corto"}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailTile label="Colaboradores" value={selected.employeesCount ?? 0} />
              <DetailTile label="Estado" value={selected.isActive ? "Activo" : "Inactivo"} />
              <DetailTile label="Tipo" value={isAreas ? "Área" : "Puesto"} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setModalMode(null)}>Cerrar</Button>
              <Button onClick={() => openEdit(selected)}>Editar</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

type KpiTone = "cyan" | "indigo" | "emerald" | "amber";

function KpiCard({ icon: Icon, label, value, helper, tone }: { icon: LucideIcon; label: string; value: number; helper: string; tone: KpiTone }): JSX.Element {
  const toneClasses: Record<KpiTone, string> = {
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={cn("flex size-10 items-center justify-center rounded-xl ring-1", toneClasses[tone])}>
          <Icon className="size-5" />
        </div>
        <Badge variant="neutral">Resumen</Badge>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function TabButton({ active, icon: Icon, title, subtitle, onClick }: { active: boolean; icon: LucideIcon; title: string; subtitle: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-left transition",
        active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className={cn("block text-xs", active ? "text-slate-300" : "text-slate-400")}>{subtitle}</span>
      </span>
    </button>
  );
}

function IconButton({ title, children, onClick, disabled }: { title: string; children: ReactNode; onClick: () => void; disabled?: boolean }): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }): JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function DetailTile({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}
