import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName } from "@/components/export/exportUtils";
import { createPayrollConcept, deletePayrollConcept, getPayrollConcepts, updatePayrollConcept, } from "@/modules/payroll/services/payrollConceptsApi";
// ─── constants ───────────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
    { value: "earning", label: "Bonificación", color: "emerald" },
    { value: "deduction", label: "Descuento", color: "red" },
];
const CALC_OPTIONS = [
    { value: "fixed", label: "Monto fijo" },
    { value: "percentage", label: "Porcentaje" },
];
// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtMoney(n) {
    return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function typeBadge(type) {
    if (type === "earning") {
        return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500" }), "Bonificaci\u00F3n"] }));
    }
    return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-500" }), "Descuento"] }));
}
function autoBadge(auto) {
    if (auto) {
        return (_jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700", children: "\u26A1 Autom\u00E1tico" }));
    }
    return (_jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600", children: "\u270B Manual" }));
}
function calcDisplay(c) {
    if (c.fixedAmount != null)
        return fmtMoney(c.fixedAmount);
    if (c.percentage != null)
        return `${c.percentage}%`;
    return "—";
}
function calcMode(c) {
    return c.fixedAmount != null ? "fixed" : "percentage";
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
    return (_jsxs("div", { className: `fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-2xl border max-w-sm animate-in slide-in-from-bottom-4 ${isError ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`, children: [_jsx("span", { className: "text-lg font-bold", children: isError ? "✕" : "✓" }), _jsx("p", { className: "text-sm leading-snug flex-1", children: toast.message }), _jsx("button", { onClick: onClose, className: "opacity-60 hover:opacity-100 text-lg leading-none ml-2", children: "\u00D7" })] }));
}
function ConfirmDialog({ state, onClose }) {
    if (!state)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900", children: state.title }), _jsx("p", { className: "text-sm text-slate-600 leading-relaxed", children: state.message }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors", children: "Cancelar" }), _jsx("button", { onClick: () => { state.onConfirm(); onClose(); }, className: `px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`, children: "Confirmar" })] })] }) }));
}
// ─── KpiCard ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent }) {
    return (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4", children: [_jsx("div", { className: `w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`, children: icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: label }), _jsx("p", { className: "text-2xl font-bold text-slate-900 leading-tight mt-0.5", children: value }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: sub })] })] }));
}
// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
    return (_jsx("button", { type: "button", role: "switch", "aria-checked": checked, disabled: disabled, onClick: () => onChange(!checked), className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${checked ? "bg-emerald-500" : "bg-slate-200"}`, children: _jsx("span", { className: `inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}` }) }));
}
function validateForm(form, isNew) {
    const errors = {};
    if (isNew) {
        if (!form.code.trim())
            errors.code = "El código es obligatorio.";
        else if (!/^[A-Za-z0-9_\-]+$/.test(form.code.trim()))
            errors.code = "Solo letras, números, guiones o guiones bajos.";
    }
    if (!form.name.trim())
        errors.name = "El nombre es obligatorio.";
    else if (form.name.trim().length < 3)
        errors.name = "Mínimo 3 caracteres.";
    if (!form.type)
        errors.type = "Selecciona un tipo.";
    if (form.calcMode === "fixed") {
        if (form.fixedAmount === "" || form.fixedAmount === null)
            errors.fixedAmount = "El monto es obligatorio.";
        else if (Number(form.fixedAmount) <= 0)
            errors.fixedAmount = "El monto debe ser mayor a 0.";
    }
    if (form.calcMode === "percentage") {
        if (form.percentage === "" || form.percentage === null)
            errors.percentage = "El porcentaje es obligatorio.";
        else if (Number(form.percentage) <= 0 || Number(form.percentage) > 100)
            errors.percentage = "Debe estar entre 0.01 y 100.";
    }
    return errors;
}
function blankForm() {
    return {
        code: "", name: "", type: "earning", calcMode: "fixed",
        fixedAmount: "", percentage: "", isAutomatic: false, isActive: true, description: "",
    };
}
function conceptToForm(c) {
    return {
        code: c.code,
        name: c.name,
        type: c.type,
        calcMode: c.fixedAmount != null ? "fixed" : "percentage",
        fixedAmount: c.fixedAmount != null ? String(c.fixedAmount) : "",
        percentage: c.percentage != null ? String(c.percentage) : "",
        isAutomatic: c.isAutomatic,
        isActive: c.isActive,
        description: c.description ?? "",
    };
}
function formToCreate(f) {
    return {
        code: f.code.trim(),
        name: f.name.trim(),
        type: f.type,
        fixedAmount: f.calcMode === "fixed" && f.fixedAmount ? Number(f.fixedAmount) : null,
        percentage: f.calcMode === "percentage" && f.percentage ? Number(f.percentage) : null,
        isAutomatic: f.isAutomatic,
        description: f.description.trim() || null,
    };
}
function formToUpdate(f) {
    return {
        name: f.name.trim(),
        type: f.type,
        fixedAmount: f.calcMode === "fixed" && f.fixedAmount ? Number(f.fixedAmount) : null,
        percentage: f.calcMode === "percentage" && f.percentage ? Number(f.percentage) : null,
        isAutomatic: f.isAutomatic,
        isActive: f.isActive,
        description: f.description.trim() || null,
    };
}
function ConceptModal({ open, isNew, isPending, errors, form, onChange, onClose, onSave }) {
    if (!open)
        return null;
    const typeLabel = form.type === "earning" ? "Bonificación" : "Descuento";
    const calcLabel = form.calcMode === "fixed"
        ? (form.fixedAmount ? fmtMoney(Number(form.fixedAmount)) : "—")
        : (form.percentage ? `${form.percentage}%` : "—");
    const exampleLine = form.type === "earning"
        ? `+${form.calcMode === "fixed" ? (form.fixedAmount ? fmtMoney(Number(form.fixedAmount)) : "—") : (form.percentage ? `${form.percentage}%` : "—")}`
        : `-${form.calcMode === "fixed" ? (form.fixedAmount ? fmtMoney(Number(form.fixedAmount)) : "—") : (form.percentage ? `${form.percentage}%` : "—")}`;
    const showDeactivateWarning = !isNew && !form.isActive;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]", children: [_jsx("div", { className: "bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex-shrink-0", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0", children: isNew ? "➕" : "✏️" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: isNew ? "Nuevo concepto" : "Editar concepto" }), _jsx("p", { className: "text-sm text-emerald-100 mt-0.5", children: "Configura bonificaciones, descuentos y reglas de aplicaci\u00F3n para la planilla." })] })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0", children: "\u00D7" })] }) }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-5", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold", children: "1" }), "Identificaci\u00F3n"] }), _jsxs("div", { className: "space-y-3", children: [isNew && (_jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["C\u00F3digo ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { value: form.code, onChange: (e) => onChange({ code: e.target.value.toUpperCase() }), placeholder: "Ej: BOND-001", className: `w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.code ? "border-red-400 bg-red-50" : "border-slate-200"}` }), errors.code && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.code })] })), !isNew && (_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200", children: [_jsx("span", { className: "text-xs text-slate-500", children: "C\u00F3digo:" }), _jsx("span", { className: "text-sm font-mono font-bold text-slate-800", children: form.code }), _jsx("span", { className: "text-xs text-slate-400 ml-auto", children: "Solo lectura" })] })), _jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["Nombre ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { value: form.name, onChange: (e) => onChange({ name: e.target.value }), placeholder: "Ej: Asignaci\u00F3n familiar", className: `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.name ? "border-red-400 bg-red-50" : "border-slate-200"}` }), errors.name && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.name })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-2", children: ["Tipo ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("div", { className: "flex gap-2", children: TYPE_OPTIONS.map((opt) => (_jsxs("button", { type: "button", onClick: () => onChange({ type: opt.value }), className: `flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.type === opt.value
                                                                    ? opt.value === "earning"
                                                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                                        : "border-red-500 bg-red-50 text-red-700"
                                                                    : "border-slate-200 text-slate-600 hover:border-slate-300"}`, children: [opt.value === "earning" ? "🟢" : "🔴", " ", opt.label] }, opt.value))) }), errors.type && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.type })] })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold", children: "2" }), "Modo de c\u00E1lculo"] }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex gap-2", children: CALC_OPTIONS.map((opt) => (_jsxs("button", { type: "button", onClick: () => onChange({ calcMode: opt.value, fixedAmount: "", percentage: "" }), className: `flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.calcMode === opt.value
                                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                            : "border-slate-200 text-slate-600 hover:border-slate-300"}`, children: [opt.value === "fixed" ? "💵" : "📊", " ", opt.label] }, opt.value))) }), form.calcMode === "fixed" && (_jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["Monto fijo (S/) ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400", children: "S/" }), _jsx("input", { type: "number", min: "0.01", step: "0.01", value: form.fixedAmount ?? "", onChange: (e) => onChange({ fixedAmount: e.target.value }), placeholder: "0.00", className: `w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.fixedAmount ? "border-red-400 bg-red-50" : "border-slate-200"}` })] }), errors.fixedAmount && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.fixedAmount })] })), form.calcMode === "percentage" && (_jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["Porcentaje (%) ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "number", min: "0.01", max: "100", step: "0.01", value: form.percentage ?? "", onChange: (e) => onChange({ percentage: e.target.value }), placeholder: "0.00", className: `w-full rounded-lg border pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.percentage ? "border-red-400 bg-red-50" : "border-slate-200"}` }), _jsx("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400", children: "%" })] }), errors.percentage && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.percentage })] }))] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold", children: "3" }), "Comportamiento"] }), _jsxs("div", { className: "bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-800", children: "C\u00E1lculo autom\u00E1tico" }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: "Se aplica sin intervenci\u00F3n manual en cada planilla" })] }), _jsx(Toggle, { checked: form.isAutomatic, onChange: (v) => onChange({ isAutomatic: v }) })] }), !isNew && (_jsxs("div", { className: "flex items-center justify-between px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-800", children: "Concepto activo" }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: "Los conceptos inactivos no se incluyen en planilla" })] }), _jsx(Toggle, { checked: form.isActive, onChange: (v) => onChange({ isActive: v }) })] }))] }), showDeactivateWarning && (_jsxs("div", { className: "mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5", children: [_jsx("span", { className: "text-amber-500 text-sm mt-0.5", children: "\u26A0\uFE0F" }), _jsx("p", { className: "text-xs text-amber-700 leading-snug", children: "Al desactivar este concepto quedar\u00E1 excluido del c\u00E1lculo de futuras planillas. Los registros hist\u00F3ricos no se ven afectados." })] }))] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold", children: "4" }), "Descripci\u00F3n"] }), _jsx("textarea", { value: form.description, onChange: (e) => onChange({ description: e.target.value }), rows: 3, placeholder: "Describe la regla de negocio o condici\u00F3n de aplicaci\u00F3n de este concepto...", className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-slate-700" })] })] }), _jsxs("div", { className: "w-56 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 flex flex-col overflow-y-auto hidden sm:flex", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Vista previa" }), _jsxs("div", { className: "space-y-2.5 flex-1", children: [_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "C\u00F3digo" }), _jsx("p", { className: "font-mono font-bold text-slate-900 text-sm mt-0.5 truncate", children: form.code || "—" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Nombre" }), _jsx("p", { className: "font-semibold text-slate-900 text-sm mt-0.5 leading-tight", children: form.name || "—" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400 mb-1.5", children: "Tipo" }), typeBadge(form.type)] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "C\u00E1lculo" }), _jsx("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: calcLabel }), _jsx("p", { className: "text-xs text-slate-400", children: form.calcMode === "fixed" ? "Monto fijo" : "Porcentaje" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Autom\u00E1tico" }), _jsx("span", { className: `text-xs font-bold ${form.isAutomatic ? "text-amber-600" : "text-slate-500"}`, children: form.isAutomatic ? "⚡ Sí" : "✋ No" })] }), !isNew && (_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Estado" }), _jsx("span", { className: `text-xs font-bold ${form.isActive ? "text-emerald-600" : "text-slate-400"}`, children: form.isActive ? "● Activo" : "○ Inactivo" })] }))] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-slate-200", children: [_jsx("p", { className: "text-xs text-slate-500 mb-2 font-semibold", children: "Ejemplo de aplicaci\u00F3n" }), _jsxs("div", { className: "bg-white rounded-lg border border-slate-200 p-3 text-xs space-y-1", children: [_jsx("div", { className: "flex justify-between text-slate-600", children: _jsx("span", { children: "Empleado ejemplo" }) }), _jsxs("div", { className: "flex justify-between font-bold", children: [_jsx("span", { className: form.type === "earning" ? "text-emerald-700" : "text-red-600", children: form.name || typeLabel }), _jsx("span", { className: form.type === "earning" ? "text-emerald-700" : "text-red-600", children: exampleLine })] })] })] })] })] }), _jsxs("div", { className: "px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors", children: "Cancelar" }), _jsxs("button", { disabled: isPending, onClick: onSave, className: "px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2", children: [isPending && _jsx("span", { className: "w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" }), isPending ? "Guardando..." : (isNew ? "Crear concepto" : "Guardar cambios")] })] })] }) }));
}
// ─── RowMenu ──────────────────────────────────────────────────────────────────
function RowMenu({ onEdit, onDelete }) {
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
    return (_jsxs("div", { className: "relative", ref: ref, children: [_jsx("button", { onClick: () => setOpen((v) => !v), className: "w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors", children: "\u2022\u2022\u2022" }), open && (_jsxs("div", { className: "absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden", children: [_jsx("button", { onClick: () => { onEdit(); setOpen(false); }, className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors", children: "\u270F\uFE0F Editar" }), _jsx("button", { onClick: () => { onDelete(); setOpen(false); }, className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors", children: "\uD83D\uDDD1\uFE0F Eliminar" })] }))] }));
}
function renderPieLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
    if (percent < 0.08)
        return null;
    const R = Math.PI / 180;
    const r = outerRadius + 14;
    const x = cx + r * Math.cos(-midAngle * R);
    const y = cy + r * Math.sin(-midAngle * R);
    return (_jsxs("text", { x: x, y: y, fontSize: 10, fill: "#475569", textAnchor: x > cx ? "start" : "end", dominantBaseline: "central", children: [name, " (", (percent * 100).toFixed(0), "%)"] }));
}
// ─── Main page ────────────────────────────────────────────────────────────────
export function PaginaConceptosPlanilla() {
    const queryClient = useQueryClient();
    // ── UI state ──
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [modalOpen, setModal] = useState(false);
    const [isNew, setIsNew] = useState(true);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(blankForm());
    const [errors, setErrors] = useState({});
    // ── Filters ──
    const [search, setSearch] = useState("");
    const [typeFilter, setType] = useState("");
    const [stateFilter, setState] = useState("");
    const [modeFilter, setMode] = useState("");
    const ok = (msg) => setToast({ type: "success", message: msg });
    const fail = (msg) => setToast({ type: "error", message: msg });
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["payroll-concepts"] });
    // ── Query ──
    const listQuery = useQuery({ queryKey: ["payroll-concepts"], queryFn: getPayrollConcepts });
    const all = listQuery.data ?? [];
    // ── KPIs ──
    const kpis = useMemo(() => ({
        active: all.filter((r) => r.isActive).length,
        earnings: all.filter((r) => r.type === "earning").length,
        deductions: all.filter((r) => r.type === "deduction").length,
        automatic: all.filter((r) => r.isAutomatic).length,
    }), [all]);
    // ── Pie data ──
    const pieData = useMemo(() => [
        { name: "Bonificaciones", value: kpis.earnings },
        { name: "Descuentos", value: kpis.deductions },
    ].filter((d) => d.value > 0), [kpis]);
    // ── Filtered rows ──
    const rows = useMemo(() => {
        let list = all;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
        }
        if (typeFilter)
            list = list.filter((r) => r.type === typeFilter);
        if (stateFilter)
            list = list.filter((r) => stateFilter === "active" ? r.isActive : !r.isActive);
        if (modeFilter)
            list = list.filter((r) => modeFilter === "automatic" ? r.isAutomatic : !r.isAutomatic);
        return list;
    }, [all, search, typeFilter, stateFilter, modeFilter]);
    const autoList = useMemo(() => all.filter((r) => r.isAutomatic && r.isActive), [all]);
    // ── Mutations ──
    const saveMutation = useMutation({
        mutationFn: () => {
            if (isNew)
                return createPayrollConcept(formToCreate(form));
            return updatePayrollConcept(editId, formToUpdate(form));
        },
        onSuccess: async () => {
            await invalidate();
            ok(isNew ? "✓ Concepto creado correctamente." : "✓ Concepto actualizado.");
            setModal(false);
        },
        onError: () => fail("No se pudo guardar el concepto. Verifica que el código no esté duplicado."),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deletePayrollConcept(id),
        onSuccess: async () => { await invalidate(); ok("Concepto eliminado."); },
        onError: () => fail("No se pudo eliminar el concepto."),
    });
    const toggleActiveMutation = useMutation({
        mutationFn: ({ concept, active }) => updatePayrollConcept(concept.id, {
            name: concept.name, type: concept.type,
            fixedAmount: concept.fixedAmount, percentage: concept.percentage,
            isAutomatic: concept.isAutomatic, isActive: active,
            description: concept.description,
        }),
        onSuccess: async (_, { active }) => {
            await invalidate();
            ok(active ? "Concepto activado." : "Concepto desactivado.");
        },
        onError: () => fail("No se pudo cambiar el estado."),
    });
    // ── Modal helpers ──
    function openNew() { setForm(blankForm()); setErrors({}); setIsNew(true); setEditId(null); setModal(true); }
    function openEdit(c) { setForm(conceptToForm(c)); setErrors({}); setIsNew(false); setEditId(c.id); setModal(true); }
    function handleSave() {
        const errs = validateForm(form, isNew);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        saveMutation.mutate();
    }
    function handleFormChange(patch) {
        setForm((f) => ({ ...f, ...patch }));
        setErrors((e) => {
            const next = { ...e };
            Object.keys(patch).forEach((k) => delete next[k]);
            return next;
        });
    }
    function clearFilters() { setSearch(""); setType(""); setState(""); setMode(""); }
    const hasFilters = !!(search || typeFilter || stateFilter || modeFilter);
    // ── Export ──
    function handleExport(format) {
        if (!rows.length) {
            fail("No hay conceptos para exportar con los filtros actuales.");
            return;
        }
        const data = rows.map((r) => ({
            "Código": r.code,
            "Nombre": r.name,
            "Tipo": r.type === "earning" ? "Bonificación" : "Descuento",
            "Monto fijo": r.fixedAmount != null ? fmtMoney(r.fixedAmount) : "—",
            "Porcentaje": r.percentage != null ? `${r.percentage}%` : "—",
            "Automático": r.isAutomatic ? "Sí" : "No",
            "Activo": r.isActive ? "Sí" : "No",
            "Descripción": r.description ?? "",
        }));
        exportRows(format, data, makeFileName("Conceptos-Planilla"), "Conceptos de planilla", {
            subtitle: "Catálogo de bonificaciones, descuentos y conceptos automáticos.",
            period: "Configuración vigente",
            filters: [
                { label: "Tipo", value: typeFilter === "earning" ? "Bonificación" : typeFilter === "deduction" ? "Descuento" : "Todos" },
                { label: "Estado", value: stateFilter === "active" ? "Activos" : stateFilter === "inactive" ? "Inactivos" : "Todos" },
                { label: "Modo", value: modeFilter === "automatic" ? "Automáticos" : modeFilter === "manual" ? "Manuales" : "Todos" },
                { label: "Búsqueda", value: search || "—" },
            ],
            metrics: [
                { label: "Total", value: rows.length },
                { label: "Bonificaciones", value: kpis.earnings },
                { label: "Descuentos", value: kpis.deductions },
                { label: "Automáticos", value: kpis.automatic },
            ],
        });
    }
    // ─────────────────────────────────────────────────────────────────────────
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx(Toast, { toast: toast, onClose: () => setToast(null) }), _jsx(ConfirmDialog, { state: confirm, onClose: () => setConfirm(null) }), _jsx("div", { className: "bg-white border-b border-slate-100 px-6 py-5", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3.5", children: [_jsx("div", { className: "w-11 h-11 rounded-xl bg-emerald-500 shadow-sm shadow-emerald-500/30 flex items-center justify-center text-white text-xl flex-shrink-0", children: "\uD83D\uDCCB" }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "Conceptos de planilla" }), _jsx("p", { className: "text-sm text-slate-500 mt-0.5", children: "Configuraci\u00F3n de bonificaciones, descuentos y reglas autom\u00E1ticas" })] })] }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [_jsx(ExportMenu, { fileName: makeFileName("Conceptos-Planilla"), filtersActive: hasFilters, resultCount: rows.length, onExport: handleExport }), _jsx("button", { onClick: openNew, className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors", children: "\u2795 Nuevo concepto" })] })] }) }), _jsxs("div", { className: "px-6 py-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(KpiCard, { label: "Activos", value: kpis.active, sub: "Conceptos en uso", icon: "\u2705", accent: "bg-emerald-100" }), _jsx(KpiCard, { label: "Bonificaciones", value: kpis.earnings, sub: "Tipos de ingreso", icon: "\uD83D\uDFE2", accent: "bg-blue-100" }), _jsx(KpiCard, { label: "Descuentos", value: kpis.deductions, sub: "Tipos de descuento", icon: "\uD83D\uDD34", accent: "bg-red-100" }), _jsx(KpiCard, { label: "Autom\u00E1ticos", value: kpis.automatic, sub: "Se aplican sin acci\u00F3n", icon: "\u26A1", accent: "bg-amber-100" })] }), _jsx("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-4", children: _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "relative flex-1 min-w-44", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm", children: "\uD83D\uDD0D" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar por c\u00F3digo o nombre...", className: "w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" }), search && (_jsx("button", { onClick: () => setSearch(""), className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none", children: "\u00D7" }))] }), _jsxs("select", { value: typeFilter, onChange: (e) => setType(e.target.value), className: "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: [_jsx("option", { value: "", children: "Todos los tipos" }), _jsx("option", { value: "earning", children: "Bonificaciones" }), _jsx("option", { value: "deduction", children: "Descuentos" })] }), _jsxs("select", { value: stateFilter, onChange: (e) => setState(e.target.value), className: "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "active", children: "Activos" }), _jsx("option", { value: "inactive", children: "Inactivos" })] }), _jsxs("select", { value: modeFilter, onChange: (e) => setMode(e.target.value), className: "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: [_jsx("option", { value: "", children: "Autom\u00E1tico y manual" }), _jsx("option", { value: "automatic", children: "Solo autom\u00E1ticos" }), _jsx("option", { value: "manual", children: "Solo manuales" })] }), hasFilters && (_jsx("button", { onClick: clearFilters, className: "px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5", children: "\u2715 Limpiar" })), _jsxs("span", { className: "ml-auto text-xs text-slate-400 whitespace-nowrap", children: [rows.length, " resultado", rows.length !== 1 ? "s" : ""] })] }) }), _jsxs("div", { className: "flex gap-6 items-start", children: [_jsx("div", { className: "flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: listQuery.isLoading ? (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx("span", { className: "w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" }) })) : rows.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx("div", { className: "text-5xl mb-3", children: "\uD83D\uDCCB" }), _jsx("p", { className: "text-base font-semibold text-slate-700", children: hasFilters ? "Sin resultados" : "Aún no hay conceptos" }), _jsx("p", { className: "text-sm text-slate-400 mt-1 max-w-xs", children: hasFilters
                                                ? "Prueba con otros filtros o limpia la búsqueda."
                                                : "Crea el primer concepto de bonificación o descuento para comenzar." }), !hasFilters && (_jsx("button", { onClick: openNew, className: "mt-4 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors", children: "\u2795 Crear primer concepto" }))] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-50 border-b border-slate-100", children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider", children: "C\u00F3digo" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Nombre" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "C\u00E1lculo" }), _jsx("th", { className: "px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Modo" }), _jsx("th", { className: "px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Activo" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-50", children: rows.map((r, idx) => (_jsxs("tr", { className: `hover:bg-slate-50 transition-colors group ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`, children: [_jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "inline-block font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg", children: r.code }) }), _jsxs("td", { className: "px-4 py-3 max-w-xs", children: [_jsx("p", { className: "font-semibold text-slate-900 leading-tight truncate", children: r.name }), r.description && (_jsx("p", { className: "text-xs text-slate-400 mt-0.5 truncate", children: r.description }))] }), _jsx("td", { className: "px-4 py-3", children: typeBadge(r.type) }), _jsxs("td", { className: "px-4 py-3 text-right", children: [_jsx("span", { className: `font-semibold tabular-nums ${r.type === "earning" ? "text-emerald-700" : "text-red-600"}`, children: calcDisplay(r) }), _jsx("p", { className: "text-xs text-slate-400", children: calcMode(r) === "fixed" ? "Monto fijo" : "Porcentaje" })] }), _jsx("td", { className: "px-4 py-3 text-center", children: autoBadge(r.isAutomatic) }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsx(Toggle, { checked: r.isActive, disabled: toggleActiveMutation.isPending, onChange: (v) => {
                                                                    if (!v) {
                                                                        setConfirm({
                                                                            title: "Desactivar concepto",
                                                                            message: `¿Desactivar "${r.name}"? Quedará excluido del cálculo de futuras planillas.`,
                                                                            danger: true,
                                                                            onConfirm: () => toggleActiveMutation.mutate({ concept: r, active: false }),
                                                                        });
                                                                    }
                                                                    else {
                                                                        toggleActiveMutation.mutate({ concept: r, active: true });
                                                                    }
                                                                } }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx(RowMenu, { onEdit: () => openEdit(r), onDelete: () => setConfirm({
                                                                    title: "Eliminar concepto",
                                                                    message: `¿Eliminar "${r.name}"? Esta acción no se puede deshacer.`,
                                                                    danger: true,
                                                                    onConfirm: () => deleteMutation.mutate(r.id),
                                                                }) }) })] }, r.id))) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-emerald-50 border-t-2 border-emerald-100", children: [_jsxs("td", { className: "px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide", colSpan: 2, children: [rows.length, " concepto", rows.length !== 1 ? "s" : ""] }), _jsx("td", { className: "px-4 py-3", children: _jsxs("span", { className: "text-xs text-slate-500", children: [rows.filter((r) => r.type === "earning").length, " bonif. \u00B7 ", rows.filter((r) => r.type === "deduction").length, " desc."] }) }), _jsx("td", { colSpan: 4 })] }) })] }) })) }), _jsxs("div", { className: "w-64 flex-shrink-0 hidden xl:flex flex-col gap-4", children: [pieData.length > 0 && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Distribuci\u00F3n" }), _jsx("div", { style: { height: 170 }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsxs(Pie, { data: pieData, cx: "50%", cy: "50%", outerRadius: 60, dataKey: "value", labelLine: false, label: renderPieLabel, children: [_jsx(Cell, { fill: "#10b981" }), _jsx(Cell, { fill: "#ef4444" })] }), _jsx(Tooltip, { formatter: (v) => [`${v} conceptos`, ""], contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" } })] }) }) }), _jsxs("div", { className: "mt-2 space-y-1.5", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" }), _jsx("span", { className: "text-slate-600 flex-1", children: "Bonificaciones" }), _jsx("span", { className: "font-bold text-slate-900", children: kpis.earnings })] }), _jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" }), _jsx("span", { className: "text-slate-600 flex-1", children: "Descuentos" }), _jsx("span", { className: "font-bold text-slate-900", children: kpis.deductions })] })] })] })), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "\u26A1 Autom\u00E1ticos activos" }), autoList.length === 0 ? (_jsx("p", { className: "text-xs text-slate-400 italic", children: "Sin conceptos autom\u00E1ticos activos." })) : (_jsx("div", { className: "space-y-2 max-h-52 overflow-y-auto", children: autoList.map((c) => (_jsxs("div", { className: "flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0", children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${c.type === "earning" ? "bg-emerald-500" : "bg-red-500"}` }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-semibold text-slate-800 truncate", children: c.name }), _jsx("p", { className: "text-xs text-slate-400", children: calcDisplay(c) })] })] }, c.id))) }))] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "Resumen" }), _jsx("div", { className: "space-y-2.5", children: [
                                                    { label: "Total conceptos", value: all.length },
                                                    { label: "Activos", value: kpis.active },
                                                    { label: "Inactivos", value: all.length - kpis.active },
                                                    { label: "Automáticos", value: kpis.automatic },
                                                    { label: "Manuales", value: all.filter((r) => !r.isAutomatic).length },
                                                ].map(({ label, value }) => (_jsxs("div", { className: "flex justify-between items-center py-1 border-b border-slate-50 last:border-0", children: [_jsx("span", { className: "text-xs text-slate-500", children: label }), _jsx("span", { className: "text-sm font-bold text-slate-900", children: value })] }, label))) })] })] })] })] }), _jsx(ConceptModal, { open: modalOpen, isNew: isNew, isPending: saveMutation.isPending, errors: errors, form: form, onChange: handleFormChange, onClose: () => setModal(false), onSave: handleSave })] }));
}
