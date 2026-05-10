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
  UserRound,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { getEmployeeCatalogs } from "@/modules/employees/services/employeesApi";
import {
  createArea,
  createPosition,
  getAreas,
  getOrgStructureActivity,
  getPositions,
  updateArea,
  updateAreaStatus,
  updatePosition,
  updatePositionStatus,
} from "@/modules/org-structure/services/orgStructureApi";
import type { OrgItem, OrgPayload, OrgQuery, OrgStructureActivityItem } from "@/modules/org-structure/types/orgStructure.types";

type Tab = "areas" | "positions";
type StatusFilter = "all" | "active" | "inactive";
type Feedback = { type: "success" | "error"; message: string };
type FormState = {
  name: string;
  code: string;
  description: string;
  responsibleEmployeeId: string;
  level: string;
  areaId: string;
  reportsToEmployeeId: string;
};

const pageSize = 100;
const emptyForm: FormState = { name: "", code: "", description: "", responsibleEmployeeId: "", level: "", areaId: "", reportsToEmployeeId: "" };

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

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeCode(value: string): string {
  return stripAccents(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 12);
}

function buildCodeFromName(value: string): string {
  const words = stripAccents(value).trim().split(/\s+/).filter(Boolean);
  const initialsCode = words.map((word) => word[0]).join("");
  return normalizeCode(initialsCode.length >= 2 ? initialsCode : value);
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
  return value.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function activityTitle(item: OrgStructureActivityItem): string {
  const isPosition = item.module.toLowerCase().includes("position") || item.entityType.toLowerCase().includes("position");
  const entity = isPosition ? "Puesto" : "Área";
  const normalized = item.action.toLowerCase();
  const feminine = entity === "Área";

  if (normalized === "create") return `${entity} ${feminine ? "creada" : "creado"}`;
  if (normalized === "update") return `${entity} ${feminine ? "editada" : "editado"}`;
  if (normalized === "activate" || normalized === "deactivate") return "Estado actualizado";
  if (normalized === "delete") return `${entity} ${feminine ? "eliminada" : "eliminado"}`;
  return "Cambio registrado";
}

function activityTone(action: string): string {
  const normalized = action.toLowerCase();
  if (normalized === "create") return "bg-emerald-500";
  if (normalized === "update") return "bg-cyan-500";
  if (normalized === "activate") return "bg-blue-500";
  if (normalized === "deactivate" || normalized === "delete") return "bg-amber-500";
  return "bg-slate-400";
}

function activityDetail(item: OrgStructureActivityItem): string {
  const normalized = item.action.toLowerCase();
  const rawDetail = item.entityName.trim();
  const isPosition = item.module.toLowerCase().includes("position") || item.entityType.toLowerCase().includes("position");
  const entity = isPosition ? "Puesto" : "Área";
  const feminine = entity === "Área";

  if (normalized === "activate") return `${entity} ${feminine ? "activada" : "activado"}`;
  if (normalized === "deactivate") return `${entity} ${feminine ? "desactivada" : "desactivado"}`;
  if (normalized === "delete") return `${entity} ${feminine ? "eliminada" : "eliminado"}`;
  if (rawDetail.toLowerCase().startsWith("isactive=")) return "Cambio de estado aplicado";
  if (rawDetail === item.entityType) return "Sin detalle adicional";

  return rawDetail;
}

function colorForIndex(index: number): { tile: string; icon: string; bar: string; dot: string } {
  const colors = [
    { tile: "bg-cyan-50 text-cyan-700", icon: "text-cyan-700", bar: "bg-cyan-600", dot: "bg-cyan-600" },
    { tile: "bg-blue-50 text-blue-700", icon: "text-blue-700", bar: "bg-blue-500", dot: "bg-blue-500" },
    { tile: "bg-violet-50 text-violet-700", icon: "text-violet-700", bar: "bg-violet-500", dot: "bg-violet-500" },
    { tile: "bg-amber-50 text-amber-700", icon: "text-amber-700", bar: "bg-amber-400", dot: "bg-amber-400" },
    { tile: "bg-emerald-50 text-emerald-700", icon: "text-emerald-700", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  ];
  return colors[index % colors.length];
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

  const areaQuery = useMemo(() => buildQuery(areaSearch, areaStatus), [areaSearch, areaStatus]);
  const positionQuery = useMemo(() => buildQuery(positionSearch, positionStatus), [positionSearch, positionStatus]);

  const areasQuery = useQuery({ queryKey: ["areas", areaQuery], queryFn: () => getAreas(areaQuery) });
  const positionsQuery = useQuery({ queryKey: ["positions", positionQuery], queryFn: () => getPositions(positionQuery) });
  const activityQuery = useQuery({ queryKey: ["org-structure", "activity"], queryFn: () => getOrgStructureActivity(5) });
  const catalogsQuery = useQuery({ queryKey: ["employee-catalogs"], queryFn: getEmployeeCatalogs });

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
  const areasWithoutResponsible = allAreas.filter((item) => item.isActive && !item.responsibleEmployeeId).length;
  const distribution = [...allAreas].sort((a, b) => (b.employeesCount ?? 0) - (a.employeesCount ?? 0)).slice(0, 5);
  const distributionStops = distribution.reduce<{ start: number; end: number; color: string }[]>((acc, item, index) => {
    const previous = acc[index - 1]?.end ?? 0;
    const value = totalEmployees > 0 ? ((item.employeesCount ?? 0) / totalEmployees) * 100 : 0;
    acc.push({ start: previous, end: previous + value, color: ["#0891b2", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"][index % 5] });
    return acc;
  }, []);
  const donutBackground = distributionStops.length > 0
    ? `conic-gradient(${distributionStops.map((x) => `${x.color} ${x.start}% ${x.end}%`).join(", ")})`
    : "conic-gradient(#e2e8f0 0% 100%)";
  const activityItems = activityQuery.data ?? [];
  const activityUnavailable = activityQuery.isError;
  const modalTitle = modalMode === "create"
    ? (isAreas ? "Nueva área" : "Nuevo puesto")
    : (isAreas ? "Editar área" : "Editar puesto");
  const modalSubtitle = isAreas
    ? "Define el área, su responsable y la información básica para mantener la estructura ordenada."
    : "Registra el puesto, su área asociada y la línea de reporte para alimentar la estructura real.";

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["areas"] }),
      queryClient.invalidateQueries({ queryKey: ["positions"] }),
      queryClient.invalidateQueries({ queryKey: ["org-structure", "activity"] }),
    ]);
  };

  function openCreate(): void {
    setSelected(null);
    setForm(emptyForm);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(item: OrgItem): void {
    setSelected(item);
    setForm({
      name: item.name,
      code: item.code ?? "",
      description: item.description ?? "",
      responsibleEmployeeId: item.responsibleEmployeeId ?? "",
      level: item.level ?? "",
      areaId: item.areaId ?? "",
      reportsToEmployeeId: item.reportsToEmployeeId ?? "",
    });
    setFormError(null);
    setModalMode("edit");
  }

  function validateForm(): OrgPayload | null {
    const name = form.name.trim();
    const code = normalizeCode(form.code) || buildCodeFromName(name);
    const collection = isAreas ? allAreas : allPositions;
    const duplicatedName = collection.some((item) => item.id !== selected?.id && item.name.trim().toLowerCase() === name.toLowerCase());
    const duplicatedCode = code && collection.some((item) => item.id !== selected?.id && (item.code ?? "").trim().toLowerCase() === code.toLowerCase());

    if (!name) {
      setFormError("El nombre es obligatorio.");
      return null;
    }

    if (!/^[A-Z0-9-]{2,12}$/.test(code)) {
      setFormError("El código debe tener entre 2 y 12 caracteres: letras, números o guiones.");
      return null;
    }

    if (!isAreas && !form.areaId) {
      setFormError("El área asociada es obligatoria.");
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
    return {
      name,
      code,
      description: form.description.trim() || null,
      responsibleEmployeeId: isAreas ? form.responsibleEmployeeId || null : undefined,
      level: isAreas ? undefined : form.level.trim() || null,
      areaId: isAreas ? undefined : form.areaId || null,
      reportsToEmployeeId: isAreas ? undefined : form.reportsToEmployeeId || null,
    };
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
      setFeedback({ type: "success", message: `${item.name} ${item.isActive ? "desactivado" : "activado"} correctamente.` });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar el estado." }),
  });

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-cyan-50/60 px-5 py-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Organización</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Estructura organizacional</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">Gestión de áreas y puestos</p>
            </div>
          </div>
        </div>
      </div>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} label="Áreas activas" value={activeAreas} helper={`${allAreas.length} áreas registradas`} tone="cyan" />
        <KpiCard icon={BriefcaseBusiness} label="Puestos activos" value={activePositions} helper={`${allPositions.length} puestos registrados`} tone="indigo" />
        <KpiCard icon={Users} label="Colaboradores asignados" value={totalEmployees} helper="Según distribución por áreas" tone="emerald" />
        <KpiCard icon={UserRound} label="Áreas sin responsable" value={areasWithoutResponsible} helper={`${unusedAreas} áreas sin colaboradores`} tone="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-1 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          <TabButton active={tab === "areas"} icon={Layers3} title="Áreas" subtitle={`${activeAreas} activas`} onClick={() => setTab("areas")} />
          <TabButton active={tab === "positions"} icon={BriefcaseBusiness} title="Puestos" subtitle={`${activePositions} activos`} onClick={() => setTab("positions")} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-3.5 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">{isAreas ? "Directorio de áreas" : "Catálogo de puestos"}</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {rows.length} resultado{rows.length === 1 ? "" : "s"} para administrar {nounPlural}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Refrescar datos"
                  aria-label="Refrescar datos"
                  onClick={refresh}
                  disabled={areasQuery.isFetching || positionsQuery.isFetching}
                  className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-4", (areasQuery.isFetching || positionsQuery.isFetching) && "animate-spin")} />
                </button>
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Nuevo {noun}
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
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
                  <th className="px-4 py-3">{isAreas ? "Responsable" : "Área asociada"}</th>
                  <th className="px-4 py-3">Colaboradores</th>
                  <th className="px-4 py-3">{isAreas ? "Descripción" : "Nivel / descripción"}</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((item, index) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white", colorForIndex(index).tile)}>
                          {isAreas ? <Building2 className="size-4" /> : <BriefcaseBusiness className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">{item.code || "Sin código"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isAreas ? (
                        item.responsibleName ? (
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                              {initials(item.responsibleName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">{item.responsibleName}</p>
                              <p className="truncate text-xs text-slate-500">{item.responsiblePosition || "Responsable"}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-amber-700">
                            <div className="flex size-8 items-center justify-center rounded-full bg-amber-50">
                              <UserRound className="size-4" />
                            </div>
                            <span className="font-medium">Sin responsable</span>
                          </div>
                        )
                      ) : (
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{item.areaName || "Sin área asociada"}</p>
                          <p className="text-xs text-slate-500">{item.areaId ? "Vinculado" : "Pendiente de relación"}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200">
                        <Users className="size-3.5 text-slate-400" />
                        {item.employeesCount ?? 0}
                      </div>
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-slate-500">
                      {isAreas ? (
                        <p className="line-clamp-2">{item.description || "Sin descripción registrada"}</p>
                      ) : (
                        <div>
                          {item.level ? <Badge variant="info">{item.level}</Badge> : null}
                          <p className={cn("line-clamp-2 text-slate-500", item.level && "mt-1")}>{item.description || "Sin descripción registrada"}</p>
                          {item.reportsToName ? <p className="mt-1 truncate text-xs font-medium text-slate-500">Reporta a: {item.reportsToName}</p> : null}
                        </div>
                      )}
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
                    <td className="px-4 py-12" colSpan={6}>
                      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                          {isAreas ? <Building2 className="size-5" /> : <BriefcaseBusiness className="size-5" />}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700">No se encontraron {nounPlural}</p>
                        <p className="mt-1 text-sm text-slate-500">Ajusta la búsqueda o crea un nuevo registro para continuar.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={6}>
                      Cargando {nounPlural}...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Distribución por áreas</h3>
                <p className="text-sm text-slate-500">{totalEmployees} colaboradores en total</p>
              </div>
              <Activity className="size-5 text-cyan-600" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)] xl:grid-cols-1">
              <div className="mx-auto flex size-32 items-center justify-center rounded-full" style={{ background: donutBackground }}>
                <div className="flex size-20 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                  <span className="text-lg font-bold leading-none text-slate-900">{totalEmployees}</span>
                  <span className="text-[10px] font-semibold uppercase leading-tight text-slate-500">Total</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {distribution.map((item, index) => {
                const percent = totalEmployees > 0 ? Math.round(((item.employeesCount ?? 0) / totalEmployees) * 100) : 0;
                return (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <span className={cn("size-2 rounded-full", colorForIndex(index).dot)} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{item.name}</span>
                    <span className="text-slate-500">{percent}%</span>
                    <span className="text-slate-400">({item.employeesCount})</span>
                  </div>
                );
              })}
                {distribution.length === 0 ? <p className="py-3 text-center text-sm text-slate-500">Sin datos para distribuir.</p> : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Resumen de estructura</h3>
                <p className="text-sm text-slate-500">Calidad de datos del módulo</p>
              </div>
              <ShieldCheck className="size-5 text-emerald-600" />
            </div>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <span className="text-sm font-medium text-slate-600">Áreas sin responsable</span>
                <span className="font-bold text-amber-700">{areasWithoutResponsible}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <span className="text-sm font-medium text-slate-600">Áreas sin colaboradores</span>
                <span className="font-bold text-slate-800">{unusedAreas}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <span className="text-sm font-medium text-slate-600">Registros inactivos</span>
                <span className="font-bold text-slate-800">{inactiveTotal}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Últimos cambios</h3>
                <p className="text-sm text-slate-500">Actividad real de estructura</p>
              </div>
              <Activity className="size-5 text-cyan-600" />
            </div>
            <div className="mt-3 space-y-2.5">
              {activityItems.map((item: OrgStructureActivityItem) => (
                <div key={item.id} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                  <div className={cn("mt-0.5 size-2 rounded-full", activityTone(item.action))} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{activityTitle(item)}</p>
                    <p className="truncate text-xs text-slate-500">{activityDetail(item)}</p>
                    <p className="text-xs text-slate-500">{item.userName} · {formatTime(new Date(item.timestamp))}</p>
                  </div>
                </div>
              ))}
              {!activityUnavailable && activityItems.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Aún no hay cambios recientes</p>
                    <p className="text-xs text-slate-500">Los movimientos sobre áreas y puestos aparecerán aquí.</p>
                  </div>
                </div>
              ) : null}
              {activityUnavailable ? <p className="py-3 text-center text-sm text-slate-500">No se pudo cargar la actividad real.</p> : null}
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={modalMode === "create" || modalMode === "edit"}
        title={modalTitle}
        onClose={() => setModalMode(null)}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50/60 p-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 ring-1 ring-cyan-100">
                {isAreas ? <Building2 className="size-5" /> : <BriefcaseBusiness className="size-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">{modalTitle}</p>
                <p className="mt-1 text-sm text-slate-600">{modalSubtitle}</p>
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

          <FormField label="Descripción">
            <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Describe brevemente su función dentro de la organización" maxLength={300} />
          </FormField>

          {isAreas ? (
            <FormField label="Responsable">
              <Select value={form.responsibleEmployeeId} onChange={(event) => setForm((prev) => ({ ...prev, responsibleEmployeeId: event.target.value }))}>
                <option value="">Sin responsable</option>
                {catalogsQuery.data?.managers?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormField>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Área asociada" required>
                <Select value={form.areaId} onChange={(event) => setForm((prev) => ({ ...prev, areaId: event.target.value }))}>
                  <option value="">Selecciona un área</option>
                  {allAreas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Nivel / categoría">
                <Input value={form.level} onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value }))} placeholder="Ej. Gerencial, Operativo" maxLength={80} />
              </FormField>
              <FormField label="Reporta a / jefe inmediato">
                <Select value={form.reportsToEmployeeId} onChange={(event) => setForm((prev) => ({ ...prev, reportsToEmployeeId: event.target.value }))}>
                  <option value="">Sin jefe inmediato</option>
                  {catalogsQuery.data?.managers?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </FormField>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
              <p className="text-xs text-slate-500">El estado se activa o desactiva desde las acciones de la tabla.</p>
            </div>
            <Badge variant={selected?.isActive === false ? "neutral" : "success"}>{selected?.isActive === false ? "Inactivo" : "Activo"}</Badge>
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
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Descripción</p>
              <p className="mt-1 text-sm text-slate-600">{selected.description || "Sin descripción registrada"}</p>
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
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg ring-1", toneClasses[tone])}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold leading-none text-slate-900">{value}</p>
            <p className="truncate text-sm font-semibold text-slate-700">{label}</p>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, icon: Icon, title, subtitle, onClick }: { active: boolean; icon: LucideIcon; title: string; subtitle: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-left transition",
        active
          ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
          : "border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-cyan-700" : "text-slate-400")} />
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold">{title}</span>
        <span className={cn("block text-xs", active ? "text-slate-500" : "text-slate-400")}>{subtitle}</span>
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
