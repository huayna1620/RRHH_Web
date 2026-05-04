import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getAuditLogs } from "@/modules/audit/services/auditApi";
const pageSize = 20;
export function PaginaAuditoria() {
    const [search, setSearch] = useState("");
    const [module, setModule] = useState("");
    const [action, setAction] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const query = { search, module, action, userId: "", from, to, pageNumber, pageSize };
    const listQuery = useQuery({ queryKey: ["audit-logs", query], queryFn: () => getAuditLogs(query) });
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Auditor\u00EDa", description: "Registro de actividad del sistema" }), _jsxs("div", { className: "grid gap-2 md:grid-cols-5", children: [_jsx(Input, { value: search, onChange: (e) => { setSearch(e.target.value); setPageNumber(1); }, placeholder: "Buscar" }), _jsx(Input, { value: module, onChange: (e) => { setModule(e.target.value); setPageNumber(1); }, placeholder: "M\u00F3dulo" }), _jsx(Input, { value: action, onChange: (e) => { setAction(e.target.value); setPageNumber(1); }, placeholder: "Acci\u00F3n" }), _jsx(Input, { type: "date", value: from, onChange: (e) => { setFrom(e.target.value); setPageNumber(1); } }), _jsx(Input, { type: "date", value: to, onChange: (e) => { setTo(e.target.value); setPageNumber(1); } })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Fecha" }), _jsx("th", { className: "px-3 py-2", children: "Usuario" }), _jsx("th", { className: "px-3 py-2", children: "M\u00F3dulo" }), _jsx("th", { className: "px-3 py-2", children: "Acci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Entidad" }), _jsx("th", { className: "px-3 py-2", children: "IP" }), _jsx("th", { className: "px-3 py-2", children: "Detalles" })] }) }), _jsxs("tbody", { children: [rows.map((r) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 text-xs text-slate-500 whitespace-nowrap", children: new Date(r.timestamp).toLocaleString("es-PE") }), _jsx("td", { className: "px-3 py-2", children: r.userName }), _jsx("td", { className: "px-3 py-2", children: r.module }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: "rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono", children: r.action }) }), _jsxs("td", { className: "px-3 py-2 text-xs text-slate-500", children: [r.entityType, " #", r.entityId.slice(0, 8)] }), _jsx("td", { className: "px-3 py-2 text-xs text-slate-400", children: r.ipAddress ?? "—" }), _jsx("td", { className: "px-3 py-2 max-w-xs truncate text-xs text-slate-500", children: r.details ?? "—" })] }, r.id))), rows.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 7, children: "Sin resultados" }) })] })] }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Button, { variant: "secondary", disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), children: "Anterior" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["P\u00E1gina ", pageNumber, " de ", totalPages, " \u00B7 ", total, " registros"] }), _jsx(Button, { variant: "secondary", disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), children: "Siguiente" })] })] }));
}
