import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  approvePayroll,
  downloadBankFile,
  downloadBulkPayslips,
  downloadPayslip,
  generatePayroll,
  getBankFormats,
  getPayroll,
  getPayrollCatalogs,
  markPayrollPaid,
  previewBankFile,
  unapprovePayroll,
  updatePayrollAdjustments,
} from "@/modules/payroll/services/payrollApi";
import type { BankFilePreview, BankFormatDescriptor } from "@/modules/payroll/services/payrollApi";
import type { PayrollItem } from "@/modules/payroll/types/payroll.types";

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

type StatusConfig = { label: string; bg: string; text: string; dot: string };
const STATUS: Record<string, StatusConfig> = {
  draft:    { label: "Borrador",  bg: "bg-slate-100",   text: "text-slate-700",  dot: "bg-slate-400"   },
  approved: { label: "Aprobado",  bg: "bg-blue-100",  text: "text-blue-700", dot: "bg-blue-500"  },
  paid:     { label: "Pagado",    bg: "bg-emerald-100", text: "text-emerald-700",dot: "bg-emerald-500" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function padMonth(m: number): string { return String(m).padStart(2, "0"); }
function monthLabel(m: number): string { return MONTHS[m - 1] ?? String(m); }

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function avatarBg(name: string): string {
  const colors = [
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500",
    "bg-indigo-500",  "bg-blue-500",   "bg-cyan-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function blobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-2xl border max-w-sm ${
        isError ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
      }`}
    >
      <span className="text-lg">{isError ? "✕" : "✓"}</span>
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
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

function KpiCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string; sub?: string; icon: string; accent: string;
}): JSX.Element {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }): JSX.Element {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-emerald-600" : "bg-slate-200"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): JSX.Element {
  const s = STATUS[status] ?? STATUS["draft"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── GenerarPlanillaModal ─────────────────────────────────────────────────────

type GenerarProps = {
  open: boolean;
  year: number; month: number;
  employees: { id: string; label: string }[];
  isPending: boolean;
  onClose: () => void;
  onGenerate: (payload: { year: number; month: number; employeeId: string; forceRecalculate: boolean }) => void;
};

function GenerarPlanillaModal({ open, year, month, employees, isPending, onClose, onGenerate }: GenerarProps): JSX.Element | null {
  const [selYear, setSelYear] = useState(year);
  const [selMonth, setSelMonth] = useState(month);
  const [employeeId, setEmployeeId] = useState("");
  const [force, setForce] = useState(false);
  const [scope, setScope] = useState<"all" | "one">("all");

  useEffect(() => { if (open) { setSelYear(year); setSelMonth(month); setEmployeeId(""); setForce(false); setScope("all"); } }, [open, year, month]);

  if (!open) return null;

  const selEmployee = employees.find((e) => e.id === employeeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Generar Planilla</h2>
              <p className="text-sm text-emerald-100 mt-0.5">Calcula y registra los haberes del período seleccionado</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">×</button>
          </div>
        </div>

        <div className="flex divide-x divide-slate-100">
          {/* Left: form */}
          <div className="flex-1 p-6 space-y-5">
            {/* Período */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">📅 Período</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Año</label>
                  <select
                    value={selYear}
                    onChange={(e) => setSelYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Mes</label>
                  <select
                    value={selMonth}
                    onChange={(e) => setSelMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Alcance */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">👥 Alcance</h3>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(["all", "one"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setScope(v); if (v === "all") setEmployeeId(""); }}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${scope === v ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {v === "all" ? "Todos los colaboradores" : "Colaborador específico"}
                  </button>
                ))}
              </div>
              {scope === "one" && (
                <div className="mt-3">
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">— Seleccionar colaborador —</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Opciones */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">⚙️ Opciones</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                <Toggle checked={force} onChange={setForce} label="Forzar recálculo" />
                {force && (
                  <p className="text-xs text-amber-700 ml-14">⚠️ Recalculará incluso registros ya aprobados. Úsalo con precaución.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-52 p-6 bg-slate-50 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Vista previa</h3>
            <div className="flex-1 space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Período</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{monthLabel(selMonth)} {selYear}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Colaboradores</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {scope === "all" ? `Todos (${employees.length})` : selEmployee?.label ?? "Ninguno seleccionado"}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Modo</p>
                <p className="font-bold text-sm mt-0.5" style={{ color: force ? "#d97706" : "#10b981" }}>
                  {force ? "Recálculo forzado" : "Normal"}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <button
                disabled={isPending || (scope === "one" && !employeeId)}
                onClick={() => onGenerate({ year: selYear, month: selMonth, employeeId, forceRecalculate: force })}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "⚡"}
                {isPending ? "Generando..." : "Generar"}
              </button>
              <button onClick={onClose} className="w-full py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AjustarModal ────────────────────────────────────────────────────────────

type AjustarProps = {
  item: PayrollItem | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (id: string, bonuses: number, deductions: number, notes: string) => void;
};

function AjustarModal({ item, isPending, onClose, onSave }: AjustarProps): JSX.Element | null {
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

  if (!item) return null;

  const newNet = item.baseSalary + item.automaticBonuses + Number(bonuses) - item.automaticDeductions - item.incidentDeductions - item.loanDeductions - Number(deductions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Ajustar Planilla</h2>
              <p className="text-sm text-emerald-100 mt-0.5">{item.employeeName} · {item.employeeCode}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Breakdown read-only */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Desglose actual</h3>
            <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
              {[
                ["Salario base", item.baseSalary, false],
                ["Bonif. automáticas", item.automaticBonuses, false],
                ["Desc. automáticos", item.automaticDeductions, true],
                ["Desc. por incidencias", item.incidentDeductions, true],
                ["Desc. por préstamos", item.loanDeductions, true],
              ].map(([label, val, isDed]) => (
                <div key={String(label)} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-slate-600">{String(label)}</span>
                  <span className={`font-medium ${isDed ? "text-red-600" : "text-slate-900"}`}>
                    {isDed ? "−" : "+"} {fmtCurrency(Number(val))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">
                Bonificaciones manuales
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">S/</span>
                <input
                  type="number" min="0" step="0.01" value={bonuses}
                  onChange={(e) => setBonuses(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">
                Descuentos manuales
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">S/</span>
                <input
                  type="number" min="0" step="0.01" value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Notas internas</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Motivo del ajuste, observaciones..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Neto calculado */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-700">Neto estimado</span>
            <span className="text-xl font-bold text-emerald-900">{fmtCurrency(Math.max(0, newNet))}</span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button
              disabled={isPending}
              onClick={() => onSave(item.id, Number(bonuses), Number(deductions), notes)}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isPending ? "Guardando..." : "Guardar ajuste"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BankFileModal ────────────────────────────────────────────────────────────

type BankFileProps = {
  open: boolean;
  year: number; month: number;
  formats: BankFormatDescriptor[];
  onClose: () => void;
};

function BankFileModal({ open, year, month, formats, onClose }: BankFileProps): JSX.Element | null {
  const [selectedFormat, setSelectedFormat] = useState("");
  const [preview, setPreview] = useState<BankFilePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) { setSelectedFormat(""); setPreview(null); }
    if (open && formats.length > 0) setSelectedFormat(formats[0].code);
  }, [open, formats]);

  useEffect(() => {
    if (!selectedFormat) return;
    setPreview(null);
    setLoadingPreview(true);
    previewBankFile(year, month, selectedFormat)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false));
  }, [selectedFormat, year, month]);

  if (!open) return null;

  const fmt = formats.find((f) => f.code === selectedFormat);

  function handleDownload() {
    if (!selectedFormat) return;
    setDownloading(true);
    downloadBankFile(year, month, selectedFormat)
      .then((blob) => blobDownload(blob, preview?.fileName ?? `banco_${year}_${padMonth(month)}.${fmt?.fileExtension ?? "txt"}`))
      .catch(() => {})
      .finally(() => setDownloading(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Archivo Bancario</h2>
              <p className="text-sm text-slate-300 mt-0.5">{monthLabel(month)} {year} · Transferencias de nómina</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">×</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Format selector */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-2">Formato bancario</label>
            <div className="grid grid-cols-2 gap-2">
              {formats.map((f) => (
                <button
                  key={f.code}
                  onClick={() => setSelectedFormat(f.code)}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                    selectedFormat === f.code
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-sm font-bold text-slate-900">{f.displayName}</span>
                  <span className="text-xs text-slate-500 mt-0.5">.{f.fileExtension}</span>
                </button>
              ))}
            </div>
            {fmt && <p className="text-xs text-slate-500 mt-2 italic">{fmt.description}</p>}
          </div>

          {/* Preview */}
          {loadingPreview && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
              Calculando vista previa...
            </div>
          )}
          {preview && !loadingPreview && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">Colaboradores incluidos</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{preview.includedCount}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">Monto total</p>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">{fmtCurrency(preview.totalAmount)}</p>
                </div>
              </div>
              {preview.skipped.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1.5">⚠️ {preview.skipped.length} omitido(s):</p>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {preview.skipped.map((s) => (
                      <div key={s.employeeId} className="flex justify-between text-xs text-slate-600 bg-white rounded px-2 py-1 border border-slate-100">
                        <span className="font-medium">{s.fullName}</span>
                        <span className="text-slate-400">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button
              disabled={!selectedFormat || downloading || loadingPreview}
              onClick={handleDownload}
              className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {downloading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {downloading ? "Generando..." : "⬇ Descargar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ExportDropdown ───────────────────────────────────────────────────────────

type ExportDropdownProps = {
  onExport: (fmt: ExportFormat) => void;
  onBankFile: () => void;
  onBulkPayslips: () => void;
};

function ExportDropdown({ onExport, onBankFile, onBulkPayslips }: ExportDropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const exportOptions: { fmt: ExportFormat; label: string; icon: string; color: string }[] = [
    { fmt: "excel",  label: "Excel (.xlsx)",  icon: "📊", color: "text-emerald-700" },
    { fmt: "csv",    label: "CSV",            icon: "📄", color: "text-blue-700"    },
    { fmt: "pdf",    label: "PDF",            icon: "📕", color: "text-red-700"     },
    { fmt: "print",  label: "Imprimir",       icon: "🖨️", color: "text-slate-700"   },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 shadow-sm transition-colors"
      >
        ⬇ Exportar
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-30 overflow-hidden">
          <div className="py-1">
            <p className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Reportes</p>
            {exportOptions.map(({ fmt, label, icon, color }) => (
              <button
                key={fmt}
                onClick={() => { onExport(fmt); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
              >
                <span>{icon}</span>
                <span className={`font-medium ${color}`}>{label}</span>
              </button>
            ))}
            <div className="my-1 border-t border-slate-100" />
            <p className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Boletas</p>
            <button
              onClick={() => { onBulkPayslips(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
            >
              <span>🗂️</span>
              <span className="font-medium text-slate-700">Descargar todas (.zip)</span>
            </button>
            <div className="my-1 border-t border-slate-100" />
            <p className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Banco</p>
            <button
              onClick={() => { onBankFile(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
            >
              <span>🏦</span>
              <span className="font-medium text-slate-700">Archivo bancario</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RowActionsMenu ───────────────────────────────────────────────────────────

function RowActionsMenu({
  item,
  onPayslip,
  onAdjust,
}: {
  item: PayrollItem;
  onPayslip: () => void;
  onAdjust: () => void;
}): JSX.Element {
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
        className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
      >
        •••
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
          <button
            onClick={() => { onPayslip(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
          >
            📄 Boleta de pago
          </button>
          {item.status === "draft" && (
            <button
              onClick={() => { onAdjust(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-emerald-700"
            >
              ✏️ Ajustar importes
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PieChart custom label ─────────────────────────────────────────────────

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
  name: string;
}

function renderPieLabel({ cx, cy, midAngle, outerRadius, percent, name }: PieLabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 18;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fontSize={10} fill="#475569" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function PaginaPlanilla(): JSX.Element {
  const queryClient = useQueryClient();
  const today = new Date();
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth() + 1);
  const [search, setSearch]   = useState("");
  const [areaId, setAreaId]   = useState("");
  const [pageNumber, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [toast, setToast] = useState<ToastState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const [generateOpen, setGenerateOpen]   = useState(false);
  const [adjustItem, setAdjustItem]       = useState<PayrollItem | null>(null);
  const [bankFileOpen, setBankFileOpen]   = useState(false);

  const ok   = (msg: string) => setToast({ type: "success", message: msg });
  const fail = (msg: string) => setToast({ type: "error",   message: msg });
  const invalidate = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["payroll"] });

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
    const total   = kpiItems.length;
    const neto    = kpiItems.reduce((s, r) => s + r.netPay, 0);
    const draft   = kpiItems.filter((r) => r.status === "draft").length;
    const approved = kpiItems.filter((r) => r.status === "approved").length;
    const paid    = kpiItems.filter((r) => r.status === "paid").length;
    return { total, neto, draft, approved, paid };
  }, [kpiItems]);

  const areaDistribution = useMemo(() => {
    const map = new Map<string, number>();
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
    mutationFn: ({ id, bonuses, deductions, notes }: { id: string; bonuses: number; deductions: number; notes: string }) =>
      updatePayrollAdjustments(id, { bonuses, deductions, notes }),
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

  async function handleExport(format: ExportFormat): Promise<void> {
    try {
      const result = await getPayroll({ ...baseQuery, search, areaId, pageNumber: 1, pageSize: 9999 });
      if (!result.items.length) { fail("No hay registros para exportar."); return; }
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
    } catch { fail("No se pudo exportar."); }
  }

  function handleBulkDownload(): void {
    downloadBulkPayslips(year, month)
      .then((blob) => blobDownload(blob, `boletas_${year}_${padMonth(month)}.zip`))
      .catch(() => fail("No se pudo descargar las boletas."));
  }

  function handlePayslip(id: string, name: string): void {
    downloadPayslip(id)
      .then((blob) => blobDownload(blob, `boleta_${name.replace(/\s+/g, "_")}_${year}_${padMonth(month)}.pdf`))
      .catch(() => fail("No se pudo descargar la boleta."));
  }

  // ── list data ─────────────────────────────────────────────────────────────

  const rows     = listQuery.data?.items ?? [];
  const total    = listQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function changePeriod(y: number, m: number): void { setYear(y); setMonth(m); setPage(1); }

  function prevMonth(): void {
    if (month === 1) changePeriod(year - 1, 12);
    else changePeriod(year, month - 1);
  }
  function nextMonth(): void {
    if (month === 12) changePeriod(year + 1, 1);
    else changePeriod(year, month + 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Planilla</h1>
            <p className="text-sm text-slate-500 mt-0.5">Nómina mensual · {monthLabel(month)} {year}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportDropdown
              onExport={handleExport}
              onBankFile={() => setBankFileOpen(true)}
              onBulkPayslips={handleBulkDownload}
            />
            <button
              onClick={() => setGenerateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors"
            >
              ⚡ Generar planilla
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Colaboradores"
            value={kpis.total.toLocaleString("es-PE")}
            sub={`${monthLabel(month)} ${year}`}
            icon="👥"
            accent="bg-emerald-100"
          />
          <KpiCard
            label="Total neto"
            value={fmtCurrency(kpis.neto)}
            sub="Período completo"
            icon="💰"
            accent="bg-emerald-100"
          />
          <KpiCard
            label="Borradores"
            value={kpis.draft.toLocaleString("es-PE")}
            sub="Pendientes de aprobar"
            icon="✏️"
            accent="bg-slate-100"
          />
          <KpiCard
            label="Aprobados"
            value={kpis.approved.toLocaleString("es-PE")}
            sub="Listos para pagar"
            icon="✅"
            accent="bg-emerald-100"
          />
          <KpiCard
            label="Pagados"
            value={kpis.paid.toLocaleString("es-PE")}
            sub="Completados"
            icon="🏦"
            accent="bg-emerald-100"
          />
        </div>

        {/* ── Period nav + filters ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Period navigator */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors">‹</button>
              <div className="flex gap-2">
                <select
                  value={month}
                  onChange={(e) => changePeriod(year, Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <select
                  value={year}
                  onChange={(e) => changePeriod(Number(e.target.value), month)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={nextMonth} className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors">›</button>
            </div>

            {/* Search + area */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Buscar colaborador..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                {search && (
                  <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">×</button>
                )}
              </div>
              <select
                value={areaId}
                onChange={(e) => { setAreaId(e.target.value); setPage(1); }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Todas las áreas</option>
                {catalogsQuery.data?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shrink-0"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} por pág.</option>)}
            </select>
          </div>
        </div>

        {/* ── Bulk actions ── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Acciones masivas:</span>
          <button
            disabled={approveMutation.isPending || kpis.draft === 0}
            onClick={() =>
              setConfirm({
                title: "Aprobar planilla",
                message: `¿Aprobar los ${kpis.draft} registros en borrador de ${monthLabel(month)} ${year}? Esta acción bloquea ediciones.`,
                onConfirm: () => approveMutation.mutate(),
              })
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-40 transition-colors"
          >
            {approveMutation.isPending
              ? <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
              : "✅"} Aprobar todos
          </button>
          <button
            disabled={unapproveMutation.isPending || kpis.approved === 0}
            onClick={() =>
              setConfirm({
                title: "Revertir aprobación",
                message: `¿Revertir los ${kpis.approved} registros aprobados de ${monthLabel(month)} ${year} a borrador?`,
                danger: true,
                onConfirm: () => unapproveMutation.mutate(),
              })
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 disabled:opacity-40 transition-colors"
          >
            ↩ Revertir aprobación
          </button>
          <button
            disabled={paidMutation.isPending || kpis.approved === 0}
            onClick={() =>
              setConfirm({
                title: "Marcar como pagados",
                message: `¿Marcar los ${kpis.approved} registros aprobados de ${monthLabel(month)} ${year} como pagados? Esta acción es irreversible.`,
                danger: true,
                onConfirm: () => paidMutation.mutate(),
              })
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-40 transition-colors"
          >
            {paidMutation.isPending
              ? <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
              : "🏦"} Marcar pagados
          </button>
          <span className="ml-auto text-xs text-slate-400">{total} registros</span>
        </div>

        {/* ── Main 2-column grid ── */}
        <div className="flex gap-6 items-start">
          {/* Table */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Salario base</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Bonificaciones</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Descuentos</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Neto</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {listQuery.isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <span className="w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin inline-block" />
                      </td>
                    </tr>
                  )}
                  {!listQuery.isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="font-medium">Sin registros para este período</p>
                        <p className="text-xs mt-1">Genera la planilla para comenzar</p>
                      </td>
                    </tr>
                  )}
                  {rows.map((r, idx) => (
                    <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarBg(r.employeeName)}`}>
                            {initials(r.employeeName)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{r.employeeName}</p>
                            <p className="text-xs text-slate-400">{r.employeeCode} · {r.area}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium tabular-nums">{fmtCurrency(r.baseSalary)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium tabular-nums">+{fmtCurrency(r.bonuses + r.automaticBonuses)}</td>
                      <td className="px-4 py-3 text-right text-red-500 font-medium tabular-nums">−{fmtCurrency(r.deductions)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">{fmtCurrency(r.netPay)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowActionsMenu
                          item={r}
                          onPayslip={() => handlePayslip(r.id, r.employeeName)}
                          onAdjust={() => setAdjustItem(r)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-emerald-50 border-t-2 border-emerald-100">
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide">Total página</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 tabular-nums">{fmtCurrency(rows.reduce((s, r) => s + r.baseSalary, 0))}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600 tabular-nums">+{fmtCurrency(rows.reduce((s, r) => s + r.bonuses + r.automaticBonuses, 0))}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-red-500 tabular-nums">−{fmtCurrency(rows.reduce((s, r) => s + r.deductions, 0))}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-emerald-900 tabular-nums">{fmtCurrency(rows.reduce((s, r) => s + r.netPay, 0))}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Mostrando {rows.length} de {total} registros
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pageNumber <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors"
                >‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, pageNumber - 2)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg border text-sm transition-colors ${
                        p === pageNumber
                          ? "border-emerald-500 bg-emerald-600 text-white font-semibold"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >{p}</button>
                  );
                })}
                <button
                  disabled={pageNumber >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm flex items-center justify-center transition-colors"
                >›</button>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="w-72 shrink-0 hidden xl:flex flex-col gap-4">
            {/* Period summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Resumen del período</h3>
              <div className="space-y-3">
                {[
                  { label: "Colaboradores", value: kpis.total.toString(), color: "text-slate-900" },
                  { label: "Total bruto", value: fmtCurrency(kpiItems.reduce((s, r) => s + r.grossIncome, 0)), color: "text-slate-900" },
                  { label: "Total descuentos", value: fmtCurrency(kpiItems.reduce((s, r) => s + r.deductions, 0)), color: "text-red-600" },
                  { label: "Total neto", value: fmtCurrency(kpis.neto), color: "text-emerald-700 font-bold" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={`text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Status breakdown */}
              <div className="mt-4 space-y-2">
                {(["draft", "approved", "paid"] as const).map((s) => {
                  const count = kpis[s === "draft" ? "draft" : s === "approved" ? "approved" : "paid"];
                  const pct   = kpis.total > 0 ? (count / kpis.total) * 100 : 0;
                  const sc    = STATUS[s];
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={sc.text}>{sc.label}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${sc.dot} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Area distribution chart */}
            {areaDistribution.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Distribución por área</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={areaDistribution}
                        cx="50%" cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        labelLine={false}
                        label={renderPieLabel as (props: unknown) => JSX.Element | null}
                      >
                        {areaDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [fmtCurrency(val), "Neto"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                  {areaDistribution.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600 truncate flex-1">{d.name}</span>
                      <span className="text-slate-900 font-medium tabular-nums">{fmtCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <GenerarPlanillaModal
        open={generateOpen}
        year={year} month={month}
        employees={catalogsQuery.data?.employees ?? []}
        isPending={generateMutation.isPending}
        onClose={() => setGenerateOpen(false)}
        onGenerate={(payload) => generateMutation.mutate(payload)}
      />

      <AjustarModal
        item={adjustItem}
        isPending={adjustMutation.isPending}
        onClose={() => setAdjustItem(null)}
        onSave={(id, bonuses, deductions, notes) => adjustMutation.mutate({ id, bonuses, deductions, notes })}
      />

      <BankFileModal
        open={bankFileOpen}
        year={year} month={month}
        formats={bankFormatsQuery.data ?? []}
        onClose={() => setBankFileOpen(false)}
      />
    </div>
  );
}
