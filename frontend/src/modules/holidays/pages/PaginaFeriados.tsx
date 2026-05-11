import { useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  AlertCircle, CalendarDays, CalendarRange, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown,
  Clock, Loader2, Plus, RefreshCw, RotateCcw,
  Search, Trash2, X,
} from "lucide-react";
import {
  createHoliday, deleteHoliday, getHolidays, updateHoliday,
} from "@/modules/holidays/services/holidaysApi";
import type { HolidayItem } from "@/modules/holidays/types/holiday.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50];
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DIAS  = ["dom","lun","mar","mié","jue","vie","sáb"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

interface FmtDateResult { dayOfWeek: string; day: number; month: string; year: number }

function fmtDate(iso: string): FmtDateResult | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return { dayOfWeek: DIAS[dt.getDay()], day: d, month: MESES[m - 1], year: y };
}

function getEffectiveDate(h: HolidayItem, today: string): string | null {
  if (!h.isActive) return null;
  const todayYear = parseInt(today.slice(0, 4));
  if (h.isRecurring) {
    const mmdd = h.date.slice(5);
    const thisYear = `${todayYear}-${mmdd}`;
    return thisYear >= today ? thisYear : `${todayYear + 1}-${mmdd}`;
  }
  return h.date >= today ? h.date : null;
}

function daysUntil(iso: string, today: string): number {
  const a = new Date(iso + "T00:00:00");
  const b = new Date(today + "T00:00:00");
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function extractErr(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message?.trim() || fallback;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { variant: "success" | "error"; message: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }): JSX.Element | null {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const ok = toast.variant === "success";
  return (
    <div className={`fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <p className="flex-1 text-[13px] font-medium leading-snug">{toast.message}</p>
      <button onClick={onClose} className="shrink-0 opacity-50 transition hover:opacity-100">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── SortableHeader ───────────────────────────────────────────────────────────

function SortableHeader({ col, label, sortKey, sortDir, align = "left", onSort }: {
  col: string; label: string; sortKey: string | null; sortDir: "asc" | "desc";
  align?: "left" | "center" | "right";
  onSort: (col: string) => void;
}): JSX.Element {
  const active = sortKey === col;
  const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      onClick={() => onSort(col)}
      className={`cursor-pointer select-none px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition group text-${align} ${active ? "text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "center" ? "w-full justify-center" : ""}`}>
        {label}
        <Icon className={`size-3 shrink-0 ${active ? "text-teal-500" : "text-slate-300 group-hover:text-slate-400"}`} />
      </span>
    </th>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, loading, iconBg, icon }: {
  label: string; value: number | string; sub?: string;
  loading?: boolean; iconBg: string; icon: JSX.Element;
}): JSX.Element {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:shadow-md">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        {loading
          ? <div className="mt-1.5 h-7 w-14 animate-pulse rounded-lg bg-slate-200" />
          : <p className="mt-0.5 text-[28px] font-extrabold leading-none text-slate-900">{value}</p>
        }
        {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onClear, onCreate }: { onClear: () => void; onCreate: () => void }): JSX.Element {
  return (
    <tr>
      <td colSpan={5}>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
            <CalendarDays className="size-8 stroke-[1.5] text-slate-400" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-700">Sin feriados registrados</p>
            <p className="mt-1 text-[13px] text-slate-400">No hay feriados que coincidan con los filtros actuales.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <X className="size-3.5" />Limpiar filtros
            </button>
            <button
              onClick={onCreate}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="size-3.5" />Nuevo feriado
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ holiday, saving, onConfirm, onCancel }: {
  holiday: HolidayItem | null; saving: boolean;
  onConfirm: () => void; onCancel: () => void;
}): JSX.Element | null {
  if (!holiday) return null;
  const p = fmtDate(holiday.date);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-3 px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
            <Trash2 className="size-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Eliminar feriado</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
              ¿Estás seguro de eliminar{" "}
              <span className="font-semibold text-slate-700">"{holiday.name}"</span>
              {p ? ` (${p.day} ${p.month} ${p.year})` : ""}?
            </p>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[11px] text-amber-700">
                ⚠️ El feriado se desactivará y dejará de aparecer en el calendario.
                El historial vinculado se preserva. Puedes reactivarlo editándolo después.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            No, mantener
          </button>
          <button
            disabled={saving}
            onClick={onConfirm}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-500 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {saving ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, help }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; help: string;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-700">{label}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{help}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 ${checked ? "bg-teal-500" : "bg-slate-200"}`}
        >
          <span className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>
    </div>
  );
}

// ─── HolidayFormModal ─────────────────────────────────────────────────────────

type FormState = { name: string; date: string; isRecurring: boolean; isActive: boolean };

function HolidayFormModal({ mode, initial, saving, serverError, onSave, onClose }: {
  mode: "create" | "edit";
  initial: FormState;
  saving: boolean;
  serverError: string | null;
  onSave: (form: FormState) => void;
  onClose: () => void;
}): JSX.Element {
  const [form, setForm]     = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const isEdit  = mode === "edit";

  useEffect(() => { nameRef.current?.focus(); }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = "El nombre del feriado es obligatorio.";
    else if (form.name.trim().length < 2) errs.name = "El nombre debe tener al menos 2 caracteres.";
    if (!form.date) errs.date = "La fecha es obligatoria.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (validate()) onSave(form);
  }

  const preview = form.date ? fmtDate(form.date) : null;
  const recurringMonthDay = form.isRecurring && form.date
    ? `${form.date.slice(8)} ${MESES[parseInt(form.date.slice(5, 7)) - 1]}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white px-5 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 shadow-sm shadow-teal-500/30">
            <CalendarDays className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-bold text-slate-900">
              {isEdit ? "Editar feriado" : "Nuevo feriado"}
            </h2>
            <p className="text-[12px] text-slate-500">
              {isEdit
                ? "Modifica los datos del feriado seleccionado."
                : "Registra un nuevo feriado en el calendario corporativo."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">

          {/* Form column */}
          <form
            id="holiday-form"
            onSubmit={handleSubmit}
            className="flex-1 space-y-5 overflow-y-auto px-5 py-5"
          >
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-600">
                Nombre del feriado <span className="text-rose-500">*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ej: Año Nuevo, Navidad, Día del Trabajo…"
                maxLength={150}
                className={`h-10 w-full rounded-xl border px-3.5 text-[13px] text-slate-800 outline-none transition focus:ring-2 ${
                  errors.name
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-teal-400 focus:ring-teal-100"
                }`}
              />
              {errors.name && (
                <p className="flex items-center gap-1 text-[11px] text-rose-600">
                  <AlertCircle className="size-3" />{errors.name}
                </p>
              )}
              <p className="text-[11px] text-slate-400">{form.name.length}/150 caracteres</p>
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-600">
                Fecha <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={`h-10 w-full rounded-xl border px-3.5 text-[13px] text-slate-800 outline-none transition focus:ring-2 ${
                  errors.date
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-teal-400 focus:ring-teal-100"
                }`}
              />
              {errors.date && (
                <p className="flex items-center gap-1 text-[11px] text-rose-600">
                  <AlertCircle className="size-3" />{errors.date}
                </p>
              )}
              {recurringMonthDay && (
                <p className="text-[11px] text-teal-600">
                  🔄 Se repetirá cada año el {recurringMonthDay}
                </p>
              )}
            </div>

            {/* Toggle recurrente */}
            <Toggle
              checked={form.isRecurring}
              onChange={(v) => set("isRecurring", v)}
              label="Recurrente cada año"
              help={form.isRecurring
                ? "Este feriado se repetirá automáticamente todos los años."
                : "Este feriado aplica solo para la fecha exacta seleccionada."}
            />

            {/* Toggle activo (solo en editar) */}
            {isEdit && (
              <Toggle
                checked={form.isActive}
                onChange={(v) => set("isActive", v)}
                label="Activo"
                help={form.isActive
                  ? "El feriado se muestra en el calendario y afecta cálculos de días laborables."
                  : "El feriado está desactivado y no afecta al sistema."}
              />
            )}

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                <p className="text-[12px] text-rose-700">{serverError}</p>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="w-px shrink-0 bg-slate-100" />

          {/* Preview column */}
          <div className="w-56 shrink-0 space-y-4 px-4 py-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Vista previa
            </p>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Fecha visual */}
              <div className="mb-3 text-center">
                {preview ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {preview.dayOfWeek}
                    </p>
                    <p className="text-[34px] font-extrabold leading-none text-teal-600">
                      {preview.day}
                    </p>
                    <p className="text-[13px] font-semibold text-slate-600">
                      {preview.month} {preview.year}
                    </p>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="mx-auto h-2.5 w-8 rounded bg-slate-100" />
                    <div className="mx-auto h-9 w-9 rounded-xl bg-slate-100" />
                    <div className="mx-auto h-2.5 w-16 rounded bg-slate-100" />
                  </div>
                )}
              </div>

              {/* Nombre */}
              <p className={`mb-3 text-center text-[13px] font-bold leading-snug ${form.name.trim() ? "text-slate-800" : "italic text-slate-300"}`}>
                {form.name.trim() || "Nombre del feriado"}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap justify-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${form.isRecurring ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                  {form.isRecurring
                    ? <RotateCcw className="size-2.5" />
                    : <CalendarDays className="size-2.5" />
                  }
                  {form.isRecurring ? "Recurrente" : "Único"}
                </span>
                {isEdit && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${form.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                    <span className={`size-1.5 rounded-full ${form.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {form.isActive ? "Activo" : "Inactivo"}
                  </span>
                )}
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-400">
              Así se verá en el listado de feriados
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <p className="text-[11px] text-slate-400">
            <span className="text-rose-500">*</span> Campos obligatorios
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="holiday-form"
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 px-5 text-[13px] font-semibold text-white shadow-sm shadow-teal-500/30 hover:from-teal-500 hover:to-teal-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar feriado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PaginaFeriados ───────────────────────────────────────────────────────────

export function PaginaFeriados(): JSX.Element {
  const qc = useQueryClient();

  // ── Filtros ──
  const [searchInput, setSearchInput]         = useState("");
  const [search, setSearch]                   = useState("");
  const [yearFilter, setYearFilter]           = useState("");
  const [recurringFilter, setRecurringFilter] = useState(""); // "" | "true" | "false"
  const [activeFilter, setActiveFilter]       = useState(""); // "" | "true" | "false"
  const [page, setPage]                       = useState(1);
  const [pageSize, setPageSize]               = useState(10);

  // ── Ordenamiento ──
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: string): void {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("desc"); }
    } else {
      setSortKey(key); setSortDir("asc");
    }
  }

  // ── UI ──
  const [toast, setToast]             = useState<ToastState>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formMode, setFormMode]       = useState<"create" | "edit">("create");
  const [formOpen, setFormOpen]       = useState(false);
  const [formKey, setFormKey]         = useState(0);
  const [formInitial, setFormInitial] = useState<FormState>({ name: "", date: "", isRecurring: false, isActive: true });
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HolidayItem | null>(null);
  const [serverError, setServerError]   = useState<string | null>(null);

  const ok   = (msg: string) => setToast({ variant: "success", message: msg });
  const fail = (msg: string) => setToast({ variant: "error",   message: msg });

  // ── Query ──
  const listQuery = useQuery({ queryKey: ["holidays"], queryFn: getHolidays });
  const allRows = listQuery.data ?? [];

  async function refreshAll(): Promise<void> {
    await qc.invalidateQueries({ queryKey: ["holidays"] });
  }

  async function handleManualRefresh(): Promise<void> {
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

  const kpiTotal     = allRows.length;
  const kpiActive    = allRows.filter((r) => r.isActive).length;
  const kpiRecurring = allRows.filter((r) => r.isRecurring).length;

  const upcomingAll = useMemo(() =>
    allRows
      .map((h) => ({ h, eff: getEffectiveDate(h, today) }))
      .filter((x): x is { h: HolidayItem; eff: string } => x.eff !== null)
      .sort((a, b) => a.eff.localeCompare(b.eff)),
  [allRows, today]);

  const nextHoliday  = upcomingAll[0] ?? null;
  const upcomingList = upcomingAll.slice(0, 8);

  // ── Filtrado ──
  const filteredRows = useMemo(() =>
    allRows.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (yearFilter && r.date.slice(0, 4) !== yearFilter) return false;
      if (recurringFilter === "true"  && !r.isRecurring) return false;
      if (recurringFilter === "false" && r.isRecurring)  return false;
      if (activeFilter === "true"  && !r.isActive) return false;
      if (activeFilter === "false" && r.isActive)  return false;
      return true;
    }),
  [allRows, search, yearFilter, recurringFilter, activeFilter]);

  // ── Ordenamiento ──
  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    if (!sortKey) {
      return arr.sort((a, b) => a.date.localeCompare(b.date)); // por defecto: fecha asc
    }
    return arr.sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      const cmp = av.localeCompare(bv, "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  // ── Paginación cliente ──
  const total      = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows  = useMemo(
    () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
    [sortedRows, page, pageSize],
  );
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo   = Math.min(page * pageSize, total);

  const pageNumbers = useMemo((): number[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, page - 3);
    const end = Math.min(totalPages, start + 6);
    start = Math.max(1, end - 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, page]);

  const hasActiveFilters = !!(search || yearFilter || recurringFilter || activeFilter);

  function clearFilters(): void {
    setSearchInput(""); setSearch(""); setYearFilter(""); setRecurringFilter(""); setActiveFilter(""); setPage(1);
  }

  function applyFilters(): void { setSearch(searchInput); setPage(1); }

  // ── Mutaciones ──
  const saveMut = useMutation({
    mutationFn: (form: FormState) =>
      formMode === "create"
        ? createHoliday({ date: form.date, name: form.name, isRecurring: form.isRecurring })
        : updateHoliday(editingId!, { date: form.date, name: form.name, isRecurring: form.isRecurring, isActive: form.isActive }),
    onSuccess: async () => {
      await refreshAll();
      setSortKey(null);
      ok(formMode === "create" ? "Feriado creado correctamente." : "Feriado actualizado correctamente.");
      setFormOpen(false); setServerError(null);
    },
    onError: (error) => {
      setServerError(extractErr(error, "No se pudo guardar el feriado. Verifica los datos."));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: async () => {
      await refreshAll();
      ok("Feriado eliminado correctamente.");
      setDeleteTarget(null);
    },
    onError: () => fail("No se pudo eliminar el feriado."),
  });

  function openCreate(): void {
    setFormMode("create");
    setEditingId(null);
    setFormInitial({ name: "", date: "", isRecurring: false, isActive: true });
    setServerError(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(h: HolidayItem): void {
    setFormMode("edit");
    setEditingId(h.id);
    setFormInitial({ name: h.name, date: h.date, isRecurring: h.isRecurring, isActive: h.isActive });
    setServerError(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function handleExport(format: ExportFormat): void {
    if (sortedRows.length === 0) { fail("No hay datos para exportar."); return; }
    const data = sortedRows.map((r) => {
      const p = fmtDate(r.date);
      return {
        Fecha:        p ? `${p.day} ${p.month} ${p.year}` : r.date,
        "Día semana": p?.dayOfWeek ?? "",
        Nombre:       r.name,
        Recurrente:   r.isRecurring ? "Sí" : "No",
        Estado:       r.isActive ? "Activo" : "Inactivo",
      };
    });
    exportRows(format, data, makeFileName("Feriados", [yearFilter ? String(yearFilter) : null]), "Feriados del año");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-5 pb-10">

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 shadow-sm shadow-teal-500/30">
            <CalendarDays className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Feriados</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Gestión de días feriados del calendario corporativo
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleManualRefresh}
            title="Recargar datos"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <ExportMenu
            fileName={makeFileName("Feriados", [yearFilter ? String(yearFilter) : null])}
            resultCount={sortedRows.length}
            filtersActive={Boolean(yearFilter || search)}
            onExport={handleExport}
          />
          <button
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-teal-500/30 hover:from-teal-500 hover:to-teal-700 transition"
          >
            <Plus className="size-4" />
            Nuevo feriado
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Total feriados"
          value={kpiTotal}
          sub="en el sistema"
          loading={listQuery.isLoading}
          iconBg="bg-slate-100 shadow-slate-100"
          icon={<CalendarRange className="size-5 text-slate-600" />}
        />
        <KpiCard
          label="Activos"
          value={kpiActive}
          sub="en el calendario"
          loading={listQuery.isLoading}
          iconBg="bg-emerald-50 shadow-emerald-100"
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
        />
        <KpiCard
          label="Recurrentes"
          value={kpiRecurring}
          sub="se repiten cada año"
          loading={listQuery.isLoading}
          iconBg="bg-teal-50 shadow-teal-100"
          icon={<RotateCcw className="size-5 text-teal-600" />}
        />
        <KpiCard
          label="Próximo feriado"
          value={nextHoliday ? `${daysUntil(nextHoliday.eff, today)}d` : "—"}
          sub={nextHoliday ? nextHoliday.h.name : "sin próximos feriados"}
          loading={listQuery.isLoading}
          iconBg="bg-amber-50 shadow-amber-100"
          icon={<Clock className="size-5 text-amber-500" />}
        />
      </div>

      {/* ── Barra de filtros ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 px-4 py-4">
          {/* Búsqueda */}
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (!e.target.value) { setSearch(""); setPage(1); }
                }}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Nombre del feriado"
                className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
          {/* Año */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Año</label>
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setSearch(searchInput); setPage(1); }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Todos los años</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Recurrencia */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Recurrencia</label>
            <select
              value={recurringFilter}
              onChange={(e) => { setRecurringFilter(e.target.value); setSearch(searchInput); setPage(1); }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Todos</option>
              <option value="true">Recurrentes</option>
              <option value="false">Únicos</option>
            </select>
          </div>
          {/* Estado */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado</label>
            <select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setSearch(searchInput); setPage(1); }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
          {/* Botones */}
          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              <Search className="size-3.5" />Aplicar
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                <X className="size-3.5" />Limpiar
              </button>
            )}
          </div>
          {total > 0 && (
            <p className="ml-auto self-end text-[12px] text-slate-400">
              {rangeFrom}–{rangeTo} de <b className="text-slate-600">{total}</b> feriados
            </p>
          )}
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="flex items-start gap-4">

        {/* Tabla */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-[13px]">Cargando feriados…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <SortableHeader col="date"        label="Fecha"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortableHeader col="name"        label="Nombre"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortableHeader col="isRecurring" label="Recurrente" sortKey={sortKey} sortDir={sortDir} align="center" onSort={toggleSort} />
                    <SortableHeader col="isActive"    label="Estado"     sortKey={sortKey} sortDir={sortDir} align="center" onSort={toggleSort} />
                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRows.length === 0
                    ? <EmptyState onClear={clearFilters} onCreate={openCreate} />
                    : pagedRows.map((r) => {
                        const p    = fmtDate(r.date);
                        const eff  = getEffectiveDate(r, today);
                        const days = eff !== null ? daysUntil(eff, today) : null;
                        const isToday = days === 0;
                        const isSoon  = days !== null && days > 0 && days <= 7;
                        return (
                          <tr key={r.id} className="group transition-colors hover:bg-slate-50/60">

                            {/* Fecha */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border ${isToday ? "border-teal-300 bg-teal-500 text-white" : isSoon ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                                  {p ? (
                                    <>
                                      <span className={`text-[9px] font-bold uppercase ${isToday ? "text-teal-100" : isSoon ? "text-amber-500" : "text-slate-400"}`}>
                                        {p.dayOfWeek}
                                      </span>
                                      <span className="text-[16px] font-extrabold leading-none">{p.day}</span>
                                    </>
                                  ) : (
                                    <span className="text-[10px]">—</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[13px] font-semibold text-slate-700">
                                    {p ? `${p.day} ${p.month} ${p.year}` : r.date}
                                  </p>
                                  {days !== null && days >= 0 && (
                                    <p className={`text-[11px] ${isToday ? "font-bold text-teal-600" : isSoon ? "text-amber-600" : "text-slate-400"}`}>
                                      {isToday ? "🎉 Hoy" : `en ${days} día${days === 1 ? "" : "s"}`}
                                    </p>
                                  )}
                                  {!r.isActive && (
                                    <p className="text-[11px] text-slate-400">Inactivo</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Nombre */}
                            <td className="px-4 py-3">
                              <p className="text-[13px] font-semibold text-slate-800">{r.name}</p>
                              {r.isRecurring && (
                                <p className="text-[11px] text-teal-500">
                                  🔄 Cada año el {r.date.slice(8)} {MESES[parseInt(r.date.slice(5, 7)) - 1]}
                                </p>
                              )}
                            </td>

                            {/* Badge recurrente */}
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${r.isRecurring ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                                {r.isRecurring
                                  ? <RotateCcw className="size-2.5" />
                                  : <CalendarDays className="size-2.5" />
                                }
                                {r.isRecurring ? "Recurrente" : "Único"}
                              </span>
                            </td>

                            {/* Badge estado */}
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${r.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                                <span className={`size-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {r.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEdit(r)}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(r)}
                                  title="Eliminar"
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[11px] font-semibold text-rose-600 shadow-sm hover:bg-rose-100 transition"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel lateral: próximos feriados */}
        <aside className="w-64 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <CalendarRange className="size-4 text-teal-500" />
              <h2 className="text-[13px] font-bold text-slate-700">Próximos feriados</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {listQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : upcomingList.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12px] text-slate-400">
                  Sin próximos feriados activos
                </p>
              ) : (
                upcomingList.map(({ h, eff }) => {
                  const p    = fmtDate(eff);
                  const days = daysUntil(eff, today);
                  const isToday = days === 0;
                  return (
                    <div key={`${h.id}-${eff}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/60">
                      <div className={`flex size-9 shrink-0 flex-col items-center justify-center rounded-xl border ${isToday ? "border-teal-300 bg-teal-500 text-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {p && (
                          <>
                            <span className={`text-[8px] font-bold uppercase ${isToday ? "text-teal-100" : "text-slate-400"}`}>
                              {p.dayOfWeek}
                            </span>
                            <span className="text-[13px] font-extrabold leading-none">{p.day}</span>
                          </>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-slate-700">{h.name}</p>
                        <p className={`text-[10px] ${isToday ? "font-bold text-teal-600" : "text-slate-400"}`}>
                          {isToday ? "Hoy" : days === 1 ? "Mañana" : `en ${days} días`}
                          {p ? ` · ${p.day} ${p.month}` : ""}
                        </p>
                      </div>
                      {h.isRecurring && (
                        <span title="Recurrente">
                          <RotateCcw className="size-3 shrink-0 text-teal-400" />
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {upcomingList.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-2.5">
                <p className="text-center text-[10px] text-slate-400">
                  {kpiRecurring} recurrentes · {allRows.filter((r) => !r.isRecurring && r.isActive).length} únicos activos
                </p>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* ── Paginación ── */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-teal-400"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>por página</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="size-4" />
            </button>
            {pageNumbers[0] > 1 && (
              <>
                <button onClick={() => setPage(1)} className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50">1</button>
                {pageNumbers[0] > 2 && <span className="px-1 text-slate-300">…</span>}
              </>
            )}
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`inline-flex size-8 items-center justify-center rounded-lg text-[12px] font-semibold transition ${p === page ? "bg-teal-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {p}
              </button>
            ))}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-slate-300">…</span>}
                <button onClick={() => setPage(totalPages)} className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50">{totalPages}</button>
              </>
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      {formOpen && (
        <HolidayFormModal
          key={formKey}
          mode={formMode}
          initial={formInitial}
          saving={saveMut.isPending}
          serverError={serverError}
          onSave={(form) => saveMut.mutate(form)}
          onClose={() => { setFormOpen(false); setServerError(null); }}
        />
      )}

      <ConfirmDeleteModal
        holiday={deleteTarget}
        saving={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

    </section>
  );
}
