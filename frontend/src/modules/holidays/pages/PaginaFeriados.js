import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { createHoliday, deleteHoliday, getHolidays, updateHoliday } from "@/modules/holidays/services/holidaysApi";
const blank = () => ({
    date: "", name: "", isRecurring: false,
});
export function PaginaFeriados() {
    const queryClient = useQueryClient();
    const [feedback, setFeedback] = useState(null);
    const [open, setOpen] = useState(false);
    const [isNew, setIsNew] = useState(true);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(blank());
    const [deleteId, setDeleteId] = useState(null);
    const listQuery = useQuery({ queryKey: ["holidays"], queryFn: getHolidays });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["holidays"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const saveMutation = useMutation({
        mutationFn: () => isNew
            ? createHoliday(form)
            : updateHoliday(selected.id, form),
        onSuccess: async () => { await refresh(); ok(isNew ? "Feriado creado." : "Feriado actualizado."); setOpen(false); },
        onError: () => fail("No se pudo guardar."),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteHoliday(id),
        onSuccess: async () => { await refresh(); ok("Feriado eliminado."); setDeleteId(null); },
        onError: () => fail("No se pudo eliminar."),
    });
    function openNew() { setForm(blank()); setIsNew(true); setSelected(null); setOpen(true); }
    function openEdit(h) { setForm({ date: h.date, name: h.name, isRecurring: h.isRecurring }); setIsNew(false); setSelected(h); setOpen(true); }
    const rows = listQuery.data ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Feriados", description: "Gesti\u00F3n de d\u00EDas feriados", action: _jsx(Button, { onClick: openNew, children: "Nuevo feriado" }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Fecha" }), _jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Recurrente" }), _jsx("th", { className: "px-3 py-2", children: "Activo" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2", children: r.date }), _jsx("td", { className: "px-3 py-2", children: r.name }), _jsx("td", { className: "px-3 py-2", children: r.isRecurring ? "Sí" : "No" }), _jsx("td", { className: "px-3 py-2", children: r.isActive ? "Sí" : "No" }), _jsxs("td", { className: "px-3 py-2 flex gap-1", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => openEdit(r), children: "Editar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => setDeleteId(r.id), children: "Eliminar" })] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 5, children: "Sin feriados registrados" }) })] })] }) }), _jsx(Modal, { open: open, title: isNew ? "Nuevo feriado" : "Editar feriado", onClose: () => setOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Fecha" }), _jsx(Input, { type: "date", value: form.date, onChange: (e) => setForm((f) => ({ ...f, date: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre" }), _jsx(Input, { value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), placeholder: "Nombre del feriado" })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: form.isRecurring, onChange: (e) => setForm((f) => ({ ...f, isRecurring: e.target.checked })) }), "Se repite cada a\u00F1o"] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !form.date || !form.name || saveMutation.isPending, onClick: () => saveMutation.mutate(), children: "Guardar" })] })] }) }), _jsx(Modal, { open: !!deleteId, title: "Confirmar eliminaci\u00F3n", onClose: () => setDeleteId(null), children: _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-slate-600", children: "\u00BFEliminar este feriado?" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleteId(null), children: "Cancelar" }), _jsx(Button, { variant: "danger", disabled: deleteMutation.isPending, onClick: () => deleteId && deleteMutation.mutate(deleteId), children: "Eliminar" })] })] }) })] }));
}
