import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Download,
  Eye,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ModalFormEmpleado } from "@/modules/employees/components/ModalFormEmpleado";
import {
  createEmployee,
  getEmployeeById,
  getEmployeeCatalogs,
  getEmployees,
  updateEmployee,
  updateEmployeeStatus,
} from "@/modules/employees/services/employeesApi";
import type { EmployeePayload } from "@/modules/employees/types/employee.types";

type ModalState = { mode: "create"; id: null } | { mode: "edit"; id: string } | null;

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function pct(n: number, total: number): string {
  if (!total) return "0%";
  return (Math.round((n / total) * 1000) / 10).toFixed(1) + "%";
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, subtitle, icon: Icon, iconBg, iconColor, isLoading,
}: {
  label: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isLoading: boolean;
}): JSX.Element {
  return (
    <div className="relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`size-6 ${iconColor}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-slate-500">{label}</p>
        {isLoading ? (
          <>
            <Skeleton className="my-1 h-7 w-14" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <p className="text-[26px] font-extrabold leading-tight text-slate-800">{value}</p>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </>
        )}
      </div>
      <button className="absolute right-3 top-3 text-slate-300 hover:text-slate-400">
        <Info className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function PaginaEmpleados(): JSX.Element {
  const queryClient = useQueryClient();
  const [modalState, setModalState]     = useState<ModalState>(null);
  const [pageNumber, setPageNumber]     = useState(1);
  const [pageSize, setPageSize]         = useState(10);
  // search: applied query — searchInput: what's typed (applied on click)
  const [search, setSearch]             = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [areaFilter, setAreaFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedEmployeeId = modalState?.mode === "edit" ? modalState.id : undefined;

  const catalogsQuery = useQuery({ queryKey: ["employee-catalogs"], queryFn: getEmployeeCatalogs });

  // Stat queries (lightweight, unfiltered)
  const BASE = { search: "", areaId: "", branchId: "", pageNumber: 1, pageSize: 1, sortBy: "fullName", sortDirection: "asc" as const };
  const totalStatQuery    = useQuery({ queryKey: ["emp-stats", "total"],    queryFn: () => getEmployees(BASE) });
  const activeStatQuery   = useQuery({ queryKey: ["emp-stats", "active"],   queryFn: () => getEmployees({ ...BASE, isActive: true }) });
  const inactiveStatQuery = useQuery({ queryKey: ["emp-stats", "inactive"], queryFn: () => getEmployees({ ...BASE, isActive: false }) });

  const employeesQuery = useQuery({
    queryKey: ["employees", pageNumber, pageSize, search, areaFilter, statusFilter],
    queryFn: () =>
      getEmployees({
        search,
        areaId: areaFilter,
        branchId: "",
        isActive: statusFilter === "all" ? undefined as unknown as boolean : statusFilter === "active",
        pageNumber,
        pageSize,
        sortBy: "fullName",
        sortDirection: "asc",
      }),
  });

  const detailQuery = useQuery({
    queryKey: ["employee", selectedEmployeeId],
    queryFn: () => getEmployeeById(selectedEmployeeId!),
    enabled: Boolean(selectedEmployeeId),
  });

  async function invalidateAll(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
    await queryClient.invalidateQueries({ queryKey: ["emp-stats"] });
  }

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => { await invalidateAll(); setFeedback({ type: "success", message: "Empleado creado correctamente." }); setModalState(null); },
    onError: () => setFeedback({ type: "error", message: "No se pudo crear el empleado." }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeePayload }) => updateEmployee(id, payload),
    onSuccess: async () => { await invalidateAll(); setFeedback({ type: "success", message: "Empleado actualizado correctamente." }); setModalState(null); },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar el empleado." }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateEmployeeStatus(id, isActive),
    onSuccess: async () => { await invalidateAll(); setFeedback({ type: "success", message: "Estado actualizado." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar el estado." }),
  });

  const rows       = employeesQuery.data?.items ?? [];
  const total      = employeesQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const totalCount    = totalStatQuery.data?.totalCount ?? 0;
  const activeCount   = activeStatQuery.data?.totalCount ?? 0;
  const inactiveCount = inactiveStatQuery.data?.totalCount ?? 0;
  const statsLoading  = totalStatQuery.isLoading || activeStatQuery.isLoading || inactiveStatQuery.isLoading;

  const hasFilters = Boolean(search || searchInput || areaFilter || statusFilter !== "all");

  function handleSearch(): void {
    setSearch(searchInput);
    setPageNumber(1);
  }

  function clearFilters(): void {
    setSearchInput(""); setSearch(""); setAreaFilter(""); setStatusFilter("all"); setPageNumber(1);
  }

  // Pagination helpers
  const firstItem = total === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const lastItem  = Math.min(pageNumber * pageSize, total);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, pageNumber - 1);
    const end   = Math.min(totalPages, pageNumber + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [pageNumber, totalPages]);

  return (
    <section className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gestión de empleados</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300">
            <Download className="size-4" />
            Exportar
          </button>
          <button
            onClick={() => setModalState({ mode: "create", id: null })}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:from-brand-500 hover:to-brand-700"
          >
            <Plus className="size-4" />
            Nuevo empleado
          </button>
        </div>
      </div>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total empleados"
          value={totalCount.toLocaleString()}
          subtitle="100% del total"
          icon={Users}
          iconBg="bg-brand-50"
          iconColor="text-brand-500"
          isLoading={statsLoading}
        />
        <StatCard
          label="Activos"
          value={activeCount.toLocaleString()}
          subtitle={`${pct(activeCount, totalCount)} del total`}
          icon={UserCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          isLoading={statsLoading}
        />
        <StatCard
          label="Inactivos"
          value={inactiveCount.toLocaleString()}
          subtitle={`${pct(inactiveCount, totalCount)} del total`}
          icon={UserX}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          isLoading={statsLoading}
        />
        <StatCard
          label="Tasa de actividad"
          value={totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : "—"}
          subtitle={activeCount > 0 ? `${activeCount.toLocaleString()} empleados activos` : "Sin datos"}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          isLoading={statsLoading}
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o correo"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          />
        </div>

        {/* Area */}
        <select
          value={areaFilter}
          onChange={(e) => { setAreaFilter(e.target.value); setPageNumber(1); }}
          className="h-10 min-w-[160px] flex-1 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 sm:flex-none"
        >
          <option value="">Todas las áreas</option>
          {catalogsQuery.data?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as "all" | "active" | "inactive"); setPageNumber(1); }}
          className="h-10 min-w-[155px] flex-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>

        {/* Buscar */}
        <button
          onClick={handleSearch}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:from-brand-500 hover:to-brand-700"
        >
          <Search className="size-4" />
          Buscar
        </button>

        {/* Limpiar */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <X className="size-3.5" />
            Limpiar
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto shrink-0 text-sm font-medium text-slate-500">
          {total.toLocaleString()} resultados
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                {[
                  { label: "Empleado", cls: "pl-5 pr-4" },
                  { label: "Documento", cls: "px-4" },
                  { label: "Área / Cargo", cls: "px-4" },
                  { label: "Sede", cls: "px-4" },
                  { label: "Estado", cls: "px-4" },
                ].map(({ label, cls }) => (
                  <th key={label} className={`${cls} py-3 text-left`}>
                    <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-600 hover:text-slate-900">
                      {label}
                      <ArrowUpDown className="size-3 text-slate-300" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[12px] font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-3.5 pl-5 pr-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full" />
                        <div><Skeleton className="mb-1 h-4 w-32" /><Skeleton className="h-3 w-16" /></div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="mb-1 h-4 w-28" /><Skeleton className="h-3 w-20" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1"><Skeleton className="size-8 rounded-lg" /><Skeleton className="size-8 rounded-lg" /><Skeleton className="size-8 rounded-lg" /><Skeleton className="size-8 rounded-lg" /></div>
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Users className="mx-auto mb-3 size-10 text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">No se encontraron empleados</p>
                    {hasFilters && (
                      <button onClick={clearFilters} className="mt-2 text-xs text-brand-500 hover:underline">Limpiar filtros</button>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const color = avatarColor(r.fullName);
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                      {/* Empleado */}
                      <td className="py-3 pl-5 pr-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${color}`}>
                            {initials(r.fullName)}
                          </span>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800">{r.fullName}</p>
                            <p className="font-mono text-[11px] text-slate-400">{r.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      {/* Documento */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[13px] text-slate-600">{r.documentNumber}</span>
                      </td>
                      {/* Área / Cargo */}
                      <td className="px-4 py-3">
                        <p className="text-[13px] text-slate-700">{r.area}</p>
                        <p className="text-[11px] italic text-slate-400">{r.position}</p>
                      </td>
                      {/* Sede */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-slate-600">{r.branch || "—"}</span>
                      </td>
                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={[
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          r.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-600",
                        ].join(" ")}>
                          <span className={`size-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-rose-400"}`} />
                          {r.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Ver detalle"
                            onClick={() => setModalState({ mode: "edit", id: r.id })}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            title="Editar"
                            onClick={() => setModalState({ mode: "edit", id: r.id })}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            title={r.isActive ? "Desactivar" : "Activar"}
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: r.id, isActive: !r.isActive })}
                            className={[
                              "flex size-8 items-center justify-center rounded-lg transition disabled:opacity-50",
                              r.isActive
                                ? "text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                                : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600",
                            ].join(" ")}
                          >
                            {r.isActive ? <UserX className="size-4" /> : <RefreshCw className="size-4" />}
                          </button>
                          <button
                            title="Más opciones"
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            {/* Left: rows per page */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Mostrar</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPageNumber(1); }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              >
                {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span>por página</span>
            </div>

            {/* Center: page buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              >
                ‹
              </button>

              {pageNumbers[0] > 1 && (
                <>
                  <button onClick={() => setPageNumber(1)} className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition hover:bg-slate-50">1</button>
                  {pageNumbers[0] > 2 && <span className="flex size-8 items-center justify-center text-sm text-slate-400">…</span>}
                </>
              )}

              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => setPageNumber(p)}
                  className={[
                    "flex size-8 items-center justify-center rounded-lg border text-sm font-semibold shadow-sm transition",
                    p === pageNumber
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span className="flex size-8 items-center justify-center text-sm text-slate-400">…</span>
                  )}
                  <button onClick={() => setPageNumber(totalPages)} className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition hover:bg-slate-50">
                    {totalPages}
                  </button>
                </>
              )}

              <button
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              >
                ›
              </button>
            </div>

            {/* Right: page X de Y */}
            <p className="text-sm text-slate-500">
              Página <span className="font-semibold text-slate-700">{pageNumber}</span> de{" "}
              <span className="font-semibold text-slate-700">{totalPages}</span>
            </p>
          </div>
        )}
      </div>

      <ModalFormEmpleado
        open={Boolean(modalState)}
        mode={modalState?.mode ?? "create"}
        catalogs={catalogsQuery.data}
        employee={detailQuery.data ?? null}
        loadingEmployee={detailQuery.isFetching}
        saving={createMutation.isPending || updateMutation.isPending}
        onClose={() => setModalState(null)}
        onSubmit={async (payload) => {
          if (modalState?.mode === "edit" && modalState.id) {
            await updateMutation.mutateAsync({ id: modalState.id, payload });
            return;
          }
          await createMutation.mutateAsync(payload);
        }}
      />
    </section>
  );
}
