import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { exportRows, makeFileName } from "@/components/export/exportUtils";
import { approvePayroll, downloadBankFile, downloadBulkPayslips, downloadPayslip, generatePayroll, getBankFormats, getPayroll, getPayrollCatalogs, markPayrollPaid, previewBankFile, unapprovePayroll, updatePayrollAdjustments, } from "@/modules/payroll/services/payrollApi";
// ─── constants ───────────────────────────────────────────────────────────────
const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const PAGE_SIZES = [10, 25, 50];
const PIE_COLORS = ["#7c3aed", "#a855f7", "#c084fc", "#e879f9", "#f0abfc", "#ddd6fe", "#4c1d95", "#6d28d9"];
const KPI_PAGE_SIZE = 9999;
const STATUS = {
    draft: { label: "Borrador", bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
    approved: { label: "Aprobado", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
    paid: { label: "Pagado", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
};
// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
    return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function padMonth(m) { return String(m).padStart(2, "0"); }
function monthLabel(m) { return MONTHS[m - 1] ?? String(m); }
function initials(name) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function avatarBg(name) {
    const colors = [
        "bg-violet-500", "bg-purple-500", "bg-fuchsia-500",
        "bg-indigo-500", "bg-blue-500", "bg-cyan-500",
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++)
        h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
}
function blobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
function Toast({ toast, onClose }) {
    useEffect(() => {
        if (!toast)
            return;
        const t = setTimeout(onClose, 5000);
        return () => clearTimeout(t);
    }, [toast, onClose]);
    if (!toast)
        return null;
    const isError = toast.type === "error";
    return (_jsxs("div", { className: `fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-2xl border max-w-sm ${isError ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`, children: [_jsx("span", { className: "text-lg", children: isError ? "✕" : "✓" }), _jsx("p", { className: "text-sm leading-snug flex-1", children: toast.message }), _jsx("button", { onClick: onClose, className: "opacity-60 hover:opacity-100 text-lg leading-none", children: "\u00D7" })] }));
}
function ConfirmDialog({ state, onClose }) {
    if (!state)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900", children: state.title }), _jsx("p", { className: "text-sm text-slate-600 leading-relaxed", children: state.message }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors", children: "Cancelar" }), _jsx("button", { onClick: () => { state.onConfirm(); onClose(); }, className: `px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`, children: "Confirmar" })] })] }) }));
}
// ─── KpiCard ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent, }) {
    return (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4", children: [_jsx("div", { className: `w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${accent}`, children: icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-medium text-slate-500 uppercase tracking-wide truncate", children: label }), _jsx("p", { className: "text-xl font-bold text-slate-900 leading-tight mt-0.5", children: value }), sub && _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: sub })] })] }));
}
// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
    return (_jsxs("label", { className: "flex items-center gap-3 cursor-pointer select-none", children: [_jsx("button", { type: "button", role: "switch", "aria-checked": checked, onClick: () => onChange(!checked), className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-emerald-600" : "bg-slate-200"}`, children: _jsx("span", { className: `inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}` }) }), _jsx("span", { className: "text-sm text-slate-700", children: label })] }));
}
// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const s = STATUS[status] ?? STATUS["draft"];
    return (_jsxs("span", { className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${s.dot}` }), s.label] }));
}
function GenerarPlanillaModal({ open, year, month, employees, isPending, onClose, onGenerate }) {
    const [selYear, setSelYear] = useState(year);
    const [selMonth, setSelMonth] = useState(month);
    const [employeeId, setEmployeeId] = useState("");
    const [force, setForce] = useState(false);
    const [scope, setScope] = useState("all");
    useEffect(() => { if (open) {
        setSelYear(year);
        setSelMonth(month);
        setEmployeeId("");
        setForce(false);
        setScope("all");
    } }, [open, year, month]);
    if (!open)
        return null;
    const selEmployee = employees.find((e) => e.id === employeeId);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden", children: [_jsx("div", { className: "bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: "Generar Planilla" }), _jsx("p", { className: "text-sm text-emerald-100 mt-0.5", children: "Calcula y registra los haberes del per\u00EDodo seleccionado" })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors", children: "\u00D7" })] }) }), _jsxs("div", { className: "flex divide-x divide-slate-100", children: [_jsxs("div", { className: "flex-1 p-6 space-y-5", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "\uD83D\uDCC5 Per\u00EDodo" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-600 block mb-1", children: "A\u00F1o" }), _jsx("select", { value: selYear, onChange: (e) => setSelYear(Number(e.target.value)), className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: YEARS.map((y) => _jsx("option", { value: y, children: y }, y)) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-600 block mb-1", children: "Mes" }), _jsx("select", { value: selMonth, onChange: (e) => setSelMonth(Number(e.target.value)), className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: MONTHS.map((m, i) => _jsx("option", { value: i + 1, children: m }, i + 1)) })] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "\uD83D\uDC65 Alcance" }), _jsx("div", { className: "flex rounded-lg border border-slate-200 overflow-hidden", children: ["all", "one"].map((v) => (_jsx("button", { onClick: () => { setScope(v); if (v === "all")
                                                    setEmployeeId(""); }, className: `flex-1 py-2 text-sm font-medium transition-colors ${scope === v ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`, children: v === "all" ? "Todos los colaboradores" : "Colaborador específico" }, v))) }), scope === "one" && (_jsx("div", { className: "mt-3", children: _jsxs("select", { value: employeeId, onChange: (e) => setEmployeeId(e.target.value), className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: [_jsx("option", { value: "", children: "\u2014 Seleccionar colaborador \u2014" }), employees.map((e) => _jsx("option", { value: e.id, children: e.label }, e.id))] }) }))] }), _jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "\u2699\uFE0F Opciones" }), _jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1", children: [_jsx(Toggle, { checked: force, onChange: setForce, label: "Forzar rec\u00E1lculo" }), force && (_jsx("p", { className: "text-xs text-amber-700 ml-14", children: "\u26A0\uFE0F Recalcular\u00E1 incluso registros ya aprobados. \u00DAsalo con precauci\u00F3n." }))] })] })] }), _jsxs("div", { className: "w-52 p-6 bg-slate-50 flex flex-col", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Vista previa" }), _jsxs("div", { className: "flex-1 space-y-3", children: [_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-500", children: "Per\u00EDodo" }), _jsxs("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: [monthLabel(selMonth), " ", selYear] })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-500", children: "Colaboradores" }), _jsx("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: scope === "all" ? `Todos (${employees.length})` : selEmployee?.label ?? "Ninguno seleccionado" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-500", children: "Modo" }), _jsx("p", { className: "font-bold text-sm mt-0.5", style: { color: force ? "#d97706" : "#10b981" }, children: force ? "Recálculo forzado" : "Normal" })] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-slate-200 space-y-2", children: [_jsxs("button", { disabled: isPending || (scope === "one" && !employeeId), onClick: () => onGenerate({ year: selYear, month: selMonth, employeeId, forceRecalculate: force }), className: "w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2", children: [isPending ? _jsx("span", { className: "w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" }) : "⚡", isPending ? "Generando..." : "Generar"] }), _jsx("button", { onClick: onClose, className: "w-full py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors", children: "Cancelar" })] })] })] })] }) }));
}
function AjustarModal({ item, isPending, onClose, onSave }) {
    const [bonuses, setBonuses] = useState("0");
    const [deductions, setDeductions] = useState("0");
    const [notes, setNotes] = useState("");
    useEffect(() => {
        if (item) {
            setBonuses(String(item.bonuses));
            setDeductions(String(item.manualDeductions ?? item.deductions));
            setNotes(item.notes ?? "");
        }
    }, [item]);
    if (!item)
        return null;
    const newNet = item.baseSalary + item.automaticBonuses + Number(bonuses) - item.automaticDeductions - item.incidentDeductions - item.loanDeductions - Number(deductions);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden", children: [_jsx("div", { className: "bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: "Ajustar Planilla" }), _jsxs("p", { className: "text-sm text-emerald-100 mt-0.5", children: [item.employeeName, " \u00B7 ", item.employeeCode] })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors", children: "\u00D7" })] }) }), _jsxs("div", { className: "p-6 space-y-5", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "Desglose actual" }), _jsx("div", { className: "bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100", children: [
                                        ["Salario base", item.baseSalary, false],
                                        ["Bonif. automáticas", item.automaticBonuses, false],
                                        ["Desc. automáticos", item.automaticDeductions, true],
                                        ["Desc. por incidencias", item.incidentDeductions, true],
                                        ["Desc. por préstamos", item.loanDeductions, true],
                                    ].map(([label, val, isDed]) => (_jsxs("div", { className: "flex items-center justify-between px-4 py-2.5 text-sm", children: [_jsx("span", { className: "text-slate-600", children: String(label) }), _jsxs("span", { className: `font-medium ${isDed ? "text-red-600" : "text-slate-900"}`, children: [isDed ? "−" : "+", " ", fmtCurrency(Number(val))] })] }, String(label)))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-600 block mb-1.5", children: "Bonificaciones manuales" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400", children: "S/" }), _jsx("input", { type: "number", min: "0", step: "0.01", value: bonuses, onChange: (e) => setBonuses(e.target.value), className: "w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-600 block mb-1.5", children: "Descuentos manuales" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400", children: "S/" }), _jsx("input", { type: "number", min: "0", step: "0.01", value: deductions, onChange: (e) => setDeductions(e.target.value), className: "w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-600 block mb-1.5", children: "Notas internas" }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2, placeholder: "Motivo del ajuste, observaciones...", className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" })] }), _jsxs("div", { className: "bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold text-emerald-700", children: "Neto estimado" }), _jsx("span", { className: "text-xl font-bold text-emerald-900", children: fmtCurrency(Math.max(0, newNet)) })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-1", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors", children: "Cancelar" }), _jsxs("button", { disabled: isPending, onClick: () => onSave(item.id, Number(bonuses), Number(deductions), notes), className: "px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2", children: [isPending && _jsx("span", { className: "w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" }), isPending ? "Guardando..." : "Guardar ajuste"] })] })] })] }) }));
}
function BankFileModal({ open, year, month, formats, onClose }) {
    const [selectedFormat, setSelectedFormat] = useState("");
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    useEffect(() => {
        if (!open) {
            setSelectedFormat("");
            setPreview(null);
        }
        if (open && formats.length > 0)
            setSelectedFormat(formats[0].code);
    }, [open, formats]);
    useEffect(() => {
        if (!selectedFormat)
            return;
        setPreview(null);
        setLoadingPreview(true);
        previewBankFile(year, month, selectedFormat)
            .then(setPreview)
            .catch(() => setPreview(null))
            .finally(() => setLoadingPreview(false));
    }, [selectedFormat, year, month]);
    if (!open)
        return null;
    const fmt = formats.find((f) => f.code === selectedFormat);
    function handleDownload() {
        if (!selectedFormat)
            return;
        setDownloading(true);
        downloadBankFile(year, month, selectedFormat)
            .then((blob) => blobDownload(blob, preview?.fileName ?? `banco_${year}_${padMonth(month)}.${fmt?.fileExtension ?? "txt"}`))
            .catch(() => { })
            .finally(() => setDownloading(false));
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden", children: [_jsx("div", { className: "bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: "Archivo Bancario" }), _jsxs("p", { className: "text-sm text-slate-300 mt-0.5", children: [monthLabel(month), " ", year, " \u00B7 Transferencias de n\u00F3mina"] })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors", children: "\u00D7" })] }) }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-600 block mb-2", children: "Formato bancario" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: formats.map((f) => (_jsxs("button", { onClick: () => setSelectedFormat(f.code), className: `flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${selectedFormat === f.code
                                            ? "border-emerald-500 bg-emerald-50"
                                            : "border-slate-200 hover:border-slate-300"}`, children: [_jsx("span", { className: "text-sm font-bold text-slate-900", children: f.displayName }), _jsxs("span", { className: "text-xs text-slate-500 mt-0.5", children: [".", f.fileExtension] })] }, f.code))) }), fmt && _jsx("p", { className: "text-xs text-slate-500 mt-2 italic", children: fmt.description })] }), loadingPreview && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-slate-500 py-3", children: [_jsx("span", { className: "w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" }), "Calculando vista previa..."] })), preview && !loadingPreview && (_jsxs("div", { className: "bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "bg-white rounded-lg border border-slate-100 p-3", children: [_jsx("p", { className: "text-xs text-slate-500", children: "Colaboradores incluidos" }), _jsx("p", { className: "text-xl font-bold text-slate-900 mt-0.5", children: preview.includedCount })] }), _jsxs("div", { className: "bg-white rounded-lg border border-slate-100 p-3", children: [_jsx("p", { className: "text-xs text-slate-500", children: "Monto total" }), _jsx("p", { className: "text-xl font-bold text-emerald-700 mt-0.5", children: fmtCurrency(preview.totalAmount) })] })] }), preview.skipped.length > 0 && (_jsxs("div", { children: [_jsxs("p", { className: "text-xs font-semibold text-amber-700 mb-1.5", children: ["\u26A0\uFE0F ", preview.skipped.length, " omitido(s):"] }), _jsx("div", { className: "max-h-28 overflow-y-auto space-y-1", children: preview.skipped.map((s) => (_jsxs("div", { className: "flex justify-between text-xs text-slate-600 bg-white rounded px-2 py-1 border border-slate-100", children: [_jsx("span", { className: "font-medium", children: s.fullName }), _jsx("span", { className: "text-slate-400", children: s.reason })] }, s.employeeId))) })] }))] })), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors", children: "Cancelar" }), _jsxs("button", { disabled: !selectedFormat || downloading || loadingPreview, onClick: handleDownload, className: "px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2", children: [downloading && _jsx("span", { className: "w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" }), downloading ? "Generando..." : "⬇ Descargar"] })] })] })] }) }));
}
function ExportDropdown({ onExport, onBankFile, onBulkPayslips }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);
    const exportOptions = [
        { fmt: "excel", label: "Excel (.xlsx)", icon: "📊", color: "text-emerald-700" },
        { fmt: "csv", label: "CSV", icon: "📄", color: "text-blue-700" },
        { fmt: "pdf", label: "PDF", icon: "📕", color: "text-red-700" },
        { fmt: "print", label: "Imprimir", icon: "🖨️", color: "text-slate-700" },
    ];
    return (_jsxs("div", { className: "relative", ref: ref, children: [_jsxs("button", { onClick: () => setOpen((v) => !v), className: "flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 shadow-sm transition-colors", children: ["\u2B07 Exportar", _jsx("svg", { className: `w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`, viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z", clipRule: "evenodd" }) })] }), open && (_jsx("div", { className: "absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-30 overflow-hidden", children: _jsxs("div", { className: "py-1", children: [_jsx("p", { className: "px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest", children: "Reportes" }), exportOptions.map(({ fmt, label, icon, color }) => (_jsxs("button", { onClick: () => { onExport(fmt); setOpen(false); }, className: "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors", children: [_jsx("span", { children: icon }), _jsx("span", { className: `font-medium ${color}`, children: label })] }, fmt))), _jsx("div", { className: "my-1 border-t border-slate-100" }), _jsx("p", { className: "px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest", children: "Boletas" }), _jsxs("button", { onClick: () => { onBulkPayslips(); setOpen(false); }, className: "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors", children: [_jsx("span", { children: "\uD83D\uDDC2\uFE0F" }), _jsx("span", { className: "font-medium text-slate-700", children: "Descargar todas (.zip)" })] }), _jsx("div", { className: "my-1 border-t border-slate-100" }), _jsx("p", { className: "px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest", children: "Banco" }), _jsxs("button", { onClick: () => { onBankFile(); setOpen(false); }, className: "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors", children: [_jsx("span", { children: "\uD83C\uDFE6" }), _jsx("span", { className: "font-medium text-slate-700", children: "Archivo bancario" })] })] }) }))] }));
}
// ─── RowActionsMenu ───────────────────────────────────────────────────────────
function RowActionsMenu({ item, onPayslip, onAdjust, }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);
    return (_jsxs("div", { className: "relative", ref: ref, children: [_jsx("button", { onClick: () => setOpen((v) => !v), className: "w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors", children: "\u2022\u2022\u2022" }), open && (_jsxs("div", { className: "absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden", children: [_jsx("button", { onClick: () => { onPayslip(); setOpen(false); }, className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700", children: "\uD83D\uDCC4 Boleta de pago" }), item.status === "draft" && (_jsx("button", { onClick: () => { onAdjust(); setOpen(false); }, className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-emerald-700", children: "\u270F\uFE0F Ajustar importes" }))] }))] }));
}
function renderPieLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
    if (percent < 0.05)
        return null;
    const RADIAN = Math.PI / 180;
    const r = outerRadius + 18;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (_jsxs("text", { x: x, y: y, fontSize: 10, fill: "#475569", textAnchor: x > cx ? "start" : "end", dominantBaseline: "central", children: [name, " (", (percent * 100).toFixed(0), "%)"] }));
}
// ─── Main page ───────────────────────────────────────────────────────────────
export function PaginaPlanilla() {
    const queryClient = useQueryClient();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [search, setSearch] = useState("");
    const [areaId, setAreaId] = useState("");
    const [pageNumber, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [adjustItem, setAdjustItem] = useState(null);
    const [bankFileOpen, setBankFileOpen] = useState(false);
    const ok = (msg) => setToast({ type: "success", message: msg });
    const fail = (msg) => setToast({ type: "error", message: msg });
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["payroll"] });
    // ── queries ────────────────────────────────────────────────────────────────
    const catalogsQuery = useQuery({
        queryKey: ["payroll-catalogs"],
        queryFn: getPayrollCatalogs,
    });
    const bankFormatsQuery = useQuery({
        queryKey: ["payroll-bank-formats"],
        queryFn: getBankFormats,
        staleTime: Infinity,
    });
    const baseQuery = { year, month, search: "", employeeId: "", areaId: "", startDate: "", endDate: "" };
    const kpiQuery = useQuery({
        queryKey: ["payroll", "kpi", year, month],
        queryFn: () => getPayroll({ ...baseQuery, pageNumber: 1, pageSize: KPI_PAGE_SIZE }),
    });
    const listQuery = useQuery({
        queryKey: ["payroll", "list", year, month, search, areaId, pageNumber, pageSize],
        queryFn: () => getPayroll({ ...baseQuery, search, areaId, pageNumber, pageSize }),
        placeholderData: (prev) => prev,
    });
    // ── kpi memos ──────────────────────────────────────────────────────────────
    const kpiItems = kpiQuery.data?.items ?? [];
    const kpis = useMemo(() => {
        const total = kpiItems.length;
        const neto = kpiItems.reduce((s, r) => s + r.netPay, 0);
        const draft = kpiItems.filter((r) => r.status === "draft").length;
        const approved = kpiItems.filter((r) => r.status === "approved").length;
        const paid = kpiItems.filter((r) => r.status === "paid").length;
        return { total, neto, draft, approved, paid };
    }, [kpiItems]);
    const areaDistribution = useMemo(() => {
        const map = new Map();
        for (const r of kpiItems) {
            map.set(r.area, (map.get(r.area) ?? 0) + r.netPay);
        }
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [kpiItems]);
    // ── mutations ─────────────────────────────────────────────────────────────
    const generateMutation = useMutation({
        mutationFn: generatePayroll,
        onSuccess: async (res) => {
            await invalidate();
            ok(`✓ Generados: ${res.generatedCount}, actualizados: ${res.updatedCount}.`);
            setGenerateOpen(false);
        },
        onError: () => fail("No se pudo generar la planilla."),
    });
    const adjustMutation = useMutation({
        mutationFn: ({ id, bonuses, deductions, notes }) => updatePayrollAdjustments(id, { bonuses, deductions, notes }),
        onSuccess: async () => {
            await invalidate();
            ok("Ajuste guardado correctamente.");
            setAdjustItem(null);
        },
        onError: () => fail("No se pudo guardar el ajuste."),
    });
    const approveMutation = useMutation({
        mutationFn: () => approvePayroll(year, month),
        onSuccess: async (res) => { await invalidate(); ok(`✓ ${res.approvedCount} registros aprobados.`); },
        onError: () => fail("No se pudo aprobar la planilla."),
    });
    const unapproveMutation = useMutation({
        mutationFn: () => unapprovePayroll(year, month),
        onSuccess: async (res) => { await invalidate(); ok(`✓ ${res.unapprovedCount} registros revertidos a borrador.`); },
        onError: () => fail("No se pudo revertir la aprobación."),
    });
    const paidMutation = useMutation({
        mutationFn: () => markPayrollPaid(year, month),
        onSuccess: async (res) => { await invalidate(); ok(`✓ ${res.paidCount} registros marcados como pagados.`); },
        onError: () => fail("No se pudo marcar como pagado."),
    });
    // ── export ────────────────────────────────────────────────────────────────
    async function handleExport(format) {
        try {
            const result = await getPayroll({ ...baseQuery, search, areaId, pageNumber: 1, pageSize: 9999 });
            if (!result.items.length) {
                fail("No hay registros para exportar.");
                return;
            }
            const rows = result.items.map((r) => ({
                "Código": r.employeeCode,
                "Colaborador": r.employeeName,
                "Área": r.area,
                "Salario base": r.baseSalary,
                "Bonif. automáticas": r.automaticBonuses,
                "Bonif. manuales": r.bonuses,
                "Desc. automáticos": r.automaticDeductions,
                "Desc. incidencias": r.incidentDeductions,
                "Desc. préstamos": r.loanDeductions,
                "Desc. manuales": r.manualDeductions,
                "Neto": r.netPay,
                "Estado": STATUS[r.status]?.label ?? r.status,
            }));
            exportRows(format, rows, makeFileName("Planilla", [year, padMonth(month)]), "Planilla de nómina", {
                period: `${monthLabel(month)} ${year}`,
                subtitle: "Detalle de haberes y descuentos por colaborador.",
                filters: [
                    { label: "Año", value: year },
                    { label: "Mes", value: monthLabel(month) },
                    { label: "Búsqueda", value: search || "—" },
                    { label: "Área", value: catalogsQuery.data?.areas?.find((a) => a.id === areaId)?.name ?? "Todas" },
                ],
                metrics: [
                    { label: "Colaboradores", value: result.items.length },
                    { label: "Total neto", value: fmtCurrency(result.items.reduce((s, r) => s + r.netPay, 0)) },
                    { label: "Borradores", value: result.items.filter((r) => r.status === "draft").length },
                    { label: "Aprobados", value: result.items.filter((r) => r.status === "approved").length },
                    { label: "Pagados", value: result.items.filter((r) => r.status === "paid").length },
                ],
            });
        }
        catch {
            fail("No se pudo exportar.");
        }
    }
    function handleBulkDownload() {
        downloadBulkPayslips(year, month)
            .then((blob) => blobDownload(blob, `boletas_${year}_${padMonth(month)}.zip`))
            .catch(() => fail("No se pudo descargar las boletas."));
    }
    function handlePayslip(id, name) {
        downloadPayslip(id)
            .then((blob) => blobDownload(blob, `boleta_${name.replace(/\s+/g, "_")}_${year}_${padMonth(month)}.pdf`))
            .catch(() => fail("No se pudo descargar la boleta."));
    }
    // ── list data ─────────────────────────────────────────────────────────────
    const rows = listQuery.data?.items ?? [];
    const total = listQuery.data?.totalCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    function changePeriod(y, m) { setYear(y); setMonth(m); setPage(1); }
    function prevMonth() {
        if (month === 1)
            changePeriod(year - 1, 12);
        else
            changePeriod(year, month - 1);
    }
    function nextMonth() {
        if (month === 12)
            changePeriod(year + 1, 1);
        else
            changePeriod(year, month + 1);
    }
    // ─────────────────────────────────────────────────────────────────────────
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx(Toast, { toast: toast, onClose: () => setToast(null) }), _jsx(ConfirmDialog, { state: confirm, onClose: () => setConfirm(null) }), _jsx("div", { className: "bg-white border-b border-slate-100 px-6 py-5", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "Planilla" }), _jsxs("p", { className: "text-sm text-slate-500 mt-0.5", children: ["N\u00F3mina mensual \u00B7 ", monthLabel(month), " ", year] })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(ExportDropdown, { onExport: handleExport, onBankFile: () => setBankFileOpen(true), onBulkPayslips: handleBulkDownload }), _jsx("button", { onClick: () => setGenerateOpen(true), className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors", children: "\u26A1 Generar planilla" })] })] }) }), _jsxs("div", { className: "px-6 py-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4", children: [_jsx(KpiCard, { label: "Colaboradores", value: kpis.total.toLocaleString("es-PE"), sub: `${monthLabel(month)} ${year}`, icon: "\uD83D\uDC65", accent: "bg-emerald-100" }), _jsx(KpiCard, { label: "Total neto", value: fmtCurrency(kpis.neto), sub: "Per\u00EDodo completo", icon: "\uD83D\uDCB0", accent: "bg-emerald-100" }), _jsx(KpiCard, { label: "Borradores", value: kpis.draft.toLocaleString("es-PE"), sub: "Pendientes de aprobar", icon: "\u270F\uFE0F", accent: "bg-slate-100" }), _jsx(KpiCard, { label: "Aprobados", value: kpis.approved.toLocaleString("es-PE"), sub: "Listos para pagar", icon: "\u2705", accent: "bg-emerald-100" }), _jsx(KpiCard, { label: "Pagados", value: kpis.paid.toLocaleString("es-PE"), sub: "Completados", icon: "\uD83C\uDFE6", accent: "bg-emerald-100" })] }), _jsx("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-4", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("button", { onClick: prevMonth, className: "w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors", children: "\u2039" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("select", { value: month, onChange: (e) => changePeriod(year, Number(e.target.value)), className: "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: MONTHS.map((m, i) => _jsx("option", { value: i + 1, children: m }, i + 1)) }), _jsx("select", { value: year, onChange: (e) => changePeriod(Number(e.target.value), month), className: "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: YEARS.map((y) => _jsx("option", { value: y, children: y }, y)) })] }), _jsx("button", { onClick: nextMonth, className: "w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors", children: "\u203A" })] }), _jsxs("div", { className: "flex-1 flex gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm", children: "\uD83D\uDD0D" }), _jsx("input", { value: search, onChange: (e) => { setSearch(e.target.value); setPage(1); }, placeholder: "Buscar colaborador...", className: "w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" }), search && (_jsx("button", { onClick: () => { setSearch(""); setPage(1); }, className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600", children: "\u00D7" }))] }), _jsxs("select", { value: areaId, onChange: (e) => { setAreaId(e.target.value); setPage(1); }, className: "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: [_jsx("option", { value: "", children: "Todas las \u00E1reas" }), catalogsQuery.data?.areas?.map((a) => _jsx("option", { value: a.id, children: a.name }, a.id))] })] }), _jsx("select", { value: pageSize, onChange: (e) => { setPageSize(Number(e.target.value)); setPage(1); }, className: "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shrink-0", children: PAGE_SIZES.map((s) => _jsxs("option", { value: s, children: [s, " por p\u00E1g."] }, s)) })] }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mr-1", children: "Acciones masivas:" }), _jsxs("button", { disabled: approveMutation.isPending || kpis.draft === 0, onClick: () => setConfirm({
                                    title: "Aprobar planilla",
                                    message: `¿Aprobar los ${kpis.draft} registros en borrador de ${monthLabel(month)} ${year}? Esta acción bloquea ediciones.`,
                                    onConfirm: () => approveMutation.mutate(),
                                }), className: "flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-40 transition-colors", children: [approveMutation.isPending
                                        ? _jsx("span", { className: "w-3.5 h-3.5 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" })
                                        : "✅", " Aprobar todos"] }), _jsx("button", { disabled: unapproveMutation.isPending || kpis.approved === 0, onClick: () => setConfirm({
                                    title: "Revertir aprobación",
                                    message: `¿Revertir los ${kpis.approved} registros aprobados de ${monthLabel(month)} ${year} a borrador?`,
                                    danger: true,
                                    onConfirm: () => unapproveMutation.mutate(),
                                }), className: "flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 disabled:opacity-40 transition-colors", children: "\u21A9 Revertir aprobaci\u00F3n" }), _jsxs("button", { disabled: paidMutation.isPending || kpis.approved === 0, onClick: () => setConfirm({
                                    title: "Marcar como pagados",
                                    message: `¿Marcar los ${kpis.approved} registros aprobados de ${monthLabel(month)} ${year} como pagados? Esta acción es irreversible.`,
                                    danger: true,
                                    onConfirm: () => paidMutation.mutate(),
                                }), className: "flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-40 transition-colors", children: [paidMutation.isPending
                                        ? _jsx("span", { className: "w-3.5 h-3.5 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" })
                                        : "🏦", " Marcar pagados"] }), _jsxs("span", { className: "ml-auto text-xs text-slate-400", children: [total, " registros"] })] }), _jsxs("div", { className: "flex gap-6 items-start", children: [_jsxs("div", { className: "flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-50 border-b border-slate-100", children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Colaborador" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Salario base" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Bonificaciones" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Descuentos" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Neto" }), _jsx("th", { className: "px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-50", children: [listQuery.isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-12 text-center", children: _jsx("span", { className: "w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin inline-block" }) }) })), !listQuery.isLoading && rows.length === 0 && (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "px-4 py-12 text-center text-slate-400", children: [_jsx("div", { className: "text-4xl mb-2", children: "\uD83D\uDCCB" }), _jsx("p", { className: "font-medium", children: "Sin registros para este per\u00EDodo" }), _jsx("p", { className: "text-xs mt-1", children: "Genera la planilla para comenzar" })] }) })), rows.map((r, idx) => (_jsxs("tr", { className: `hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`, children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarBg(r.employeeName)}`, children: initials(r.employeeName) }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-900 leading-tight", children: r.employeeName }), _jsxs("p", { className: "text-xs text-slate-400", children: [r.employeeCode, " \u00B7 ", r.area] })] })] }) }), _jsx("td", { className: "px-4 py-3 text-right text-slate-700 font-medium tabular-nums", children: fmtCurrency(r.baseSalary) }), _jsxs("td", { className: "px-4 py-3 text-right text-emerald-600 font-medium tabular-nums", children: ["+", fmtCurrency(r.bonuses + r.automaticBonuses)] }), _jsxs("td", { className: "px-4 py-3 text-right text-red-500 font-medium tabular-nums", children: ["\u2212", fmtCurrency(r.deductions)] }), _jsx("td", { className: "px-4 py-3 text-right font-bold text-slate-900 tabular-nums", children: fmtCurrency(r.netPay) }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsx(StatusBadge, { status: r.status }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx(RowActionsMenu, { item: r, onPayslip: () => handlePayslip(r.id, r.employeeName), onAdjust: () => setAdjustItem(r) }) })] }, r.id)))] }), rows.length > 0 && (_jsx("tfoot", { children: _jsxs("tr", { className: "bg-emerald-50 border-t-2 border-emerald-100", children: [_jsx("td", { className: "px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide", children: "Total p\u00E1gina" }), _jsx("td", { className: "px-4 py-3 text-right text-xs font-bold text-slate-700 tabular-nums", children: fmtCurrency(rows.reduce((s, r) => s + r.baseSalary, 0)) }), _jsxs("td", { className: "px-4 py-3 text-right text-xs font-bold text-emerald-600 tabular-nums", children: ["+", fmtCurrency(rows.reduce((s, r) => s + r.bonuses + r.automaticBonuses, 0))] }), _jsxs("td", { className: "px-4 py-3 text-right text-xs font-bold text-red-500 tabular-nums", children: ["\u2212", fmtCurrency(rows.reduce((s, r) => s + r.deductions, 0))] }), _jsx("td", { className: "px-4 py-3 text-right text-sm font-bold text-emerald-900 tabular-nums", children: fmtCurrency(rows.reduce((s, r) => s + r.netPay, 0)) }), _jsx("td", { colSpan: 2 })] }) }))] }) }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50", children: [_jsxs("span", { className: "text-xs text-slate-500", children: ["Mostrando ", rows.length, " de ", total, " registros"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { disabled: pageNumber <= 1, onClick: () => setPage((p) => Math.max(1, p - 1)), className: "w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors", children: "\u2039" }), Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        const p = Math.max(1, Math.min(totalPages - 4, pageNumber - 2)) + i;
                                                        return (_jsx("button", { onClick: () => setPage(p), className: `w-8 h-8 rounded-lg border text-sm transition-colors ${p === pageNumber
                                                                ? "border-emerald-500 bg-emerald-600 text-white font-semibold"
                                                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"}`, children: p }, p));
                                                    }), _jsx("button", { disabled: pageNumber >= totalPages, onClick: () => setPage((p) => Math.min(totalPages, p + 1)), className: "w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors", children: "\u203A" })] })] })] }), _jsxs("div", { className: "w-72 shrink-0 hidden xl:flex flex-col gap-4", children: [_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Resumen del per\u00EDodo" }), _jsx("div", { className: "space-y-3", children: [
                                                    { label: "Colaboradores", value: kpis.total.toString(), color: "text-slate-900" },
                                                    { label: "Total bruto", value: fmtCurrency(kpiItems.reduce((s, r) => s + r.grossIncome, 0)), color: "text-slate-900" },
                                                    { label: "Total descuentos", value: fmtCurrency(kpiItems.reduce((s, r) => s + r.deductions, 0)), color: "text-red-600" },
                                                    { label: "Total neto", value: fmtCurrency(kpis.neto), color: "text-emerald-700 font-bold" },
                                                ].map(({ label, value, color }) => (_jsxs("div", { className: "flex justify-between items-center py-1.5 border-b border-slate-50", children: [_jsx("span", { className: "text-xs text-slate-500", children: label }), _jsx("span", { className: `text-sm ${color}`, children: value })] }, label))) }), _jsx("div", { className: "mt-4 space-y-2", children: ["draft", "approved", "paid"].map((s) => {
                                                    const count = kpis[s === "draft" ? "draft" : s === "approved" ? "approved" : "paid"];
                                                    const pct = kpis.total > 0 ? (count / kpis.total) * 100 : 0;
                                                    const sc = STATUS[s];
                                                    return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-xs mb-1", children: [_jsx("span", { className: sc.text, children: sc.label }), _jsx("span", { className: "text-slate-500", children: count })] }), _jsx("div", { className: "h-1.5 rounded-full bg-slate-100 overflow-hidden", children: _jsx("div", { className: `h-full rounded-full ${sc.dot} transition-all`, style: { width: `${pct}%` } }) })] }, s));
                                                }) })] }), areaDistribution.length > 0 && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Distribuci\u00F3n por \u00E1rea" }), _jsx("div", { style: { height: 200 }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: areaDistribution, cx: "50%", cy: "50%", outerRadius: 70, dataKey: "value", labelLine: false, label: renderPieLabel, children: areaDistribution.map((_, i) => (_jsx(Cell, { fill: PIE_COLORS[i % PIE_COLORS.length] }, i))) }), _jsx(Tooltip, { formatter: (val) => [fmtCurrency(val), "Neto"], contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" } })] }) }) }), _jsx("div", { className: "mt-3 space-y-1.5 max-h-32 overflow-y-auto", children: areaDistribution.map((d, i) => (_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full flex-shrink-0", style: { background: PIE_COLORS[i % PIE_COLORS.length] } }), _jsx("span", { className: "text-slate-600 truncate flex-1", children: d.name }), _jsx("span", { className: "text-slate-900 font-medium tabular-nums", children: fmtCurrency(d.value) })] }, d.name))) })] }))] })] })] }), _jsx(GenerarPlanillaModal, { open: generateOpen, year: year, month: month, employees: catalogsQuery.data?.employees ?? [], isPending: generateMutation.isPending, onClose: () => setGenerateOpen(false), onGenerate: (payload) => generateMutation.mutate(payload) }), _jsx(AjustarModal, { item: adjustItem, isPending: adjustMutation.isPending, onClose: () => setAdjustItem(null), onSave: (id, bonuses, deductions, notes) => adjustMutation.mutate({ id, bonuses, deductions, notes }) }), _jsx(BankFileModal, { open: bankFileOpen, year: year, month: month, formats: bankFormatsQuery.data ?? [], onClose: () => setBankFileOpen(false) })] }));
}
