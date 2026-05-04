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
import { Badge } from "@/components/ui/badge";
import { approvePayroll, downloadBulkPayslips, downloadPayslip, generatePayroll, getPayroll, getPayrollCatalogs, markPayrollPaid, updatePayrollAdjustments, } from "@/modules/payroll/services/payrollApi";
const pageSize = 10;
const statusLabels = { draft: "Borrador", approved: "Aprobado", paid: "Pagado" };
const payrollStatusVariants = { draft: "neutral", approved: "info", paid: "success" };
export function PaginaPlanilla() {
    const queryClient = useQueryClient();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [search, setSearch] = useState("");
    const [areaId, setAreaId] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [feedback, setFeedback] = useState(null);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [genEmployeeId, setGenEmployeeId] = useState("");
    const [genForce, setGenForce] = useState(false);
    const [adjBonuses, setAdjBonuses] = useState("0");
    const [adjDeductions, setAdjDeductions] = useState("0");
    const [adjNotes, setAdjNotes] = useState("");
    const query = { search, employeeId: "", areaId, year, month, startDate: "", endDate: "", pageNumber, pageSize };
    const catalogsQuery = useQuery({ queryKey: ["payroll-catalogs"], queryFn: getPayrollCatalogs });
    const listQuery = useQuery({ queryKey: ["payroll", query], queryFn: () => getPayroll(query) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["payroll"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const generateMutation = useMutation({
        mutationFn: generatePayroll,
        onSuccess: async (res) => { await refresh(); ok(`Generados: ${res.generatedCount}, actualizados: ${res.updatedCount}.`); setGenerateOpen(false); },
        onError: () => fail("No se pudo generar la planilla."),
    });
    const adjustMutation = useMutation({
        mutationFn: ({ id, payload }) => updatePayrollAdjustments(id, payload),
        onSuccess: async () => { await refresh(); ok("Ajuste guardado."); setAdjustOpen(false); },
        onError: () => fail("No se pudo guardar el ajuste."),
    });
    const approveMutation = useMutation({
        mutationFn: () => approvePayroll(year, month),
        onSuccess: async (res) => { await refresh(); ok(`${res.approvedCount} registros aprobados.`); },
        onError: () => fail("No se pudo aprobar la planilla."),
    });
    const paidMutation = useMutation({
        mutationFn: () => markPayrollPaid(year, month),
        onSuccess: async (res) => { await refresh(); ok(`${res.paidCount} registros marcados como pagados.`); },
        onError: () => fail("No se pudo marcar como pagado."),
    });
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    function handleDownloadPayslip(id) {
        downloadPayslip(id).then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `boleta_${id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        }).catch(() => fail("No se pudo descargar la boleta."));
    }
    function handleBulkDownload() {
        downloadBulkPayslips(year, month).then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `boletas_${year}_${month}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        }).catch(() => fail("No se pudo descargar."));
    }
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Planilla", description: "Gesti\u00F3n de n\u00F3mina mensual", action: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: handleBulkDownload, children: "Descargar boletas" }), _jsx(Button, { onClick: () => setGenerateOpen(true), children: "Generar planilla" })] }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-5", children: [_jsx(Input, { type: "number", value: year, onChange: (e) => { setYear(Number(e.target.value)); setPageNumber(1); }, placeholder: "A\u00F1o" }), _jsx(Select, { value: month, onChange: (e) => { setMonth(Number(e.target.value)); setPageNumber(1); }, children: Array.from({ length: 12 }, (_, i) => _jsx("option", { value: i + 1, children: new Date(2000, i).toLocaleString("es-PE", { month: "long" }) }, i + 1)) }), _jsx(Input, { value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); }, placeholder: "Buscar" }), _jsxs(Select, { value: areaId, onChange: (e) => { setAreaId(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todas las \u00E1reas" }), catalogsQuery.data?.areas?.map((a) => _jsx("option", { value: a.id, children: a.name }, a.id))] }), _jsxs("div", { className: "text-sm text-slate-500 self-center", children: [total, " registros"] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", disabled: approveMutation.isPending, onClick: () => approveMutation.mutate(), children: "Aprobar todos" }), _jsx(Button, { variant: "secondary", disabled: paidMutation.isPending, onClick: () => paidMutation.mutate(), children: "Marcar pagados" })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "Salario base" }), _jsx("th", { className: "px-3 py-2", children: "Bonificaciones" }), _jsx("th", { className: "px-3 py-2", children: "Descuentos" }), _jsx("th", { className: "px-3 py-2", children: "Neto" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: r.employeeName }), _jsxs("div", { className: "text-xs text-slate-500", children: [r.employeeCode, " \u00B7 ", r.area] })] }), _jsxs("td", { className: "px-3 py-2", children: ["S/ ", r.baseSalary.toLocaleString("es-PE")] }), _jsxs("td", { className: "px-3 py-2", children: ["S/ ", r.bonuses.toLocaleString("es-PE")] }), _jsxs("td", { className: "px-3 py-2", children: ["S/ ", r.deductions.toLocaleString("es-PE")] }), _jsxs("td", { className: "px-3 py-2 font-semibold", children: ["S/ ", r.netPay.toLocaleString("es-PE")] }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: payrollStatusVariants[r.status] ?? "neutral", children: statusLabels[r.status] ?? r.status }) }), _jsxs("td", { className: "px-3 py-2 flex gap-1 flex-wrap", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => handleDownloadPayslip(r.id), children: "Boleta" }), r.status === "draft" && (_jsx(Button, { size: "sm", onClick: () => { setSelected(r); setAdjBonuses(String(r.bonuses)); setAdjDeductions(String(r.deductions)); setAdjNotes(r.notes ?? ""); setAdjustOpen(true); }, children: "Ajustar" }))] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 7, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["P\u00E1gina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(Modal, { open: generateOpen, title: "Generar planilla", onClose: () => setGenerateOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs(Select, { value: genEmployeeId, onChange: (e) => setGenEmployeeId(e.target.value), children: [_jsx("option", { value: "", children: "Todos los empleados" }), catalogsQuery.data?.employees?.map((e) => _jsx("option", { value: e.id, children: e.label }, e.id))] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: genForce, onChange: (e) => setGenForce(e.target.checked) }), "Forzar recalculo"] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setGenerateOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: generateMutation.isPending, onClick: () => generateMutation.mutate({ year, month, employeeId: genEmployeeId, forceRecalculate: genForce }), children: "Generar" })] })] }) }), _jsx(Modal, { open: adjustOpen, title: "Ajustar planilla", onClose: () => setAdjustOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600 font-semibold", children: selected?.employeeName }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Bonificaciones manuales" }), _jsx(Input, { type: "number", value: adjBonuses, onChange: (e) => setAdjBonuses(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Descuentos manuales" }), _jsx(Input, { type: "number", value: adjDeductions, onChange: (e) => setAdjDeductions(e.target.value) })] }), _jsx(Textarea, { value: adjNotes, onChange: (e) => setAdjNotes(e.target.value), placeholder: "Notas" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setAdjustOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: adjustMutation.isPending, onClick: () => selected && adjustMutation.mutate({ id: selected.id, payload: { bonuses: Number(adjBonuses), deductions: Number(adjDeductions), notes: adjNotes } }), children: "Guardar" })] })] }) })] }));
}
