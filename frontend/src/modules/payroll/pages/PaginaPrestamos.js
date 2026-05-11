import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName } from "@/components/export/exportUtils";
import { cancelPayrollLoan, createPayrollLoan, getPayrollLoanById, getPayrollLoans, registerInstallmentPayment, updatePayrollLoan, } from "@/modules/payroll/services/payrollLoansApi";
import { getPayrollCatalogs } from "@/modules/payroll/services/payrollApi";
// ─── constants ────────────────────────────────────────────────────────────────
const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const PAGE_SIZES = [10, 25, 50];
const KPI_PAGE_SIZE = 9999;
// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtMoney(n) {
    return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMonthYear(year, month) {
    return `${MONTHS[month - 1] ?? month} ${year}`;
}
function fmtDate(iso) {
    if (!iso)
        return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
function initials(name) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function avatarBg(name) {
    const colors = [
        "bg-emerald-500", "bg-teal-500", "bg-blue-500",
        "bg-indigo-500", "bg-cyan-500", "bg-green-500",
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++)
        h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
}
function loanTypeLabel(t) {
    return t === "advance" ? "Adelanto" : "Préstamo";
}
function loanTypeBadge(t) {
    if (t === "advance") {
        return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-purple-500" }), "Adelanto"] }));
    }
    return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-500" }), "Pr\u00E9stamo"] }));
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
    const isErr = toast.type === "error";
    return (_jsxs("div", { className: `fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-2xl border max-w-sm ${isErr ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`, children: [_jsx("span", { className: "text-lg font-bold", children: isErr ? "✕" : "✓" }), _jsx("p", { className: "text-sm leading-snug flex-1", children: toast.message }), _jsx("button", { onClick: onClose, className: "opacity-60 hover:opacity-100 text-lg ml-2", children: "\u00D7" })] }));
}
function ConfirmDialog({ state, onClose }) {
    if (!state)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900", children: state.title }), _jsx("p", { className: "text-sm text-slate-600 leading-relaxed", children: state.message }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors", children: "Cancelar" }), _jsx("button", { onClick: () => { state.onConfirm(); onClose(); }, className: `px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`, children: "Confirmar" })] })] }) }));
}
// ─── KpiCard ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent }) {
    return (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4", children: [_jsx("div", { className: `w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`, children: icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide truncate", children: label }), _jsx("p", { className: "text-xl font-bold text-slate-900 leading-tight mt-0.5", children: value }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: sub })] })] }));
}
// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({ paid, total }) {
    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
    return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex justify-between text-xs text-slate-500", children: [_jsxs("span", { children: [paid, "/", total, " cuotas"] }), _jsxs("span", { className: "font-semibold text-slate-700", children: [pct, "%"] })] }), _jsx("div", { className: "h-1.5 bg-slate-100 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-emerald-500 rounded-full transition-all", style: { width: `${pct}%` } }) })] }));
}
function blankForm() {
    return { employeeId: "", loanType: "loan", totalAmount: "", totalInstallments: "12", startDate: "", notes: "" };
}
function validateForm(f) {
    const e = {};
    if (!f.employeeId)
        e.employeeId = "Selecciona un colaborador.";
    if (!f.totalAmount || Number(f.totalAmount) <= 0)
        e.totalAmount = "El monto debe ser mayor a 0.";
    if (Number(f.totalAmount) > 999999)
        e.totalAmount = "El monto no puede superar S/ 999,999.";
    if (!f.totalInstallments || Number(f.totalInstallments) < 1)
        e.totalInstallments = "Mínimo 1 cuota.";
    if (Number(f.totalInstallments) > 120)
        e.totalInstallments = "Máximo 120 cuotas.";
    if (!f.startDate)
        e.startDate = "La fecha de inicio es obligatoria.";
    return e;
}
function NuevoPrestamoModal({ open, employees, isPending, errors, form, onChange, onClose, onSave }) {
    if (!open)
        return null;
    const monto = Number(form.totalAmount) || 0;
    const cuotas = Number(form.totalInstallments) || 0;
    const cuotaMensual = monto > 0 && cuotas > 0 ? monto / cuotas : 0;
    const selEmployee = employees.find((e) => e.id === form.employeeId);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]", children: [_jsx("div", { className: "bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex-shrink-0", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0", children: "\uD83D\uDCB3" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: "Nuevo pr\u00E9stamo" }), _jsx("p", { className: "text-sm text-emerald-100 mt-0.5", children: "Registra un pr\u00E9stamo o adelanto de planilla para un colaborador." })] })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0", children: "\u00D7" })] }) }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-5", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold", children: "1" }), "Datos del pr\u00E9stamo"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["Colaborador ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("select", { value: form.employeeId, onChange: (e) => onChange({ employeeId: e.target.value }), className: `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${errors.employeeId ? "border-red-400 bg-red-50" : "border-slate-200"}`, children: [_jsx("option", { value: "", children: "\u2014 Seleccionar colaborador \u2014" }), employees.map((e) => _jsx("option", { value: e.id, children: e.label }, e.id))] }), errors.employeeId && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.employeeId })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-2", children: ["Tipo ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("div", { className: "flex gap-2", children: [["loan", "💳", "Préstamo"], ["advance", "⚡", "Adelanto"]].map(([val, icon, label]) => (_jsxs("button", { type: "button", onClick: () => onChange({ loanType: val }), className: `flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.loanType === val
                                                                    ? val === "loan"
                                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                                        : "border-purple-500 bg-purple-50 text-purple-700"
                                                                    : "border-slate-200 text-slate-600 hover:border-slate-300"}`, children: [icon, " ", label] }, val))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["Monto total ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400", children: "S/" }), _jsx("input", { type: "number", min: "1", step: "0.01", value: form.totalAmount, onChange: (e) => onChange({ totalAmount: e.target.value }), placeholder: "0.00", className: `w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.totalAmount ? "border-red-400 bg-red-50" : "border-slate-200"}` })] }), errors.totalAmount && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.totalAmount })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["N.\u00B0 de cuotas ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "number", min: "1", max: "120", step: "1", value: form.totalInstallments, onChange: (e) => onChange({ totalInstallments: e.target.value }), placeholder: "12", className: `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.totalInstallments ? "border-red-400 bg-red-50" : "border-slate-200"}` }), errors.totalInstallments && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.totalInstallments })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: ["Inicio de descuento ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "date", value: form.startDate, onChange: (e) => onChange({ startDate: e.target.value }), className: `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.startDate ? "border-red-400 bg-red-50" : "border-slate-200"}` }), errors.startDate && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.startDate })] })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold", children: "2" }), "C\u00E1lculo autom\u00E1tico"] }), _jsxs("div", { className: "bg-slate-50 rounded-xl border border-slate-100 p-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-500", children: "Cuota mensual estimada" }), _jsx("p", { className: "text-2xl font-bold text-emerald-700 mt-0.5", children: cuotaMensual > 0 ? fmtMoney(cuotaMensual) : "—" }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "Calculada como monto \u00F7 cuotas. Sin intereses." })] }), _jsx("div", { className: "text-4xl opacity-20", children: "\uD83E\uDDEE" })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold", children: "3" }), "Notas adicionales"] }), _jsx("textarea", { value: form.notes, onChange: (e) => onChange({ notes: e.target.value }), rows: 3, placeholder: "Motivo del pr\u00E9stamo, condiciones especiales, observaciones...", className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" })] })] }), _jsxs("div", { className: "w-56 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 flex flex-col overflow-y-auto hidden sm:flex", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Vista previa" }), _jsxs("div", { className: "space-y-2.5 flex-1", children: [_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Colaborador" }), _jsx("p", { className: "font-semibold text-slate-900 text-sm mt-0.5 leading-tight truncate", children: selEmployee?.label ?? "—" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400 mb-1", children: "Tipo" }), loanTypeBadge(form.loanType)] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Monto total" }), _jsx("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: monto > 0 ? fmtMoney(monto) : "—" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Cuotas" }), _jsx("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: cuotas > 0 ? `${cuotas} cuotas` : "—" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Cuota mensual" }), _jsx("p", { className: "font-bold text-emerald-700 text-sm mt-0.5", children: cuotaMensual > 0 ? fmtMoney(cuotaMensual) : "—" })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Total a pagar" }), _jsx("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: monto > 0 ? fmtMoney(monto) : "—" }), _jsx("p", { className: "text-xs text-slate-400", children: "Sin intereses" })] }), form.startDate && (_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Inicio descuento" }), _jsx("p", { className: "font-semibold text-slate-900 text-sm mt-0.5", children: fmtDate(form.startDate) })] }))] }), _jsx("div", { className: "mt-4 pt-4 border-t border-slate-200", children: _jsx("p", { className: "text-xs text-slate-400 leading-snug italic", children: "Los montos son referenciales y se actualizar\u00E1n al guardar el pr\u00E9stamo." }) })] })] }), _jsxs("div", { className: "px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors", children: "Cancelar" }), _jsxs("button", { disabled: isPending, onClick: onSave, className: "px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2", children: [isPending && _jsx("span", { className: "w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" }), isPending ? "Guardando..." : "Crear préstamo"] })] })] }) }));
}
// ─── DetalleModal ─────────────────────────────────────────────────────────────
function DetalleModal({ loanId, onClose, onCancel, cancelPending, onPayInstallment, payPending, }) {
    const detailQuery = useQuery({
        queryKey: ["payroll-loan-detail", loanId],
        queryFn: () => getPayrollLoanById(loanId),
        enabled: !!loanId,
    });
    if (!loanId)
        return null;
    const loan = detailQuery.data;
    const installments = loan?.installments ?? [];
    const paidCount = installments.filter((i) => i.isPaid).length;
    const pct = installments.length > 0 ? Math.round((paidCount / installments.length) * 100) : 0;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]", children: [_jsx("div", { className: "bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-5 text-white flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl", children: "\uD83D\uDCCB" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: "Detalle del pr\u00E9stamo" }), loan && _jsxs("p", { className: "text-sm text-slate-300 mt-0.5", children: [loan.employeeName, " \u00B7 ", loan.employeeCode] })] })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors", children: "\u00D7" })] }) }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [detailQuery.isLoading && (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx("span", { className: "w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" }) })), loan && (_jsxs("div", { className: "p-6 space-y-5", children: [_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [
                                        { label: "Monto total", val: fmtMoney(loan.totalAmount), color: "text-slate-900" },
                                        { label: "Cuota mensual", val: fmtMoney(loan.monthlyInstallment), color: "text-emerald-700" },
                                        { label: "Saldo pendiente", val: fmtMoney(loan.remainingAmount), color: "text-amber-700" },
                                        { label: "Inicio descuento", val: fmtDate(loan.startDate), color: "text-slate-900" },
                                    ].map(({ label, val, color }) => (_jsxs("div", { className: "bg-slate-50 rounded-xl border border-slate-100 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: label }), _jsx("p", { className: `font-bold text-sm mt-0.5 ${color}`, children: val })] }, label))) }), _jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [loanTypeBadge(loan.loanType), _jsxs("span", { className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${loan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${loan.isActive ? "bg-emerald-500" : "bg-slate-400"}` }), loan.isActive ? "Activo" : "Cancelado"] }), loan.notes && _jsxs("span", { className: "text-xs text-slate-500 italic", children: ["\"", loan.notes, "\""] })] }), _jsxs("div", { className: "bg-slate-50 rounded-xl border border-slate-100 p-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("p", { className: "text-sm font-semibold text-slate-700", children: "Progreso de pago" }), _jsxs("p", { className: "text-sm font-bold text-emerald-700", children: [pct, "%"] })] }), _jsx("div", { className: "h-2.5 bg-slate-200 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-emerald-500 rounded-full transition-all", style: { width: `${pct}%` } }) }), _jsxs("p", { className: "text-xs text-slate-500 mt-2", children: [paidCount, " de ", installments.length, " cuotas pagadas \u00B7 ", loan.remainingInstallments, " pendientes"] })] }), installments.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "Cronograma de cuotas" }), _jsxs("div", { className: "rounded-xl border border-slate-100 overflow-hidden", children: [_jsxs("div", { className: "grid bg-slate-50 border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide", style: { gridTemplateColumns: "auto 1fr auto auto" }, children: [_jsx("span", { className: "pr-3", children: "Cuota" }), _jsx("span", { children: "Per\u00EDodo" }), _jsx("span", { className: "text-right pr-3", children: "Monto" }), _jsx("span", { className: "text-center", children: "Estado / Acci\u00F3n" })] }), _jsx("div", { className: "divide-y divide-slate-50 max-h-72 overflow-y-auto", children: installments.map((inst) => (_jsxs("div", { className: `grid px-4 py-2.5 text-sm items-center gap-2 ${inst.isPaid ? "bg-emerald-50/40" : ""}`, style: { gridTemplateColumns: "auto 1fr auto auto" }, children: [_jsxs("span", { className: "font-mono text-xs text-slate-600 font-bold pr-3", children: ["#", inst.installmentNumber] }), _jsx("span", { className: "text-slate-700", children: fmtMonthYear(inst.year, inst.month) }), _jsx("span", { className: "text-right font-semibold text-slate-900 tabular-nums pr-3", children: fmtMoney(inst.amount) }), _jsx("div", { className: "flex flex-col items-center gap-0.5", children: inst.isPaid ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700", children: "\u2713 Pagada" }), inst.paidAtUtc && (_jsx("p", { className: "text-xs text-slate-400", children: fmtDate(inst.paidAtUtc) }))] })) : (loan?.isActive ? (_jsx("button", { disabled: payPending, onClick: () => onPayInstallment(loan.id, inst.id), className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors whitespace-nowrap", children: "\uD83D\uDCB5 Pagar" })) : (_jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500", children: "Pendiente" }))) })] }, inst.id))) })] }), _jsx("p", { className: "text-xs text-slate-400 mt-2 italic", children: "\uD83D\uDCA1 Los pagos se registran autom\u00E1ticamente al procesar la planilla. Tambi\u00E9n puedes marcar cuotas manualmente con el bot\u00F3n \"Pagar\"." })] }))] }))] }), _jsxs("div", { className: "px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0", children: [_jsx("div", { className: "text-xs text-slate-400", children: loan?.isActive ? "Para modificar el monto, cancela y crea un nuevo préstamo." : "Préstamo cancelado — solo lectura." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors", children: "Cerrar" }), loan?.isActive && (_jsxs("button", { disabled: cancelPending, onClick: () => onCancel(loan.id), className: "px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors", children: [cancelPending && _jsx("span", { className: "w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" }), "Cancelar pr\u00E9stamo"] }))] })] })] }) }));
}
function EditPrestamoModal({ loan, isPending, onClose, onSave, }) {
    const [form, setForm] = useState({ loanType: "loan", notes: "" });
    useEffect(() => {
        if (loan)
            setForm({ loanType: loan.loanType, notes: loan.notes ?? "" });
    }, [loan]);
    if (!loan)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]", children: [_jsx("div", { className: "bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white flex-shrink-0", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0", children: "\u270F\uFE0F" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: "Editar pr\u00E9stamo" }), _jsxs("p", { className: "text-sm text-blue-100 mt-0.5", children: [loan.employeeName, " \u00B7 ", loan.employeeCode] })] })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0", children: "\u00D7" })] }) }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-5", children: [_jsxs("div", { className: "bg-slate-50 rounded-xl border border-slate-100 p-4", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "Datos del contrato (solo lectura)" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Monto total" }), _jsx("p", { className: "font-bold text-slate-900", children: fmtMoney(loan.totalAmount) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "N.\u00B0 de cuotas" }), _jsxs("p", { className: "font-bold text-slate-900", children: [loan.totalInstallments, " cuotas"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Cuota mensual" }), _jsx("p", { className: "font-bold text-emerald-700", children: fmtMoney(loan.monthlyInstallment) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Saldo pendiente" }), _jsx("p", { className: "font-bold text-amber-700", children: fmtMoney(loan.remainingAmount) })] })] }), _jsx("p", { className: "text-xs text-slate-400 mt-3 italic", children: "El monto y las cuotas no se pueden modificar. Para cambiarlo, cancela y crea un nuevo pr\u00E9stamo." })] }), _jsxs("div", { children: [_jsxs("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [_jsx("span", { className: "w-5 h-5 rounded bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold", children: "1" }), "Campos editables"] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold text-slate-600 block mb-2", children: "Tipo de producto" }), _jsx("div", { className: "flex gap-2", children: [["loan", "💳", "Préstamo"], ["advance", "⚡", "Adelanto"]].map(([val, icon, label]) => (_jsxs("button", { type: "button", onClick: () => setForm((f) => ({ ...f, loanType: val })), className: `flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.loanType === val
                                                                    ? val === "loan"
                                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                                        : "border-purple-500 bg-purple-50 text-purple-700"
                                                                    : "border-slate-200 text-slate-600 hover:border-slate-300"}`, children: [icon, " ", label] }, val))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold text-slate-600 block mb-1", children: "Notas / observaciones" }), _jsx("textarea", { value: form.notes, onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value })), rows: 4, placeholder: "Motivo del pr\u00E9stamo, condiciones especiales...", className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" })] })] })] })] }), _jsxs("div", { className: "w-52 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 flex flex-col overflow-y-auto hidden sm:flex", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Vista previa" }), _jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Colaborador" }), _jsx("p", { className: "font-semibold text-slate-900 text-sm mt-0.5 leading-tight", children: loan.employeeName })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400 mb-1", children: "Tipo" }), loanTypeBadge(form.loanType)] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Monto total" }), _jsx("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: fmtMoney(loan.totalAmount) })] }), _jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Cuotas" }), _jsxs("p", { className: "font-bold text-slate-900 text-sm mt-0.5", children: [loan.paidInstallments, "/", loan.totalInstallments, " pagadas"] })] }), form.notes && (_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-3", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Notas" }), _jsx("p", { className: "text-xs text-slate-700 mt-0.5 italic leading-snug", children: form.notes })] }))] })] })] }), _jsxs("div", { className: "px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors", children: "Cancelar" }), _jsxs("button", { disabled: isPending, onClick: () => onSave(loan.id, form), className: "px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2", children: [isPending && _jsx("span", { className: "w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" }), isPending ? "Guardando..." : "Guardar cambios"] })] })] }) }));
}
// ─── RowMenu ──────────────────────────────────────────────────────────────────
function RowMenu({ onDetail, onEdit, onCancel, canEdit, canCancel }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        function h(e) { if (ref.current && !ref.current.contains(e.target))
            setOpen(false); }
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);
    return (_jsxs("div", { className: "relative", ref: ref, children: [_jsx("button", { onClick: () => setOpen((v) => !v), className: "w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors", children: "\u2022\u2022\u2022" }), open && (_jsxs("div", { className: "absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden", children: [_jsx("button", { onClick: () => { onDetail(); setOpen(false); }, className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50", children: "\uD83D\uDCCB Ver cronograma" }), canEdit && (_jsx("button", { onClick: () => { onEdit(); setOpen(false); }, className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50", children: "\u270F\uFE0F Editar pr\u00E9stamo" })), canCancel && (_jsx("button", { onClick: () => { onCancel(); setOpen(false); }, className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50", children: "\u2715 Cancelar pr\u00E9stamo" }))] }))] }));
}
function renderPieLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
    if (percent < 0.1)
        return null;
    const R = Math.PI / 180;
    const r = outerRadius + 14;
    const x = cx + r * Math.cos(-midAngle * R);
    const y = cy + r * Math.sin(-midAngle * R);
    return (_jsxs("text", { x: x, y: y, fontSize: 10, fill: "#475569", textAnchor: x > cx ? "start" : "end", dominantBaseline: "central", children: [name, " (", (percent * 100).toFixed(0), "%)"] }));
}
// ─── Main page ────────────────────────────────────────────────────────────────
export function PaginaPrestamos() {
    const queryClient = useQueryClient();
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);
    // Filters
    const [employeeId, setEmployeeId] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [activeOnly, setActiveOnly] = useState(true);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    // Modals
    const [createOpen, setCreateOpen] = useState(false);
    const [detailLoanId, setDetailLoanId] = useState(null);
    const [editLoan, setEditLoan] = useState(null);
    // Create form
    const [form, setForm] = useState(blankForm());
    const [errors, setErrors] = useState({});
    const ok = (msg) => setToast({ type: "success", message: msg });
    const fail = (msg) => setToast({ type: "error", message: msg });
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });
    // ── Queries ──
    const catalogsQuery = useQuery({ queryKey: ["payroll-catalogs"], queryFn: getPayrollCatalogs });
    const kpiQuery = useQuery({
        queryKey: ["payroll-loans-kpi", activeOnly],
        queryFn: () => getPayrollLoans({ employeeId: "", activeOnly, pageNumber: 1, pageSize: KPI_PAGE_SIZE }),
    });
    const listQuery = useQuery({
        queryKey: ["payroll-loans", employeeId, activeOnly, pageNumber, pageSize],
        queryFn: () => getPayrollLoans({ employeeId, activeOnly, pageNumber, pageSize }),
        placeholderData: (prev) => prev,
    });
    // ── KPIs ──
    const allItems = kpiQuery.data?.items ?? [];
    const kpis = useMemo(() => ({
        active: allItems.filter((r) => r.isActive).length,
        colocado: allItems.filter((r) => r.isActive).reduce((s, r) => s + r.totalAmount, 0),
        saldo: allItems.filter((r) => r.isActive).reduce((s, r) => s + r.remainingAmount, 0),
        advances: allItems.filter((r) => r.isActive && r.loanType === "advance").length,
    }), [allItems]);
    const pieData = useMemo(() => [
        { name: "Préstamos", value: allItems.filter((r) => r.isActive && r.loanType === "loan").length },
        { name: "Adelantos", value: allItems.filter((r) => r.isActive && r.loanType === "advance").length },
    ].filter((d) => d.value > 0), [allItems]);
    // ── Next installments ──
    const nextInstallments = useMemo(() => {
        const now = new Date();
        const nowY = now.getFullYear();
        const nowM = now.getMonth() + 1;
        return allItems
            .filter((r) => r.isActive && r.remainingInstallments > 0)
            .map((r) => ({ name: r.employeeName, amount: r.monthlyInstallment, saldo: r.remainingAmount, remaining: r.remainingInstallments }))
            .slice(0, 6);
    }, [allItems]);
    // ── Rows (with client-side type filter) ──
    const rawRows = listQuery.data?.items ?? [];
    const rows = useMemo(() => typeFilter ? rawRows.filter((r) => r.loanType === typeFilter) : rawRows, [rawRows, typeFilter]);
    const total = typeFilter ? rows.length : (listQuery.data?.totalCount ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // ── Mutations ──
    const createMutation = useMutation({
        mutationFn: createPayrollLoan,
        onSuccess: async () => {
            await invalidate();
            ok("✓ Préstamo creado correctamente.");
            setCreateOpen(false);
            setForm(blankForm());
            setErrors({});
        },
        onError: () => fail("No se pudo crear el préstamo. Verifica los datos e intenta de nuevo."),
    });
    const cancelMutation = useMutation({
        mutationFn: (id) => cancelPayrollLoan(id),
        onSuccess: async () => {
            await invalidate();
            ok("Préstamo cancelado.");
            setDetailLoanId(null);
        },
        onError: () => fail("No se pudo cancelar el préstamo."),
    });
    const editMutation = useMutation({
        mutationFn: ({ id, patch }) => updatePayrollLoan(id, { loanType: patch.loanType, notes: patch.notes || null }),
        onSuccess: async () => {
            await invalidate();
            ok("✓ Préstamo actualizado correctamente.");
            setEditLoan(null);
        },
        onError: () => fail("No se pudo actualizar el préstamo."),
    });
    const payMutation = useMutation({
        mutationFn: ({ loanId, installmentId }) => registerInstallmentPayment(loanId, installmentId),
        onSuccess: async () => {
            await invalidate();
            await queryClient.invalidateQueries({ queryKey: ["payroll-loan-detail", detailLoanId] });
            ok("✓ Cuota marcada como pagada.");
        },
        onError: () => fail("No se pudo registrar el pago. Verifica que la cuota no esté ya pagada."),
    });
    function handleSave() {
        const errs = validateForm(form);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        createMutation.mutate({
            employeeId: form.employeeId,
            loanType: form.loanType,
            totalAmount: Number(form.totalAmount),
            totalInstallments: Number(form.totalInstallments),
            startDate: form.startDate,
            notes: form.notes,
        });
    }
    function handleFormChange(patch) {
        setForm((f) => ({ ...f, ...patch }));
        setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; });
    }
    // ── Export ──
    async function handleExport(format) {
        try {
            const result = await getPayrollLoans({ employeeId, activeOnly, pageNumber: 1, pageSize: KPI_PAGE_SIZE });
            let items = result.items;
            if (typeFilter)
                items = items.filter((r) => r.loanType === typeFilter);
            if (!items.length) {
                fail("No hay préstamos para exportar con los filtros actuales.");
                return;
            }
            const data = items.map((r) => ({
                "Colaborador": r.employeeName,
                "Código": r.employeeCode,
                "Tipo": loanTypeLabel(r.loanType),
                "Monto total": fmtMoney(r.totalAmount),
                "Cuota mensual": fmtMoney(r.monthlyInstallment),
                "Cuotas pagadas": r.paidInstallments,
                "Pendientes": r.remainingInstallments,
                "Saldo": fmtMoney(r.remainingAmount),
                "Inicio": fmtDate(r.startDate),
                "Estado": r.isActive ? "Activo" : "Cancelado",
                "Notas": r.notes ?? "",
            }));
            exportRows(format, data, makeFileName("Prestamos", [activeOnly ? "Activos" : null]), "Préstamos y adelantos de planilla", {
                subtitle: "Cartera de préstamos y adelantos con saldo y avance de cuotas.",
                period: "Cartera vigente",
                filters: [
                    { label: "Colaborador", value: catalogsQuery.data?.employees?.find((e) => e.id === employeeId)?.label ?? "Todos" },
                    { label: "Tipo", value: typeFilter === "loan" ? "Préstamos" : typeFilter === "advance" ? "Adelantos" : "Todos" },
                    { label: "Estado", value: activeOnly ? "Solo activos" : "Todos" },
                ],
                metrics: [
                    { label: "Total", value: items.length },
                    { label: "Activos", value: items.filter((r) => r.isActive).length },
                    { label: "Monto total", value: fmtMoney(items.reduce((s, r) => s + r.totalAmount, 0)) },
                    { label: "Saldo total", value: fmtMoney(items.reduce((s, r) => s + r.remainingAmount, 0)) },
                ],
            });
        }
        catch {
            fail("No se pudo exportar.");
        }
    }
    const hasFilters = !!(employeeId || typeFilter || !activeOnly);
    // ─────────────────────────────────────────────────────────────────────────
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx(Toast, { toast: toast, onClose: () => setToast(null) }), _jsx(ConfirmDialog, { state: confirm, onClose: () => setConfirm(null) }), _jsx("div", { className: "bg-white border-b border-slate-100 px-6 py-5", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3.5", children: [_jsx("div", { className: "w-11 h-11 rounded-xl bg-emerald-500 shadow-sm shadow-emerald-500/30 flex items-center justify-center text-white text-xl flex-shrink-0", children: "\uD83D\uDCB3" }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "Pr\u00E9stamos" }), _jsx("p", { className: "text-sm text-slate-500 mt-0.5", children: "Gesti\u00F3n de pr\u00E9stamos y adelantos de planilla" })] })] }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [_jsx(ExportMenu, { fileName: makeFileName("Prestamos", [activeOnly ? "Activos" : null]), filtersActive: hasFilters, resultCount: total, onExport: handleExport }), _jsx("button", { onClick: () => { setForm(blankForm()); setErrors({}); setCreateOpen(true); }, className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors", children: "\u2795 Nuevo pr\u00E9stamo" })] })] }) }), _jsxs("div", { className: "px-6 py-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(KpiCard, { label: "Pr\u00E9stamos activos", value: kpis.active.toString(), sub: "En cartera vigente", icon: "\u2705", accent: "bg-emerald-100" }), _jsx(KpiCard, { label: "Monto colocado", value: fmtMoney(kpis.colocado), sub: "Total desembolsado", icon: "\uD83D\uDCB0", accent: "bg-blue-100" }), _jsx(KpiCard, { label: "Saldo pendiente", value: fmtMoney(kpis.saldo), sub: "Por recuperar", icon: "\u23F3", accent: "bg-amber-100" }), _jsx(KpiCard, { label: "Adelantos activos", value: kpis.advances.toString(), sub: "Adelantos de planilla", icon: "\u26A1", accent: "bg-purple-100" })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("select", { value: employeeId, onChange: (e) => { setEmployeeId(e.target.value); setPageNumber(1); }, className: "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-44", children: [_jsx("option", { value: "", children: "Todos los colaboradores" }), catalogsQuery.data?.employees?.map((e) => _jsx("option", { value: e.id, children: e.label }, e.id))] }), _jsxs("select", { value: typeFilter, onChange: (e) => { setTypeFilter(e.target.value); setPageNumber(1); }, className: "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: [_jsx("option", { value: "", children: "Todos los tipos" }), _jsx("option", { value: "loan", children: "Solo pr\u00E9stamos" }), _jsx("option", { value: "advance", children: "Solo adelantos" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("button", { type: "button", role: "switch", "aria-checked": activeOnly, onClick: () => { setActiveOnly((v) => !v); setPageNumber(1); }, className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${activeOnly ? "bg-emerald-500" : "bg-slate-200"}`, children: _jsx("span", { className: `inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${activeOnly ? "translate-x-4.5" : "translate-x-0.5"}` }) }), _jsx("span", { className: "text-sm text-slate-700", children: "Solo activos" })] }), hasFilters && (_jsx("button", { onClick: () => { setEmployeeId(""); setTypeFilter(""); setActiveOnly(true); setPageNumber(1); }, className: "px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5", children: "\u2715 Limpiar" })), _jsx("select", { value: pageSize, onChange: (e) => { setPageSize(Number(e.target.value)); setPageNumber(1); }, className: "ml-auto rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white", children: PAGE_SIZES.map((s) => _jsxs("option", { value: s, children: [s, " por p\u00E1g."] }, s)) }), _jsxs("span", { className: "text-xs text-slate-400 whitespace-nowrap", children: [total, " resultado", total !== 1 ? "s" : ""] })] }), typeFilter && (_jsx("p", { className: "text-xs text-amber-600 mt-2", children: "\u26A0\uFE0F El filtro por tipo se aplica sobre la p\u00E1gina actual. Para resultados m\u00E1s precisos, comb\u00EDnalo con el filtro de colaborador." }))] }), _jsxs("div", { className: "flex gap-6 items-start", children: [_jsx("div", { className: "flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: listQuery.isLoading ? (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx("span", { className: "w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" }) })) : rows.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx("div", { className: "text-5xl mb-3", children: "\uD83D\uDCB3" }), _jsx("p", { className: "text-base font-semibold text-slate-700", children: hasFilters ? "Sin resultados" : "Aún no hay préstamos" }), _jsx("p", { className: "text-sm text-slate-400 mt-1 max-w-xs", children: hasFilters ? "Prueba con otros filtros." : "Crea el primer préstamo o adelanto de planilla." }), !hasFilters && (_jsx("button", { onClick: () => { setForm(blankForm()); setErrors({}); setCreateOpen(true); }, className: "mt-4 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors", children: "\u2795 Nuevo pr\u00E9stamo" }))] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-50 border-b border-slate-100", children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Colaborador" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Monto" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Cuota" }), _jsx("th", { className: "px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider min-w-36", children: "Progreso" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Saldo" }), _jsx("th", { className: "px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-50", children: rows.map((r, idx) => (_jsxs("tr", { className: `hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`, children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarBg(r.employeeName)}`, children: initials(r.employeeName) }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-900 leading-tight", children: r.employeeName }), _jsx("p", { className: "text-xs text-slate-400", children: r.employeeCode })] })] }) }), _jsx("td", { className: "px-4 py-3", children: loanTypeBadge(r.loanType) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: "font-semibold text-slate-900 tabular-nums", children: fmtMoney(r.totalAmount) }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: "font-medium text-slate-700 tabular-nums", children: fmtMoney(r.monthlyInstallment) }) }), _jsx("td", { className: "px-4 py-3 min-w-36", children: _jsx(ProgressBar, { paid: r.paidInstallments, total: r.totalInstallments }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: `font-bold tabular-nums ${r.remainingAmount > 0 ? "text-amber-700" : "text-emerald-700"}`, children: fmtMoney(r.remainingAmount) }) }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsxs("span", { className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-400"}` }), r.isActive ? "Activo" : "Cancelado"] }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx(RowMenu, { onDetail: () => setDetailLoanId(r.id), canEdit: r.isActive, onEdit: () => setEditLoan(r), canCancel: r.isActive, onCancel: () => setConfirm({
                                                                            title: "Cancelar préstamo",
                                                                            message: `¿Cancelar el préstamo de ${r.employeeName} por ${fmtMoney(r.totalAmount)}? Esta acción no se puede deshacer.`,
                                                                            danger: true,
                                                                            onConfirm: () => cancelMutation.mutate(r.id),
                                                                        }) }) })] }, r.id))) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-emerald-50 border-t-2 border-emerald-100", children: [_jsxs("td", { className: "px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide", colSpan: 2, children: [rows.length, " registro", rows.length !== 1 ? "s" : ""] }), _jsx("td", { className: "px-4 py-3 text-right text-xs font-bold text-slate-700 tabular-nums", children: fmtMoney(rows.reduce((s, r) => s + r.totalAmount, 0)) }), _jsx("td", { className: "px-4 py-3 text-right text-xs font-bold text-slate-700 tabular-nums", children: fmtMoney(rows.reduce((s, r) => s + r.monthlyInstallment, 0)) }), _jsx("td", {}), _jsx("td", { className: "px-4 py-3 text-right text-xs font-bold text-amber-700 tabular-nums", children: fmtMoney(rows.reduce((s, r) => s + r.remainingAmount, 0)) }), _jsx("td", { colSpan: 2 })] }) })] }) }), !typeFilter && (_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50", children: [_jsxs("span", { className: "text-xs text-slate-500", children: ["Mostrando ", rows.length, " de ", total, " registros"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { disabled: pageNumber <= 1, onClick: () => setPageNumber((p) => Math.max(1, p - 1)), className: "w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors", children: "\u2039" }), Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                            const p = Math.max(1, Math.min(totalPages - 4, pageNumber - 2)) + i;
                                                            return (_jsx("button", { onClick: () => setPageNumber(p), className: `w-8 h-8 rounded-lg border text-sm transition-colors ${p === pageNumber ? "border-emerald-500 bg-emerald-600 text-white font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"}`, children: p }, p));
                                                        }), _jsx("button", { disabled: pageNumber >= totalPages, onClick: () => setPageNumber((p) => Math.min(totalPages, p + 1)), className: "w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors", children: "\u203A" })] })] }))] })) }), _jsxs("div", { className: "w-64 flex-shrink-0 hidden xl:flex flex-col gap-4", children: [pieData.length > 0 && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-4", children: "Distribuci\u00F3n" }), _jsx("div", { style: { height: 160 }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsxs(Pie, { data: pieData, cx: "50%", cy: "50%", outerRadius: 58, dataKey: "value", labelLine: false, label: renderPieLabel, children: [_jsx(Cell, { fill: "#3b82f6" }), _jsx(Cell, { fill: "#a855f7" })] }), _jsx(Tooltip, { formatter: (v) => [`${v} registros`, ""], contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" } })] }) }) }), _jsxs("div", { className: "mt-2 space-y-1.5", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" }), _jsx("span", { className: "text-slate-600 flex-1", children: "Pr\u00E9stamos" }), _jsx("span", { className: "font-bold text-slate-900", children: allItems.filter((r) => r.isActive && r.loanType === "loan").length })] }), _jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" }), _jsx("span", { className: "text-slate-600 flex-1", children: "Adelantos" }), _jsx("span", { className: "font-bold text-slate-900", children: allItems.filter((r) => r.isActive && r.loanType === "advance").length })] })] })] })), nextInstallments.length > 0 && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "\uD83D\uDCC5 Cuotas en cartera" }), _jsx("div", { className: "space-y-2.5 max-h-52 overflow-y-auto", children: nextInstallments.map((item, i) => (_jsxs("div", { className: "flex items-start justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-semibold text-slate-800 truncate", children: item.name }), _jsxs("p", { className: "text-xs text-slate-400", children: [item.remaining, " cuota", item.remaining !== 1 ? "s" : "", " pend."] })] }), _jsxs("div", { className: "text-right flex-shrink-0", children: [_jsx("p", { className: "text-xs font-bold text-emerald-700", children: fmtMoney(item.amount) }), _jsx("p", { className: "text-xs text-slate-400", children: "por mes" })] })] }, i))) })] })), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-widest mb-3", children: "Resumen" }), _jsx("div", { className: "space-y-2.5", children: [
                                                    { label: "Total registros", value: allItems.length.toString() },
                                                    { label: "Activos", value: kpis.active.toString() },
                                                    { label: "Cancelados", value: (allItems.length - kpis.active).toString() },
                                                    { label: "Monto colocado", value: fmtMoney(kpis.colocado) },
                                                    { label: "Saldo pendiente", value: fmtMoney(kpis.saldo) },
                                                ].map(({ label, value }) => (_jsxs("div", { className: "flex justify-between items-center py-1 border-b border-slate-50 last:border-0", children: [_jsx("span", { className: "text-xs text-slate-500", children: label }), _jsx("span", { className: "text-sm font-bold text-slate-900", children: value })] }, label))) })] })] })] })] }), _jsx(NuevoPrestamoModal, { open: createOpen, employees: catalogsQuery.data?.employees ?? [], isPending: createMutation.isPending, errors: errors, form: form, onChange: handleFormChange, onClose: () => { setCreateOpen(false); setErrors({}); }, onSave: handleSave }), _jsx(DetalleModal, { loanId: detailLoanId, onClose: () => setDetailLoanId(null), cancelPending: cancelMutation.isPending, payPending: payMutation.isPending, onPayInstallment: (loanId, installmentId) => setConfirm({
                    title: "Registrar pago manual",
                    message: "¿Marcar esta cuota como pagada? Esta acción no se puede deshacer.",
                    danger: false,
                    onConfirm: () => payMutation.mutate({ loanId, installmentId }),
                }), onCancel: (id) => setConfirm({
                    title: "Cancelar préstamo",
                    message: "¿Cancelar este préstamo? Los pagos ya registrados no se verán afectados pero no se generarán más cuotas.",
                    danger: true,
                    onConfirm: () => cancelMutation.mutate(id),
                }) }), _jsx(EditPrestamoModal, { loan: editLoan, isPending: editMutation.isPending, onClose: () => setEditLoan(null), onSave: (id, patch) => editMutation.mutate({ id, patch }) })] }));
}
