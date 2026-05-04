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
import { createRecruitmentCandidate, deleteRecruitmentCandidate, getRecruitmentCandidates, getRecruitmentCatalogs, updateRecruitmentStatus, } from "@/modules/recruitment/services/recruitmentApi";
const pageSize = 10;
const statusLabels = {
    new: "Nuevo", screening: "Preselección", interview: "Entrevista",
    offered: "Oferta", hired: "Contratado", rejected: "Rechazado",
};
const blankForm = {
    fullName: "", email: "", phoneNumber: "", positionApplied: "", expectedSalary: "",
    source: "", currentStatus: "new", isPotentialHire: false,
    applicationDate: new Date().toISOString().slice(0, 10), nextStepDate: "", notes: "", jobPostingId: "",
};
export function PaginaReclutamiento() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [feedback, setFeedback] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [newStatus, setNewStatus] = useState("screening");
    const [statusNotes, setStatusNotes] = useState("");
    const [form, setForm] = useState({ ...blankForm });
    const query = { search, status: status, isPotentialHire: undefined, isActive: undefined, jobPostingId: "", pageNumber, pageSize };
    const catalogsQuery = useQuery({ queryKey: ["recruitment-catalogs"], queryFn: getRecruitmentCatalogs });
    const listQuery = useQuery({ queryKey: ["recruitment", query], queryFn: () => getRecruitmentCandidates(query) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["recruitment"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const createMutation = useMutation({
        mutationFn: createRecruitmentCandidate,
        onSuccess: async () => { await refresh(); ok("Candidato registrado."); setCreateOpen(false); setForm({ ...blankForm }); },
        onError: () => fail("No se pudo registrar el candidato."),
    });
    const statusMutation = useMutation({
        mutationFn: ({ id, status: s }) => updateRecruitmentStatus(id, { status: s, nextStepDate: "", isPotentialHire: false, notes: statusNotes, rejectionReason: "" }),
        onSuccess: async () => { await refresh(); ok("Estado actualizado."); setStatusOpen(false); },
        onError: () => fail("No se pudo actualizar el estado."),
    });
    const deleteMutation = useMutation({
        mutationFn: deleteRecruitmentCandidate,
        onSuccess: async () => { await refresh(); ok("Candidato eliminado."); },
        onError: () => fail("No se pudo eliminar."),
    });
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Reclutamiento", description: "Gesti\u00F3n de candidatos", action: _jsx(Button, { onClick: () => setCreateOpen(true), children: "Nuevo candidato" }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-3", children: [_jsx(Input, { value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); }, placeholder: "Buscar candidato" }), _jsxs(Select, { value: status, onChange: (e) => { setStatus(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todos los estados" }), catalogsQuery.data?.statuses?.map((s) => _jsx("option", { value: s.code, children: s.name }, s.code))] }), _jsxs("div", { className: "text-sm text-slate-500 self-center", children: [total, " registros"] })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Candidato" }), _jsx("th", { className: "px-3 py-2", children: "Puesto" }), _jsx("th", { className: "px-3 py-2", children: "Fecha" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: r.fullName }), _jsxs("div", { className: "text-xs text-slate-500", children: [r.email, " \u00B7 ", r.phoneNumber] })] }), _jsx("td", { className: "px-3 py-2", children: r.positionApplied }), _jsx("td", { className: "px-3 py-2", children: r.applicationDate }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: r.currentStatus === "hired" ? "success" : r.currentStatus === "rejected" ? "danger" : "info", children: statusLabels[r.currentStatus] ?? r.currentStatus }) }), _jsxs("td", { className: "px-3 py-2 flex gap-1", children: [_jsx(Button, { size: "sm", onClick: () => { setSelected(r); setNewStatus(r.currentStatus); setStatusNotes(""); setStatusOpen(true); }, children: "Estado" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => deleteMutation.mutate(r.id), children: "Eliminar" })] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 5, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["P\u00E1gina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(Modal, { open: createOpen, title: "Nuevo candidato", onClose: () => setCreateOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { value: form.fullName, onChange: (e) => setForm((f) => ({ ...f, fullName: e.target.value })), placeholder: "Nombre completo" }), _jsx(Input, { value: form.email, onChange: (e) => setForm((f) => ({ ...f, email: e.target.value })), placeholder: "Correo", type: "email" }), _jsx(Input, { value: form.phoneNumber, onChange: (e) => setForm((f) => ({ ...f, phoneNumber: e.target.value })), placeholder: "Tel\u00E9fono" }), _jsx(Input, { value: form.positionApplied, onChange: (e) => setForm((f) => ({ ...f, positionApplied: e.target.value })), placeholder: "Puesto al que aplica" }), _jsx(Input, { type: "number", value: form.expectedSalary, onChange: (e) => setForm((f) => ({ ...f, expectedSalary: e.target.value })), placeholder: "Pretensi\u00F3n salarial" }), _jsx(Input, { value: form.source, onChange: (e) => setForm((f) => ({ ...f, source: e.target.value })), placeholder: "Fuente (LinkedIn, referido, etc.)" }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Fecha de aplicaci\u00F3n" }), _jsx(Input, { type: "date", value: form.applicationDate, onChange: (e) => setForm((f) => ({ ...f, applicationDate: e.target.value })) })] }), _jsx(Textarea, { value: form.notes, onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value })), placeholder: "Notas" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !form.fullName || !form.email || createMutation.isPending, onClick: () => createMutation.mutate({ ...form, expectedSalary: Number(form.expectedSalary) || 0, nextStepDate: form.nextStepDate || "" }), children: "Registrar" })] })] }) }), _jsx(Modal, { open: statusOpen, title: "Cambiar estado", onClose: () => setStatusOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm font-semibold text-slate-700", children: selected?.fullName }), _jsx(Select, { value: newStatus, onChange: (e) => setNewStatus(e.target.value), children: catalogsQuery.data?.statuses?.map((s) => _jsx("option", { value: s.code, children: s.name }, s.code)) }), _jsx(Textarea, { value: statusNotes, onChange: (e) => setStatusNotes(e.target.value), placeholder: "Notas" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setStatusOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: statusMutation.isPending, onClick: () => selected && statusMutation.mutate({ id: selected.id, status: newStatus }), children: "Guardar" })] })] }) })] }));
}
