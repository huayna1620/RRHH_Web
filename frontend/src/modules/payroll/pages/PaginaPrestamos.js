import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { cancelPayrollLoan, createPayrollLoan, getPayrollLoans } from "@/modules/payroll/services/payrollLoansApi";
import { getPayrollCatalogs } from "@/modules/payroll/services/payrollApi";
const pageSize = 10;
export function PaginaPrestamos() {
    const queryClient = useQueryClient();
    const [employeeId, setEmployeeId] = useState("");
    const [activeOnly, setActiveOnly] = useState(true);
    const [pageNumber, setPageNumber] = useState(1);
    const [feedback, setFeedback] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [detailItem, setDetailItem] = useState(null);
    const [newEmployeeId, setNewEmployeeId] = useState("");
    const [newLoanType, setNewLoanType] = useState("loan");
    const [newAmount, setNewAmount] = useState("");
    const [newInstallments, setNewInstallments] = useState("12");
    const [newStartDate, setNewStartDate] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const params = { employeeId, activeOnly, pageNumber, pageSize };
    const catalogsQuery = useQuery({ queryKey: ["payroll-catalogs"], queryFn: getPayrollCatalogs });
    const listQuery = useQuery({ queryKey: ["payroll-loans", params], queryFn: () => getPayrollLoans(params) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const createMutation = useMutation({
        mutationFn: createPayrollLoan,
        onSuccess: async () => {
            await refresh();
            ok("Préstamo creado.");
            setCreateOpen(false);
            setNewEmployeeId("");
            setNewAmount("");
            setNewInstallments("12");
            setNewStartDate("");
            setNewNotes("");
        },
        onError: () => fail("No se pudo crear el préstamo."),
    });
    const cancelMutation = useMutation({
        mutationFn: (id) => cancelPayrollLoan(id),
        onSuccess: async () => { await refresh(); ok("Préstamo cancelado."); },
        onError: () => fail("No se pudo cancelar."),
    });
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Pr\u00E9stamos", description: "Gesti\u00F3n de pr\u00E9stamos y adelantos de planilla", action: _jsx(Button, { onClick: () => setCreateOpen(true), children: "Nuevo pr\u00E9stamo" }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-3", children: [_jsxs(Select, { value: employeeId, onChange: (e) => { setEmployeeId(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todos los empleados" }), catalogsQuery.data?.employees?.map((e) => _jsx("option", { value: e.id, children: e.label }, e.id))] }), _jsxs("label", { className: "flex items-center gap-2 text-sm self-center", children: [_jsx("input", { type: "checkbox", checked: activeOnly, onChange: (e) => { setActiveOnly(e.target.checked); setPageNumber(1); } }), "Solo activos"] }), _jsxs("div", { className: "text-sm text-slate-500 self-center", children: [total, " registros"] })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "Tipo" }), _jsx("th", { className: "px-3 py-2", children: "Monto total" }), _jsx("th", { className: "px-3 py-2", children: "Cuota mensual" }), _jsx("th", { className: "px-3 py-2", children: "Pagadas" }), _jsx("th", { className: "px-3 py-2", children: "Pendientes" }), _jsx("th", { className: "px-3 py-2", children: "Saldo" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: r.employeeName }), _jsx("div", { className: "text-xs text-slate-500", children: r.employeeCode })] }), _jsx("td", { className: "px-3 py-2 capitalize", children: r.loanType === "loan" ? "Préstamo" : "Adelanto" }), _jsxs("td", { className: "px-3 py-2", children: ["S/ ", r.totalAmount.toLocaleString("es-PE")] }), _jsxs("td", { className: "px-3 py-2", children: ["S/ ", r.monthlyInstallment.toLocaleString("es-PE")] }), _jsx("td", { className: "px-3 py-2", children: r.paidInstallments }), _jsx("td", { className: "px-3 py-2", children: r.remainingInstallments }), _jsxs("td", { className: "px-3 py-2", children: ["S/ ", r.remainingAmount.toLocaleString("es-PE")] }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`, children: r.isActive ? "Activo" : "Inactivo" }) }), _jsxs("td", { className: "px-3 py-2 flex gap-1", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => setDetailItem(r), children: "Detalle" }), r.isActive && _jsx(Button, { size: "sm", variant: "danger", onClick: () => cancelMutation.mutate(r.id), children: "Cancelar" })] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 9, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["P\u00E1gina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(Modal, { open: createOpen, title: "Nuevo pr\u00E9stamo", onClose: () => setCreateOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs(Select, { value: newEmployeeId, onChange: (e) => setNewEmployeeId(e.target.value), children: [_jsx("option", { value: "", children: "Seleccionar empleado" }), catalogsQuery.data?.employees?.map((e) => _jsx("option", { value: e.id, children: e.label }, e.id))] }), _jsxs(Select, { value: newLoanType, onChange: (e) => setNewLoanType(e.target.value), children: [_jsx("option", { value: "loan", children: "Pr\u00E9stamo" }), _jsx("option", { value: "advance", children: "Adelanto" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Monto total" }), _jsx(Input, { type: "number", value: newAmount, onChange: (e) => setNewAmount(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "N\u00FAmero de cuotas" }), _jsx(Input, { type: "number", value: newInstallments, onChange: (e) => setNewInstallments(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Inicio de descuento" }), _jsx(Input, { type: "date", value: newStartDate, onChange: (e) => setNewStartDate(e.target.value) })] }), _jsx(Textarea, { value: newNotes, onChange: (e) => setNewNotes(e.target.value), placeholder: "Notas" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !newEmployeeId || !newAmount || !newStartDate || createMutation.isPending, onClick: () => createMutation.mutate({ employeeId: newEmployeeId, loanType: newLoanType, totalAmount: Number(newAmount), totalInstallments: Number(newInstallments), startDate: newStartDate, notes: newNotes }), children: "Crear" })] })] }) }), _jsx(Modal, { open: !!detailItem, title: "Cuotas del pr\u00E9stamo", onClose: () => setDetailItem(null), children: _jsx("div", { className: "space-y-2 max-h-96 overflow-auto", children: detailItem?.installments?.map((inst) => (_jsxs("div", { className: "flex justify-between text-sm border-b py-1", children: [_jsxs("span", { children: ["Cuota ", inst.installmentNumber, " \u2014 ", inst.year, "/", String(inst.month).padStart(2, "0")] }), _jsxs("span", { children: ["S/ ", inst.amount.toLocaleString("es-PE")] }), _jsx("span", { className: inst.isPaid ? "text-green-600" : "text-slate-400", children: inst.isPaid ? "Pagado" : "Pendiente" })] }, inst.id))) }) })] }));
}
