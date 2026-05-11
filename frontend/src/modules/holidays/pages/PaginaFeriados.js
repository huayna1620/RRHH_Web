import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName } from "@/components/export/exportUtils";
import { AlertCircle, CalendarDays, CalendarRange, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Clock, Loader2, Plus, RefreshCw, RotateCcw, Search, Trash2, X, } from "lucide-react";
import { createHoliday, deleteHoliday, getHolidays, updateHoliday, } from "@/modules/holidays/services/holidaysApi";
// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayIso() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}
function fmtDate(iso) {
    if (!iso)
        return null;
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return { dayOfWeek: DIAS[dt.getDay()], day: d, month: MESES[m - 1], year: y };
}
function getEffectiveDate(h, today) {
    if (!h.isActive)
        return null;
    const todayYear = parseInt(today.slice(0, 4));
    if (h.isRecurring) {
        const mmdd = h.date.slice(5);
        const thisYear = `${todayYear}-${mmdd}`;
        return thisYear >= today ? thisYear : `${todayYear + 1}-${mmdd}`;
    }
    return h.date >= today ? h.date : null;
}
function daysUntil(iso, today) {
    const a = new Date(iso + "T00:00:00");
    const b = new Date(today + "T00:00:00");
    return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function extractErr(error, fallback) {
    const e = error;
    return e?.response?.data?.message?.trim() || fallback;
}
function Toast({ toast, onClose }) {
    useEffect(() => {
        if (!toast)
            return;
        const t = setTimeout(onClose, 4500);
        return () => clearTimeout(t);
    }, [toast, onClose]);
    if (!toast)
        return null;
    const ok = toast.variant === "success";
    return (_jsxs("div", { className: `fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`, children: [ok ? _jsx(CheckCircle2, { className: "mt-0.5 size-4 shrink-0" }) : _jsx(AlertCircle, { className: "mt-0.5 size-4 shrink-0" }), _jsx("p", { className: "flex-1 text-[13px] font-medium leading-snug", children: toast.message }), _jsx("button", { onClick: onClose, className: "shrink-0 opacity-50 transition hover:opacity-100", children: _jsx(X, { className: "size-3.5" }) })] }));
}
// ─── SortableHeader ───────────────────────────────────────────────────────────
function SortableHeader({ col, label, sortKey, sortDir, align = "left", onSort }) {
    const active = sortKey === col;
    const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (_jsx("th", { onClick: () => onSort(col), className: `cursor-pointer select-none px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition group text-${align} ${active ? "text-teal-600" : "text-slate-400 hover:text-slate-600"}`, children: _jsxs("span", { className: `inline-flex items-center gap-1 ${align === "center" ? "w-full justify-center" : ""}`, children: [label, _jsx(Icon, { className: `size-3 shrink-0 ${active ? "text-teal-500" : "text-slate-300 group-hover:text-slate-400"}` })] }) }));
}
// ─── KpiCard ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, loading, iconBg, icon }) {
    return (_jsxs("div", { className: "flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:shadow-md", children: [_jsx("div", { className: `flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBg}`, children: icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-widest text-slate-400", children: label }), loading
                        ? _jsx("div", { className: "mt-1.5 h-7 w-14 animate-pulse rounded-lg bg-slate-200" })
                        : _jsx("p", { className: "mt-0.5 text-[28px] font-extrabold leading-none text-slate-900", children: value }), sub && _jsx("p", { className: "mt-1 text-[11px] text-slate-400", children: sub })] })] }));
}
// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ onClear, onCreate }) {
    return (_jsx("tr", { children: _jsx("td", { colSpan: 5, children: _jsxs("div", { className: "flex flex-col items-center justify-center gap-4 py-20 text-center", children: [_jsx("div", { className: "flex size-16 items-center justify-center rounded-2xl bg-slate-100", children: _jsx(CalendarDays, { className: "size-8 stroke-[1.5] text-slate-400" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[15px] font-bold text-slate-700", children: "Sin feriados registrados" }), _jsx("p", { className: "mt-1 text-[13px] text-slate-400", children: "No hay feriados que coincidan con los filtros actuales." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: onClear, className: "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50", children: [_jsx(X, { className: "size-3.5" }), "Limpiar filtros"] }), _jsxs("button", { onClick: onCreate, className: "inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-teal-700", children: [_jsx(Plus, { className: "size-3.5" }), "Nuevo feriado"] })] })] }) }) }));
}
// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────
function ConfirmDeleteModal({ holiday, saving, onConfirm, onCancel }) {
    if (!holiday)
        return null;
    const p = fmtDate(holiday.date);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4", children: _jsxs("div", { className: "w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl", children: [_jsxs("div", { className: "flex items-start gap-3 px-5 py-5", children: [_jsx("div", { className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50", children: _jsx(Trash2, { className: "size-5 text-rose-500" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-[15px] font-bold text-slate-900", children: "Eliminar feriado" }), _jsxs("p", { className: "mt-1 text-[13px] leading-relaxed text-slate-500", children: ["\u00BFEst\u00E1s seguro de eliminar", " ", _jsxs("span", { className: "font-semibold text-slate-700", children: ["\"", holiday.name, "\""] }), p ? ` (${p.day} ${p.month} ${p.year})` : "", "?"] }), _jsx("div", { className: "mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5", children: _jsx("p", { className: "text-[11px] text-amber-700", children: "\u26A0\uFE0F El feriado se desactivar\u00E1 y dejar\u00E1 de aparecer en el calendario. El historial vinculado se preserva. Puedes reactivarlo edit\u00E1ndolo despu\u00E9s." }) })] })] }), _jsxs("div", { className: "flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5", children: [_jsx("button", { onClick: onCancel, className: "inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50", children: "No, mantener" }), _jsxs("button", { disabled: saving, onClick: onConfirm, className: "inline-flex h-9 items-center gap-2 rounded-lg bg-rose-500 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-60", children: [saving ? _jsx(Loader2, { className: "size-3.5 animate-spin" }) : _jsx(Trash2, { className: "size-3.5" }), saving ? "Eliminando..." : "Sí, eliminar"] })] })] }) }));
}
// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, help }) {
    return (_jsx("div", { className: "rounded-xl border border-slate-200 px-4 py-3.5", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[13px] font-semibold text-slate-700", children: label }), _jsx("p", { className: "mt-0.5 text-[11px] text-slate-400", children: help })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": checked, onClick: () => onChange(!checked), className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 ${checked ? "bg-teal-500" : "bg-slate-200"}`, children: _jsx("span", { className: `pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}` }) })] }) }));
}
function HolidayFormModal({ mode, initial, saving, serverError, onSave, onClose }) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const nameRef = useRef(null);
    const isEdit = mode === "edit";
    useEffect(() => { nameRef.current?.focus(); }, []);
    function set(key, value) {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    }
    function validate() {
        const errs = {};
        if (!form.name.trim())
            errs.name = "El nombre del feriado es obligatorio.";
        else if (form.name.trim().length < 2)
            errs.name = "El nombre debe tener al menos 2 caracteres.";
        if (!form.date)
            errs.date = "La fecha es obligatoria.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }
    function handleSubmit(e) {
        e.preventDefault();
        if (validate())
            onSave(form);
    }
    const preview = form.date ? fmtDate(form.date) : null;
    const recurringMonthDay = form.isRecurring && form.date
        ? `${form.date.slice(8)} ${MESES[parseInt(form.date.slice(5, 7)) - 1]}`
        : null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4", children: _jsxs("div", { className: "flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl", children: [_jsxs("div", { className: "flex shrink-0 items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white px-5 py-4", children: [_jsx("div", { className: "flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 shadow-sm shadow-teal-500/30", children: _jsx(CalendarDays, { className: "size-5 text-white" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "text-[16px] font-bold text-slate-900", children: isEdit ? "Editar feriado" : "Nuevo feriado" }), _jsx("p", { className: "text-[12px] text-slate-500", children: isEdit
                                        ? "Modifica los datos del feriado seleccionado."
                                        : "Registra un nuevo feriado en el calendario corporativo." })] }), _jsx("button", { onClick: onClose, className: "flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "flex min-h-0 flex-1", children: [_jsxs("form", { id: "holiday-form", onSubmit: handleSubmit, className: "flex-1 space-y-5 overflow-y-auto px-5 py-5", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-[12px] font-semibold text-slate-600", children: ["Nombre del feriado ", _jsx("span", { className: "text-rose-500", children: "*" })] }), _jsx("input", { ref: nameRef, type: "text", value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "Ej: A\u00F1o Nuevo, Navidad, D\u00EDa del Trabajo\u2026", maxLength: 150, className: `h-10 w-full rounded-xl border px-3.5 text-[13px] text-slate-800 outline-none transition focus:ring-2 ${errors.name
                                                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                                                : "border-slate-200 focus:border-teal-400 focus:ring-teal-100"}` }), errors.name && (_jsxs("p", { className: "flex items-center gap-1 text-[11px] text-rose-600", children: [_jsx(AlertCircle, { className: "size-3" }), errors.name] })), _jsxs("p", { className: "text-[11px] text-slate-400", children: [form.name.length, "/150 caracteres"] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-[12px] font-semibold text-slate-600", children: ["Fecha ", _jsx("span", { className: "text-rose-500", children: "*" })] }), _jsx("input", { type: "date", value: form.date, onChange: (e) => set("date", e.target.value), className: `h-10 w-full rounded-xl border px-3.5 text-[13px] text-slate-800 outline-none transition focus:ring-2 ${errors.date
                                                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                                                : "border-slate-200 focus:border-teal-400 focus:ring-teal-100"}` }), errors.date && (_jsxs("p", { className: "flex items-center gap-1 text-[11px] text-rose-600", children: [_jsx(AlertCircle, { className: "size-3" }), errors.date] })), recurringMonthDay && (_jsxs("p", { className: "text-[11px] text-teal-600", children: ["\uD83D\uDD04 Se repetir\u00E1 cada a\u00F1o el ", recurringMonthDay] }))] }), _jsx(Toggle, { checked: form.isRecurring, onChange: (v) => set("isRecurring", v), label: "Recurrente cada a\u00F1o", help: form.isRecurring
                                        ? "Este feriado se repetirá automáticamente todos los años."
                                        : "Este feriado aplica solo para la fecha exacta seleccionada." }), isEdit && (_jsx(Toggle, { checked: form.isActive, onChange: (v) => set("isActive", v), label: "Activo", help: form.isActive
                                        ? "El feriado se muestra en el calendario y afecta cálculos de días laborables."
                                        : "El feriado está desactivado y no afecta al sistema." })), serverError && (_jsxs("div", { className: "flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5", children: [_jsx(AlertCircle, { className: "mt-0.5 size-4 shrink-0 text-rose-500" }), _jsx("p", { className: "text-[12px] text-rose-700", children: serverError })] }))] }), _jsx("div", { className: "w-px shrink-0 bg-slate-100" }), _jsxs("div", { className: "w-56 shrink-0 space-y-4 px-4 py-5", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-widest text-slate-400", children: "Vista previa" }), _jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", children: [_jsx("div", { className: "mb-3 text-center", children: preview ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-widest text-slate-400", children: preview.dayOfWeek }), _jsx("p", { className: "text-[34px] font-extrabold leading-none text-teal-600", children: preview.day }), _jsxs("p", { className: "text-[13px] font-semibold text-slate-600", children: [preview.month, " ", preview.year] })] })) : (_jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "mx-auto h-2.5 w-8 rounded bg-slate-100" }), _jsx("div", { className: "mx-auto h-9 w-9 rounded-xl bg-slate-100" }), _jsx("div", { className: "mx-auto h-2.5 w-16 rounded bg-slate-100" })] })) }), _jsx("p", { className: `mb-3 text-center text-[13px] font-bold leading-snug ${form.name.trim() ? "text-slate-800" : "italic text-slate-300"}`, children: form.name.trim() || "Nombre del feriado" }), _jsxs("div", { className: "flex flex-wrap justify-center gap-1.5", children: [_jsxs("span", { className: `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${form.isRecurring ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-100 text-slate-500"}`, children: [form.isRecurring
                                                            ? _jsx(RotateCcw, { className: "size-2.5" })
                                                            : _jsx(CalendarDays, { className: "size-2.5" }), form.isRecurring ? "Recurrente" : "Único"] }), isEdit && (_jsxs("span", { className: `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${form.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`, children: [_jsx("span", { className: `size-1.5 rounded-full ${form.isActive ? "bg-emerald-500" : "bg-slate-400"}` }), form.isActive ? "Activo" : "Inactivo"] }))] })] }), _jsx("p", { className: "text-center text-[10px] text-slate-400", children: "As\u00ED se ver\u00E1 en el listado de feriados" })] })] }), _jsxs("div", { className: "flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5", children: [_jsxs("p", { className: "text-[11px] text-slate-400", children: [_jsx("span", { className: "text-rose-500", children: "*" }), " Campos obligatorios"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50", children: "Cancelar" }), _jsxs("button", { type: "submit", form: "holiday-form", disabled: saving, className: "inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 px-5 text-[13px] font-semibold text-white shadow-sm shadow-teal-500/30 hover:from-teal-500 hover:to-teal-700 disabled:opacity-60", children: [saving ? _jsx(Loader2, { className: "size-3.5 animate-spin" }) : _jsx(CheckCircle2, { className: "size-3.5" }), saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar feriado"] })] })] })] }) }));
}
// ─── PaginaFeriados ───────────────────────────────────────────────────────────
export function PaginaFeriados() {
    const qc = useQueryClient();
    // ── Filtros ──
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [recurringFilter, setRecurringFilter] = useState(""); // "" | "true" | "false"
    const [activeFilter, setActiveFilter] = useState(""); // "" | "true" | "false"
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    // ── Ordenamiento ──
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState("desc");
    function toggleSort(key) {
        if (sortKey === key) {
            if (sortDir === "asc")
                setSortDir("desc");
            else {
                setSortKey(null);
                setSortDir("desc");
            }
        }
        else {
            setSortKey(key);
            setSortDir("asc");
        }
    }
    // ── UI ──
    const [toast, setToast] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [formMode, setFormMode] = useState("create");
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [formInitial, setFormInitial] = useState({ name: "", date: "", isRecurring: false, isActive: true });
    const [editingId, setEditingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [serverError, setServerError] = useState(null);
    const ok = (msg) => setToast({ variant: "success", message: msg });
    const fail = (msg) => setToast({ variant: "error", message: msg });
    // ── Query ──
    const listQuery = useQuery({ queryKey: ["holidays"], queryFn: getHolidays });
    const allRows = listQuery.data ?? [];
    async function refreshAll() {
        await qc.invalidateQueries({ queryKey: ["holidays"] });
    }
    async function handleManualRefresh() {
        setIsRefreshing(true);
        await refreshAll();
        setIsRefreshing(false);
    }
    // ── Derivados globales (sin filtros) ──
    const today = todayIso();
    const availableYears = useMemo(() => {
        const years = new Set(allRows.map((r) => r.date.slice(0, 4)));
        years.add(String(new Date().getFullYear()));
        return [...years].sort().reverse();
    }, [allRows]);
    const kpiTotal = allRows.length;
    const kpiActive = allRows.filter((r) => r.isActive).length;
    const kpiRecurring = allRows.filter((r) => r.isRecurring).length;
    const upcomingAll = useMemo(() => allRows
        .map((h) => ({ h, eff: getEffectiveDate(h, today) }))
        .filter((x) => x.eff !== null)
        .sort((a, b) => a.eff.localeCompare(b.eff)), [allRows, today]);
    const nextHoliday = upcomingAll[0] ?? null;
    const upcomingList = upcomingAll.slice(0, 8);
    // ── Filtrado ──
    const filteredRows = useMemo(() => allRows.filter((r) => {
        if (search && !r.name.toLowerCase().includes(search.toLowerCase()))
            return false;
        if (yearFilter && r.date.slice(0, 4) !== yearFilter)
            return false;
        if (recurringFilter === "true" && !r.isRecurring)
            return false;
        if (recurringFilter === "false" && r.isRecurring)
            return false;
        if (activeFilter === "true" && !r.isActive)
            return false;
        if (activeFilter === "false" && r.isActive)
            return false;
        return true;
    }), [allRows, search, yearFilter, recurringFilter, activeFilter]);
    // ── Ordenamiento ──
    const sortedRows = useMemo(() => {
        const arr = [...filteredRows];
        if (!sortKey) {
            return arr.sort((a, b) => a.date.localeCompare(b.date)); // por defecto: fecha asc
        }
        return arr.sort((a, b) => {
            const av = String(a[sortKey] ?? "");
            const bv = String(b[sortKey] ?? "");
            const cmp = av.localeCompare(bv, "es", { numeric: true });
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [filteredRows, sortKey, sortDir]);
    // ── Paginación cliente ──
    const total = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pagedRows = useMemo(() => sortedRows.slice((page - 1) * pageSize, page * pageSize), [sortedRows, page, pageSize]);
    const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeTo = Math.min(page * pageSize, total);
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7)
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        let start = Math.max(1, page - 3);
        const end = Math.min(totalPages, start + 6);
        start = Math.max(1, end - 6);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [totalPages, page]);
    const hasActiveFilters = !!(search || yearFilter || recurringFilter || activeFilter);
    function clearFilters() {
        setSearchInput("");
        setSearch("");
        setYearFilter("");
        setRecurringFilter("");
        setActiveFilter("");
        setPage(1);
    }
    function applyFilters() { setSearch(searchInput); setPage(1); }
    // ── Mutaciones ──
    const saveMut = useMutation({
        mutationFn: (form) => formMode === "create"
            ? createHoliday({ date: form.date, name: form.name, isRecurring: form.isRecurring })
            : updateHoliday(editingId, { date: form.date, name: form.name, isRecurring: form.isRecurring, isActive: form.isActive }),
        onSuccess: async () => {
            await refreshAll();
            setSortKey(null);
            ok(formMode === "create" ? "Feriado creado correctamente." : "Feriado actualizado correctamente.");
            setFormOpen(false);
            setServerError(null);
        },
        onError: (error) => {
            setServerError(extractErr(error, "No se pudo guardar el feriado. Verifica los datos."));
        },
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteHoliday(id),
        onSuccess: async () => {
            await refreshAll();
            ok("Feriado eliminado correctamente.");
            setDeleteTarget(null);
        },
        onError: () => fail("No se pudo eliminar el feriado."),
    });
    function openCreate() {
        setFormMode("create");
        setEditingId(null);
        setFormInitial({ name: "", date: "", isRecurring: false, isActive: true });
        setServerError(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }
    function openEdit(h) {
        setFormMode("edit");
        setEditingId(h.id);
        setFormInitial({ name: h.name, date: h.date, isRecurring: h.isRecurring, isActive: h.isActive });
        setServerError(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }
    function handleExport(format) {
        if (sortedRows.length === 0) {
            fail("No hay datos para exportar.");
            return;
        }
        const data = sortedRows.map((r) => {
            const p = fmtDate(r.date);
            return {
                Fecha: p ? `${p.day} ${p.month} ${p.year}` : r.date,
                "Día semana": p?.dayOfWeek ?? "",
                Nombre: r.name,
                Recurrente: r.isRecurring ? "Sí" : "No",
                Estado: r.isActive ? "Activo" : "Inactivo",
            };
        });
        exportRows(format, data, makeFileName("Feriados", [yearFilter ? String(yearFilter) : null]), "Feriados del año");
    }
    // ── Render ──────────────────────────────────────────────────────────────────
    return (_jsxs("section", { className: "space-y-5 pb-10", children: [_jsx(Toast, { toast: toast, onClose: () => setToast(null) }), _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-3.5", children: [_jsx("div", { className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 shadow-sm shadow-teal-500/30", children: _jsx(CalendarDays, { className: "size-5 text-white" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-[22px] font-extrabold tracking-tight text-slate-900", children: "Feriados" }), _jsx("p", { className: "mt-0.5 text-[13px] text-slate-500", children: "Gesti\u00F3n de d\u00EDas feriados del calendario corporativo" })] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsx("button", { onClick: handleManualRefresh, title: "Recargar datos", className: "inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition", children: _jsx(RefreshCw, { className: `size-4 ${isRefreshing ? "animate-spin" : ""}` }) }), _jsx(ExportMenu, { fileName: makeFileName("Feriados", [yearFilter ? String(yearFilter) : null]), resultCount: sortedRows.length, filtersActive: Boolean(yearFilter || search), onExport: handleExport }), _jsxs("button", { onClick: openCreate, className: "inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-teal-500/30 hover:from-teal-500 hover:to-teal-700 transition", children: [_jsx(Plus, { className: "size-4" }), "Nuevo feriado"] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 lg:grid-cols-4", children: [_jsx(KpiCard, { label: "Total feriados", value: kpiTotal, sub: "en el sistema", loading: listQuery.isLoading, iconBg: "bg-slate-100 shadow-slate-100", icon: _jsx(CalendarRange, { className: "size-5 text-slate-600" }) }), _jsx(KpiCard, { label: "Activos", value: kpiActive, sub: "en el calendario", loading: listQuery.isLoading, iconBg: "bg-emerald-50 shadow-emerald-100", icon: _jsx(CheckCircle2, { className: "size-5 text-emerald-600" }) }), _jsx(KpiCard, { label: "Recurrentes", value: kpiRecurring, sub: "se repiten cada a\u00F1o", loading: listQuery.isLoading, iconBg: "bg-teal-50 shadow-teal-100", icon: _jsx(RotateCcw, { className: "size-5 text-teal-600" }) }), _jsx(KpiCard, { label: "Pr\u00F3ximo feriado", value: nextHoliday ? `${daysUntil(nextHoliday.eff, today)}d` : "—", sub: nextHoliday ? nextHoliday.h.name : "sin próximos feriados", loading: listQuery.isLoading, iconBg: "bg-amber-50 shadow-amber-100", icon: _jsx(Clock, { className: "size-5 text-amber-500" }) })] }), _jsx("div", { className: "rounded-2xl border border-slate-200 bg-white shadow-sm", children: _jsxs("div", { className: "flex flex-wrap items-end gap-3 px-4 py-4", children: [_jsxs("div", { className: "flex min-w-[200px] flex-1 flex-col gap-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-widest text-slate-400", children: "Buscar" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "text", value: searchInput, onChange: (e) => {
                                                setSearchInput(e.target.value);
                                                if (!e.target.value) {
                                                    setSearch("");
                                                    setPage(1);
                                                }
                                            }, onKeyDown: (e) => e.key === "Enter" && applyFilters(), placeholder: "Nombre del feriado", className: "h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" })] })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-widest text-slate-400", children: "A\u00F1o" }), _jsxs("select", { value: yearFilter, onChange: (e) => { setYearFilter(e.target.value); setSearch(searchInput); setPage(1); }, className: "h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100", children: [_jsx("option", { value: "", children: "Todos los a\u00F1os" }), availableYears.map((y) => _jsx("option", { value: y, children: y }, y))] })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-widest text-slate-400", children: "Recurrencia" }), _jsxs("select", { value: recurringFilter, onChange: (e) => { setRecurringFilter(e.target.value); setSearch(searchInput); setPage(1); }, className: "h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100", children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "true", children: "Recurrentes" }), _jsx("option", { value: "false", children: "\u00DAnicos" })] })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-widest text-slate-400", children: "Estado" }), _jsxs("select", { value: activeFilter, onChange: (e) => { setActiveFilter(e.target.value); setSearch(searchInput); setPage(1); }, className: "h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100", children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "true", children: "Activos" }), _jsx("option", { value: "false", children: "Inactivos" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: applyFilters, className: "inline-flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-teal-700 transition", children: [_jsx(Search, { className: "size-3.5" }), "Aplicar"] }), hasActiveFilters && (_jsxs("button", { onClick: clearFilters, className: "inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition", children: [_jsx(X, { className: "size-3.5" }), "Limpiar"] }))] }), total > 0 && (_jsxs("p", { className: "ml-auto self-end text-[12px] text-slate-400", children: [rangeFrom, "\u2013", rangeTo, " de ", _jsx("b", { className: "text-slate-600", children: total }), " feriados"] }))] }) }), _jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: "min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", children: listQuery.isLoading ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-20 text-slate-400", children: [_jsx(Loader2, { className: "size-5 animate-spin" }), _jsx("span", { className: "text-[13px]", children: "Cargando feriados\u2026" })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-100 bg-slate-50/80", children: [_jsx(SortableHeader, { col: "date", label: "Fecha", sortKey: sortKey, sortDir: sortDir, onSort: toggleSort }), _jsx(SortableHeader, { col: "name", label: "Nombre", sortKey: sortKey, sortDir: sortDir, onSort: toggleSort }), _jsx(SortableHeader, { col: "isRecurring", label: "Recurrente", sortKey: sortKey, sortDir: sortDir, align: "center", onSort: toggleSort }), _jsx(SortableHeader, { col: "isActive", label: "Estado", sortKey: sortKey, sortDir: sortDir, align: "center", onSort: toggleSort }), _jsx("th", { className: "px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400", children: "Acciones" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100", children: sortedRows.length === 0
                                            ? _jsx(EmptyState, { onClear: clearFilters, onCreate: openCreate })
                                            : pagedRows.map((r) => {
                                                const p = fmtDate(r.date);
                                                const eff = getEffectiveDate(r, today);
                                                const days = eff !== null ? daysUntil(eff, today) : null;
                                                const isToday = days === 0;
                                                const isSoon = days !== null && days > 0 && days <= 7;
                                                return (_jsxs("tr", { className: "group transition-colors hover:bg-slate-50/60", children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border ${isToday ? "border-teal-300 bg-teal-500 text-white" : isSoon ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700"}`, children: p ? (_jsxs(_Fragment, { children: [_jsx("span", { className: `text-[9px] font-bold uppercase ${isToday ? "text-teal-100" : isSoon ? "text-amber-500" : "text-slate-400"}`, children: p.dayOfWeek }), _jsx("span", { className: "text-[16px] font-extrabold leading-none", children: p.day })] })) : (_jsx("span", { className: "text-[10px]", children: "\u2014" })) }), _jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-semibold text-slate-700", children: p ? `${p.day} ${p.month} ${p.year}` : r.date }), days !== null && days >= 0 && (_jsx("p", { className: `text-[11px] ${isToday ? "font-bold text-teal-600" : isSoon ? "text-amber-600" : "text-slate-400"}`, children: isToday ? "🎉 Hoy" : `en ${days} día${days === 1 ? "" : "s"}` })), !r.isActive && (_jsx("p", { className: "text-[11px] text-slate-400", children: "Inactivo" }))] })] }) }), _jsxs("td", { className: "px-4 py-3", children: [_jsx("p", { className: "text-[13px] font-semibold text-slate-800", children: r.name }), r.isRecurring && (_jsxs("p", { className: "text-[11px] text-teal-500", children: ["\uD83D\uDD04 Cada a\u00F1o el ", r.date.slice(8), " ", MESES[parseInt(r.date.slice(5, 7)) - 1]] }))] }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${r.isRecurring ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-100 text-slate-500"}`, children: [r.isRecurring
                                                                        ? _jsx(RotateCcw, { className: "size-2.5" })
                                                                        : _jsx(CalendarDays, { className: "size-2.5" }), r.isRecurring ? "Recurrente" : "Único"] }) }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${r.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`, children: [_jsx("span", { className: `size-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-400"}` }), r.isActive ? "Activo" : "Inactivo"] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-end gap-1.5", children: [_jsx("button", { onClick: () => openEdit(r), className: "inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition", children: "Editar" }), _jsx("button", { onClick: () => setDeleteTarget(r), title: "Eliminar", className: "inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[11px] font-semibold text-rose-600 shadow-sm hover:bg-rose-100 transition", children: _jsx(Trash2, { className: "size-3" }) })] }) })] }, r.id));
                                            }) })] }) })) }), _jsx("aside", { className: "w-64 shrink-0", children: _jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-slate-100 px-4 py-3", children: [_jsx(CalendarRange, { className: "size-4 text-teal-500" }), _jsx("h2", { className: "text-[13px] font-bold text-slate-700", children: "Pr\u00F3ximos feriados" })] }), _jsx("div", { className: "divide-y divide-slate-100", children: listQuery.isLoading ? (_jsx("div", { className: "flex items-center justify-center gap-2 py-8 text-slate-400", children: _jsx(Loader2, { className: "size-4 animate-spin" }) })) : upcomingList.length === 0 ? (_jsx("p", { className: "px-4 py-6 text-center text-[12px] text-slate-400", children: "Sin pr\u00F3ximos feriados activos" })) : (upcomingList.map(({ h, eff }) => {
                                        const p = fmtDate(eff);
                                        const days = daysUntil(eff, today);
                                        const isToday = days === 0;
                                        return (_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/60", children: [_jsx("div", { className: `flex size-9 shrink-0 flex-col items-center justify-center rounded-xl border ${isToday ? "border-teal-300 bg-teal-500 text-white" : "border-slate-200 bg-slate-50 text-slate-600"}`, children: p && (_jsxs(_Fragment, { children: [_jsx("span", { className: `text-[8px] font-bold uppercase ${isToday ? "text-teal-100" : "text-slate-400"}`, children: p.dayOfWeek }), _jsx("span", { className: "text-[13px] font-extrabold leading-none", children: p.day })] })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12px] font-semibold text-slate-700", children: h.name }), _jsxs("p", { className: `text-[10px] ${isToday ? "font-bold text-teal-600" : "text-slate-400"}`, children: [isToday ? "Hoy" : days === 1 ? "Mañana" : `en ${days} días`, p ? ` · ${p.day} ${p.month}` : ""] })] }), h.isRecurring && (_jsx("span", { title: "Recurrente", children: _jsx(RotateCcw, { className: "size-3 shrink-0 text-teal-400" }) }))] }, `${h.id}-${eff}`));
                                    })) }), upcomingList.length > 0 && (_jsx("div", { className: "border-t border-slate-100 px-4 py-2.5", children: _jsxs("p", { className: "text-center text-[10px] text-slate-400", children: [kpiRecurring, " recurrentes \u00B7 ", allRows.filter((r) => !r.isRecurring && r.isActive).length, " \u00FAnicos activos"] }) }))] }) })] }), total > 0 && (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-[12px] text-slate-500", children: [_jsx("span", { children: "Mostrar" }), _jsx("select", { value: pageSize, onChange: (e) => { setPageSize(Number(e.target.value)); setPage(1); }, className: "h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-teal-400", children: PAGE_SIZES.map((s) => _jsx("option", { value: s, children: s }, s)) }), _jsx("span", { children: "por p\u00E1gina" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { disabled: page <= 1, onClick: () => setPage((p) => p - 1), className: "inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition", children: _jsx(ChevronLeft, { className: "size-4" }) }), pageNumbers[0] > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setPage(1), className: "inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50", children: "1" }), pageNumbers[0] > 2 && _jsx("span", { className: "px-1 text-slate-300", children: "\u2026" })] })), pageNumbers.map((p) => (_jsx("button", { onClick: () => setPage(p), className: `inline-flex size-8 items-center justify-center rounded-lg text-[12px] font-semibold transition ${p === page ? "bg-teal-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`, children: p }, p))), pageNumbers[pageNumbers.length - 1] < totalPages && (_jsxs(_Fragment, { children: [pageNumbers[pageNumbers.length - 1] < totalPages - 1 && _jsx("span", { className: "px-1 text-slate-300", children: "\u2026" }), _jsx("button", { onClick: () => setPage(totalPages), className: "inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50", children: totalPages })] })), _jsx("button", { disabled: page >= totalPages, onClick: () => setPage((p) => p + 1), className: "inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition", children: _jsx(ChevronRight, { className: "size-4" }) })] })] })), formOpen && (_jsx(HolidayFormModal, { mode: formMode, initial: formInitial, saving: saveMut.isPending, serverError: serverError, onSave: (form) => saveMut.mutate(form), onClose: () => { setFormOpen(false); setServerError(null); } }, formKey)), _jsx(ConfirmDeleteModal, { holiday: deleteTarget, saving: deleteMut.isPending, onConfirm: () => deleteTarget && deleteMut.mutate(deleteTarget.id), onCancel: () => setDeleteTarget(null) })] }));
}
