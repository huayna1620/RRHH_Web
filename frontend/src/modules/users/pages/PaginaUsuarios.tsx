import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  KeyRound,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  UserCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { exportRows, makeFileName, type ExportRow } from "@/components/export/exportUtils";
import { getAuditLogs } from "@/modules/audit/services/auditApi";
import type { AuditLogItem } from "@/modules/audit/types/audit.types";
import { getEmployees } from "@/modules/employees/services/employeesApi";
import type { EmployeeListItem } from "@/modules/employees/types/employee.types";
import { getRoles } from "@/modules/roles/services/rolesApi";
import type { RoleItem } from "@/modules/roles/types/role.types";
import { ModalFormUsuario, type UsuarioFormValues } from "@/modules/users/components/ModalFormUsuario";
import { createUser, getUsers, updateUser, updateUserStatus } from "@/modules/users/services/usersApi";
import type { UserItem } from "@/modules/users/types/user.types";

type ModalState = { mode: "create" } | { mode: "edit"; user: UserItem } | null;
type StatusFilter = "all" | "active" | "inactive" | "blocked" | "pending";
type Tone = "teal" | "violet" | "blue" | "rose" | "amber";

const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];

const TONE_STYLE: Record<Tone, { box: string; icon: string; text: string; badge: string }> = {
  teal: { box: "bg-brand-50", icon: "text-brand-700", text: "text-brand-700", badge: "bg-brand-100 text-brand-700" },
  violet: { box: "bg-violet-50", icon: "text-violet-700", text: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
  blue: { box: "bg-blue-50", icon: "text-blue-700", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  rose: { box: "bg-rose-50", icon: "text-rose-700", text: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
  amber: { box: "bg-amber-50", icon: "text-amber-700", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
};

function roleLabel(roleName: string): string {
  const normalized = roleName.toUpperCase();
  if (normalized === "SUPER_ADMIN") return "Super Administrador";
  if (normalized === "HR_MANAGER") return "Administrador";
  if (normalized === "EMPLOYEE") return "Empleado";
  return roleName;
}

function roleTone(roleName: string): string {
  const normalized = roleName.toUpperCase();
  if (normalized === "SUPER_ADMIN") return "bg-violet-50 text-violet-700 ring-violet-100";
  if (normalized === "HR_MANAGER") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (normalized === "EMPLOYEE") return "bg-brand-50 text-brand-700 ring-brand-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function statusBadge(isActive: boolean): JSX.Element {
  return isActive ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
      <span className="size-1.5 rounded-full bg-slate-400" />
      Inactivo
    </span>
  );
}

function initials(fullName: string, userName: string): string {
  const source = fullName.trim() || userName.trim();
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
}

function formatDateTime(value: string | null): string {
  if (!value) return "Sin registro";
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday.getTime() - startDate.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Hoy, ${time}`;
  if (diffDays === 1) return `Ayer, ${time}`;
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function KpiCard({ label, value, helper, icon, tone }: {
  label: string;
  value: number;
  helper: string;
  icon: JSX.Element;
  tone: Tone;
}): JSX.Element {
  const style = TONE_STYLE[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex size-10 items-center justify-center rounded-xl ${style.box} ${style.icon}`}>{icon}</div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>Sistema</span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{value.toLocaleString("es-PE")}</p>
      <p className="mt-1 text-[12px] font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function employeeMeta(user: UserItem, employees: EmployeeListItem[]): EmployeeListItem | undefined {
  return user.employeeId ? employees.find((employee) => employee.id === user.employeeId) : undefined;
}

function auditLabel(action: string): { title: string; tone: Tone; icon: JSX.Element } {
  const normalized = action.toLowerCase();
  if (normalized.includes("create")) return { title: "Usuario creado", tone: "teal", icon: <Plus className="size-4" /> };
  if (normalized.includes("password") || normalized.includes("reset")) return { title: "Contraseña restablecida", tone: "amber", icon: <KeyRound className="size-4" /> };
  if (normalized.includes("role") || normalized.includes("update")) return { title: "Rol actualizado", tone: "blue", icon: <ShieldCheck className="size-4" /> };
  if (normalized.includes("deactivate") || normalized.includes("block")) return { title: "Usuario bloqueado", tone: "rose", icon: <LockKeyhole className="size-4" /> };
  if (normalized.includes("activate")) return { title: "Usuario activado", tone: "teal", icon: <CheckCircle2 className="size-4" /> };
  return { title: "Actividad registrada", tone: "violet", icon: <MoreHorizontal className="size-4" /> };
}

function buildRows(users: UserItem[], employees: EmployeeListItem[]): ExportRow[] {
  return users.map((user) => {
    const employee = employeeMeta(user, employees);
    return {
      Usuario: user.userName,
      "Nombre completo": user.fullName,
      Correo: user.email,
      Rol: user.roles.map(roleLabel).join(", ") || "Sin rol",
      Estado: user.isActive ? "Activo" : "Inactivo",
      "Último acceso": formatDateTime(user.lastLoginAtUtc),
      Área: employee?.area ?? "Sin vincular",
      Sede: employee?.branch ?? "Sin vincular",
      Colaborador: user.employeeName ?? employee?.fullName ?? "Sin vincular",
    };
  });
}

export function PaginaUsuarios(): JSX.Element {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [previewUser, setPreviewUser] = useState<UserItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: getRoles });
  const employeesQuery = useQuery({
    queryKey: ["employees", "users-selector"],
    queryFn: () => getEmployees({ search: "", areaId: "", branchId: "", isActive: true, pageNumber: 1, pageSize: 500, sortBy: "fullName", sortDirection: "asc" }),
  });
  const auditQuery = useQuery({
    queryKey: ["audit-logs", "users-panel"],
    queryFn: () => getAuditLogs({ search: "usuario", module: "", action: "", userId: "", from: "", to: "", pageNumber: 1, pageSize: 8 }),
    retry: false,
  });

  const users = usersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const employees = employeesQuery.data?.items ?? [];
  const currentUser = modalState && modalState.mode === "edit" ? modalState.user : null;

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: UsuarioFormValues) => {
      const fullName = `${values.firstName} ${values.lastName}`.trim();
      const created = await createUser({
        userName: values.userName.trim(),
        email: values.email.trim(),
        fullName,
        password: values.password,
        roleIds: [values.roleId],
      });
      if (values.employeeId || values.status === "inactive") {
        await updateUser(created.id, {
          fullName,
          email: values.email.trim(),
          roleIds: [values.roleId],
          employeeId: values.employeeId || null,
        });
        if (values.status === "inactive") await updateUserStatus(created.id, false);
      }
      return created;
    },
    onSuccess: async () => {
      await refresh();
      setModalState(null);
      setFeedback({ type: "success", message: "Usuario creado correctamente." });
    },
    onError: (error) => setFeedback({ type: "error", message: error instanceof Error ? error.message : "No se pudo crear el usuario." }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UsuarioFormValues }) => {
      await updateUser(id, {
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email.trim(),
        roleIds: [values.roleId],
        employeeId: values.employeeId || null,
      });
      await updateUserStatus(id, values.status === "active");
    },
    onSuccess: async () => {
      await refresh();
      setModalState(null);
      setFeedback({ type: "success", message: "Usuario actualizado correctamente." });
    },
    onError: (error) => setFeedback({ type: "error", message: error instanceof Error ? error.message : "No se pudo actualizar el usuario." }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateUserStatus(id, active),
    onSuccess: async () => {
      await refresh();
      setFeedback({ type: "success", message: "Estado actualizado correctamente." });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar el estado." }),
  });

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const employee = employeeMeta(user, employees);
      const roleMatch = roleFilter === "all" || user.roles.some((roleName) => roleName.toUpperCase() === roleFilter.toUpperCase());
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);
      const areaMatch = areaFilter === "all" || employee?.area === areaFilter || employee?.branch === areaFilter;
      const searchMatch =
        !normalizedSearch ||
        user.fullName.toLowerCase().includes(normalizedSearch) ||
        user.userName.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.employeeName ?? "").toLowerCase().includes(normalizedSearch);
      return roleMatch && statusMatch && areaMatch && searchMatch;
    });
  }, [areaFilter, employees, roleFilter, search, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const areaOptions = useMemo(() => {
    const values = new Set<string>();
    employees.forEach((employee) => {
      if (employee.area) values.add(employee.area);
      if (employee.branch) values.add(employee.branch);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [employees]);

  const adminCount = users.filter((user) => user.roles.some((role) => ["SUPER_ADMIN", "HR_MANAGER"].includes(role.toUpperCase()))).length;
  const collaboratorCount = users.filter((user) => user.roles.some((role) => role.toUpperCase() === "EMPLOYEE")).length;

  function clearFilters(): void {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setAreaFilter("all");
    setPage(1);
  }

  function exportVisible(): void {
    const rows = buildRows(filteredUsers, employees);
    if (!rows.length) {
      setFeedback({ type: "error", message: "No hay usuarios para exportar con los filtros actuales." });
      return;
    }
    exportRows("excel", rows, makeFileName("Usuarios", [roleFilter, statusFilter]), "Usuarios", {
      subtitle: "Gestión de usuarios y accesos del sistema.",
      filters: [
        { label: "Búsqueda", value: search || "Todas" },
        { label: "Rol", value: roleFilter === "all" ? "Todos" : roleLabel(roleFilter) },
        { label: "Estado", value: statusFilter === "all" ? "Todos" : statusFilter === "active" ? "Activo" : statusFilter === "inactive" ? "Inactivo" : "Preparado" },
        { label: "Área / Sede", value: areaFilter === "all" ? "Todas" : areaFilter },
      ],
      metrics: [
        { label: "Usuarios activos", value: users.filter((user) => user.isActive).length },
        { label: "Administradores", value: adminCount },
        { label: "Colaboradores", value: collaboratorCount },
        { label: "Filtrados", value: filteredUsers.length },
      ],
    });
  }

  const isLoading = usersQuery.isLoading || rolesQuery.isLoading;
  const activities = auditQuery.data?.items ?? [];

  return (
    <section className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-brand-700">
            <UserCog className="size-4" />
            Control de accesos
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-slate-950">Usuarios</h1>
          <p className="mt-1 text-[14px] text-slate-500">Gestión de usuarios y accesos del sistema</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={exportVisible}>
            <Download className="size-4" />
            Exportar
          </Button>
          <Button onClick={() => setModalState({ mode: "create" })}>
            <Plus className="size-4" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Usuarios activos" value={users.filter((user) => user.isActive).length} helper="Cuentas con acceso vigente" icon={<UserCheck className="size-5" />} tone="teal" />
        <KpiCard label="Administradores" value={adminCount} helper="Roles con permisos de gestión" icon={<ShieldCheck className="size-5" />} tone="violet" />
        <KpiCard label="Colaboradores" value={collaboratorCount} helper="Acceso operativo al portal" icon={<Users className="size-5" />} tone="blue" />
        <KpiCard label="Bloqueados" value={0} helper="Preparado para backend" icon={<LockKeyhole className="size-5" />} tone="rose" />
        <KpiCard label="Pendientes de activación" value={0} helper="Preparado para activaciones" icon={<AlertCircle className="size-5" />} tone="amber" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.5fr)_repeat(3,minmax(150px,1fr))_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por nombre, usuario o correo" />
          </div>
          <Select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}>
            <option value="all">Todos los roles</option>
            {roles.map((role) => <option key={role.id} value={role.name}>{roleLabel(role.name)}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); setPage(1); }}>
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="blocked" disabled>Bloqueado · preparado</option>
            <option value="pending" disabled>Pendiente · preparado</option>
          </Select>
          <Select value={areaFilter} onChange={(event) => { setAreaFilter(event.target.value); setPage(1); }}>
            <option value="all">Todas las áreas / sedes</option>
            {areaOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </Select>
          <Button type="button" onClick={() => setPage(1)}>
            <Search className="size-4" />
            Buscar
          </Button>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            <X className="size-4" />
            Limpiar
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Directorio de usuarios</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">{filteredUsers.length.toLocaleString("es-PE")} resultados con los filtros actuales</p>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[1020px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-4 py-3">Nombre completo</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Último acceso</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] font-semibold text-slate-400">Cargando usuarios...</td></tr>
                )}
                {!isLoading && pagedUsers.map((user) => {
                  const employee = employeeMeta(user, employees);
                  const primaryRole = user.roles[0] ?? "Sin rol";
                  return (
                    <tr key={user.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-extrabold text-white">
                            {initials(user.fullName, user.userName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">@{user.userName}</p>
                            <p className="text-[11px] font-medium text-slate-400">{user.employeeName ? "Vinculado" : "Cuenta independiente"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{user.fullName}</td>
                      <td className="px-4 py-4 text-slate-500">{user.email}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${roleTone(primaryRole)}`}>
                          {roleLabel(primaryRole)}
                        </span>
                      </td>
                      <td className="px-4 py-4">{statusBadge(user.isActive)}</td>
                      <td className="px-4 py-4 text-[12px] font-semibold text-slate-500">{formatDateTime(user.lastLoginAtUtc)}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-700">{employee?.area ?? "Sin vincular"}</p>
                        <p className="text-[11px] text-slate-400">{employee?.branch ?? user.employeeName ?? "Sin sede"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setPreviewUser(user)} title="Ver" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
                            <Eye className="size-4" />
                          </button>
                          <button type="button" onClick={() => setModalState({ mode: "edit", user })} title="Editar" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                            <Edit3 className="size-4" />
                          </button>
                          <button type="button" onClick={() => setFeedback({ type: "error", message: "Restablecer contraseñas de otros usuarios requiere un endpoint administrativo pendiente." })} title="Restablecer contraseña" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700">
                            <KeyRound className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: user.id, active: !user.isActive })}
                            title={user.isActive ? "Desactivar" : "Activar"}
                            className={`relative h-9 w-14 rounded-full border transition ${user.isActive ? "border-brand-200 bg-brand-100" : "border-slate-200 bg-slate-100"}`}
                          >
                            <span className={`absolute top-1 size-7 rounded-full bg-white shadow-sm transition ${user.isActive ? "left-6" : "left-1"}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && pagedUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Users className="size-6" />
                      </div>
                      <p className="mt-3 text-[14px] font-bold text-slate-700">No se encontraron usuarios</p>
                      <p className="mt-1 text-[12px] text-slate-500">Ajusta los filtros o crea una nueva cuenta de acceso.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-[12px] font-medium text-slate-500">
              Mostrando {filteredUsers.length ? ((safePage - 1) * pageSize) + 1 : 0} - {Math.min(safePage * pageSize, filteredUsers.length)} de {filteredUsers.length} resultados
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select className="h-9 w-[120px]" value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} por página</option>)}
              </Select>
              <Button variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`flex size-9 items-center justify-center rounded-lg text-[12px] font-bold ${safePage === pageNumber ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              <Button variant="secondary" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Actividad reciente</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">Eventos de acceso y administración</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <ShieldEllipsis className="size-5" />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {activities.length > 0 ? activities.map((item: AuditLogItem) => {
              const info = auditLabel(item.action);
              const style = TONE_STYLE[info.tone];
              return (
                <div key={item.id} className="flex gap-3">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${style.box} ${style.icon}`}>{info.icon}</div>
                  <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                    <p className="text-[13px] font-bold text-slate-800">{info.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-slate-500">{item.details || `${item.userName} · ${item.module}`}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatDateTime(item.timestamp)}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="text-[13px] font-bold text-slate-700">Auditoría preparada</p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  El backend de auditoría existe, pero faltan eventos específicos del servicio de usuarios para mostrar creación, bloqueo y restablecimientos reales.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ModalFormUsuario
        open={Boolean(modalState)}
        user={currentUser}
        saving={createMutation.isPending || updateMutation.isPending}
        roles={roles}
        employees={employees}
        existingUsers={users}
        onClose={() => setModalState(null)}
        onSubmit={async (values) => {
          if (modalState?.mode === "edit" && currentUser) {
            await updateMutation.mutateAsync({ id: currentUser.id, values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />

      {previewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-sm font-extrabold text-white">{initials(previewUser.fullName, previewUser.userName)}</div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">{previewUser.fullName}</h3>
                  <p className="text-[12px] font-semibold text-slate-500">@{previewUser.userName}</p>
                </div>
              </div>
              <button type="button" onClick={() => setPreviewUser(null)} className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Correo", previewUser.email],
                ["Rol", previewUser.roles.map(roleLabel).join(", ") || "Sin rol"],
                ["Estado", previewUser.isActive ? "Activo" : "Inactivo"],
                ["Último acceso", formatDateTime(previewUser.lastLoginAtUtc)],
                ["Colaborador", previewUser.employeeName ?? "Sin vincular"],
                ["ID", previewUser.id],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-[13px] font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
