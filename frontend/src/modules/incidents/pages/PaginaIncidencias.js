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
import { approveIncident, getIncidents, rejectIncident, submitJustification, } from "@/modules/incidents/services/incidentsApi";
const incidentStatusVariants = {
    open: "warning",
    justified: "success",
    rejected: "danger",
    expired: "neutral",
};
const incidentStatusLabels = {
    open: "Abierto",
    justified: "Justificado",
    rejected: "Rechazado",
    expired: "Expirado",
};
const incidentTypeLabels = {
    absence: "Falta",
    late: "Tardanza",
    early_leave: "Salida anticipada",
};
const pageSize = 10;
export function PaginaIncidencias() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [incidentType, setIncidentType] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [feedback, setFeedback] = useState(null);
    const [justifyOpen, setJustifyOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [justifyText, setJustifyText] = useState("");
    const [reviewComment, setReviewComment] = useState("");
    const query = { employeeId: "", search, status, incidentType, fromDate, toDate, pageNumber, pageSize };
    const listQuery = useQuery({ queryKey: ["incidents", query], queryFn: () => getIncidents(query) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["incidents"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const justifyMutation = useMutation({
        mutationFn: ({ id, text }) => submitJustification(id, text),
        onSuccess: async () => { await refresh(); ok("Justificación enviada."); setJustifyOpen(false); },
        onError: () => fail("No se pudo justificar."),
    });
    const approveMutation = useMutation({
        mutationFn: ({ id, comment }) => approveIncident(id, comment),
        onSuccess: async () => { await refresh(); ok("Incidencia aprobada."); setReviewOpen(false); },
        onError: () => fail("No se pudo aprobar."),
    });
    const rejectMutation = useMutation({
        mutationFn: ({ id, comment }) => rejectIncident(id, comment),
        onSuccess: async () => { await refresh(); ok("Incidencia rechazada."); setReviewOpen(false); },
        onError: () => fail("No se pudo rechazar."),
    });
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Incidencias de asistencia", description: "Gesti\u00F3n de tardanzas y faltas" }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-5", children: [_jsx(Input, { value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); }, placeholder: "Buscar" }), _jsxs(Select, { value: status, onChange: (e) => { setStatus(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "open", children: "Abierto" }), _jsx("option", { value: "justified", children: "Justificado" }), _jsx("option", { value: "approved", children: "Aprobado" }), _jsx("option", { value: "rejected", children: "Rechazado" }), _jsx("option", { value: "expired", children: "Expirado" })] }), _jsxs(Select, { value: incidentType, onChange: (e) => { setIncidentType(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todos los tipos" }), _jsx("option", { value: "absence", children: "Falta" }), _jsx("option", { value: "late", children: "Tardanza" }), _jsx("option", { value: "early_leave", children: "Salida anticipada" })] }), _jsx(Input, { type: "date", value: fromDate, onChange: (e) => { setFromDate(e.target.value); setPageNumber(1); } }), _jsx(Input, { type: "date", value: toDate, onChange: (e) => { setToDate(e.target.value); setPageNumber(1); } })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "Tipo" }), _jsx("th", { className: "px-3 py-2", children: "Fecha" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Justificaci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: r.employeeName }), _jsx("div", { className: "text-xs text-slate-500", children: r.employeeCode })] }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: "info", children: incidentTypeLabels[r.incidentType] ?? r.incidentType }) }), _jsx("td", { className: "px-3 py-2", children: r.incidentDate }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: incidentStatusVariants[r.status] ?? "neutral", children: incidentStatusLabels[r.status] ?? r.status }) }), _jsx("td", { className: "px-3 py-2 max-w-xs truncate text-xs text-slate-500", children: r.justificationText ?? "—" }), _jsxs("td", { className: "px-3 py-2 flex gap-1 flex-wrap", children: [r.status === "open" && (_jsx(Button, { size: "sm", variant: "secondary", onClick: () => { setSelected(r); setJustifyText(""); setJustifyOpen(true); }, children: "Justificar" })), r.status === "justified" && (_jsx(Button, { size: "sm", onClick: () => { setSelected(r); setReviewComment(""); setReviewOpen(true); }, children: "Revisar" }))] })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 6, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["P\u00E1gina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(Modal, { open: justifyOpen, title: "Enviar justificaci\u00F3n", onClose: () => setJustifyOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("p", { className: "text-sm text-slate-600", children: [selected?.employeeName, " \u2014 ", selected?.incidentType, " \u00B7 ", selected?.incidentDate] }), _jsx(Textarea, { value: justifyText, onChange: (e) => setJustifyText(e.target.value), placeholder: "Detalle de la justificaci\u00F3n" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setJustifyOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !justifyText || justifyMutation.isPending, onClick: () => selected && justifyMutation.mutate({ id: selected.id, text: justifyText }), children: "Enviar" })] })] }) }), _jsx(Modal, { open: reviewOpen, title: "Revisar justificaci\u00F3n", onClose: () => setReviewOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("p", { className: "text-sm text-slate-600", children: [selected?.employeeName, " \u2014 ", selected?.justificationText] }), _jsx(Textarea, { value: reviewComment, onChange: (e) => setReviewComment(e.target.value), placeholder: "Comentario del revisor" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setReviewOpen(false), children: "Cancelar" }), _jsx(Button, { variant: "danger", disabled: rejectMutation.isPending, onClick: () => selected && rejectMutation.mutate({ id: selected.id, comment: reviewComment }), children: "Rechazar" }), _jsx(Button, { disabled: approveMutation.isPending, onClick: () => selected && approveMutation.mutate({ id: selected.id, comment: reviewComment }), children: "Aprobar" })] })] }) })] }));
}
