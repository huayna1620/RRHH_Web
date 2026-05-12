import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Eye,
  KeyRound,
  Layers3,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { exportRows, makeFileName } from "@/components/export/exportUtils";
import { getUsers } from "@/modules/users/services/usersApi";
import {
  createRole,
  getPermissions,
  getRolePermissionIds,
  getRoles,
  updateRole,
  updateRolePermissions,
  updateRoleStatus,
} from "@/modules/roles/services/rolesApi";
import type { PermissionItem, RoleItem } from "@/modules/roles/types/role.types";

type Feedback = { type: "success" | "error"; message: string } | null;
type RoleType = "system" | "custom";
type RoleForm = { name: string; description: string; type: RoleType; isActive: boolean; tone: string };
type ActivityItem = { title: string; detail: string; date: string; tone: string };

const SYSTEM_ROLE_NAMES = new Set(["SUPER_ADMIN", "HR_MANAGER", "EMPLOYEE"]);

const moduleLabels: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Usuarios",
  roles: "Roles",
  employees: "Empleados",
  areas: "Áreas organizacionales",
  positions: "Estructura org.",
  attendance: "Asistencia",
  vacations: "Vacaciones",
  leaves: "Permisos",
  payroll: "Planilla",
  recruitment: "Candidatos",
  reports: "Reportes",
  configuration: "Configuración",
  auditlog: "Auditoría",
  holidays: "Feriados",
  jobpostings: "Convocatorias",
  onboarding: "Onboarding",
  evaluations: "Evaluaciones",
  documents: "Documentos",
  analytics: "Analítica",
  integrations: "Integraciones",
};

const actionLabels: Record<string, string> = {
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  delete: "Eliminar",
  approve: "Aprobar",
  export: "Exportar",
  configure: "Configurar",
  manage: "Configurar",
  justify: "Justificar",
};

const toneClasses: Record<string, { card: string; icon: string; badge: string }> = {
  teal: { card: "from-teal-50 to-white", icon: "bg-teal-100 text-teal-700", badge: "bg-teal-50 text-teal-700 ring-teal-200" },
  blue: { card: "from-blue-50 to-white", icon: "bg-blue-100 text-blue-700", badge: "bg-blue-50 text-blue-700 ring-blue-200" },
  violet: { card: "from-violet-50 to-white", icon: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700 ring-violet-200" },
  emerald: { card: "from-emerald-50 to-white", icon: "bg-emerald-100 text-emerald-700", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  amber: { card: "from-amber-50 to-white", icon: "bg-amber-100 text-amber-700", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  rose: { card: "from-rose-50 to-white", icon: "bg-rose-100 text-rose-700", badge: "bg-rose-50 text-rose-700 ring-rose-200" },
  slate: { card: "from-slate-50 to-white", icon: "bg-slate-100 text-slate-700", badge: "bg-slate-50 text-slate-700 ring-slate-200" },
};

function isSystemRole(role: RoleItem): boolean {
  return SYSTEM_ROLE_NAMES.has(role.name.toUpperCase()) || role.createdBy === "seed";
}

function roleTypeLabel(role: RoleItem): string {
  return isSystemRole(role) ? "Sistema" : "Personalizado";
}

function permissionModule(permission: PermissionItem): string {
  return (permission.module || permission.code.split(".")[0] || "general").toLowerCase();
}

function moduleLabel(module: string): string {
  return moduleLabels[module.toLowerCase()] ?? module;
}

function permissionAction(permission: PermissionItem): string {
  const action = permission.code.split(".").at(-1) ?? permission.name;
  return actionLabels[action] ?? permission.name;
}

function formatDate(value?: string | null): string {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function roleTone(role: RoleItem): keyof typeof toneClasses {
  const name = role.name.toLowerCase();
  if (name.includes("super") || name.includes("admin")) return "violet";
  if (name.includes("rrhh") || name.includes("hr")) return "teal";
  if (!role.isActive) return "rose";
  return isSystemRole(role) ? "blue" : "emerald";
}

function KpiCard({ label, value, helper, icon, tone }: { label: string; value: string | number; helper: string; icon: JSX.Element; tone: keyof typeof toneClasses }): JSX.Element {
  const colors = toneClasses[tone];
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-gradient-to-br p-4 shadow-sm", colors.card)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
        </div>
        <div className={cn("flex size-11 items-center justify-center rounded-xl", colors.icon)}>{icon}</div>
      </div>
    </div>
  );
}

function Badge({ children, tone = "slate" }: { children: string; tone?: keyof typeof toneClasses }): JSX.Element {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", toneClasses[tone].badge)}>{children}</span>;
}

function emptyForm(): RoleForm {
  return { name: "", description: "", type: "custom", isActive: true, tone: "teal" };
}

function buildActivities(role: RoleItem | null): ActivityItem[] {
  if (!role) return [];
  const items: ActivityItem[] = [
    { title: "Rol disponible", detail: `${role.name} se encuentra registrado en el sistema.`, date: formatDate(role.createdAtUtc), tone: "teal" },
  ];

  if (role.updatedAtUtc) {
    items.unshift({ title: "Rol actualizado", detail: role.updatedBy ? `Actualizado por ${role.updatedBy}` : "Cambios recientes aplicados.", date: formatDate(role.updatedAtUtc), tone: "blue" });
  }

  if (!role.isActive) {
    items.unshift({ title: "Rol inactivo", detail: "Este rol no debe asignarse a nuevos usuarios.", date: formatDate(role.updatedAtUtc ?? role.createdAtUtc), tone: "rose" });
  }

  items.push({ title: "Permisos configurables", detail: "La auditoría histórica dedicada queda preparada para backend.", date: "UI preparada", tone: "amber" });
  return items;
}

function RoleEditorModal({
  open,
  mode,
  role,
  roles,
  permissions,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  role: RoleItem | null;
  roles: RoleItem[];
  permissions: PermissionItem[];
  onClose: () => void;
  onSaved: (message: string) => void;
}): JSX.Element | null {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RoleForm>(emptyForm());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingPerms, setLoadingPerms] = useState(false);

  const grouped = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const map = new Map<string, PermissionItem[]>();
    for (const permission of permissions) {
      if (normalizedQuery && !`${permission.name} ${permission.code} ${permission.module}`.toLowerCase().includes(normalizedQuery)) continue;
      const module = permissionModule(permission);
      map.set(module, [...(map.get(module) ?? []), permission]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => moduleLabel(a).localeCompare(moduleLabel(b), "es"))
      .map(([module, items]) => [module, items.sort((a, b) => permissionAction(a).localeCompare(permissionAction(b), "es"))] as const);
  }, [permissions, query]);

  const selectedModules = useMemo(() => {
    const modules = new Set<string>();
    permissions.forEach((permission) => {
      if (selected.has(permission.id)) modules.add(permissionModule(permission));
    });
    return Array.from(modules).sort((a, b) => moduleLabel(a).localeCompare(moduleLabel(b), "es"));
  }, [permissions, selected]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const duplicate = roles.some((item) => item.id !== role?.id && item.name.trim().toLowerCase() === form.name.trim().toLowerCase());
      const nextErrors: Record<string, string> = {};
      if (!form.name.trim()) nextErrors.name = "El nombre del rol es obligatorio.";
      if (!form.description.trim()) nextErrors.description = "La descripción es obligatoria para documentar el alcance.";
      if (duplicate) nextErrors.name = "Ya existe un rol con este nombre.";
      if (selected.size === 0) nextErrors.permissions = "Selecciona al menos un permiso.";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) throw new Error("validation");

      if (mode === "create") {
        const created = await createRole({ name: form.name.trim(), description: form.description.trim() });
        await updateRolePermissions(created.id, Array.from(selected));
      } else if (role) {
        await updateRole(role.id, { name: form.name.trim(), description: form.description.trim(), isActive: form.isActive });
        await updateRolePermissions(role.id, Array.from(selected));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      onSaved(mode === "create" ? "Rol creado y permisos asignados." : "Rol actualizado correctamente.");
      onClose();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "validation") return;
      setErrors({ general: "No se pudo guardar el rol. Revisa los datos e inténtalo nuevamente." });
    },
  });

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setQuery("");
    setExpanded(new Set(permissions.map(permissionModule)));

    if (mode === "create") {
      setForm(emptyForm());
      setSelected(new Set());
      return;
    }

    if (!role) return;
    setForm({ name: role.name, description: role.description ?? "", type: isSystemRole(role) ? "system" : "custom", isActive: role.isActive, tone: roleTone(role) });
    setLoadingPerms(true);
    getRolePermissionIds(role.id)
      .then((ids) => setSelected(new Set(ids)))
      .finally(() => setLoadingPerms(false));
  }, [mode, open, permissions, role]);

  if (!open) return null;

  const togglePermission = (permissionId: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const toggleModule = (module: string, items: PermissionItem[]): void => {
    const allSelected = items.every((item) => selected.has(item.id));
    setSelected((current) => {
      const next = new Set(current);
      items.forEach((item) => {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      });
      return next;
    });
  };

  const toggleExpanded = (module: string): void => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-blue-50 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">{mode === "create" ? "Nuevo rol" : "Editar rol"}</h2>
              <p className="text-sm text-slate-500">{mode === "create" ? "Crea un nuevo rol y asigna permisos al sistema" : "Actualiza el alcance y permisos del rol seleccionado"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)_300px]">
          <aside className="space-y-5 overflow-auto border-r border-slate-100 bg-slate-50/60 p-5">
            {errors.general && <Alert variant="error" message={errors.general} />}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nombre del rol</label>
              <Input className="mt-2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Supervisor de asistencia" />
              {errors.name && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Descripción</label>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:shadow-[0_0_0_3px_rgba(48,200,194,0.15)]"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Define el alcance operativo del rol."
              />
              {errors.description && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo</label>
                <Select className="mt-2" value={form.type} disabled={mode === "edit" && form.type === "system"} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as RoleType }))}>
                  <option value="custom">Personalizado</option>
                  <option value="system">Sistema</option>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Estado</label>
                <Select className="mt-2" value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Color visual</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {Object.keys(toneClasses).filter((tone) => tone !== "slate").map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, tone }))}
                    className={cn("h-10 rounded-xl border-2 transition", form.tone === tone ? "border-slate-900" : "border-transparent", toneClasses[tone].icon)}
                    aria-label={`Color ${tone}`}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-bold">Impacto en usuarios</p>
              <p className="mt-1 text-xs leading-5">Los cambios de permisos se aplican a los usuarios que tienen este rol asignado.</p>
            </div>
          </aside>

          <main className="min-h-0 overflow-auto p-5">
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar permisos por módulo, nombre o código" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelected(new Set(permissions.map((item) => item.id)))}>Seleccionar todos</Button>
                <Button type="button" variant="secondary" onClick={() => setSelected(new Set())}>Limpiar permisos</Button>
              </div>
            </div>
            {errors.permissions && <p className="mb-3 text-sm font-semibold text-rose-600">{errors.permissions}</p>}
            {loadingPerms ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center text-sm text-slate-500">Cargando permisos del rol...</div>
            ) : (
              <div className="space-y-3">
                {grouped.map(([module, items]) => {
                  const selectedInModule = items.filter((item) => selected.has(item.id)).length;
                  const allSelected = selectedInModule === items.length && items.length > 0;
                  const isOpen = expanded.has(module);
                  return (
                    <section key={module} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                        <button type="button" onClick={() => toggleExpanded(module)} className="flex items-center gap-3 text-left">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><Layers3 className="size-5" /></div>
                          <div>
                            <p className="font-black text-slate-900">{moduleLabel(module)}</p>
                            <p className="text-xs text-slate-500">{selectedInModule} de {items.length} permisos seleccionados</p>
                          </div>
                          <ChevronsUpDown className="size-4 text-slate-400" />
                        </button>
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
                          <input className="size-4 accent-teal-600" type="checkbox" checked={allSelected} onChange={() => toggleModule(module, items)} />
                          Seleccionar módulo
                        </label>
                      </div>
                      {isOpen && (
                        <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                          {items.map((permission) => (
                            <label key={permission.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition", selected.has(permission.id) ? "border-teal-200 bg-teal-50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50")}>
                              <input className="mt-0.5 size-4 accent-teal-600" type="checkbox" checked={selected.has(permission.id)} onChange={() => togglePermission(permission.id)} />
                              <span className="min-w-0">
                                <span className="block text-sm font-bold text-slate-800">{permissionAction(permission)}</span>
                                <span className="block truncate text-xs text-slate-500">{permission.code}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
                {grouped.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No hay permisos que coincidan con la búsqueda.</div>}
              </div>
            )}
          </main>

          <aside className="space-y-4 overflow-auto border-l border-slate-100 bg-white p-5">
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Resumen del rol</p>
              <div className="mt-4 flex items-center gap-3">
                <div className={cn("flex size-12 items-center justify-center rounded-2xl", toneClasses[form.tone]?.icon ?? toneClasses.teal.icon)}>
                  <ShieldCheck className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-950">{form.name || "Rol sin nombre"}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge tone={form.type === "system" ? "blue" : "emerald"}>{form.type === "system" ? "Sistema" : "Personalizado"}</Badge>
                    <Badge tone={form.isActive ? "teal" : "rose"}>{form.isActive ? "Activo" : "Inactivo"}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                  <p className="text-2xl font-black text-slate-900">{selected.size}</p>
                  <p className="text-xs text-slate-500">Permisos</p>
                </div>
                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                  <p className="text-2xl font-black text-slate-900">{selectedModules.length}</p>
                  <p className="text-xs text-slate-500">Módulos</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Módulos habilitados</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedModules.slice(0, 12).map((module) => <Badge key={module} tone="teal">{moduleLabel(module)}</Badge>)}
                {selectedModules.length === 0 && <p className="text-sm text-slate-500">Aún no hay módulos seleccionados.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-bold text-slate-800">Alcance</p>
              <p className="mt-2 leading-6">{form.description || "La descripción aparecerá aquí para validar que el alcance sea claro antes de guardar."}</p>
            </div>
          </aside>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-sm text-slate-500">{selected.size} permisos seleccionados</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Guardando..." : mode === "create" ? "Crear rol" : "Guardar cambios"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaginaRoles(): JSX.Element {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: getRoles });
  const permissionsQuery = useQuery({ queryKey: ["permissions"], queryFn: getPermissions });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) setSelectedRoleId(roles[0].id);
  }, [roles, selectedRoleId]);

  const roleUserCount = (role: RoleItem): number => {
    if (typeof role.userCount === "number") return role.userCount;
    return users.filter((user) => user.roles.some((name) => name.toLowerCase() === role.name.toLowerCase())).length;
  };

  const filteredRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roles.filter((role) => {
      const matchesText = !term || `${role.name} ${role.description}`.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? role.isActive : !role.isActive);
      const matchesType = typeFilter === "all" || (typeFilter === "system" ? isSystemRole(role) : !isSystemRole(role));
      return matchesText && matchesStatus && matchesType;
    });
  }, [roles, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRoles = filteredRoles.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;
  const selectedTone = selectedRole ? roleTone(selectedRole) : "slate";
  const activities = buildActivities(selectedRole);

  const kpis = {
    active: roles.filter((role) => role.isActive).length,
    assignedUsers: roles.reduce((sum, role) => sum + roleUserCount(role), 0),
    permissions: permissions.length,
    admins: roles.filter((role) => role.name.toLowerCase().includes("admin") || (role.permissionCount ?? 0) >= Math.max(1, Math.floor(permissions.length * 0.75))).length,
    inactive: roles.filter((role) => !role.isActive).length,
  };

  const statusMutation = useMutation({
    mutationFn: ({ roleId, isActive }: { roleId: string; isActive: boolean }) => updateRoleStatus(roleId, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      setFeedback({ type: "success", message: "Estado del rol actualizado." });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar el estado del rol." }),
  });

  const clearFilters = (): void => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const exportRoles = (): void => {
    exportRows(
      "excel",
      filteredRoles.map((role) => ({
        Rol: role.name,
        Descripción: role.description,
        Tipo: roleTypeLabel(role),
        Usuarios: roleUserCount(role),
        Permisos: role.permissionCount ?? 0,
        Estado: role.isActive ? "Activo" : "Inactivo",
      })),
      makeFileName("Roles", [statusFilter, typeFilter]),
      "Roles y permisos",
      {
        subtitle: "Catálogo de roles del sistema",
        metrics: [
          { label: "Roles", value: filteredRoles.length },
          { label: "Permisos", value: permissions.length },
        ],
      }
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">Control de acceso</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Roles</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de roles y permisos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportRoles}><Download className="size-4" /> Exportar</Button>
          <Button onClick={() => setModalMode("create")}><Plus className="size-4" /> Nuevo rol</Button>
        </div>
      </div>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Roles activos" value={kpis.active} helper="Disponibles para asignación" icon={<BadgeCheck className="size-5" />} tone="teal" />
        <KpiCard label="Usuarios asignados" value={kpis.assignedUsers} helper="Asignaciones actuales" icon={<Users className="size-5" />} tone="blue" />
        <KpiCard label="Permisos totales" value={kpis.permissions} helper="Catálogo del sistema" icon={<KeyRound className="size-5" />} tone="violet" />
        <KpiCard label="Administradores" value={kpis.admins} helper="Roles de mayor alcance" icon={<ShieldCheck className="size-5" />} tone="emerald" />
        <KpiCard label="Roles inactivos" value={kpis.inactive} helper="Fuera de operación" icon={<LockKeyhole className="size-5" />} tone="rose" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por nombre o descripción" />
          </div>
          <Select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </Select>
          <Select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}>
            <option value="all">Todos los tipos</option>
            <option value="system">Sistema</option>
            <option value="custom">Personalizado</option>
          </Select>
          <Button variant="secondary" onClick={clearFilters}><Settings2 className="size-4" /> Limpiar filtros</Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Rol</th>
                  <th className="px-5 py-4">Descripción</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Usuarios</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rolesQuery.isLoading && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Cargando roles...</td></tr>}
                {!rolesQuery.isLoading && pagedRoles.map((role) => {
                  const tone = roleTone(role);
                  const active = selectedRoleId === role.id;
                  return (
                    <tr key={role.id} className={cn("border-t border-slate-100 transition hover:bg-slate-50/70", active && "bg-teal-50/50")} onClick={() => setSelectedRoleId(role.id)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex size-11 items-center justify-center rounded-2xl", toneClasses[tone].icon)}><ShieldCheck className="size-5" /></div>
                          <div>
                            <p className="font-black text-slate-900">{role.name}</p>
                            <p className="text-xs text-slate-500">{role.permissionCount ?? 0} permisos asignados</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-md px-5 py-4 text-slate-600"><p className="line-clamp-2">{role.description || "Sin descripción registrada."}</p></td>
                      <td className="px-5 py-4"><Badge tone={isSystemRole(role) ? "blue" : "emerald"}>{roleTypeLabel(role)}</Badge></td>
                      <td className="px-5 py-4"><span className="text-lg font-black text-slate-900">{roleUserCount(role)}</span></td>
                      <td className="px-5 py-4"><Badge tone={role.isActive ? "teal" : "rose"}>{role.isActive ? "Activo" : "Inactivo"}</Badge></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelectedRoleId(role.id); }} title="Ver detalle"><Eye className="size-4" /></Button>
                          <Button size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); setSelectedRoleId(role.id); setModalMode("edit"); }}><Pencil className="size-4" /> Editar</Button>
                          <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); statusMutation.mutate({ roleId: role.id, isActive: !role.isActive }); }}>
                            {role.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!rolesQuery.isLoading && pagedRoles.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No hay roles con los filtros actuales.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">Mostrando {pagedRoles.length} de {filteredRoles.length} roles</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select className="w-28" value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value="8">8 / pág.</option>
                <option value="12">12 / pág.</option>
                <option value="20">20 / pág.</option>
              </Select>
              <Button variant="secondary" size="sm" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="size-4" /> Anterior</Button>
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200">{safePage} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Siguiente <ChevronRight className="size-4" /></Button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Detalle del rol</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{selectedRole?.name ?? "Sin rol seleccionado"}</h2>
              </div>
              <div className={cn("flex size-11 items-center justify-center rounded-2xl", toneClasses[selectedTone].icon)}><ShieldCheck className="size-5" /></div>
            </div>
            {selectedRole ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm leading-6 text-slate-600">{selectedRole.description || "Sin descripción registrada."}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={isSystemRole(selectedRole) ? "blue" : "emerald"}>{roleTypeLabel(selectedRole)}</Badge>
                  <Badge tone={selectedRole.isActive ? "teal" : "rose"}>{selectedRole.isActive ? "Activo" : "Inactivo"}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-900">{roleUserCount(selectedRole)}</p><p className="text-xs text-slate-500">Usuarios</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-900">{selectedRole.permissionCount ?? 0}</p><p className="text-xs text-slate-500">Permisos</p></div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Creado</span><strong className="text-right text-slate-800">{formatDate(selectedRole.createdAtUtc)}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Creado por</span><strong className="text-right text-slate-800">{selectedRole.createdBy ?? "No disponible"}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Actualizado</span><strong className="text-right text-slate-800">{formatDate(selectedRole.updatedAtUtc)}</strong></div>
                </div>
                <Button className="w-full" onClick={() => setModalMode("edit")}><Pencil className="size-4" /> Editar rol y permisos</Button>
              </div>
            ) : <p className="mt-4 text-sm text-slate-500">Selecciona un rol para ver su configuración.</p>}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-teal-600" />
              <p className="text-sm font-black text-slate-900">Actividad reciente</p>
            </div>
            <div className="mt-4 space-y-4">
              {activities.map((item, index) => (
                <div key={`${item.title}-${index}`} className="flex gap-3">
                  <div className={cn("mt-1 size-2.5 rounded-full", item.tone === "rose" ? "bg-rose-500" : item.tone === "amber" ? "bg-amber-500" : item.tone === "blue" ? "bg-blue-500" : "bg-teal-500")} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="text-xs leading-5 text-slate-500">{item.detail}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <RoleEditorModal
        open={modalMode !== null}
        mode={modalMode ?? "create"}
        role={modalMode === "edit" ? selectedRole : null}
        roles={roles}
        permissions={permissions}
        onClose={() => setModalMode(null)}
        onSaved={(message) => setFeedback({ type: "success", message })}
      />
    </section>
  );
}
