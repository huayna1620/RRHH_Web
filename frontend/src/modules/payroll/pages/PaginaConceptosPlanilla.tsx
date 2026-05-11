import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  createPayrollConcept,
  deletePayrollConcept,
  getPayrollConcepts,
  updatePayrollConcept,
} from "@/modules/payroll/services/payrollConceptsApi";
import type {
  CreatePayrollConceptRequest,
  PayrollConcept,
  UpdatePayrollConceptRequest,
} from "@/modules/payroll/types/payroll.types";

// ─── constants ───────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "earning",   label: "Bonificación", color: "emerald" },
  { value: "deduction", label: "Descuento",    color: "red"     },
] as const;

const CALC_OPTIONS = [
  { value: "fixed",      label: "Monto fijo"  },
  { value: "percentage", label: "Porcentaje"  },
] as const;

type ConceptType = "earning" | "deduction";
type CalcMode   = "fixed" | "percentage";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function typeBadge(type: ConceptType): JSX.Element {
  if (type === "earning") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Bonificación
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Descuento
    </span>
  );
}

function autoBadge(auto: boolean): JSX.Element {
  if (auto) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        ⚡ Automático
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      ✋ Manual
    </span>
  );
}

function calcDisplay(c: PayrollConcept): string {
  if (c.fixedAmount != null) return fmtMoney(c.fixedAmount);
  if (c.percentage  != null) return `${c.percentage}%`;
  return "—";
}

function calcMode(c: PayrollConcept): CalcMode {
  return c.fixedAmount != null ? "fixed" : "percentage";
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }): JSX.Element | null {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-2xl border max-w-sm animate-in slide-in-from-bottom-4 ${isError ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
      <span className="text-lg font-bold">{isError ? "✕" : "✓"}</span>
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none ml-2">×</button>
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

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: number; sub: string; icon: string; accent: string }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${checked ? "bg-emerald-500" : "bg-slate-200"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

// ─── Validación ───────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<string, string>>;

function validateForm(form: FormState, isNew: boolean): FormErrors {
  const errors: FormErrors = {};
  if (isNew) {
    if (!form.code.trim()) errors.code = "El código es obligatorio.";
    else if (!/^[A-Za-z0-9_\-]+$/.test(form.code.trim())) errors.code = "Solo letras, números, guiones o guiones bajos.";
  }
  if (!form.name.trim()) errors.name = "El nombre es obligatorio.";
  else if (form.name.trim().length < 3) errors.name = "Mínimo 3 caracteres.";
  if (!form.type) errors.type = "Selecciona un tipo.";
  if (form.calcMode === "fixed") {
    if (form.fixedAmount === "" || form.fixedAmount === null) errors.fixedAmount = "El monto es obligatorio.";
    else if (Number(form.fixedAmount) <= 0) errors.fixedAmount = "El monto debe ser mayor a 0.";
  }
  if (form.calcMode === "percentage") {
    if (form.percentage === "" || form.percentage === null) errors.percentage = "El porcentaje es obligatorio.";
    else if (Number(form.percentage) <= 0 || Number(form.percentage) > 100) errors.percentage = "Debe estar entre 0.01 y 100.";
  }
  return errors;
}

// ─── FormState ────────────────────────────────────────────────────────────────

type FormState = {
  code:        string;
  name:        string;
  type:        ConceptType;
  calcMode:    CalcMode;
  fixedAmount: string | null;
  percentage:  string | null;
  isAutomatic: boolean;
  isActive:    boolean;
  description: string;
};

function blankForm(): FormState {
  return {
    code: "", name: "", type: "earning", calcMode: "fixed",
    fixedAmount: "", percentage: "", isAutomatic: false, isActive: true, description: "",
  };
}

function conceptToForm(c: PayrollConcept): FormState {
  return {
    code: c.code,
    name: c.name,
    type: c.type as ConceptType,
    calcMode: c.fixedAmount != null ? "fixed" : "percentage",
    fixedAmount: c.fixedAmount != null ? String(c.fixedAmount) : "",
    percentage:  c.percentage  != null ? String(c.percentage)  : "",
    isAutomatic: c.isAutomatic,
    isActive:    c.isActive,
    description: c.description ?? "",
  };
}

function formToCreate(f: FormState): CreatePayrollConceptRequest {
  return {
    code: f.code.trim(),
    name: f.name.trim(),
    type: f.type,
    fixedAmount: f.calcMode === "fixed" && f.fixedAmount ? Number(f.fixedAmount) : null,
    percentage:  f.calcMode === "percentage" && f.percentage ? Number(f.percentage) : null,
    isAutomatic: f.isAutomatic,
    description: f.description.trim() || null,
  };
}

function formToUpdate(f: FormState): UpdatePayrollConceptRequest {
  return {
    name: f.name.trim(),
    type: f.type,
    fixedAmount: f.calcMode === "fixed" && f.fixedAmount ? Number(f.fixedAmount) : null,
    percentage:  f.calcMode === "percentage" && f.percentage ? Number(f.percentage) : null,
    isAutomatic: f.isAutomatic,
    isActive:    f.isActive,
    description: f.description.trim() || null,
  };
}

// ─── ConceptModal ─────────────────────────────────────────────────────────────

type ConceptModalProps = {
  open:       boolean;
  isNew:      boolean;
  isPending:  boolean;
  errors:     FormErrors;
  form:       FormState;
  onChange:   (patch: Partial<FormState>) => void;
  onClose:    () => void;
  onSave:     () => void;
};

function ConceptModal({ open, isNew, isPending, errors, form, onChange, onClose, onSave }: ConceptModalProps): JSX.Element | null {
  if (!open) return null;

  const typeLabel  = form.type === "earning" ? "Bonificación" : "Descuento";
  const calcLabel  = form.calcMode === "fixed"
    ? (form.fixedAmount ? fmtMoney(Number(form.fixedAmount)) : "—")
    : (form.percentage  ? `${form.percentage}%` : "—");

  const exampleLine = form.type === "earning"
    ? `+${form.calcMode === "fixed" ? (form.fixedAmount ? fmtMoney(Number(form.fixedAmount)) : "—") : (form.percentage ? `${form.percentage}%` : "—")}`
    : `-${form.calcMode === "fixed" ? (form.fixedAmount ? fmtMoney(Number(form.fixedAmount)) : "—") : (form.percentage ? `${form.percentage}%` : "—")}`;

  const showDeactivateWarning = !isNew && !form.isActive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                {isNew ? "➕" : "✏️"}
              </div>
              <div>
                <h2 className="text-lg font-bold">{isNew ? "Nuevo concepto" : "Editar concepto"}</h2>
                <p className="text-sm text-emerald-100 mt-0.5">
                  Configura bonificaciones, descuentos y reglas de aplicación para la planilla.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">×</button>
          </div>
        </div>

        {/* Body: 2 columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Sección 1: Identificación */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">1</span>
                Identificación
              </h3>
              <div className="space-y-3">
                {isNew && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Código <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.code}
                      onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
                      placeholder="Ej: BOND-001"
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.code ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                    />
                    {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
                  </div>
                )}
                {!isNew && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500">Código:</span>
                    <span className="text-sm font-mono font-bold text-slate-800">{form.code}</span>
                    <span className="text-xs text-slate-400 ml-auto">Solo lectura</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="Ej: Asignación familiar"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.name ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                  />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ type: opt.value })}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.type === opt.value
                            ? opt.value === "earning"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {opt.value === "earning" ? "🟢" : "🔴"} {opt.label}
                      </button>
                    ))}
                  </div>
                  {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type}</p>}
                </div>
              </div>
            </div>

            {/* Sección 2: Modo de cálculo */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">2</span>
                Modo de cálculo
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {CALC_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ calcMode: opt.value, fixedAmount: "", percentage: "" })}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.calcMode === opt.value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.value === "fixed" ? "💵" : "📊"} {opt.label}
                    </button>
                  ))}
                </div>

                {form.calcMode === "fixed" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Monto fijo (S/) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">S/</span>
                      <input
                        type="number" min="0.01" step="0.01"
                        value={form.fixedAmount ?? ""}
                        onChange={(e) => onChange({ fixedAmount: e.target.value })}
                        placeholder="0.00"
                        className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.fixedAmount ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                      />
                    </div>
                    {errors.fixedAmount && <p className="text-xs text-red-600 mt-1">{errors.fixedAmount}</p>}
                  </div>
                )}

                {form.calcMode === "percentage" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Porcentaje (%) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number" min="0.01" max="100" step="0.01"
                        value={form.percentage ?? ""}
                        onChange={(e) => onChange({ percentage: e.target.value })}
                        placeholder="0.00"
                        className={`w-full rounded-lg border pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.percentage ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">%</span>
                    </div>
                    {errors.percentage && <p className="text-xs text-red-600 mt-1">{errors.percentage}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Sección 3: Comportamiento */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">3</span>
                Comportamiento
              </h3>
              <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Cálculo automático</p>
                    <p className="text-xs text-slate-500 mt-0.5">Se aplica sin intervención manual en cada planilla</p>
                  </div>
                  <Toggle checked={form.isAutomatic} onChange={(v) => onChange({ isAutomatic: v })} />
                </div>
                {!isNew && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Concepto activo</p>
                      <p className="text-xs text-slate-500 mt-0.5">Los conceptos inactivos no se incluyen en planilla</p>
                    </div>
                    <Toggle checked={form.isActive} onChange={(v) => onChange({ isActive: v })} />
                  </div>
                )}
              </div>
              {showDeactivateWarning && (
                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                  <p className="text-xs text-amber-700 leading-snug">
                    Al desactivar este concepto quedará excluido del cálculo de futuras planillas. Los registros históricos no se ven afectados.
                  </p>
                </div>
              )}
            </div>

            {/* Sección 4: Descripción */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">4</span>
                Descripción
              </h3>
              <textarea
                value={form.description}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={3}
                placeholder="Describe la regla de negocio o condición de aplicación de este concepto..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-slate-700"
              />
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-56 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 flex flex-col overflow-y-auto hidden sm:flex">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Vista previa</p>

            <div className="space-y-2.5 flex-1">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Código</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5 truncate">{form.code || "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Nombre</p>
                <p className="font-semibold text-slate-900 text-sm mt-0.5 leading-tight">{form.name || "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400 mb-1.5">Tipo</p>
                {typeBadge(form.type)}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Cálculo</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{calcLabel}</p>
                <p className="text-xs text-slate-400">{form.calcMode === "fixed" ? "Monto fijo" : "Porcentaje"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">Automático</p>
                <span className={`text-xs font-bold ${form.isAutomatic ? "text-amber-600" : "text-slate-500"}`}>
                  {form.isAutomatic ? "⚡ Sí" : "✋ No"}
                </span>
              </div>
              {!isNew && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Estado</p>
                  <span className={`text-xs font-bold ${form.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                    {form.isActive ? "● Activo" : "○ Inactivo"}
                  </span>
                </div>
              )}
            </div>

            {/* Example */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold">Ejemplo de aplicación</p>
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Empleado ejemplo</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className={form.type === "earning" ? "text-emerald-700" : "text-red-600"}>
                    {form.name || typeLabel}
                  </span>
                  <span className={form.type === "earning" ? "text-emerald-700" : "text-red-600"}>
                    {exampleLine}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            disabled={isPending}
            onClick={onSave}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isPending ? "Guardando..." : (isNew ? "Crear concepto" : "Guardar cambios")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RowMenu ──────────────────────────────────────────────────────────────────

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors"
      >
        •••
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PieChart label ───────────────────────────────────────────────────────────

interface PieLabelProps { cx: number; cy: number; midAngle: number; outerRadius: number; percent: number; name: string }
function renderPieLabel({ cx, cy, midAngle, outerRadius, percent, name }: PieLabelProps) {
  if (percent < 0.08) return null;
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

export function PaginaConceptosPlanilla(): JSX.Element {
  const queryClient = useQueryClient();

  // ── UI state ──
  const [toast, setToast]       = useState<ToastState>(null);
  const [confirm, setConfirm]   = useState<ConfirmState>(null);
  const [modalOpen, setModal]   = useState(false);
  const [isNew, setIsNew]       = useState(true);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormState>(blankForm());
  const [errors, setErrors]     = useState<FormErrors>({});

  // ── Filters ──
  const [search,    setSearch]    = useState("");
  const [typeFilter,  setType]    = useState<"" | "earning" | "deduction">("");
  const [stateFilter, setState]   = useState<"" | "active" | "inactive">("");
  const [modeFilter,  setMode]    = useState<"" | "automatic" | "manual">("");

  const ok   = (msg: string) => setToast({ type: "success", message: msg });
  const fail = (msg: string) => setToast({ type: "error",   message: msg });
  const invalidate = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["payroll-concepts"] });

  // ── Query ──
  const listQuery = useQuery({ queryKey: ["payroll-concepts"], queryFn: getPayrollConcepts });
  const all: PayrollConcept[] = listQuery.data ?? [];

  // ── KPIs ──
  const kpis = useMemo(() => ({
    active:    all.filter((r) => r.isActive).length,
    earnings:  all.filter((r) => r.type === "earning").length,
    deductions:all.filter((r) => r.type === "deduction").length,
    automatic: all.filter((r) => r.isAutomatic).length,
  }), [all]);

  // ── Pie data ──
  const pieData = useMemo(() => [
    { name: "Bonificaciones", value: kpis.earnings  },
    { name: "Descuentos",     value: kpis.deductions },
  ].filter((d) => d.value > 0), [kpis]);

  // ── Filtered rows ──
  const rows = useMemo(() => {
    let list = all;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    }
    if (typeFilter)  list = list.filter((r) => r.type === typeFilter);
    if (stateFilter) list = list.filter((r) => stateFilter === "active" ? r.isActive : !r.isActive);
    if (modeFilter)  list = list.filter((r) => modeFilter === "automatic" ? r.isAutomatic : !r.isAutomatic);
    return list;
  }, [all, search, typeFilter, stateFilter, modeFilter]);

  const autoList = useMemo(() => all.filter((r) => r.isAutomatic && r.isActive), [all]);

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: () => {
      if (isNew) return createPayrollConcept(formToCreate(form));
      return updatePayrollConcept(editId!, formToUpdate(form));
    },
    onSuccess: async () => {
      await invalidate();
      ok(isNew ? "✓ Concepto creado correctamente." : "✓ Concepto actualizado.");
      setModal(false);
    },
    onError: () => fail("No se pudo guardar el concepto. Verifica que el código no esté duplicado."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayrollConcept(id),
    onSuccess: async () => { await invalidate(); ok("Concepto eliminado."); },
    onError: () => fail("No se pudo eliminar el concepto."),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ concept, active }: { concept: PayrollConcept; active: boolean }) =>
      updatePayrollConcept(concept.id, {
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
  function openEdit(c: PayrollConcept) { setForm(conceptToForm(c)); setErrors({}); setIsNew(false); setEditId(c.id); setModal(true); }

  function handleSave() {
    const errs = validateForm(form, isNew);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    saveMutation.mutate();
  }

  function handleFormChange(patch: Partial<FormState>) {
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
  function handleExport(format: ExportFormat): void {
    if (!rows.length) { fail("No hay conceptos para exportar con los filtros actuales."); return; }
    const data = rows.map((r) => ({
      "Código":      r.code,
      "Nombre":      r.name,
      "Tipo":        r.type === "earning" ? "Bonificación" : "Descuento",
      "Monto fijo":  r.fixedAmount != null ? fmtMoney(r.fixedAmount) : "—",
      "Porcentaje":  r.percentage  != null ? `${r.percentage}%` : "—",
      "Automático":  r.isAutomatic ? "Sí" : "No",
      "Activo":      r.isActive    ? "Sí" : "No",
      "Descripción": r.description ?? "",
    }));
    exportRows(format, data, makeFileName("Conceptos-Planilla"), "Conceptos de planilla", {
      subtitle: "Catálogo de bonificaciones, descuentos y conceptos automáticos.",
      period:   "Configuración vigente",
      filters: [
        { label: "Tipo",       value: typeFilter  === "earning"   ? "Bonificación" : typeFilter === "deduction" ? "Descuento" : "Todos" },
        { label: "Estado",     value: stateFilter === "active"    ? "Activos"      : stateFilter === "inactive" ? "Inactivos" : "Todos" },
        { label: "Modo",       value: modeFilter  === "automatic" ? "Automáticos"  : modeFilter === "manual"   ? "Manuales"  : "Todos" },
        { label: "Búsqueda",   value: search || "—" },
      ],
      metrics: [
        { label: "Total",          value: rows.length          },
        { label: "Bonificaciones", value: kpis.earnings        },
        { label: "Descuentos",     value: kpis.deductions      },
        { label: "Automáticos",    value: kpis.automatic       },
      ],
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />

      {/* ── Encabezado ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 shadow-sm shadow-emerald-500/30 flex items-center justify-center text-white text-xl flex-shrink-0">
              📋
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Conceptos de planilla</h1>
              <p className="text-sm text-slate-500 mt-0.5">Configuración de bonificaciones, descuentos y reglas automáticas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ExportMenu
              fileName={makeFileName("Conceptos-Planilla")}
              filtersActive={hasFilters}
              resultCount={rows.length}
              onExport={handleExport}
            />
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors"
            >
              ➕ Nuevo concepto
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Activos"        value={kpis.active}     sub="Conceptos en uso"        icon="✅" accent="bg-emerald-100" />
          <KpiCard label="Bonificaciones" value={kpis.earnings}   sub="Tipos de ingreso"        icon="🟢" accent="bg-blue-100"    />
          <KpiCard label="Descuentos"     value={kpis.deductions} sub="Tipos de descuento"      icon="🔴" accent="bg-red-100"     />
          <KpiCard label="Automáticos"    value={kpis.automatic}  sub="Se aplican sin acción"   icon="⚡" accent="bg-amber-100"   />
        </div>

        {/* ── Filtros ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-44">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código o nombre..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              )}
            </div>

            {/* Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setType(e.target.value as "" | "earning" | "deduction")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Todos los tipos</option>
              <option value="earning">Bonificaciones</option>
              <option value="deduction">Descuentos</option>
            </select>

            {/* Estado */}
            <select
              value={stateFilter}
              onChange={(e) => setState(e.target.value as "" | "active" | "inactive")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>

            {/* Modo */}
            <select
              value={modeFilter}
              onChange={(e) => setMode(e.target.value as "" | "automatic" | "manual")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Automático y manual</option>
              <option value="automatic">Solo automáticos</option>
              <option value="manual">Solo manuales</option>
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                ✕ Limpiar
              </button>
            )}

            <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">{rows.length} resultado{rows.length !== 1 ? "s" : ""}</span>
          </div>
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
                <div className="text-5xl mb-3">📋</div>
                <p className="text-base font-semibold text-slate-700">
                  {hasFilters ? "Sin resultados" : "Aún no hay conceptos"}
                </p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                  {hasFilters
                    ? "Prueba con otros filtros o limpia la búsqueda."
                    : "Crea el primer concepto de bonificación o descuento para comenzar."}
                </p>
                {!hasFilters && (
                  <button
                    onClick={openNew}
                    className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                  >
                    ➕ Crear primer concepto
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Cálculo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Modo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Activo</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((r, idx) => (
                      <tr key={r.id} className={`hover:bg-slate-50 transition-colors group ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        {/* Código */}
                        <td className="px-4 py-3">
                          <span className="inline-block font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                            {r.code}
                          </span>
                        </td>
                        {/* Nombre */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-semibold text-slate-900 leading-tight truncate">{r.name}</p>
                          {r.description && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{r.description}</p>
                          )}
                        </td>
                        {/* Tipo */}
                        <td className="px-4 py-3">{typeBadge(r.type as ConceptType)}</td>
                        {/* Cálculo */}
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold tabular-nums ${r.type === "earning" ? "text-emerald-700" : "text-red-600"}`}>
                            {calcDisplay(r)}
                          </span>
                          <p className="text-xs text-slate-400">{calcMode(r) === "fixed" ? "Monto fijo" : "Porcentaje"}</p>
                        </td>
                        {/* Modo */}
                        <td className="px-4 py-3 text-center">{autoBadge(r.isAutomatic)}</td>
                        {/* Toggle activo */}
                        <td className="px-4 py-3 text-center">
                          <Toggle
                            checked={r.isActive}
                            disabled={toggleActiveMutation.isPending}
                            onChange={(v) => {
                              if (!v) {
                                setConfirm({
                                  title: "Desactivar concepto",
                                  message: `¿Desactivar "${r.name}"? Quedará excluido del cálculo de futuras planillas.`,
                                  danger: true,
                                  onConfirm: () => toggleActiveMutation.mutate({ concept: r, active: false }),
                                });
                              } else {
                                toggleActiveMutation.mutate({ concept: r, active: true });
                              }
                            }}
                          />
                        </td>
                        {/* Acciones */}
                        <td className="px-4 py-3 text-right">
                          <RowMenu
                            onEdit={() => openEdit(r)}
                            onDelete={() =>
                              setConfirm({
                                title:   "Eliminar concepto",
                                message: `¿Eliminar "${r.name}"? Esta acción no se puede deshacer.`,
                                danger:  true,
                                onConfirm: () => deleteMutation.mutate(r.id),
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
                        {rows.length} concepto{rows.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">
                          {rows.filter((r) => r.type === "earning").length} bonif. · {rows.filter((r) => r.type === "deduction").length} desc.
                        </span>
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="w-64 flex-shrink-0 hidden xl:flex flex-col gap-4">

            {/* Distribución */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Distribución</h3>
                <div style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        labelLine={false}
                        label={renderPieLabel as (props: unknown) => JSX.Element | null}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v} conceptos`, ""]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-slate-600 flex-1">Bonificaciones</span>
                    <span className="font-bold text-slate-900">{kpis.earnings}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-slate-600 flex-1">Descuentos</span>
                    <span className="font-bold text-slate-900">{kpis.deductions}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Automáticos activos */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                ⚡ Automáticos activos
              </h3>
              {autoList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin conceptos automáticos activos.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {autoList.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${c.type === "earning" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                        <p className="text-xs text-slate-400">{calcDisplay(c)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Resumen</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Total conceptos",  value: all.length                                 },
                  { label: "Activos",          value: kpis.active                                },
                  { label: "Inactivos",        value: all.length - kpis.active                   },
                  { label: "Automáticos",      value: kpis.automatic                             },
                  { label: "Manuales",         value: all.filter((r) => !r.isAutomatic).length   },
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

      {/* ── Modal crear / editar ── */}
      <ConceptModal
        open={modalOpen}
        isNew={isNew}
        isPending={saveMutation.isPending}
        errors={errors}
        form={form}
        onChange={handleFormChange}
        onClose={() => setModal(false)}
        onSave={handleSave}
      />
    </div>
  );
}
