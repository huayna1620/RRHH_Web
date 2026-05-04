import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { createPayrollConcept, deletePayrollConcept, getPayrollConcepts, updatePayrollConcept, } from "@/modules/payroll/services/payrollConceptsApi";
const blank = () => ({
    id: "", code: "", name: "", type: "earning", fixedAmount: null, percentage: null,
    isAutomatic: false, isActive: true, description: null,
});
export function PaginaConceptosPlanilla() {
    const queryClient = useQueryClient();
    const [feedback, setFeedback] = useState(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(blank());
    const [isNew, setIsNew] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const listQuery = useQuery({ queryKey: ["payroll-concepts"], queryFn: getPayrollConcepts });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["payroll-concepts"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const saveMutation = useMutation({
        mutationFn: () => isNew
            ? createPayrollConcept({ code: form.code, name: form.name, type: form.type, fixedAmount: form.fixedAmount, percentage: form.percentage, isAutomatic: form.isAutomatic, description: form.description })
            : updatePayrollConcept(form.id, { name: form.name, type: form.type, fixedAmount: form.fixedAmount, percentage: form.percentage, isAutomatic: form.isAutomatic, isActive: form.isActive, description: form.description }),
        onSuccess: async () => { await refresh(); ok(isNew ? "Concepto creado." : "Concepto actualizado."); setOpen(false); },
        onError: () => fail("No se pudo guardar."),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deletePayrollConcept(id),
        onSuccess: async () => { await refresh(); ok("Concepto eliminado."); setDeleteId(null); },
        onError: () => fail("No se pudo eliminar."),
    });
    function openNew() { setForm(blank()); setIsNew(true); setOpen(true); }
    function openEdit(c) { setForm({ ...c }); setIsNew(false); setOpen(true); }
    const rows = listQuery.data ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Conceptos de planilla", description: "Configuraci\u00F3n de bonificaciones y descuentos", action: _jsx(Button, { onClick: openNew, children: "Nuevo concepto" }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "C\u00F3digo" }), _jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Tipo" }), _jsx("th", { className: "px-3 py-2", children: "Monto fijo" }), _jsx("th", { className: "px-3 py-2", children: "Porcentaje" }), _jsx("th", { className: "px-3 py-2", children: "Autom\u00E1tico" }), _jsx("th", { className: "px-3 py-2", children: "Activo" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-mono text-xs", children: r.code }), _jsx("td", { className: "px-3 py-2", children: r.name }), _jsx("td", { className: "px-3 py-2 capitalize", children: r.type === "earning" ? "Ingreso" : "Descuento" }), _jsx("td", { className: "px-3 py-2", children: r.fixedAmount != null ? `S/ ${r.fixedAmount}` : "—" }), _jsx("td", { className: "px-3 py-2", children: r.percentage != null ? `${r.percentage}%` : "—" }), _jsx("td", { className: "px-3 py-2", children: r.isAutomatic ? "Sí" : "No" }), _jsx("td", { className: "px-3 py-2", children: r.isActive ? "Sí" : "No" }), _jsxs("td", { className: "px-3 py-2 flex gap-1", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => openEdit(r), children: "Editar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => setDeleteId(r.id), children: "Eliminar" })] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 8, children: "Sin conceptos" }) })] })] }) }), _jsx(Modal, { open: open, title: isNew ? "Nuevo concepto" : "Editar concepto", onClose: () => setOpen(false), children: _jsxs("div", { className: "space-y-3", children: [isNew && _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "C\u00F3digo" }), _jsx(Input, { value: form.code, onChange: (e) => setForm((f) => ({ ...f, code: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre" }), _jsx(Input, { value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })) })] }), _jsxs(Select, { value: form.type, onChange: (e) => setForm((f) => ({ ...f, type: e.target.value })), children: [_jsx("option", { value: "earning", children: "Ingreso" }), _jsx("option", { value: "deduction", children: "Descuento" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Monto fijo" }), _jsx(Input, { type: "number", value: form.fixedAmount ?? "", onChange: (e) => setForm((f) => ({ ...f, fixedAmount: e.target.value ? Number(e.target.value) : null })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Porcentaje" }), _jsx(Input, { type: "number", value: form.percentage ?? "", onChange: (e) => setForm((f) => ({ ...f, percentage: e.target.value ? Number(e.target.value) : null })) })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: form.isAutomatic, onChange: (e) => setForm((f) => ({ ...f, isAutomatic: e.target.checked })) }), "Autom\u00E1tico"] }), !isNew && _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: form.isActive, onChange: (e) => setForm((f) => ({ ...f, isActive: e.target.checked })) }), "Activo"] }), _jsx(Textarea, { value: form.description ?? "", onChange: (e) => setForm((f) => ({ ...f, description: e.target.value || null })), placeholder: "Descripci\u00F3n" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: saveMutation.isPending, onClick: () => saveMutation.mutate(), children: "Guardar" })] })] }) }), _jsx(Modal, { open: !!deleteId, title: "Confirmar eliminaci\u00F3n", onClose: () => setDeleteId(null), children: _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-slate-600", children: "\u00BFEliminar este concepto? Esta acci\u00F3n no se puede deshacer." }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleteId(null), children: "Cancelar" }), _jsx(Button, { variant: "danger", disabled: deleteMutation.isPending, onClick: () => deleteId && deleteMutation.mutate(deleteId), children: "Eliminar" })] })] }) })] }));
}
