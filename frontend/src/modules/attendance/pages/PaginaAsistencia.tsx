import { useEffect, useMemo, useRef, useState, type ElementType, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ArrowUpDown, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, Clock3, Loader2,
  Search, ShieldCheck, UserCheck, UserX, X,
} from "lucide-react";
import {
  checkIn, checkOut, getAttendance, getAttendanceCatalogs,
  getAttendanceSummary, justifyAttendance, markAbsent,
} from "@/modules/attendance/services/attendanceApi";
import type { AttendanceEmployeeOption, AttendanceItem } from "@/modules/attendance/types/attendance.types";

// ─── Constants & utilities ───────────────────────────────────────────────────

const DEFAULT_TZ = "America/Lima";

function todayIso(tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

function nDaysAgo(n: number, tz = DEFAULT_TZ): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function formatTime(utc: string | null | undefined, tz = DEFAULT_TZ): string {
  if (!utc) return "—";
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-PE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

type AttendanceStatus = "on_time" | "late" | "absent" | "justified" | "pending_out" | "no_record";

function resolveStatus(r: AttendanceItem): AttendanceStatus {
  if (r.isJustified) return "justified";
  if (r.isAbsent) return "absent";
  if (!r.checkInAtUtc) return "no_record";
  if (r.checkInAtUtc && !r.checkOutAtUtc) return "pending_out";
  if (r.lateMinutes > 0) return "late";
  return "on_time";
}

const STATUS_META: Record<AttendanceStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  on_time:     { label: "A tiempo",     bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  late:        { label: "Tardanza",     bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  absent:      { label: "Falta",        bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500" },
  justified:   { label: "Justificado",  bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500" },
  pending_out: { label: "Pend. salida", bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500" },
  no_record:   { label: "Sin registro", bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",   dot: "bg-slate-400" },
};

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastState = { type: "success" | "error"; msg: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }): JSX.Element | null {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const ok = toast.type === "success";
  return (
    <div className={`fixed right-4 top-4 z-[100] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
      {ok ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      <span className="flex-1 text-[13px] font-medium">{toast.msg}</span>
      <button type="button" onClick={onClose} className="rounded p-0.5 hover:bg-black/10"><X className="size-3.5" /></button>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, lateMinutes }: { status: AttendanceStatus; lateMinutes?: number }): JSX.Element {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${m.bg} ${m.text} ${m.border}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${m.dot}`} />
      {m.label}{status === "late" && lateMinutes ? ` · ${lateMinutes} min` : ""}
    </span>
  );
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, bg, text, border, active, onClick }: {
  label: string; value: number; icon: ElementType;
  bg: string; text: string; border: string; active?: boolean; onClick?: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition ${bg} ${border} ${active ? "ring-2 ring-brand-400/50 shadow-md" : ""} ${onClick ? "cursor-pointer hover:shadow-sm hover:brightness-95" : "cursor-default"}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${text} opacity-70`}>{label}</span>
        <Icon className={`size-4 ${text} opacity-60`} />
      </div>
      <p className={`text-[28px] font-extrabold leading-none ${text}`}>{value}</p>
    </button>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState({ onToday, onClear }: { onToday: () => void; onClear: () => void }): JSX.Element {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50">
            <Clock3 className="size-6 text-slate-300" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-700">No hay registros para los filtros seleccionados</p>
            <p className="mt-1 text-[12px] text-slate-400">Prueba cambiando el rango de fechas o limpiando los filtros.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onToday}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-100">
              <Calendar className="size-3.5" /> Ver hoy
            </button>
            <button type="button" onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
              <X className="size-3.5" /> Limpiar filtros
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── JustifyModal ────────────────────────────────────────────────────────────

function JustifyModal({ open, name, onClose, onConfirm, saving }: {
  open: boolean; name: string; onClose: () => void;
  onConfirm: (text: string) => void; saving: boolean;
}): JSX.Element | null {
  const [text, setText] = useState("");
  useEffect(() => { if (!open) setText(""); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Justificar asistencia</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">{name}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="p-5">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Justificación <span className="text-rose-500">*</span></span>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={4}
              placeholder="Describe el motivo de la justificación..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" disabled={!text.trim() || saving} onClick={() => onConfirm(text.trim())}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white disabled:opacity-60 hover:from-brand-500 hover:to-brand-700">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AbsentModal ─────────────────────────────────────────────────────────────

function AbsentModal({ open, name, onClose, onConfirm, saving }: {
  open: boolean; name: string; onClose: () => void;
  onConfirm: (reason: string) => void; saving: boolean;
}): JSX.Element | null {
  const [reason, setReason] = useState("Sin justificación");
  useEffect(() => { if (!open) setReason("Sin justificación"); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Marcar falta</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">{name}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3.5">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <p className="text-[12px] text-rose-700">¿Confirmas marcar la falta de <strong>{name}</strong>? Se generará un incidente de forma automática.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Motivo</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" disabled={!reason.trim() || saving} onClick={() => onConfirm(reason.trim())}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-rose-500 to-rose-600 px-4 text-[13px] font-semibold text-white disabled:opacity-60 hover:from-rose-500 hover:to-rose-700">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Procesando..." : "Confirmar falta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DetailModal ─────────────────────────────────────────────────────────────

function DetailModal({ record, tz, onClose, onJustify }: {
  record: AttendanceItem | null; tz: string;
  onClose: () => void; onJustify: (id: string, name: string) => void;
}): JSX.Element | null {
  if (!record) return null;
  const status = resolveStatus(record);
  const m = STATUS_META[status];
  const fields: Array<{ k: string; v: string }> = [
    { k: "Empleado",      v: record.employeeName },
    { k: "Código",        v: record.employeeCode },
    { k: "Área",          v: record.area },
    { k: "Fecha",         v: formatDate(record.attendanceDate) },
    { k: "Ingreso",       v: formatTime(record.checkInAtUtc, tz) },
    { k: "Salida",        v: formatTime(record.checkOutAtUtc, tz) },
    { k: "Tardanza",      v: record.lateMinutes > 0 ? `${record.lateMinutes} min` : "—" },
    { k: "Justificación", v: record.justification ?? "—" },
  ];
  const canJustifyDetail = (status === "late" || status === "absent") && !record.isJustified;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Detalle de asistencia</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">{record.employeeName}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${m.bg} ${m.border}`}>
            <span className={`size-2.5 shrink-0 rounded-full ${m.dot}`} />
            <div className="flex-1">
              <p className={`text-[13px] font-bold ${m.text}`}>{m.label}{status === "late" ? ` — ${record.lateMinutes} min` : ""}</p>
              <p className={`text-[11px] ${m.text} opacity-70`}>Fecha: {formatDate(record.attendanceDate)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {fields.map(({ k, v }) => (
              <div key={k} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cerrar</button>
          {canJustifyDetail && (
            <button type="button" onClick={() => { onClose(); onJustify(record.id, record.employeeName); }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white hover:from-brand-500 hover:to-brand-700">
              <ShieldCheck className="size-3.5" /> Justificar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export function PaginaAsistencia(): JSX.Element {
  const queryClient = useQueryClient();

  // Live clock
  const [liveTime, setLiveTime] = useState(() => new Date().toLocaleTimeString("es-PE", { timeZone: DEFAULT_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  const [liveDate, setLiveDate] = useState(() => capFirst(new Date().toLocaleDateString("es-PE", { timeZone: DEFAULT_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" })));
  useEffect(() => {
    const t = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString("es-PE", { timeZone: DEFAULT_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setLiveDate(capFirst(new Date().toLocaleDateString("es-PE", { timeZone: DEFAULT_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" })));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Employee autocomplete
  const [empSearch, setEmpSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<AttendanceEmployeeOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const empRef = useRef<HTMLInputElement>(null);

  // History filters (independent of registration block)
  const [histSearchInput, setHistSearchInput] = useState("");
  const [histSearch, setHistSearch] = useState("");
  const [histAreaId, setHistAreaId] = useState("");
  const [histDateFrom, setHistDateFrom] = useState(() => todayIso());
  const [histDateTo, setHistDateTo] = useState(() => todayIso());
  const [histIsLate, setHistIsLate] = useState<boolean | undefined>(undefined);
  const [histIsAbsent, setHistIsAbsent] = useState<boolean | undefined>(undefined);
  const [activeChip, setActiveChip] = useState("");
  const [histPage, setHistPage] = useState(1);

  // Modals
  const [justifyTarget, setJustifyTarget] = useState<{ id: string; name: string } | null>(null);
  const [absentTarget, setAbsentTarget] = useState<{ id: string; name: string } | null>(null);
  const [detailRecord, setDetailRecord] = useState<AttendanceItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (type: "success" | "error", msg: string) => setToast({ type, msg });

  // Timezone from catalogs (fallback to Lima)
  const catalogsQuery = useQuery({ queryKey: ["attendance-catalogs"], queryFn: getAttendanceCatalogs, staleTime: 5 * 60_000 });
  const tz = catalogsQuery.data?.schedule?.timeZoneId ?? DEFAULT_TZ;

  // Summary — always shows today's totals, auto-refreshes every 30s
  const summaryQuery = useQuery({
    queryKey: ["attendance-summary-today"],
    queryFn: () => getAttendanceSummary({
      viewMode: "daily", referenceDate: todayIso(tz),
      startDateFrom: todayIso(tz), startDateTo: todayIso(tz),
      search: "", employeeId: "", areaId: "",
      isLate: undefined as unknown as boolean,
      isAbsent: undefined as unknown as boolean,
      pageNumber: 1, pageSize: 1,
    }),
    refetchInterval: 30_000,
  });

  // Today's attendance for the selected employee
  const todayRecordQuery = useQuery({
    queryKey: ["attendance-today-emp", selectedEmp?.id],
    queryFn: () => getAttendance({
      viewMode: "daily", referenceDate: todayIso(tz),
      startDateFrom: todayIso(tz), startDateTo: todayIso(tz),
      search: "", employeeId: selectedEmp!.id, areaId: "",
      isLate: undefined as unknown as boolean,
      isAbsent: undefined as unknown as boolean,
      pageNumber: 1, pageSize: 1,
    }),
    enabled: !!selectedEmp,
  });
  const todayRecord = todayRecordQuery.data?.items[0] ?? null;

  // History list
  const histQuery = useQuery({
    queryKey: ["attendance-hist", histSearch, histAreaId, histDateFrom, histDateTo, histIsLate, histIsAbsent, histPage],
    queryFn: () => getAttendance({
      viewMode: "daily", referenceDate: histDateFrom,
      startDateFrom: histDateFrom, startDateTo: histDateTo,
      search: histSearch, employeeId: "", areaId: histAreaId,
      isLate: histIsLate as unknown as boolean,
      isAbsent: histIsAbsent as unknown as boolean,
      pageNumber: histPage, pageSize: PAGE_SIZE,
    }),
  });
  const rows = histQuery.data?.items ?? [];
  const total = histQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // ── Invalidations ──────────────────────────────────────────────────────────

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendance-today-emp"] }),
      queryClient.invalidateQueries({ queryKey: ["attendance-summary-today"] }),
      queryClient.invalidateQueries({ queryKey: ["attendance-hist"] }),
    ]);
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: async () => { await refreshAll(); showToast("success", "Ingreso registrado correctamente."); },
    onError: () => showToast("error", "No se pudo registrar el ingreso. Verifica el estado del empleado."),
  });
  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: async () => { await refreshAll(); showToast("success", "Salida registrada correctamente."); },
    onError: () => showToast("error", "No se pudo registrar la salida."),
  });
  const absentMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => markAbsent(id, reason),
    onSuccess: async () => { await refreshAll(); setAbsentTarget(null); showToast("success", "Falta registrada. Se generó un incidente automáticamente."); },
    onError: () => showToast("error", "No se pudo marcar la falta."),
  });
  const justifyMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => justifyAttendance(id, text),
    onSuccess: async () => { await refreshAll(); setJustifyTarget(null); showToast("success", "Asistencia justificada correctamente."); },
    onError: () => showToast("error", "No se pudo guardar la justificación."),
  });

  // ── Autocomplete ───────────────────────────────────────────────────────────

  const filteredEmployees = useMemo(() => {
    const q = empSearch.toLowerCase().trim();
    if (q.length < 1) return [];
    return (catalogsQuery.data?.employees ?? [])
      .filter((e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.documentNumber ?? "").includes(q) ||
        e.area.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [empSearch, catalogsQuery.data?.employees]);

  function selectEmployee(emp: AttendanceEmployeeOption) {
    setSelectedEmp(emp);
    setEmpSearch(emp.fullName);
    setShowDropdown(false);
  }

  function clearEmployee() {
    setSelectedEmp(null);
    setEmpSearch("");
    setShowDropdown(false);
    empRef.current?.focus();
  }

  // ── Contextual action flags ────────────────────────────────────────────────

  const canCheckIn    = !!selectedEmp && !todayRecord?.checkInAtUtc && !todayRecord?.isAbsent;
  const canCheckOut   = !!selectedEmp && !!todayRecord?.checkInAtUtc && !todayRecord?.checkOutAtUtc;
  const canMarkAbsent = !!selectedEmp && !todayRecord?.checkInAtUtc && !todayRecord?.isAbsent;
  const canJustify    = !!todayRecord && (todayRecord.lateMinutes > 0 || todayRecord.isAbsent) && !todayRecord.isJustified;

  // ── History helpers ────────────────────────────────────────────────────────

  function applyChip(chip: string) {
    const next = activeChip === chip ? "" : chip;
    setActiveChip(next);
    setHistIsLate(next === "late" ? true : undefined);
    setHistIsAbsent(next === "absent" ? true : undefined);
    setHistPage(1);
  }

  function clearHistFilters() {
    setHistSearchInput("");
    setHistSearch("");
    setHistAreaId("");
    setHistDateFrom(todayIso(tz));
    setHistDateTo(todayIso(tz));
    setHistIsLate(undefined);
    setHistIsAbsent(undefined);
    setActiveChip("");
    setHistPage(1);
  }

  function handleViewHistory() {
    if (!selectedEmp) return;
    setHistSearchInput(selectedEmp.fullName);
    setHistSearch(selectedEmp.fullName);
    setHistDateFrom(nDaysAgo(30, tz));
    setHistDateTo(todayIso(tz));
    setHistIsLate(undefined);
    setHistIsAbsent(undefined);
    setActiveChip("");
    setHistPage(1);
    setTimeout(() => document.getElementById("historial-asistencia")?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const summary = summaryQuery.data;

  return (
    <section className="space-y-4">

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Modals */}
      <JustifyModal
        open={!!justifyTarget} name={justifyTarget?.name ?? ""} saving={justifyMutation.isPending}
        onClose={() => setJustifyTarget(null)}
        onConfirm={(text) => justifyTarget && justifyMutation.mutate({ id: justifyTarget.id, text })}
      />
      <AbsentModal
        open={!!absentTarget} name={absentTarget?.name ?? ""} saving={absentMutation.isPending}
        onClose={() => setAbsentTarget(null)}
        onConfirm={(reason) => absentTarget && absentMutation.mutate({ id: absentTarget.id, reason })}
      />
      <DetailModal record={detailRecord} tz={tz} onClose={() => setDetailRecord(null)}
        onJustify={(id, name) => setJustifyTarget({ id, name })} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Asistencia</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Registro de ingreso, salida, tardanzas, faltas y justificaciones</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
          <div className="flex items-center gap-1.5 text-[22px] font-extrabold tabular-nums text-slate-800">
            <Clock3 className="size-5 text-brand-500" />
            {liveTime}
          </div>
          <p className="text-[11px] text-slate-400">{liveDate}</p>
          {catalogsQuery.data?.schedule?.shiftName && (
            <span className="mt-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700">
              {catalogsQuery.data.schedule.shiftName} · {catalogsQuery.data.schedule.expectedStart}–{catalogsQuery.data.schedule.expectedEnd}
            </span>
          )}
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="A tiempo"     value={summary?.onTime ?? 0}         icon={CheckCircle2} bg="bg-emerald-50" text="text-emerald-700" border="border-emerald-200" active={activeChip === "on_time"} onClick={() => applyChip("on_time")} />
        <SummaryCard label="Tardanzas"    value={summary?.late ?? 0}            icon={Clock3}       bg="bg-amber-50"   text="text-amber-700"   border="border-amber-200"   active={activeChip === "late"}    onClick={() => { applyChip("late"); setTimeout(() => document.getElementById("historial-asistencia")?.scrollIntoView({ behavior: "smooth" }), 80); }} />
        <SummaryCard label="Faltas"       value={summary?.absent ?? 0}          icon={UserX}        bg="bg-rose-50"    text="text-rose-700"    border="border-rose-200"    active={activeChip === "absent"}  onClick={() => { applyChip("absent"); setTimeout(() => document.getElementById("historial-asistencia")?.scrollIntoView({ behavior: "smooth" }), 80); }} />
        <SummaryCard label="Justificados" value={summary?.justified ?? 0}       icon={ShieldCheck}  bg="bg-blue-50"    text="text-blue-700"    border="border-blue-200" />
        <SummaryCard label="Pend. salida" value={summary?.pendingCheckOut ?? 0} icon={Clock}        bg="bg-violet-50"  text="text-violet-700"  border="border-violet-200" />
        <SummaryCard label="Sin registro" value={summary?.noRecord ?? 0}        icon={UserCheck}    bg="bg-slate-50"   text="text-slate-600"   border="border-slate-200" />
      </div>

      {/* ── Quick registration ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[14px] font-bold text-slate-800">Registro rápido</h2>
          <p className="mt-0.5 text-[12px] text-slate-400">Busca un empleado por nombre, código o DNI para registrar su asistencia de hoy</p>
        </div>
        <div className="p-5">

          {/* Autocomplete */}
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={empRef}
              type="text"
              value={empSearch}
              onChange={(e) => { setEmpSearch(e.target.value); setShowDropdown(true); if (selectedEmp && e.target.value !== selectedEmp.fullName) setSelectedEmp(null); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Buscar empleado por nombre, código o DNI..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-[13px] text-slate-800 placeholder-slate-400 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {(empSearch || selectedEmp) && (
              <button type="button" onClick={clearEmployee} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="size-4" />
              </button>
            )}
            {/* Dropdown */}
            {showDropdown && filteredEmployees.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {filteredEmployees.map((emp) => (
                  <button key={emp.id} type="button" onMouseDown={() => selectEmployee(emp)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
                      {emp.fullName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{emp.fullName}</p>
                      <p className="text-[11px] text-slate-400">{emp.employeeCode} · {emp.area}</p>
                    </div>
                    {emp.shiftName && <span className="ml-auto shrink-0 text-[10px] text-slate-300">{emp.shiftName}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Employee card + actions or placeholder */}
          {selectedEmp ? (
            <div className="space-y-3">
              {/* Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-700">
                      {selectedEmp.fullName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-slate-900">{selectedEmp.fullName}</p>
                      <p className="text-[12px] text-slate-400">{selectedEmp.employeeCode} · {selectedEmp.area}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {todayRecordQuery.isLoading
                      ? <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Loader2 className="size-3 animate-spin" /> Cargando...</span>
                      : <StatusBadge status={todayRecord ? resolveStatus(todayRecord) : "no_record"} lateMinutes={todayRecord?.lateMinutes} />
                    }
                  </div>
                </div>
                {/* Details */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-[11px] sm:grid-cols-4">
                  <div><p className="text-slate-400">Cargo</p><p className="font-semibold text-slate-700">{selectedEmp.position || "—"}</p></div>
                  <div><p className="text-slate-400">Horario</p><p className="font-semibold text-slate-700">{selectedEmp.expectedSchedule || selectedEmp.shiftName || "—"}</p></div>
                  <div><p className="text-slate-400">Ingreso hoy</p><p className="font-semibold text-slate-700">{formatTime(todayRecord?.checkInAtUtc, tz)}</p></div>
                  <div><p className="text-slate-400">Salida hoy</p><p className="font-semibold text-slate-700">{formatTime(todayRecord?.checkOutAtUtc, tz)}</p></div>
                </div>
              </div>

              {/* Contextual actions */}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!canCheckIn || checkInMutation.isPending}
                  onClick={() => checkInMutation.mutate(selectedEmp.id)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 hover:from-emerald-500 hover:to-emerald-700">
                  {checkInMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-4" />}
                  Registrar ingreso
                </button>
                <button type="button" disabled={!canCheckOut || checkOutMutation.isPending}
                  onClick={() => todayRecord?.id && checkOutMutation.mutate(todayRecord.id)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50">
                  {checkOutMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-4" />}
                  Registrar salida
                </button>
                <button type="button" disabled={!canMarkAbsent}
                  onClick={() => setAbsentTarget({ id: selectedEmp.id, name: selectedEmp.fullName })}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[13px] font-semibold text-rose-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-rose-100">
                  <UserX className="size-4" /> Marcar falta
                </button>
                {canJustify && (
                  <button type="button"
                    onClick={() => todayRecord && setJustifyTarget({ id: todayRecord.id, name: selectedEmp.fullName })}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-[13px] font-semibold text-blue-700 shadow-sm hover:bg-blue-100">
                    <ShieldCheck className="size-4" /> Justificar
                  </button>
                )}
                {todayRecord && (
                  <button type="button" onClick={() => setDetailRecord(todayRecord)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                    Ver detalle
                  </button>
                )}
                <button type="button" onClick={handleViewHistory}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-[13px] font-semibold text-brand-700 shadow-sm hover:bg-brand-100">
                  Ver historial
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <Search className="size-8 text-slate-300" />
              <p className="text-[13px] font-semibold text-slate-500">Busca un empleado para comenzar</p>
              <p className="text-[11px] text-slate-400">Escribe al menos 1 caracter para ver sugerencias</p>
            </div>
          )}
        </div>
      </div>

      {/* ── History block ───────────────────────────────────────────────────── */}
      <div id="historial-asistencia" className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Historial de asistencia</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {histQuery.isLoading ? "Cargando..." : `${total} registro${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ["attendance-hist"] })}
            className="inline-flex h-8 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 sm:self-auto">
            {histQuery.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Actualizar
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Desde</span>
              <input type="date" value={histDateFrom} onChange={(e) => { setHistDateFrom(e.target.value); setHistPage(1); }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-brand-400 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hasta</span>
              <input type="date" value={histDateTo} onChange={(e) => { setHistDateTo(e.target.value); setHistPage(1); }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-brand-400 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Empleado</span>
              <input type="text" value={histSearchInput} onChange={(e) => setHistSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setHistSearch(histSearchInput); setHistPage(1); } }}
                placeholder="Nombre o código..."
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-brand-400 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Área</span>
              <select value={histAreaId} onChange={(e) => { setHistAreaId(e.target.value); setHistPage(1); }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-brand-400 focus:outline-none">
                <option value="">Todas las áreas</option>
                {catalogsQuery.data?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Acciones</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { setHistSearch(histSearchInput); setHistPage(1); }}
                  className="h-8 flex-1 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-3 text-[12px] font-semibold text-white hover:from-brand-500 hover:to-brand-700">
                  Buscar
                </button>
                <button type="button" onClick={clearHistFilters}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Quick chips */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => { setHistDateFrom(todayIso(tz)); setHistDateTo(todayIso(tz)); setHistPage(1); }}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
              <Calendar className="size-3" /> Hoy
            </button>
            {[
              { key: "late",   label: "Tardanzas", active: "bg-amber-100 text-amber-700 border-amber-300" },
              { key: "absent", label: "Faltas",    active: "bg-rose-100 text-rose-700 border-rose-300" },
            ].map((chip) => (
              <button key={chip.key} type="button" onClick={() => applyChip(chip.key)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${activeChip === chip.key ? chip.active : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                {chip.label}
                {activeChip === chip.key && <X className="size-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Empleado", "Fecha", "Ingreso", "Salida", "Estado", "Tardanza", "Área", "Acciones"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 first:pl-5 last:pr-5">
                    <span className="inline-flex items-center gap-1">
                      {col}
                      {col !== "Acciones" && <ArrowUpDown className="size-3 text-slate-300" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {histQuery.isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto size-5 animate-spin text-slate-400" /></td></tr>
              ) : rows.length === 0 ? (
                <EmptyState
                  onToday={() => { setHistDateFrom(todayIso(tz)); setHistDateTo(todayIso(tz)); setHistPage(1); }}
                  onClear={clearHistFilters}
                />
              ) : rows.map((r) => {
                const status = resolveStatus(r);
                const canJustifyRow = (status === "late" || status === "absent") && !r.isJustified;
                return (
                  <tr key={r.id} className="group transition hover:bg-slate-50/80">
                    <td className="py-3 pl-5 pr-4">
                      <p className="font-semibold text-slate-800">{r.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{r.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.attendanceDate)}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{formatTime(r.checkInAtUtc, tz)}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{formatTime(r.checkOutAtUtc, tz)}</td>
                    <td className="px-4 py-3"><StatusBadge status={status} lateMinutes={r.lateMinutes} /></td>
                    <td className="px-4 py-3 text-slate-500">{r.lateMinutes > 0 ? `${r.lateMinutes} min` : "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-400">{r.area}</td>
                    <td className="px-4 py-3 pr-5">
                      <div className="flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
                        <button type="button" onClick={() => setDetailRecord(r)}
                          className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                          Ver
                        </button>
                        {canJustifyRow && (
                          <button type="button" onClick={() => setJustifyTarget({ id: r.id, name: r.employeeName })}
                            className="inline-flex h-7 items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                            Justificar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-[12px] text-slate-400">
              {((histPage - 1) * PAGE_SIZE) + 1}–{Math.min(histPage * PAGE_SIZE, total)} de {total} registros
            </p>
            <div className="flex items-center gap-1">
              <button type="button" disabled={histPage <= 1} onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-3 text-[12px] font-semibold text-slate-700">{histPage} / {totalPages}</span>
              <button type="button" disabled={histPage >= totalPages} onClick={() => setHistPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
