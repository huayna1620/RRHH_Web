import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  cancelPayrollLoan,
  createPayrollLoan,
  getPayrollLoanById,
  getPayrollLoans,
  registerInstallmentPayment,
  updatePayrollLoan,
} from "@/modules/payroll/services/payrollLoansApi";
import { getPayrollCatalogs } from "@/modules/payroll/services/payrollApi";
import type { LoanType, PayrollLoan } from "@/modules/payroll/types/payroll.types";

// ─── constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const PAGE_SIZES = [10, 25, 50];
const KPI_PAGE_SIZE = 9999;

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMonthYear(year: number, month: number): string {
  return `${MONTHS[month - 1] ?? month} ${year}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function avatarBg(name: string): string {
  const colors = [
    "bg-emerald-500","bg-teal-500","bg-blue-500",
    "bg-indigo-500", "bg-cyan-500", "bg-green-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function loanTypeLabel(t: string): string {
  return t === "advance" ? "Adelanto" : "Préstamo";
}

function loanTypeBadge(t: string): JSX.Element {
  if (t === "advance") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Adelanto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Préstamo
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }): JSX.Element | null {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-2xl border max-w-sm ${isErr ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
      <span className="text-lg font-bold">{isErr ? "✕" : "✓"}</span>
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg ml-2">×</button>
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

type ConfirmState = { title: string; message: string; danger?: boolean; onConfirm: () => void } | null;

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }): JSX.Element | null {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">{state.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{state.message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { state.onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: string; accent: string }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ paid, total }: { paid: number; total: number }): JSX.Element {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{paid}/{total} cuotas</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<string, string>>;

type FormState = {
  employeeId:    string;
  loanType:      "loan" | "advance";
  totalAmount:   string;
  totalInstallments: string;
  startDate:     string;
  notes:         string;
};

function blankForm(): FormState {
  return { employeeId: "", loanType: "loan", totalAmount: "", totalInstallments: "12", startDate: "", notes: "" };
}

function validateForm(f: FormState): FormErrors {
  const e: FormErrors = {};
  if (!f.employeeId)                 e.employeeId = "Selecciona un colaborador.";
  if (!f.totalAmount || Number(f.totalAmount) <= 0)
                                     e.totalAmount = "El monto debe ser mayor a 0.";
  if (Number(f.totalAmount) > 999999)e.totalAmount = "El monto no puede superar S/ 999,999.";
  if (!f.totalInstallments || Number(f.totalInstallments) < 1)
                                     e.totalInstallments = "Mínimo 1 cuota.";
  if (Number(f.totalInstallments) > 120)
                                     e.totalInstallments = "Máximo 120 cuotas.";
  if (!f.startDate)                  e.startDate = "La fecha de inicio es obligatoria.";
  return e;
}

// ─── NuevoPrestamoModal ───────────────────────────────────────────────────────

type NuevoModalProps = {
  open:      boolean;
  employees: { id: string; label: string }[];
  isPending: boolean;
  errors:    FormErrors;
  form:      FormState;
  onChange:  (patch: Partial<FormState>) => void;
  onClose:   () => void;
  onSave:    () => void;
};

function NuevoPrestamoModal({ open, employees, isPending, errors, form, onChange, onClose, onSave }: NuevoModalProps): JSX.Element | null {
  if (!open) return null;

  const monto   = Number(form.totalAmount)   || 0;
  const cuotas  = Number(form.totalInstallments) || 0;
  const cuotaMensual = monto > 0 && cuotas > 0 ? monto / cuotas : 0;
  const selEmployee  = employees.find((e) => e.id === form.employeeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">💳</div>
              <div>
                <h2 className="text-lg font-bold">Nuevo préstamo</h2>
                <p className="text-sm text-emerald-100 mt-0.5">Registra un préstamo o adelanto de planilla para un colaborador.</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">×</button>
          </div>
        </div>

        {/* Body 2 cols */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Sección 1: Datos */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">1</span>
                Datos del préstamo
              </h3>
              <div className="space-y-3">

                {/* Colaborador */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Colaborador <span className="text-red-500">*</span></label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => onChange({ employeeId: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${errors.employeeId ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                  >
                    <option value="">— Seleccionar colaborador —</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                  {errors.employeeId && <p className="text-xs text-red-600 mt-1">{errors.employeeId}</p>}
                </div>

                {/* Tipo */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Tipo <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    {([["loan", "💳", "Préstamo"], ["advance", "⚡", "Adelanto"]] as const).map(([val, icon, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => onChange({ loanType: val })}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.loanType === val
                            ? val === "loan"
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monto + Cuotas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Monto total <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">S/</span>
                      <input
                        type="number" min="1" step="0.01"
                        value={form.totalAmount}
                        onChange={(e) => onChange({ totalAmount: e.target.value })}
                        placeholder="0.00"
                        className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.totalAmount ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                      />
                    </div>
                    {errors.totalAmount && <p className="text-xs text-red-600 mt-1">{errors.totalAmount}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">N.° de cuotas <span className="text-red-500">*</span></label>
                    <input
                      type="number" min="1" max="120" step="1"
                      value={form.totalInstallments}
                      onChange={(e) => onChange({ totalInstallments: e.target.value })}
                      placeholder="12"
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.totalInstallments ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                    />
                    {errors.totalInstallments && <p className="text-xs text-red-600 mt-1">{errors.totalInstallments}</p>}
                  </div>
                </div>

                {/* Inicio */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Inicio de descuento <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => onChange({ startDate: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.startDate ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                  />
                  {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>}
                </div>
              </div>
            </div>

            {/* Sección 2: Cálculo */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">2</span>
                Cálculo automático
              </h3>
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Cuota mensual estimada</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                    {cuotaMensual > 0 ? fmtMoney(cuotaMensual) : "—"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Calculada como monto ÷ cuotas. Sin intereses.</p>
                </div>
                <div className="text-4xl opacity-20">🧮</div>
              </div>
            </div>

            {/* Sección 3: Notas */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">3</span>
                Notas adicionales
              </h3>
              <textarea
                value={form.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                rows={3}
                placeholder="Motivo del préstamo, condiciones especiales, observaciones..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-56 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 flex flex-col overflow-y-auto hidden sm:flex">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Vista previa</p>
            <div className="space-y-2.5 flex-1">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Colaborador</p>
                <p className="font-semibold text-slate-900 text-sm mt-0.5 leading-tight truncate">{selEmployee?.label ?? "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400 mb-1">Tipo</p>
                {loanTypeBadge(form.loanType)}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Monto total</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{monto > 0 ? fmtMoney(monto) : "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Cuotas</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{cuotas > 0 ? `${cuotas} cuotas` : "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Cuota mensual</p>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">{cuotaMensual > 0 ? fmtMoney(cuotaMensual) : "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Total a pagar</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{monto > 0 ? fmtMoney(monto) : "—"}</p>
                <p className="text-xs text-slate-400">Sin intereses</p>
              </div>
              {form.startDate && (
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-400">Inicio descuento</p>
                  <p className="font-semibold text-slate-900 text-sm mt-0.5">{fmtDate(form.startDate)}</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-400 leading-snug italic">Los montos son referenciales y se actualizarán al guardar el préstamo.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button
            disabled={isPending}
            onClick={onSave}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isPending ? "Guardando..." : "Crear préstamo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DetalleModal ─────────────────────────────────────────────────────────────

function DetalleModal({
  loanId, onClose, onCancel, cancelPending, onPayInstallment, payPending,
}: {
  loanId: string | null;
  onClose: () => void;
  onCancel: (id: string) => void;
  cancelPending: boolean;
  onPayInstallment: (loanId: string, installmentId: string) => void;
  payPending: boolean;
}): JSX.Element | null {
  const detailQuery = useQuery({
    queryKey: ["payroll-loan-detail", loanId],
    queryFn: () => getPayrollLoanById(loanId!),
    enabled: !!loanId,
  });

  if (!loanId) return null;

  const loan = detailQuery.data;
  const installments = loan?.installments ?? [];
  const paidCount  = installments.filter((i) => i.isPaid).length;
  const pct = installments.length > 0 ? Math.round((paidCount / installments.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">📋</div>
              <div>
                <h2 className="text-lg font-bold">Detalle del préstamo</h2>
                {loan && <p className="text-sm text-slate-300 mt-0.5">{loan.employeeName} · {loan.employeeCode}</p>}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {detailQuery.isLoading && (
            <div className="flex items-center justify-center py-16">
              <span className="w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {loan && (
            <div className="p-6 space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Monto total",      val: fmtMoney(loan.totalAmount),        color: "text-slate-900"   },
                  { label: "Cuota mensual",     val: fmtMoney(loan.monthlyInstallment), color: "text-emerald-700" },
                  { label: "Saldo pendiente",   val: fmtMoney(loan.remainingAmount),    color: "text-amber-700"   },
                  { label: "Inicio descuento",  val: fmtDate(loan.startDate),           color: "text-slate-900"   },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className={`font-bold text-sm mt-0.5 ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Type + status */}
              <div className="flex items-center gap-3 flex-wrap">
                {loanTypeBadge(loan.loanType)}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${loan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${loan.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {loan.isActive ? "Activo" : "Cancelado"}
                </span>
                {loan.notes && <span className="text-xs text-slate-500 italic">"{loan.notes}"</span>}
              </div>

              {/* Progress */}
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-slate-700">Progreso de pago</p>
                  <p className="text-sm font-bold text-emerald-700">{pct}%</p>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2">{paidCount} de {installments.length} cuotas pagadas · {loan.remainingInstallments} pendientes</p>
              </div>

              {/* Installments */}
              {installments.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Cronograma de cuotas</h3>
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="grid bg-slate-50 border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide" style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
                      <span className="pr-3">Cuota</span>
                      <span>Período</span>
                      <span className="text-right pr-3">Monto</span>
                      <span className="text-center">Estado / Acción</span>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                      {installments.map((inst) => (
                        <div key={inst.id} className={`grid px-4 py-2.5 text-sm items-center gap-2 ${inst.isPaid ? "bg-emerald-50/40" : ""}`} style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
                          <span className="font-mono text-xs text-slate-600 font-bold pr-3">#{inst.installmentNumber}</span>
                          <span className="text-slate-700">{fmtMonthYear(inst.year, inst.month)}</span>
                          <span className="text-right font-semibold text-slate-900 tabular-nums pr-3">{fmtMoney(inst.amount)}</span>
                          <div className="flex flex-col items-center gap-0.5">
                            {inst.isPaid ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                  ✓ Pagada
                                </span>
                                {inst.paidAtUtc && (
                                  <p className="text-xs text-slate-400">{fmtDate(inst.paidAtUtc)}</p>
                                )}
                              </>
                            ) : (
                              loan?.isActive ? (
                                <button
                                  disabled={payPending}
                                  onClick={() => onPayInstallment(loan.id, inst.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                  💵 Pagar
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                  Pendiente
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    💡 Los pagos se registran automáticamente al procesar la planilla. También puedes marcar cuotas manualmente con el botón "Pagar".
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400">
            {loan?.isActive ? "Para modificar el monto, cancela y crea un nuevo préstamo." : "Préstamo cancelado — solo lectura."}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cerrar</button>
            {loan?.isActive && (
              <button
                disabled={cancelPending}
                onClick={() => onCancel(loan.id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {cancelPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Cancelar préstamo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EditPrestamoModal ────────────────────────────────────────────────────────

type EditForm = { loanType: LoanType; notes: string };

function EditPrestamoModal({
  loan, isPending, onClose, onSave,
}: {
  loan: PayrollLoan | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (id: string, patch: EditForm) => void;
}): JSX.Element | null {
  const [form, setForm] = useState<EditForm>({ loanType: "loan", notes: "" });

  useEffect(() => {
    if (loan) setForm({ loanType: loan.loanType as LoanType, notes: loan.notes ?? "" });
  }, [loan]);

  if (!loan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">✏️</div>
              <div>
                <h2 className="text-lg font-bold">Editar préstamo</h2>
                <p className="text-sm text-blue-100 mt-0.5">{loan.employeeName} · {loan.employeeCode}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">×</button>
          </div>
        </div>

        {/* Body 2 cols */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Info — campos no editables */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Datos del contrato (solo lectura)</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Monto total</p>
                  <p className="font-bold text-slate-900">{fmtMoney(loan.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">N.° de cuotas</p>
                  <p className="font-bold text-slate-900">{loan.totalInstallments} cuotas</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Cuota mensual</p>
                  <p className="font-bold text-emerald-700">{fmtMoney(loan.monthlyInstallment)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Saldo pendiente</p>
                  <p className="font-bold text-amber-700">{fmtMoney(loan.remainingAmount)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 italic">El monto y las cuotas no se pueden modificar. Para cambiarlo, cancela y crea un nuevo préstamo.</p>
            </div>

            {/* Campos editables */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
                Campos editables
              </h3>
              <div className="space-y-4">

                {/* Tipo */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Tipo de producto</label>
                  <div className="flex gap-2">
                    {([["loan", "💳", "Préstamo"], ["advance", "⚡", "Adelanto"]] as const).map(([val, icon, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, loanType: val }))}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.loanType === val
                            ? val === "loan"
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Notas / observaciones</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={4}
                    placeholder="Motivo del préstamo, condiciones especiales..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-52 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 flex flex-col overflow-y-auto hidden sm:flex">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Vista previa</p>
            <div className="space-y-2.5">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Colaborador</p>
                <p className="font-semibold text-slate-900 text-sm mt-0.5 leading-tight">{loan.employeeName}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400 mb-1">Tipo</p>
                {loanTypeBadge(form.loanType)}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Monto total</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{fmtMoney(loan.totalAmount)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Cuotas</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{loan.paidInstallments}/{loan.totalInstallments} pagadas</p>
              </div>
              {form.notes && (
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-400">Notas</p>
                  <p className="text-xs text-slate-700 mt-0.5 italic leading-snug">{form.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button
            disabled={isPending}
            onClick={() => onSave(loan.id, form)}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RowMenu ──────────────────────────────────────────────────────────────────

function RowMenu({ onDetail, onEdit, onCancel, canEdit, canCancel }: { onDetail: () => void; onEdit: () => void; onCancel: () => void; canEdit: boolean; canCancel: boolean }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors">
        •••
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
          <button onClick={() => { onDetail(); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            📋 Ver cronograma
          </button>
          {canEdit && (
            <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50">
              ✏️ Editar préstamo
            </button>
          )}
          {canCancel && (
            <button onClick={() => { onCancel(); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
              ✕ Cancelar préstamo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PieChart label ───────────────────────────────────────────────────────────

interface PieLabelProps { cx: number; cy: number; midAngle: number; outerRadius: number; percent: number; name: string }
function renderPieLabel({ cx, cy, midAngle, outerRadius, percent, name }: PieLabelProps) {
  if (percent < 0.1) return null;
  const R = Math.PI / 180;
  const r = outerRadius + 14;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fontSize={10} fill="#475569" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PaginaPrestamos(): JSX.Element {
  const queryClient = useQueryClient();
  const [toast, setToast]     = useState<ToastState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // Filters
  const [employeeId,  setEmployeeId]  = useState("");
  const [typeFilter,  setTypeFilter]  = useState<"" | "loan" | "advance">("");
  const [activeOnly,  setActiveOnly]  = useState(true);
  const [pageNumber,  setPageNumber]  = useState(1);
  const [pageSize,    setPageSize]    = useState(PAGE_SIZES[0]);

  // Modals
  const [createOpen,   setCreateOpen]   = useState(false);
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const [editLoan,     setEditLoan]     = useState<PayrollLoan | null>(null);

  // Create form
  const [form,   setForm]   = useState<FormState>(blankForm());
  const [errors, setErrors] = useState<FormErrors>({});

  const ok   = (msg: string) => setToast({ type: "success", message: msg });
  const fail = (msg: string) => setToast({ type: "error",   message: msg });
  const invalidate = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });

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
    active:   allItems.filter((r) => r.isActive).length,
    colocado: allItems.filter((r) => r.isActive).reduce((s, r) => s + r.totalAmount, 0),
    saldo:    allItems.filter((r) => r.isActive).reduce((s, r) => s + r.remainingAmount, 0),
    advances: allItems.filter((r) => r.isActive && r.loanType === "advance").length,
  }), [allItems]);

  const pieData = useMemo(() => [
    { name: "Préstamos", value: allItems.filter((r) => r.isActive && r.loanType === "loan").length    },
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
  const rows = useMemo(() =>
    typeFilter ? rawRows.filter((r) => r.loanType === typeFilter) : rawRows
  , [rawRows, typeFilter]);

  const total      = typeFilter ? rows.length : (listQuery.data?.totalCount ?? 0);
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
    mutationFn: (id: string) => cancelPayrollLoan(id),
    onSuccess: async () => {
      await invalidate();
      ok("Préstamo cancelado.");
      setDetailLoanId(null);
    },
    onError: () => fail("No se pudo cancelar el préstamo."),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EditForm }) =>
      updatePayrollLoan(id, { loanType: patch.loanType, notes: patch.notes || null }),
    onSuccess: async () => {
      await invalidate();
      ok("✓ Préstamo actualizado correctamente.");
      setEditLoan(null);
    },
    onError: () => fail("No se pudo actualizar el préstamo."),
  });

  const payMutation = useMutation({
    mutationFn: ({ loanId, installmentId }: { loanId: string; installmentId: string }) =>
      registerInstallmentPayment(loanId, installmentId),
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["payroll-loan-detail", detailLoanId] });
      ok("✓ Cuota marcada como pagada.");
    },
    onError: () => fail("No se pudo registrar el pago. Verifica que la cuota no esté ya pagada."),
  });

  function handleSave(): void {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    createMutation.mutate({
      employeeId:        form.employeeId,
      loanType:          form.loanType,
      totalAmount:       Number(form.totalAmount),
      totalInstallments: Number(form.totalInstallments),
      startDate:         form.startDate,
      notes:             form.notes,
    });
  }

  function handleFormChange(patch: Partial<FormState>): void {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; });
  }

  // ── Export ──
  async function handleExport(format: ExportFormat): Promise<void> {
    try {
      const result = await getPayrollLoans({ employeeId, activeOnly, pageNumber: 1, pageSize: KPI_PAGE_SIZE });
      let items = result.items;
      if (typeFilter) items = items.filter((r) => r.loanType === typeFilter);
      if (!items.length) { fail("No hay préstamos para exportar con los filtros actuales."); return; }
      const data = items.map((r) => ({
        "Colaborador":    r.employeeName,
        "Código":         r.employeeCode,
        "Tipo":           loanTypeLabel(r.loanType),
        "Monto total":    fmtMoney(r.totalAmount),
        "Cuota mensual":  fmtMoney(r.monthlyInstallment),
        "Cuotas pagadas": r.paidInstallments,
        "Pendientes":     r.remainingInstallments,
        "Saldo":          fmtMoney(r.remainingAmount),
        "Inicio":         fmtDate(r.startDate),
        "Estado":         r.isActive ? "Activo" : "Cancelado",
        "Notas":          r.notes ?? "",
      }));
      exportRows(format, data, makeFileName("Prestamos", [activeOnly ? "Activos" : null]), "Préstamos y adelantos de planilla", {
        subtitle: "Cartera de préstamos y adelantos con saldo y avance de cuotas.",
        period:   "Cartera vigente",
        filters: [
          { label: "Colaborador", value: catalogsQuery.data?.employees?.find((e) => e.id === employeeId)?.label ?? "Todos" },
          { label: "Tipo",        value: typeFilter === "loan" ? "Préstamos" : typeFilter === "advance" ? "Adelantos" : "Todos" },
          { label: "Estado",      value: activeOnly ? "Solo activos" : "Todos" },
        ],
        metrics: [
          { label: "Total",         value: items.length },
          { label: "Activos",       value: items.filter((r) => r.isActive).length },
          { label: "Monto total",   value: fmtMoney(items.reduce((s, r) => s + r.totalAmount, 0)) },
          { label: "Saldo total",   value: fmtMoney(items.reduce((s, r) => s + r.remainingAmount, 0)) },
        ],
      });
    } catch { fail("No se pudo exportar."); }
  }

  const hasFilters = !!(employeeId || typeFilter || !activeOnly);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />

      {/* ── Encabezado ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 shadow-sm shadow-emerald-500/30 flex items-center justify-center text-white text-xl flex-shrink-0">💳</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Préstamos</h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestión de préstamos y adelantos de planilla</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ExportMenu
              fileName={makeFileName("Prestamos", [activeOnly ? "Activos" : null])}
              filtersActive={hasFilters}
              resultCount={total}
              onExport={handleExport}
            />
            <button
              onClick={() => { setForm(blankForm()); setErrors({}); setCreateOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors"
            >
              ➕ Nuevo préstamo
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Préstamos activos"  value={kpis.active.toString()}       sub="En cartera vigente"   icon="✅" accent="bg-emerald-100" />
          <KpiCard label="Monto colocado"      value={fmtMoney(kpis.colocado)}     sub="Total desembolsado"   icon="💰" accent="bg-blue-100"    />
          <KpiCard label="Saldo pendiente"     value={fmtMoney(kpis.saldo)}        sub="Por recuperar"        icon="⏳" accent="bg-amber-100"   />
          <KpiCard label="Adelantos activos"   value={kpis.advances.toString()}    sub="Adelantos de planilla" icon="⚡" accent="bg-purple-100"  />
        </div>

        {/* ── Filtros ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Empleado */}
            <select
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setPageNumber(1); }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-44"
            >
              <option value="">Todos los colaboradores</option>
              {catalogsQuery.data?.employees?.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>

            {/* Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as "" | "loan" | "advance"); setPageNumber(1); }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Todos los tipos</option>
              <option value="loan">Solo préstamos</option>
              <option value="advance">Solo adelantos</option>
            </select>

            {/* Activos */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={activeOnly}
                onClick={() => { setActiveOnly((v) => !v); setPageNumber(1); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${activeOnly ? "bg-emerald-500" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${activeOnly ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-sm text-slate-700">Solo activos</span>
            </label>

            {hasFilters && (
              <button
                onClick={() => { setEmployeeId(""); setTypeFilter(""); setActiveOnly(true); setPageNumber(1); }}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                ✕ Limpiar
              </button>
            )}

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPageNumber(1); }}
              className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} por pág.</option>)}
            </select>

            <span className="text-xs text-slate-400 whitespace-nowrap">{total} resultado{total !== 1 ? "s" : ""}</span>
          </div>
          {typeFilter && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ El filtro por tipo se aplica sobre la página actual. Para resultados más precisos, combínalo con el filtro de colaborador.
            </p>
          )}
        </div>

        {/* ── Main: tabla + panel lateral ── */}
        <div className="flex gap-6 items-start">

          {/* Tabla */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-3">💳</div>
                <p className="text-base font-semibold text-slate-700">
                  {hasFilters ? "Sin resultados" : "Aún no hay préstamos"}
                </p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                  {hasFilters ? "Prueba con otros filtros." : "Crea el primer préstamo o adelanto de planilla."}
                </p>
                {!hasFilters && (
                  <button
                    onClick={() => { setForm(blankForm()); setErrors({}); setCreateOpen(true); }}
                    className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                  >
                    ➕ Nuevo préstamo
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Cuota</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider min-w-36">Progreso</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((r, idx) => (
                        <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                          {/* Colaborador */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarBg(r.employeeName)}`}>
                                {initials(r.employeeName)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 leading-tight">{r.employeeName}</p>
                                <p className="text-xs text-slate-400">{r.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          {/* Tipo */}
                          <td className="px-4 py-3">{loanTypeBadge(r.loanType)}</td>
                          {/* Monto */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-slate-900 tabular-nums">{fmtMoney(r.totalAmount)}</span>
                          </td>
                          {/* Cuota */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium text-slate-700 tabular-nums">{fmtMoney(r.monthlyInstallment)}</span>
                          </td>
                          {/* Progreso */}
                          <td className="px-4 py-3 min-w-36">
                            <ProgressBar paid={r.paidInstallments} total={r.totalInstallments} />
                          </td>
                          {/* Saldo */}
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold tabular-nums ${r.remainingAmount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                              {fmtMoney(r.remainingAmount)}
                            </span>
                          </td>
                          {/* Estado */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {r.isActive ? "Activo" : "Cancelado"}
                            </span>
                          </td>
                          {/* Acciones */}
                          <td className="px-4 py-3 text-right">
                            <RowMenu
                              onDetail={() => setDetailLoanId(r.id)}
                              canEdit={r.isActive}
                              onEdit={() => setEditLoan(r)}
                              canCancel={r.isActive}
                              onCancel={() =>
                                setConfirm({
                                  title:   "Cancelar préstamo",
                                  message: `¿Cancelar el préstamo de ${r.employeeName} por ${fmtMoney(r.totalAmount)}? Esta acción no se puede deshacer.`,
                                  danger:  true,
                                  onConfirm: () => cancelMutation.mutate(r.id),
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50 border-t-2 border-emerald-100">
                        <td className="px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide" colSpan={2}>
                          {rows.length} registro{rows.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 tabular-nums">
                          {fmtMoney(rows.reduce((s, r) => s + r.totalAmount, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 tabular-nums">
                          {fmtMoney(rows.reduce((s, r) => s + r.monthlyInstallment, 0))}
                        </td>
                        <td />
                        <td className="px-4 py-3 text-right text-xs font-bold text-amber-700 tabular-nums">
                          {fmtMoney(rows.reduce((s, r) => s + r.remainingAmount, 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Paginación */}
                {!typeFilter && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500">Mostrando {rows.length} de {total} registros</span>
                    <div className="flex items-center gap-1">
                      <button disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors">‹</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = Math.max(1, Math.min(totalPages - 4, pageNumber - 2)) + i;
                        return (
                          <button key={p} onClick={() => setPageNumber(p)}
                            className={`w-8 h-8 rounded-lg border text-sm transition-colors ${p === pageNumber ? "border-emerald-500 bg-emerald-600 text-white font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"}`}
                          >{p}</button>
                        );
                      })}
                      <button disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors">›</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Panel lateral */}
          <div className="w-64 flex-shrink-0 hidden xl:flex flex-col gap-4">

            {/* Distribución */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Distribución</h3>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={58} dataKey="value"
                        labelLine={false} label={renderPieLabel as (props: unknown) => JSX.Element | null}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#a855f7" />
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} registros`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-slate-600 flex-1">Préstamos</span>
                    <span className="font-bold text-slate-900">{allItems.filter((r) => r.isActive && r.loanType === "loan").length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="text-slate-600 flex-1">Adelantos</span>
                    <span className="font-bold text-slate-900">{allItems.filter((r) => r.isActive && r.loanType === "advance").length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Próximas cuotas */}
            {nextInstallments.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">📅 Cuotas en cartera</h3>
                <div className="space-y-2.5 max-h-52 overflow-y-auto">
                  {nextInstallments.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.remaining} cuota{item.remaining !== 1 ? "s" : ""} pend.</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-emerald-700">{fmtMoney(item.amount)}</p>
                        <p className="text-xs text-slate-400">por mes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Resumen</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Total registros",  value: allItems.length.toString() },
                  { label: "Activos",          value: kpis.active.toString() },
                  { label: "Cancelados",       value: (allItems.length - kpis.active).toString() },
                  { label: "Monto colocado",   value: fmtMoney(kpis.colocado) },
                  { label: "Saldo pendiente",  value: fmtMoney(kpis.saldo) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <NuevoPrestamoModal
        open={createOpen}
        employees={catalogsQuery.data?.employees ?? []}
        isPending={createMutation.isPending}
        errors={errors}
        form={form}
        onChange={handleFormChange}
        onClose={() => { setCreateOpen(false); setErrors({}); }}
        onSave={handleSave}
      />

      <DetalleModal
        loanId={detailLoanId}
        onClose={() => setDetailLoanId(null)}
        cancelPending={cancelMutation.isPending}
        payPending={payMutation.isPending}
        onPayInstallment={(loanId, installmentId) =>
          setConfirm({
            title:   "Registrar pago manual",
            message: "¿Marcar esta cuota como pagada? Esta acción no se puede deshacer.",
            danger:  false,
            onConfirm: () => payMutation.mutate({ loanId, installmentId }),
          })
        }
        onCancel={(id) =>
          setConfirm({
            title:   "Cancelar préstamo",
            message: "¿Cancelar este préstamo? Los pagos ya registrados no se verán afectados pero no se generarán más cuotas.",
            danger:  true,
            onConfirm: () => cancelMutation.mutate(id),
          })
        }
      />

      <EditPrestamoModal
        loan={editLoan}
        isPending={editMutation.isPending}
        onClose={() => setEditLoan(null)}
        onSave={(id, patch) => editMutation.mutate({ id, patch })}
      />
    </div>
  );
}
