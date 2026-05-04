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
import { closeJobPosting, createJobPosting, deleteJobPosting, getJobPostings, updateJobPosting, } from "@/modules/recruitment/services/jobPostingsApi";
const pageSize = 10;
const statusLabels = { open: "Abierta", paused: "Pausada", closed: "Cerrada" };
const blank = () => ({
    title: "", description: "", areaName: "", positionName: "",
    openedDate: new Date().toISOString().slice(0, 10), requiredCount: "1", notes: "",
});
export function PaginaConvocatorias() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [feedback, setFeedback] = useState(null);
    const [open, setOpen] = useState(false);
    const [isNew, setIsNew] = useState(true);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(blank());
    const [editStatus, setEditStatus] = useState("open");
    const [editClosedDate, setEditClosedDate] = useState("");
    const params = { search, status: statusFilter, pageNumber, pageSize };
    const listQuery = useQuery({ queryKey: ["job-postings", params], queryFn: () => getJobPostings(params) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["job-postings"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const createMutation = useMutation({
        mutationFn: createJobPosting,
        onSuccess: async () => { await refresh(); ok("Convocatoria creada."); setOpen(false); setForm(blank()); },
        onError: () => fail("No se pudo crear la convocatoria."),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => updateJobPosting(id, payload),
        onSuccess: async () => { await refresh(); ok("Convocatoria actualizada."); setOpen(false); },
        onError: () => fail("No se pudo actualizar."),
    });
    const closeMutation = useMutation({
        mutationFn: (id) => closeJobPosting(id),
        onSuccess: async () => { await refresh(); ok("Convocatoria cerrada."); },
        onError: () => fail("No se pudo cerrar."),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteJobPosting(id),
        onSuccess: async () => { await refresh(); ok("Convocatoria eliminada."); },
        onError: () => fail("No se pudo eliminar."),
    });
    function openNew() {
        setForm(blank());
        setIsNew(true);
        setSelected(null);
        setOpen(true);
    }
    function openEdit(j) {
        setForm({ title: j.title, description: j.description ?? "", areaName: j.areaName ?? "", positionName: j.positionName ?? "", openedDate: j.openedDate, requiredCount: String(j.requiredCount), notes: j.notes ?? "" });
        setEditStatus(j.status);
        setEditClosedDate(j.closedDate ?? "");
        setSelected(j);
        setIsNew(false);
        setOpen(true);
    }
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Convocatorias", description: "Gesti\u00F3n de puestos vacantes", action: _jsx(Button, { onClick: openNew, children: "Nueva convocatoria" }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-3", children: [_jsx(Input, { value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); }, placeholder: "Buscar" }), _jsxs(Select, { value: statusFilter, onChange: (e) => { setStatusFilter(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "open", children: "Abierta" }), _jsx("option", { value: "paused", children: "Pausada" }), _jsx("option", { value: "closed", children: "Cerrada" })] }), _jsxs("div", { className: "text-sm text-slate-500 self-center", children: [total, " registros"] })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "T\u00EDtulo" }), _jsx("th", { className: "px-3 py-2", children: "\u00C1rea / Puesto" }), _jsx("th", { className: "px-3 py-2", children: "Apertura" }), _jsx("th", { className: "px-3 py-2", children: "Vacantes" }), _jsx("th", { className: "px-3 py-2", children: "Candidatos" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-semibold", children: r.title }), _jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { children: r.areaName }), _jsx("div", { className: "text-xs text-slate-500", children: r.positionName })] }), _jsx("td", { className: "px-3 py-2", children: r.openedDate }), _jsx("td", { className: "px-3 py-2", children: r.requiredCount }), _jsx("td", { className: "px-3 py-2", children: r.candidateCount }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "open" ? "bg-green-100 text-green-700" : r.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-600"}`, children: statusLabels[r.status] ?? r.status }) }), _jsxs("td", { className: "px-3 py-2 flex gap-1 flex-wrap", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => openEdit(r), children: "Editar" }), r.status === "open" && _jsx(Button, { size: "sm", variant: "secondary", onClick: () => closeMutation.mutate(r.id), children: "Cerrar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => deleteMutation.mutate(r.id), children: "Eliminar" })] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 7, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["P\u00E1gina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(Modal, { open: open, title: isNew ? "Nueva convocatoria" : "Editar convocatoria", onClose: () => setOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { value: form.title, onChange: (e) => setForm((f) => ({ ...f, title: e.target.value })), placeholder: "T\u00EDtulo del puesto" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Input, { value: form.areaName, onChange: (e) => setForm((f) => ({ ...f, areaName: e.target.value })), placeholder: "\u00C1rea" }), _jsx(Input, { value: form.positionName, onChange: (e) => setForm((f) => ({ ...f, positionName: e.target.value })), placeholder: "Puesto" })] }), _jsx(Textarea, { value: form.description, onChange: (e) => setForm((f) => ({ ...f, description: e.target.value })), placeholder: "Descripci\u00F3n del puesto" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Fecha de apertura" }), _jsx(Input, { type: "date", value: form.openedDate, onChange: (e) => setForm((f) => ({ ...f, openedDate: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Vacantes requeridas" }), _jsx(Input, { type: "number", value: form.requiredCount, onChange: (e) => setForm((f) => ({ ...f, requiredCount: e.target.value })) })] })] }), !isNew && (_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs(Select, { value: editStatus, onChange: (e) => setEditStatus(e.target.value), children: [_jsx("option", { value: "open", children: "Abierta" }), _jsx("option", { value: "paused", children: "Pausada" }), _jsx("option", { value: "closed", children: "Cerrada" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Fecha de cierre" }), _jsx(Input, { type: "date", value: editClosedDate, onChange: (e) => setEditClosedDate(e.target.value) })] })] })), _jsx(Textarea, { value: form.notes, onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value })), placeholder: "Notas" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !form.title || createMutation.isPending || updateMutation.isPending, onClick: () => {
                                        const base = { title: form.title, description: form.description, areaName: form.areaName, positionName: form.positionName, openedDate: form.openedDate, requiredCount: Number(form.requiredCount), notes: form.notes };
                                        if (isNew)
                                            createMutation.mutate(base);
                                        else if (selected)
                                            updateMutation.mutate({ id: selected.id, payload: { ...base, status: editStatus, closedDate: editClosedDate } });
                                    }, children: "Guardar" })] })] }) })] }));
}
