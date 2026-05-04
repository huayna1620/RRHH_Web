import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const pageSize = 10;
export function PaginaEmpleados() {
    const queryClient = useQueryClient();
    const [modalState, setModalState] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [search, setSearch] = useState("");
    const [areaFilter, setAreaFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [feedback, setFeedback] = useState(null);
    const selectedEmployeeId = modalState?.mode === "edit" ? modalState.id : undefined;
    const catalogsQuery = useQuery({ queryKey: ["employee-catalogs"], queryFn: getEmployeeCatalogs });
    const employeesQuery = useQuery({
        queryKey: ["employees", pageNumber, search, areaFilter, statusFilter],
        queryFn: () => getEmployees({
            search,
            areaId: areaFilter,
            branchId: "",
            isActive: statusFilter === "all" ? undefined : statusFilter === "active",
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
        mutationFn: ({ id, payload }) => updateEmployee(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["employees"] });
            setFeedback({ type: "success", message: "Empleado actualizado." });
            setModalState(null);
        },
        onError: () => setFeedback({ type: "error", message: "No se pudo actualizar." }),
    });
    const statusMutation = useMutation({
        mutationFn: ({ id, isActive }) => updateEmployeeStatus(id, isActive),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["employees"] });
            setFeedback({ type: "success", message: "Estado actualizado." });
        },
        onError: () => setFeedback({ type: "error", message: "No se pudo actualizar estado." }),
    });
    const rows = employeesQuery.data?.items ?? [];
    const total = employeesQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Empleados", description: "Gestion de empleados", action: _jsxs(Button, { onClick: () => setModalState({ mode: "create", id: null }), children: [_jsx(Plus, { className: "size-4" }), " Nuevo empleado"] }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-4", children: [_jsx(Input, { placeholder: "Buscar por nombre/codigo", value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); } }), _jsxs(Select, { value: areaFilter, onChange: (e) => { setAreaFilter(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todas las areas" }), catalogsQuery.data?.areas?.map((a) => _jsx("option", { value: a.id, children: a.name }, a.id))] }), _jsxs(Select, { value: statusFilter, onChange: (e) => { setStatusFilter(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "all", children: "Todos" }), _jsx("option", { value: "active", children: "Activos" }), _jsx("option", { value: "inactive", children: "Inactivos" })] }), _jsxs("div", { className: "text-sm text-slate-500 self-center", children: [total, " resultados"] })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "Documento" }), _jsx("th", { className: "px-3 py-2", children: "Area / Cargo" }), _jsx("th", { className: "px-3 py-2", children: "Sede" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: r.fullName }), _jsx("div", { className: "text-xs text-slate-500", children: r.employeeCode })] }), _jsx("td", { className: "px-3 py-2", children: r.documentNumber }), _jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { children: r.area }), _jsx("div", { className: "text-xs text-slate-500", children: r.position })] }), _jsx("td", { className: "px-3 py-2", children: r.branch }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: r.isActive ? "success" : "neutral", children: r.isActive ? "Activo" : "Inactivo" }) }), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => setModalState({ mode: "edit", id: r.id }), children: _jsx(Pencil, { className: "size-4" }) }), _jsx(Button, { size: "sm", variant: r.isActive ? "danger" : "primary", onClick: () => statusMutation.mutate({ id: r.id, isActive: !r.isActive }), children: r.isActive ? _jsx(UserX, { className: "size-4" }) : _jsx(UserCheck, { className: "size-4" }) })] }) })] }, r.id))), rows.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 6, children: "Sin resultados" }) }))] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["Pagina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(ModalFormEmpleado, { open: Boolean(modalState), mode: modalState?.mode ?? "create", catalogs: catalogsQuery.data, employee: detailQuery.data ?? null, loadingEmployee: detailQuery.isFetching, saving: createMutation.isPending || updateMutation.isPending, onClose: () => setModalState(null), onSubmit: async (payload) => {
                    if (modalState?.mode === "edit" && modalState.id) {
                        await updateMutation.mutateAsync({ id: modalState.id, payload });
                        return;
                    }
                    await createMutation.mutateAsync(payload);
                } })] }));
}
