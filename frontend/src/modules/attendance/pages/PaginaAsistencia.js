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
import { checkIn, checkOut, getAttendance, getAttendanceCatalogs, getAttendanceSummary, justifyAttendance, markAbsent } from "@/modules/attendance/services/attendanceApi";
import { Badge } from "@/components/ui/badge";
const pageSize = 10;
function today() {
    return new Date().toISOString().slice(0, 10);
}
export function PaginaAsistencia() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [areaId, setAreaId] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [date, setDate] = useState(today());
    const [pageNumber, setPageNumber] = useState(1);
    const [feedback, setFeedback] = useState(null);
    const [justifyOpen, setJustifyOpen] = useState(false);
    const [justifyAttendanceId, setJustifyAttendanceId] = useState(null);
    const [justifyText, setJustifyText] = useState("");
    const query = {
        viewMode: "daily",
        referenceDate: date,
        startDateFrom: date,
        startDateTo: date,
        search,
        employeeId,
        areaId,
        isLate: undefined,
        isAbsent: undefined,
        pageNumber,
        pageSize,
    };
    const catalogsQuery = useQuery({ queryKey: ["attendance-catalogs"], queryFn: getAttendanceCatalogs });
    const listQuery = useQuery({ queryKey: ["attendance", query], queryFn: () => getAttendance(query) });
    const summaryQuery = useQuery({ queryKey: ["attendance-summary", query], queryFn: () => getAttendanceSummary(query) });
    const refreshAll = async () => {
        await queryClient.invalidateQueries({ queryKey: ["attendance"] });
        await queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
    };
    const checkInMutation = useMutation({
        mutationFn: checkIn,
        onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Ingreso registrado." }); },
        onError: () => setFeedback({ type: "error", message: "No se pudo registrar ingreso." }),
    });
    const checkOutMutation = useMutation({
        mutationFn: checkOut,
        onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Salida registrada." }); },
        onError: () => setFeedback({ type: "error", message: "No se pudo registrar salida." }),
    });
    const absentMutation = useMutation({
        mutationFn: ({ id, reason }) => markAbsent(id, reason),
        onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Falta registrada." }); },
        onError: () => setFeedback({ type: "error", message: "No se pudo marcar falta." }),
    });
    const justifyMutation = useMutation({
        mutationFn: ({ id, text }) => justifyAttendance(id, text),
        onSuccess: async () => { await refreshAll(); setFeedback({ type: "success", message: "Asistencia justificada." }); setJustifyOpen(false); setJustifyText(""); },
        onError: () => setFeedback({ type: "error", message: "No se pudo justificar." }),
    });
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    const selectedEmployeeToday = rows.find((r) => r.employeeId === employeeId);
    const canCheckIn = employeeId && !selectedEmployeeToday?.checkInAtUtc && !selectedEmployeeToday?.isAbsent;
    const canCheckOut = employeeId && selectedEmployeeToday?.checkInAtUtc && !selectedEmployeeToday?.checkOutAtUtc;
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Asistencia", description: "Registro de ingreso, salida y justificaciones" }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "grid gap-2 md:grid-cols-5", children: [_jsxs(Select, { value: employeeId, onChange: (e) => setEmployeeId(e.target.value), children: [_jsx("option", { value: "", children: "Seleccionar empleado" }), catalogsQuery.data?.employees?.map((e) => _jsx("option", { value: e.id, children: e.label }, e.id))] }), _jsx(Input, { value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); }, placeholder: "Buscar" }), _jsxs(Select, { value: areaId, onChange: (e) => { setAreaId(e.target.value); setPageNumber(1); }, children: [_jsx("option", { value: "", children: "Todas las areas" }), catalogsQuery.data?.areas?.map((a) => _jsx("option", { value: a.id, children: a.name }, a.id))] }), _jsx(Input, { type: "date", value: date, onChange: (e) => { setDate(e.target.value); setPageNumber(1); } }), _jsxs("div", { className: "text-sm text-slate-500 self-center", children: [total, " registros"] })] }), _jsxs("div", { className: "grid gap-2 sm:grid-cols-3 lg:grid-cols-6", children: [_jsxs("div", { className: "rounded-xl border bg-emerald-50 p-3 text-center", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-emerald-600", children: "A tiempo" }), _jsx("p", { className: "text-2xl font-extrabold text-emerald-700", children: summaryQuery.data?.onTime ?? 0 })] }), _jsxs("div", { className: "rounded-xl border bg-amber-50 p-3 text-center", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-amber-600", children: "Tardanzas" }), _jsx("p", { className: "text-2xl font-extrabold text-amber-700", children: summaryQuery.data?.late ?? 0 })] }), _jsxs("div", { className: "rounded-xl border bg-rose-50 p-3 text-center", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-rose-600", children: "Faltas" }), _jsx("p", { className: "text-2xl font-extrabold text-rose-700", children: summaryQuery.data?.absent ?? 0 })] }), _jsxs("div", { className: "rounded-xl border bg-blue-50 p-3 text-center", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-blue-600", children: "Justificados" }), _jsx("p", { className: "text-2xl font-extrabold text-blue-700", children: summaryQuery.data?.justified ?? 0 })] }), _jsxs("div", { className: "rounded-xl border bg-violet-50 p-3 text-center", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-violet-600", children: "Pend. salida" }), _jsx("p", { className: "text-2xl font-extrabold text-violet-700", children: summaryQuery.data?.pendingCheckOut ?? 0 })] }), _jsxs("div", { className: "rounded-xl border bg-slate-50 p-3 text-center", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-slate-500", children: "Sin registro" }), _jsx("p", { className: "text-2xl font-extrabold text-slate-600", children: summaryQuery.data?.noRecord ?? 0 })] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { disabled: !canCheckIn || checkInMutation.isPending, onClick: () => employeeId && checkInMutation.mutate(employeeId), children: "Registrar ingreso" }), _jsx(Button, { variant: "secondary", disabled: !canCheckOut || checkOutMutation.isPending, onClick: () => selectedEmployeeToday?.id && checkOutMutation.mutate(selectedEmployeeToday.id), children: "Registrar salida" }), _jsx(Button, { variant: "danger", disabled: !employeeId || absentMutation.isPending, onClick: () => employeeId && absentMutation.mutate({ id: employeeId, reason: "Falta" }), children: "Marcar falta" })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "Fecha" }), _jsx("th", { className: "px-3 py-2", children: "Ingreso" }), _jsx("th", { className: "px-3 py-2", children: "Salida" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Accion" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: r.employeeName }), _jsxs("div", { className: "text-xs text-slate-500", children: [r.employeeCode, " \uFFFD ", r.area] })] }), _jsx("td", { className: "px-3 py-2", children: r.attendanceDate }), _jsx("td", { className: "px-3 py-2", children: r.checkInAtUtc ? new Date(r.checkInAtUtc).toLocaleTimeString() : "-" }), _jsx("td", { className: "px-3 py-2", children: r.checkOutAtUtc ? new Date(r.checkOutAtUtc).toLocaleTimeString() : "-" }), _jsx("td", { className: "px-3 py-2", children: r.isAbsent ? _jsx(Badge, { variant: "danger", children: "Falta" })
                                                : r.isJustified ? _jsx(Badge, { variant: "success", children: "Justificado" })
                                                    : r.lateMinutes > 0 ? _jsxs(Badge, { variant: "warning", children: ["Tardanza ", r.lateMinutes, " min"] })
                                                        : _jsx(Badge, { variant: "success", children: "A tiempo" }) }), _jsx("td", { className: "px-3 py-2", children: r.isAbsent || r.lateMinutes > 0 ? (_jsx(Button, { variant: "secondary", size: "sm", onClick: () => { setJustifyAttendanceId(r.id); setJustifyOpen(true); }, children: "Justificar" })) : "-" })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 6, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["Pagina ", pageNumber, " de ", totalPages] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] }), _jsx(Modal, { open: justifyOpen, title: "Justificar asistencia", onClose: () => setJustifyOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Textarea, { value: justifyText, onChange: (e) => setJustifyText(e.target.value), placeholder: "Detalle de justificacion" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setJustifyOpen(false), children: "Cancelar" }), _jsx(Button, { onClick: () => justifyAttendanceId && justifyMutation.mutate({ id: justifyAttendanceId, text: justifyText || "Justificacion" }), disabled: !justifyAttendanceId || justifyMutation.isPending, children: "Guardar" })] })] }) })] }));
}
