import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { createArea, createPosition, deleteArea, deletePosition, getAreas, getPositions, updateArea, updatePosition, } from "@/modules/org-structure/services/orgStructureApi";
const defQuery = { search: "", isActive: undefined, pageNumber: 1, pageSize: 100, sortBy: "", sortDirection: "asc" };
const blank = () => ({ name: "", code: "" });
export function PaginaEstructuraOrg() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState("areas");
    const [feedback, setFeedback] = useState(null);
    const [open, setOpen] = useState(false);
    const [isNew, setIsNew] = useState(true);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(blank());
    const [deleteId, setDeleteId] = useState(null);
    const areasQuery = useQuery({ queryKey: ["areas"], queryFn: () => getAreas(defQuery) });
    const positionsQuery = useQuery({ queryKey: ["positions"], queryFn: () => getPositions(defQuery) });
    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["areas"] });
        await queryClient.invalidateQueries({ queryKey: ["positions"] });
    };
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const saveMutation = useMutation({
        mutationFn: () => {
            const payload = { name: form.name, code: form.code };
            if (tab === "areas")
                return isNew ? createArea(payload) : updateArea(selected.id, payload);
            return isNew ? createPosition(payload) : updatePosition(selected.id, payload);
        },
        onSuccess: async () => { await refresh(); ok("Guardado."); setOpen(false); },
        onError: () => fail("No se pudo guardar."),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => tab === "areas" ? deleteArea(id) : deletePosition(id),
        onSuccess: async () => { await refresh(); ok("Eliminado."); setDeleteId(null); },
        onError: () => fail("No se pudo eliminar."),
    });
    function openNew() { setForm(blank()); setIsNew(true); setSelected(null); setOpen(true); }
    function openEdit(item) {
        setForm({ name: item.name, code: item.code ?? "" });
        setIsNew(false);
        setSelected(item);
        setOpen(true);
    }
    const rows = (tab === "areas" ? areasQuery.data?.items : positionsQuery.data?.items) ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Estructura organizacional", description: "Gesti\u00F3n de \u00E1reas y puestos" }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsx("div", { className: "flex gap-2 border-b", children: ["areas", "positions"].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`, children: t === "areas" ? "Áreas" : "Puestos" }, t))) }), _jsx("div", { className: "flex justify-end", children: _jsxs(Button, { onClick: openNew, children: ["Nuevo ", tab === "areas" ? "área" : "puesto"] }) }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Activo" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-semibold", children: r.name }), _jsxs("td", { className: "px-3 py-2 text-slate-500", children: [r.employeesCount, " empleados"] }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: r.isActive ? "success" : "neutral", children: r.isActive ? "Activo" : "Inactivo" }) }), _jsxs("td", { className: "px-3 py-2 flex gap-1", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => openEdit(r), children: "Editar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => setDeleteId(r.id), children: "Eliminar" })] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 4, children: "Sin registros" }) })] })] }) }), _jsx(Modal, { open: open, title: isNew ? `Nuevo ${tab === "areas" ? "área" : "puesto"}` : "Editar", onClose: () => setOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre" }), _jsx(Input, { value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "C\u00F3digo" }), _jsx(Input, { value: form.code, onChange: (e) => setForm((f) => ({ ...f, code: e.target.value })) })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !form.name || saveMutation.isPending, onClick: () => saveMutation.mutate(), children: "Guardar" })] })] }) }), _jsx(Modal, { open: !!deleteId, title: "Confirmar eliminaci\u00F3n", onClose: () => setDeleteId(null), children: _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-slate-600", children: "\u00BFEliminar este registro?" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleteId(null), children: "Cancelar" }), _jsx(Button, { variant: "danger", disabled: deleteMutation.isPending, onClick: () => deleteId && deleteMutation.mutate(deleteId), children: "Eliminar" })] })] }) })] }));
}
