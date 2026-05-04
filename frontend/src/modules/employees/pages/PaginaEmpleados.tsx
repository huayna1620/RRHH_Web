import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { ModalFormEmpleado } from "@/modules/employees/components/ModalFormEmpleado";
import { createEmployee, getEmployeeById, getEmployeeCatalogs, getEmployees, updateEmployee, updateEmployeeStatus } from "@/modules/employees/services/employeesApi";
import type { EmployeePayload } from "@/modules/employees/types/employee.types";

type ModalState = { mode: "create"; id: null } | { mode: "edit"; id: string } | null;

const pageSize = 10;

export function PaginaEmpleados(): JSX.Element {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedEmployeeId = modalState?.mode === "edit" ? modalState.id : undefined;

  const catalogsQuery = useQuery({ queryKey: ["employee-catalogs"], queryFn: getEmployeeCatalogs });

  const employeesQuery = useQuery({
    queryKey: ["employees", pageNumber, search, areaFilter, statusFilter],
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
    queryFn: () => getEmployeeById(selectedEmployeeId || ""),
    enabled: Boolean(selectedEmployeeId),
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFeedback({ type: "success", message: "Empleado creado." });
      setModalState(null);
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo crear." }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeePayload }) => updateEmployee(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFeedback({ type: "success", message: "Empleado actualizado." });
      setModalState(null);
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar." }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateEmployeeStatus(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFeedback({ type: "success", message: "Estado actualizado." });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar estado." }),
  });

  const rows = employeesQuery.data?.items ?? [];
  const total = employeesQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Empleados"
        description="Gestion de empleados"
        action={<Button onClick={() => setModalState({ mode: "create", id: null })}><Plus className="size-4" /> Nuevo empleado</Button>}
      />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Buscar por nombre/codigo" value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} />
        <Select value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setPageNumber(1); }}>
          <option value="">Todas las areas</option>
          {catalogsQuery.data?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "all" | "active" | "inactive"); setPageNumber(1); }}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
        <div className="text-sm text-slate-500 self-center">{total} resultados</div>
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Area / Cargo</th>
              <th className="px-3 py-2">Sede</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-semibold">{r.fullName}</div>
                  <div className="text-xs text-slate-500">{r.employeeCode}</div>
                </td>
                <td className="px-3 py-2">{r.documentNumber}</td>
                <td className="px-3 py-2">
                  <div>{r.area}</div>
                  <div className="text-xs text-slate-500">{r.position}</div>
                </td>
                <td className="px-3 py-2">{r.branch}</td>
                <td className="px-3 py-2"><Badge variant={r.isActive ? "success" : "neutral"}>{r.isActive ? "Activo" : "Inactivo"}</Badge></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setModalState({ mode: "edit", id: r.id })}><Pencil className="size-4" /></Button>
                    <Button
                      size="sm"
                      variant={r.isActive ? "danger" : "primary"}
                      onClick={() => statusMutation.mutate({ id: r.id, isActive: !r.isActive })}
                    >
                      {r.isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Pagina {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
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
