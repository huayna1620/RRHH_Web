import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getCalendarEvents } from "@/modules/account/services/accountApi";
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const typeColors = {
    vacation: "bg-blue-100 text-blue-700",
    leave: "bg-purple-100 text-purple-700",
    holiday: "bg-green-100 text-green-700",
    attendance: "bg-slate-100 text-slate-600",
};
export function PaginaCalendario() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const eventsQuery = useQuery({
        queryKey: ["calendar-events", year, month],
        queryFn: () => getCalendarEvents(year, month),
    });
    const events = eventsQuery.data ?? [];
    function prev() {
        if (month === 1) {
            setYear((y) => y - 1);
            setMonth(12);
        }
        else
            setMonth((m) => m - 1);
    }
    function next() {
        if (month === 12) {
            setYear((y) => y + 1);
            setMonth(1);
        }
        else
            setMonth((m) => m + 1);
    }
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Calendario", description: "Eventos, vacaciones y feriados" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Button, { variant: "secondary", onClick: prev, children: "\u2039" }), _jsxs("h2", { className: "text-lg font-semibold text-slate-700 min-w-40 text-center", children: [MONTHS[month - 1], " ", year] }), _jsx(Button, { variant: "secondary", onClick: next, children: "\u203A" })] }), _jsxs("div", { className: "space-y-2", children: [events.length === 0 && !eventsQuery.isLoading && (_jsx("div", { className: "rounded-lg border bg-white p-8 text-center text-slate-500 text-sm", children: "Sin eventos este mes" })), events.map((ev, i) => (_jsxs("div", { className: "rounded-lg border bg-white p-3 flex items-start gap-3", children: [_jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${typeColors[ev.type] ?? "bg-slate-100 text-slate-600"}`, children: ev.type }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-sm text-slate-700", children: ev.title }), ev.employeeName && _jsx("p", { className: "text-xs text-slate-500", children: ev.employeeName }), ev.status && _jsxs("p", { className: "text-xs text-slate-400", children: ["Estado: ", ev.status] })] }), _jsxs("div", { className: "text-xs text-slate-400 flex-shrink-0", children: [_jsx("div", { children: ev.startDate }), ev.endDate !== ev.startDate && _jsxs("div", { children: ["\u2192 ", ev.endDate] })] })] }, i)))] })] }));
}
