import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { approveVacationRequest, cancelVacationRequest, createVacationRequest, getVacationCatalogs, getVacations, rejectVacationRequest, } from "@/modules/vacations/services/vacationsApi";
const pageSize = 10;
const statusLabels = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    cancelled: "Cancelado",
};
const statusVariants = {
    approved: "success",
    pending: "warning",
    rejected: "danger",
    cancelled: "neutral",
};
export function PaginaVacaciones() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [year, setYear] = useState(new Date().getFullYear());
    const [pageNumber, setPageNumber] = useState(1);
    const [feedback, setFeedback] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [reviewComment, setReviewComment] = useState("");
    const [newEmployeeId, setNewEmployeeId] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [newReason, setNewReason] = useState("");
    const query = { search, status: status, employeeId: "", startDateFrom: "", startDateTo: "", year, pageNumber, pageSize };
    const catalogsQuery = useQuery({ queryKey: ["vacation-catalogs"], queryFn: () => getVacationCatalogs() });
    const listQuery = useQuery({ queryKey: ["vacations", query], queryFn: () => getVacations(query) });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["vacations"] });
    const ok = (message) => setFeedback({ type: "success", message });
    const fail = (message) => setFeedback({ type: "error", message });
    const createMutation = useMutation({
        mutationFn: createVacationRequest,
        onSuccess: async () => { await refresh(); ok("Solicitud creada."); setCreateOpen(false); setNewEmployeeId(""); setNewStartDate(""); setNewEndDate(""); setNewReason(""); },
        onError: () => fail("No se pudo crear la solicitud."),
    });
    const approveMutation = useMutation({
        mutationFn: ({ id, comment }) => approveVacationRequest(id, comment),
        onSuccess: async () => { await refresh(); ok("Solicitud aprobada."); setReviewOpen(false); },
        onError: () => fail("No se pudo aprobar."),
    });
    const rejectMutation = useMutation({
        mutationFn: ({ id, comment }) => rejectVacationRequest(id, comment),
        onSuccess: async () => { await refresh(); ok("Solicitud rechazada."); setReviewOpen(false); },
        onError: () => fail("No se pudo rechazar."),
    });
    const cancelMutation = useMutation({
        mutationFn: (id) => cancelVacationRequest(id),
        onSuccess: async () => { await refresh(); ok("Solicitud cancelada."); },
        onError: () => fail("No se pudo cancelar."),
    });
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Vacaciones", description: "Gesti\u00F3n de solicitudes de vacaciones", action: _jsxs(Button, { onClick: () => setCreateOpen(true), children: [_jsx(Plus, { className: "size-4" }), "Nueva solicitud"] }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-4", children: [_jsx(Input, { value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); }, placeholder: "Buscar empleado" }), _jsxs(Select, { value: status, onChange: (e) => { setStatus(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "pending", children: "Pendiente" }), _jsx("option", { value: "approved", children: "Aprobado" }), _jsx("option", { value: "rejected", children: "Rechazado" }), _jsx("option", { value: "cancelled", children: "Cancelado" })] }), _jsx(Input, { type: "number", value: year, onChange: (e) => { setYear(Number(e.target.value)); setPageNumber(1); } }), _jsxs("div", { className: "text-sm text-slate-500 self-center", children: [total, " registros"] })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "Inicio" }), _jsx("th", { className: "px-3 py-2", children: "Fin" }), _jsx("th", { className: "px-3 py-2", children: "Dias" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: r.employeeName }), _jsxs("div", { className: "text-xs text-slate-500", children: [r.employeeCode, " \u00B7 ", r.area] })] }), _jsx("td", { className: "px-3 py-2", children: r.startDate }), _jsx("td", { className: "px-3 py-2", children: r.endDate }), _jsx("td", { className: "px-3 py-2", children: r.requestedDays }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: statusVariants[r.status] ?? "neutral", children: statusLabels[r.status] ?? r.status }) }), _jsx("td", { className: "px-3 py-2 flex gap-1 flex-wrap", children: r.status === "pending" && (_jsxs(_Fragment, { children: [_jsx(Button, { size: "sm", onClick: () => { setSelected(r); setReviewComment(""); setReviewOpen(true); }, children: "Revisar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => cancelMutation.mutate(r.id), children: "Cancelar" })] })) })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 6, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["P\u00E1gina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(Modal, { open: createOpen, title: "Nueva solicitud de vacaciones", onClose: () => setCreateOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs(Select, { value: newEmployeeId, onChange: (e) => setNewEmployeeId(e.target.value), children: [_jsx("option", { value: "", children: "Seleccionar empleado" }), catalogsQuery.data?.employees?.map((e) => (_jsxs("option", { value: e.id, children: [e.label, " (disp: ", e.availableDays, " d\u00EDas)"] }, e.id)))] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Inicio" }), _jsx(Input, { type: "date", value: newStartDate, onChange: (e) => setNewStartDate(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Fin" }), _jsx(Input, { type: "date", value: newEndDate, onChange: (e) => setNewEndDate(e.target.value) })] })] }), _jsx(Textarea, { value: newReason, onChange: (e) => setNewReason(e.target.value), placeholder: "Motivo (opcional)" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !newEmployeeId || !newStartDate || !newEndDate || createMutation.isPending, onClick: () => createMutation.mutate({ employeeId: newEmployeeId, startDate: newStartDate, endDate: newEndDate, reason: newReason }), children: "Crear" })] })] }) }), _jsx(Modal, { open: reviewOpen, title: "Revisar solicitud", onClose: () => setReviewOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("p", { className: "text-sm text-slate-600", children: [_jsx("b", { children: selected?.employeeName }), " \u2014 ", selected?.startDate, " a ", selected?.endDate, " (", selected?.requestedDays, " d\u00EDas)"] }), _jsx(Textarea, { value: reviewComment, onChange: (e) => setReviewComment(e.target.value), placeholder: "Comentario (opcional)" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setReviewOpen(false), children: "Cancelar" }), _jsx(Button, { variant: "danger", disabled: rejectMutation.isPending, onClick: () => selected && rejectMutation.mutate({ id: selected.id, comment: reviewComment }), children: "Rechazar" }), _jsx(Button, { disabled: approveMutation.isPending, onClick: () => selected && approveMutation.mutate({ id: selected.id, comment: reviewComment }), children: "Aprobar" })] })] }) })] }));
}
