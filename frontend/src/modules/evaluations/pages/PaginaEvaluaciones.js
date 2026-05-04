import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { activateCycle, closeCycle, createCycle, getAssignments, getCycles, } from "@/modules/evaluations/services/evaluationsApi";
const statusLabels = { draft: "Borrador", active: "Activo", closed: "Cerrado" };
export function PaginaEvaluaciones() {
    const queryClient = useQueryClient();
    const [feedback, setFeedback] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState(null);
    const [form, setForm] = useState({ name: "", period: "", year: new Date().getFullYear(), startDate: "", endDate: "" });
    const cyclesQuery = useQuery({ queryKey: ["evaluation-cycles"], queryFn: getCycles });
    const assignmentsQuery = useQuery({
        queryKey: ["evaluation-assignments", selectedCycle?.id],
        queryFn: () => getAssignments(selectedCycle.id, ""),
        enabled: !!selectedCycle,
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["evaluation-cycles"] });
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const createMutation = useMutation({
        mutationFn: createCycle,
        onSuccess: async () => { await refresh(); ok("Ciclo creado."); setCreateOpen(false); setForm({ name: "", period: "", year: new Date().getFullYear(), startDate: "", endDate: "" }); },
        onError: () => fail("No se pudo crear el ciclo."),
    });
    const activateMutation = useMutation({
        mutationFn: (id) => activateCycle(id),
        onSuccess: async () => { await refresh(); ok("Ciclo activado."); },
        onError: () => fail("No se pudo activar."),
    });
    const closeMutation = useMutation({
        mutationFn: (id) => closeCycle(id),
        onSuccess: async () => { await refresh(); ok("Ciclo cerrado."); },
        onError: () => fail("No se pudo cerrar."),
    });
    const cycles = cyclesQuery.data ?? [];
    const assignments = assignmentsQuery.data ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Evaluaciones", description: "Ciclos de evaluaci\u00F3n de desempe\u00F1o", action: _jsx(Button, { onClick: () => setCreateOpen(true), children: "Nuevo ciclo" }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Per\u00EDodo" }), _jsx("th", { className: "px-3 py-2", children: "Inicio" }), _jsx("th", { className: "px-3 py-2", children: "Fin" }), _jsx("th", { className: "px-3 py-2", children: "Asignaciones" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [cycles.map((c) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-semibold", children: c.name }), _jsx("td", { className: "px-3 py-2", children: c.period }), _jsx("td", { className: "px-3 py-2", children: c.startDate }), _jsx("td", { className: "px-3 py-2", children: c.endDate }), _jsxs("td", { className: "px-3 py-2", children: [c.finalizedAssignments, "/", c.totalAssignments] }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : c.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"}`, children: statusLabels[c.status] ?? c.status }) }), _jsxs("td", { className: "px-3 py-2 flex gap-1 flex-wrap", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => setSelectedCycle(selectedCycle?.id === c.id ? null : c), children: selectedCycle?.id === c.id ? "Ocultar" : "Ver asignaciones" }), c.status === "draft" && _jsx(Button, { size: "sm", onClick: () => activateMutation.mutate(c.id), children: "Activar" }), c.status === "active" && _jsx(Button, { size: "sm", variant: "danger", onClick: () => closeMutation.mutate(c.id), children: "Cerrar" })] })] }, c.id))), cycles.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 7, children: "Sin ciclos de evaluaci\u00F3n" }) })] })] }) }), selectedCycle && (_jsxs("div", { className: "space-y-2", children: [_jsxs("h2", { className: "font-semibold text-slate-700", children: ["Asignaciones \u2014 ", selectedCycle.name] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "Evaluador" }), _jsx("th", { className: "px-3 py-2", children: "Autoevaluaci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Evaluador" }), _jsx("th", { className: "px-3 py-2", children: "Puntaje final" }), _jsx("th", { className: "px-3 py-2", children: "Estado" })] }) }), _jsxs("tbody", { children: [assignments.map((a) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2", children: a.employeeName }), _jsx("td", { className: "px-3 py-2", children: a.evaluatorName ?? "—" }), _jsx("td", { className: "px-3 py-2", children: a.selfScore ?? "Pendiente" }), _jsx("td", { className: "px-3 py-2", children: a.evaluatorScore ?? "Pendiente" }), _jsx("td", { className: "px-3 py-2 font-semibold", children: a.finalScore ?? "—" }), _jsx("td", { className: "px-3 py-2 text-xs text-slate-500", children: a.status })] }, a.id))), assignments.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 6, children: "Sin asignaciones" }) })] })] }) })] })), _jsx(Modal, { open: createOpen, title: "Nuevo ciclo de evaluaci\u00F3n", onClose: () => setCreateOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre" }), _jsx(Input, { value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Per\u00EDodo (ej. Q1-2025)" }), _jsx(Input, { value: form.period, onChange: (e) => setForm((f) => ({ ...f, period: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "A\u00F1o" }), _jsx(Input, { type: "number", value: form.year, onChange: (e) => setForm((f) => ({ ...f, year: Number(e.target.value) })) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Inicio" }), _jsx(Input, { type: "date", value: form.startDate, onChange: (e) => setForm((f) => ({ ...f, startDate: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Fin" }), _jsx(Input, { type: "date", value: form.endDate, onChange: (e) => setForm((f) => ({ ...f, endDate: e.target.value })) })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !form.name || !form.startDate || createMutation.isPending, onClick: () => createMutation.mutate(form), children: "Crear" })] })] }) })] }));
}
