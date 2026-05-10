import { useEffect, useMemo, useRef, useState, type ElementType, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  AlertCircle, CalendarDays, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown,
  Clock, Clock3, Download, Eye, Loader2, MoreHorizontal,
  Search, ShieldCheck, UserCheck, UserMinus, UserX, X, Zap,
} from "lucide-react";
import {
  checkIn, checkOut, getAttendance, getAttendanceCatalogs,
  getAttendanceSummary, justifyAttendance, markAbsent,
} from "@/modules/attendance/services/attendanceApi";
import type { AttendanceEmployeeOption, AttendanceItem } from "@/modules/attendance/types/attendance.types";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_TZ = "America/Lima";
const PAGE_SIZE  = 15;

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500",
  "bg-amber-500", "bg-cyan-600",   "bg-indigo-500", "bg-pink-500",
];

// ─── Utilities ───────────────────────────────────────────────────────────────

function todayIso(tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

function nDaysAgo(n: number, tz = DEFAULT_TZ): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function formatDateWithDay(iso: string | null | undefined, tz = DEFAULT_TZ): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  const day = capFirst(d.toLocaleDateString("es-PE", { timeZone: tz, weekday: "short" }).replace(".", ""));
  const [y, m, dd] = iso.split("-");
  return `${dd}/${m}/${y} (${day.slice(0, 3)})`;
}

function formatTime(utc: string | null | undefined, tz = DEFAULT_TZ): string {
  if (!utc) return "—";
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-PE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(min: number): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${String(m).padStart(2, "0")} min`;
}

// ─── Status ──────────────────────────────────────────────────────────────────

type AttendanceStatus = "on_time" | "late" | "absent" | "justified" | "pending_out" | "no_record";

function resolveStatus(r: AttendanceItem): AttendanceStatus {
  if (r.isJustified) return "justified";
  if (r.isAbsent)    return "absent";
  if (!r.checkInAtUtc) return "no_record";
  if (!r.checkOutAtUtc) return "pending_out";
  if (r.lateMinutes > 0) return "late";
  return "on_time";
}

const STATUS_META: Record<AttendanceStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  on_time:     { label: "A tiempo",     bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  late:        { label: "Tardanza",     bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  absent:      { label: "Falta",        bg: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500" },
  justified:   { label: "Justificado",  bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500" },
  pending_out: { label: "Pend. salida", bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500" },
  no_record:   { label: "Sin registro", bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200",   dot: "bg-slate-400" },
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
    <div className={`fixed right-4 top-4 z-[100] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-xl transition-all ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
      {ok ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      <span className="flex-1 text-[13px] font-medium">{toast.msg}</span>
      <button type="button" onClick={onClose} className="rounded p-0.5 hover:bg-black/10"><X className="size-3.5" /></button>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AttendanceStatus }): JSX.Element {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, iconBg, iconColor, dotColor, pct, active, onClick }: {
  label: string; value: number; icon: ElementType;
  iconBg: string; iconColor: string; dotColor: string;
  pct: string; active?: boolean; onClick?: () => void;
}): JSX.Element {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition ${active ? "ring-2 ring-brand-400/40 shadow-md" : ""} ${onClick ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}>
      <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${iconBg}`}>
        <Icon className={`size-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-[26px] font-extrabold leading-tight text-slate-900">{value}</p>
        <div className="mt-0.5 flex items-center gap-1">
          <span className={`size-1.5 shrink-0 rounded-full ${dotColor}`} />
          <span className="text-[10px] text-slate-400">{pct} del total</span>
        </div>
      </div>
    </button>
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
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
              placeholder="Describe el motivo de la justificación..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200" />
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
            <p className="text-[12px] text-rose-700">¿Confirmas marcar la falta de <strong>{name}</strong>? Se generará un incidente automáticamente y quedará registrado en el historial.</p>
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
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-rose-500 to-rose-600 px-4 text-[13px] font-semibold text-white disabled:opacity-60">
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
  const canJustify = (status === "late" || status === "absent") && !record.isJustified;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Detalle de asistencia</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">{record.employeeName} · {formatDate(record.attendanceDate)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${m.bg} ${m.border}`}>
            <span className={`size-2.5 shrink-0 rounded-full ${m.dot}`} />
            <div>
              <p className={`text-[13px] font-bold ${m.text}`}>{m.label}{status === "late" ? ` — ${record.lateMinutes} min de tardanza` : ""}</p>
              <p className={`text-[11px] ${m.text} opacity-70`}>{formatDateWithDay(record.attendanceDate, tz)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { k: "Empleado",   v: record.employeeName },
              { k: "Código",     v: record.employeeCode },
              { k: "Área",       v: record.area },
              { k: "Fecha",      v: formatDate(record.attendanceDate) },
              { k: "Ingreso",    v: formatTime(record.checkInAtUtc, tz) },
              { k: "Salida",     v: formatTime(record.checkOutAtUtc, tz) },
              { k: "Tardanza",   v: record.lateMinutes > 0 ? `${record.lateMinutes} min` : "—" },
              { k: "Justificación", v: record.justification ?? "—" },
            ].map(({ k, v }) => (
              <div key={k} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cerrar</button>
          {canJustify && (
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

// ─── Row menu ────────────────────────────────────────────────────────────────

function RowMenu({ row, onDetail, onJustify, onHistory }: {
  row: AttendanceItem;
  onDetail: () => void;
  onJustify: () => void;
  onHistory: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const status = resolveStatus(row);
  const canJustify = (status === "late" || status === "absent") && !row.isJustified;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600">
        <MoreHorizontal className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <button type="button" onMouseDown={() => { onDetail(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
            <Eye className="size-3.5 text-slate-400" /> Ver detalle
          </button>
          <button type="button" onMouseDown={() => { onHistory(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
            <Clock3 className="size-3.5 text-slate-400" /> Ver historial
          </button>
          {canJustify && (
            <button type="button" onMouseDown={() => { onJustify(); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-medium text-blue-700 hover:bg-blue-50">
              <ShieldCheck className="size-3.5 text-blue-400" /> Justificar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SortableHeader ───────────────────────────────────────────────────────────

function SortableHeader({ col, label, sortKey, sortDir, align = "left", first = false, onSort }: {
  col: string; label: string; sortKey: string | null; sortDir: "asc" | "desc";
  align?: "left" | "center" | "right"; first?: boolean;
  onSort: (col: string) => void;
}): JSX.Element {
  const active = sortKey === col;
  const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      onClick={() => onSort(col)}
      className={`cursor-pointer select-none py-3 text-[11px] font-bold uppercase tracking-wide transition group text-${align} ${first ? "pl-5 pr-4" : "px-4"} ${active ? "text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={`size-3 shrink-0 ${active ? "text-teal-500" : "text-slate-300 group-hover:text-slate-400"}`} />
      </span>
    </th>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function PaginaAsistencia(): JSX.Element {
  const queryClient = useQueryClient();

  // Live clock
  const [liveTime, setLiveTime] = useState(() =>
    new Date().toLocaleTimeString("es-PE", { timeZone: DEFAULT_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  const [liveDate, setLiveDate] = useState(() =>
    capFirst(new Date().toLocaleDateString("es-PE", { timeZone: DEFAULT_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }))
  );
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

  // History filters
  const [histViewMode, setHistViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [histDateFrom, setHistDateFrom] = useState(() => todayIso());
  const [histDateTo, setHistDateTo] = useState(() => todayIso());
  const [histSearchInput, setHistSearchInput] = useState("");
  const [histSearch, setHistSearch] = useState("");
  const [histEmployeeId, setHistEmployeeId] = useState(""); // ID directo para Ver historial
  const [histAreaId, setHistAreaId] = useState("");
  const [histEstado, setHistEstado] = useState(""); // "" | "late" | "absent"
  const [histPage, setHistPage] = useState(1);

  // ── Ordenamiento del historial ──
  const [histSortKey, setHistSortKey] = useState<string | null>(null);
  const [histSortDir, setHistSortDir] = useState<"asc" | "desc">("desc");

  function toggleHistSort(key: string): void {
    if (histSortKey === key) {
      if (histSortDir === "asc") setHistSortDir("desc");
      else { setHistSortKey(null); setHistSortDir("desc"); }
    } else {
      setHistSortKey(key); setHistSortDir("asc");
    }
  }

  // Derived filter booleans
  const histIsLate   = histEstado === "late"   ? true : undefined;
  const histIsAbsent = histEstado === "absent" ? true : undefined;

  // Modals
  const [justifyTarget, setJustifyTarget] = useState<{ id: string; name: string } | null>(null);
  const [absentTarget,  setAbsentTarget]  = useState<{ id: string; name: string } | null>(null);
  const [detailRecord,  setDetailRecord]  = useState<AttendanceItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (type: "success" | "error", msg: string) => setToast({ type, msg });

  // ── Queries ─────────────────────────────────────────────────────────────────

  const catalogsQuery = useQuery({
    queryKey: ["attendance-catalogs"],
    queryFn: getAttendanceCatalogs,
    staleTime: 5 * 60_000,
  });
  const tz = catalogsQuery.data?.schedule?.timeZoneId ?? DEFAULT_TZ;

  // Today's global summary (auto-refresh 30s)
  const summaryQuery = useQuery({
    queryKey: ["attendance-summary-today"],
    queryFn: () => getAttendanceSummary({
      viewMode: "daily", referenceDate: todayIso(tz),
      startDateFrom: todayIso(tz), startDateTo: todayIso(tz),
      search: "", employeeId: "", areaId: "",
      isLate: undefined as unknown as boolean, isAbsent: undefined as unknown as boolean,
      pageNumber: 1, pageSize: 1,
    }),
    refetchInterval: 30_000,
  });

  // Today's record for selected employee
  const todayRecordQuery = useQuery({
    queryKey: ["attendance-today-emp", selectedEmp?.id],
    queryFn: () => getAttendance({
      viewMode: "daily", referenceDate: todayIso(tz),
      startDateFrom: todayIso(tz), startDateTo: todayIso(tz),
      search: "", employeeId: selectedEmp!.id, areaId: "",
      isLate: undefined as unknown as boolean, isAbsent: undefined as unknown as boolean,
      pageNumber: 1, pageSize: 1,
    }),
    enabled: !!selectedEmp,
  });
  const todayRecord = todayRecordQuery.data?.items[0] ?? null;

  // History list — usa employeeId directo cuando viene de "Ver historial",
  // o search de texto cuando el usuario escribe en el filtro manual.
  const histQuery = useQuery({
    queryKey: ["attendance-hist", histSearch, histEmployeeId, histAreaId, histDateFrom, histDateTo, histEstado, histViewMode, histPage],
    queryFn: () => getAttendance({
      viewMode: histViewMode, referenceDate: histDateFrom,
      startDateFrom: histDateFrom, startDateTo: histDateTo,
      search: histSearch,
      employeeId: histEmployeeId,
      areaId: histAreaId,
      isLate: histIsLate as unknown as boolean,
      isAbsent: histIsAbsent as unknown as boolean,
      pageNumber: histPage, pageSize: PAGE_SIZE,
    }),
  });
  const rows = histQuery.data?.items ?? [];
  const total = histQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const sortedHistRows = useMemo(() => {
    const arr = [...rows];
    if (!histSortKey) {
      return arr.sort((a, b) =>
        String(b.attendanceDate ?? "").localeCompare(String(a.attendanceDate ?? ""))
      );
    }
    return arr.sort((a, b) => {
      const av = String((a as Record<string, unknown>)[histSortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[histSortKey] ?? "");
      const cmp = av.localeCompare(bv, "es", { numeric: true });
      return histSortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, histSortKey, histSortDir]);

  // ── Summary percentages ──────────────────────────────────────────────────────

  const summary = summaryQuery.data;
  const grandTotal = (summary?.onTime ?? 0) + (summary?.late ?? 0) + (summary?.absent ?? 0) +
    (summary?.justified ?? 0) + (summary?.pendingCheckOut ?? 0) + (summary?.noRecord ?? 0);
  const pct = (n: number) => grandTotal > 0 ? `${((n / grandTotal) * 100).toFixed(1)}%` : "0%";

  // ── Mutations ────────────────────────────────────────────────────────────────

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendance-today-emp"] }),
      queryClient.invalidateQueries({ queryKey: ["attendance-summary-today"] }),
      queryClient.invalidateQueries({ queryKey: ["attendance-hist"] }),
    ]);
  };

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: async () => { await refreshAll(); showToast("success", "Ingreso registrado correctamente."); },
    onError: (e: unknown) => {
      const msg = e && typeof e === "object" && "response" in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      showToast("error", msg ?? "No se pudo registrar el ingreso.");
    },
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

  // ── Autocomplete ─────────────────────────────────────────────────────────────

  const filteredEmployees = useMemo(() => {
    const q = empSearch.toLowerCase().trim();
    if (!q) return [];
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

  // ── Contextual action flags ───────────────────────────────────────────────────
  // Reglas:
  // - Registrar ingreso: solo si NO tiene check-in hoy y NO está marcado como ausente
  // - Registrar salida: solo si TIENE check-in y NO tiene check-out
  // - Marcar falta: solo si NO tiene check-in y NO está ya ausente
  // - Justificar: solo si tiene tardanza o está ausente y NO está justificado

  const canCheckIn    = !!selectedEmp && !todayRecord?.checkInAtUtc && !todayRecord?.isAbsent;
  const canCheckOut   = !!selectedEmp && !!todayRecord?.checkInAtUtc && !todayRecord?.checkOutAtUtc && !todayRecord?.isAbsent;
  const canMarkAbsent = !!selectedEmp && !todayRecord?.checkInAtUtc && !todayRecord?.isAbsent;
  const canJustify    = !!todayRecord && (todayRecord.lateMinutes > 0 || todayRecord.isAbsent) && !todayRecord.isJustified;

  // ── History helpers ───────────────────────────────────────────────────────────

  function applyFilters() {
    setHistSearch(histSearchInput);
    setHistEmployeeId(""); // al buscar manualmente, quitar filtro por ID
    setHistPage(1);
  }

  function clearHistFilters() {
    setHistSearchInput(""); setHistSearch("");
    setHistEmployeeId("");
    setHistAreaId(""); setHistEstado("");
    setHistDateFrom(todayIso(tz)); setHistDateTo(todayIso(tz));
    setHistViewMode("daily"); setHistPage(1);
  }

  // Ver historial: filtra por ID directo del empleado (más confiable que buscar por nombre)
  function handleViewHistory(emp: { id: string; fullName: string }) {
    setHistEmployeeId(emp.id);        // filtro por ID — esto es lo que realmente funciona
    setHistSearchInput(emp.fullName); // solo para mostrar en el input
    setHistSearch("");                // limpiar búsqueda de texto para no interferir
    setHistDateFrom(nDaysAgo(30, tz));
    setHistDateTo(todayIso(tz));
    setHistEstado(""); setHistPage(1);
    setTimeout(() => document.getElementById("historial-asistencia")?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  function handleSummaryClick(estado: string) {
    setHistEstado((v) => v === estado ? "" : estado);
    setHistPage(1);
    setTimeout(() => document.getElementById("historial-asistencia")?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  async function handleExport() {
    try {
      const result = await getAttendance({
        viewMode: histViewMode, referenceDate: histDateFrom,
        startDateFrom: histDateFrom, startDateTo: histDateTo,
        search: histSearch, employeeId: "", areaId: histAreaId,
        isLate: histIsLate as unknown as boolean,
        isAbsent: histIsAbsent as unknown as boolean,
        pageNumber: 1, pageSize: 5000,
      });
      if (!result.items.length) { showToast("error", "No hay registros para exportar."); return; }
      const data = result.items.map((r) => ({
        "Empleado":        r.employeeName,
        "Código":          r.employeeCode,
        "Área":            r.area,
        "Fecha":           r.attendanceDate,
        "Ingreso":         formatTime(r.checkInAtUtc, tz),
        "Salida":          formatTime(r.checkOutAtUtc, tz),
        "Estado":          STATUS_META[resolveStatus(r)].label,
        "Tardanza (min)":  r.lateMinutes || 0,
        "Justificación":   r.justification ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
      XLSX.writeFile(wb, `Asistencia_${histDateFrom}_${histDateTo}.xlsx`);
      showToast("success", `${result.items.length} registros exportados.`);
    } catch {
      showToast("error", "No se pudo exportar.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-5">

      {/* Modals */}
      <JustifyModal open={!!justifyTarget} name={justifyTarget?.name ?? ""} saving={justifyMutation.isPending}
        onClose={() => setJustifyTarget(null)}
        onConfirm={(text) => justifyTarget && justifyMutation.mutate({ id: justifyTarget.id, text })} />
      <AbsentModal open={!!absentTarget} name={absentTarget?.name ?? ""} saving={absentMutation.isPending}
        onClose={() => setAbsentTarget(null)}
        onConfirm={(reason) => absentTarget && absentMutation.mutate({ id: absentTarget.id, reason })} />
      <DetailModal record={detailRecord} tz={tz} onClose={() => setDetailRecord(null)}
        onJustify={(id, name) => setJustifyTarget({ id, name })} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-500 text-white shadow-md">
            <CalendarDays className="size-6" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-slate-900">Asistencia</h1>
            <p className="text-[12px] text-slate-500">Registro de ingreso, salida, tardanzas, faltas y justificaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <CalendarDays className="size-4 text-slate-400" />
            {liveDate}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-[14px] font-bold tabular-nums text-slate-800 shadow-sm">
            <Clock3 className="size-4 text-teal-500" />
            {liveTime}
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* ── Resumen del día ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-[13px] font-bold text-slate-700">Resumen del día</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="A tiempo"     value={summary?.onTime ?? 0}         icon={UserCheck}  iconBg="bg-emerald-100" iconColor="text-emerald-600" dotColor="bg-emerald-500" pct={pct(summary?.onTime ?? 0)}         active={histEstado === "on_time"} />
          <SummaryCard label="Tardanzas"    value={summary?.late ?? 0}            icon={Clock3}     iconBg="bg-amber-100"   iconColor="text-amber-600"   dotColor="bg-amber-500"   pct={pct(summary?.late ?? 0)}            active={histEstado === "late"}    onClick={() => handleSummaryClick("late")} />
          <SummaryCard label="Faltas"       value={summary?.absent ?? 0}          icon={UserX}      iconBg="bg-rose-100"    iconColor="text-rose-600"    dotColor="bg-rose-500"    pct={pct(summary?.absent ?? 0)}          active={histEstado === "absent"}  onClick={() => handleSummaryClick("absent")} />
          <SummaryCard label="Justificados" value={summary?.justified ?? 0}       icon={ShieldCheck} iconBg="bg-blue-100"   iconColor="text-blue-600"    dotColor="bg-blue-500"    pct={pct(summary?.justified ?? 0)} />
          <SummaryCard label="Pend. salida" value={summary?.pendingCheckOut ?? 0} icon={Clock}      iconBg="bg-violet-100"  iconColor="text-violet-600"  dotColor="bg-violet-500"  pct={pct(summary?.pendingCheckOut ?? 0)} />
          <SummaryCard label="Sin registro" value={summary?.noRecord ?? 0}        icon={UserMinus}  iconBg="bg-slate-100"   iconColor="text-slate-500"   dotColor="bg-slate-400"   pct={pct(summary?.noRecord ?? 0)} />
        </div>
      </div>

      {/* ── Registro rápido ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <div className="grid size-6 place-items-center rounded-md bg-amber-400 text-white">
            <Zap className="size-3.5" />
          </div>
          <h2 className="text-[14px] font-bold text-slate-800">Registro rápido</h2>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[400px_1fr]">
          {/* Left: Search */}
          <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input ref={empRef} type="text" value={empSearch}
                onChange={(e) => { setEmpSearch(e.target.value); setShowDropdown(true); if (selectedEmp && e.target.value !== selectedEmp.fullName) setSelectedEmp(null); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Buscar empleado (nombre, código, DNI, área)..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-[13px] text-slate-800 placeholder-slate-400 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200" />
              {(empSearch || selectedEmp) && (
                <button type="button" onClick={clearEmployee} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            <div className={`mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-all ${showDropdown && filteredEmployees.length > 0 ? "block" : "hidden"}`}>
              {filteredEmployees.map((emp) => (
                <button key={emp.id} type="button" onMouseDown={() => selectEmployee(emp)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 ${selectedEmp?.id === emp.id ? "bg-teal-50" : ""}`}>
                  <div className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${avatarColor(emp.fullName)}`}>
                    {initials(emp.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{emp.fullName}</p>
                    <p className="text-[11px] text-slate-400">{emp.employeeCode} · {emp.documentNumber ? `DNI ${emp.documentNumber}` : ""} · {emp.area}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Empty search hint */}
            {!showDropdown && !selectedEmp && (
              <div className="mt-8 flex flex-col items-center gap-2 text-center">
                <Search className="size-8 text-slate-200" />
                <p className="text-[13px] font-medium text-slate-400">Busca un empleado para registrar</p>
                <p className="text-[11px] text-slate-300">Nombre, código, DNI o área</p>
              </div>
            )}
          </div>

          {/* Right: Employee card */}
          <div className="p-5">
            {selectedEmp ? (
              <div className="space-y-4">
                {/* Card */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`grid size-14 place-items-center rounded-full text-lg font-extrabold text-white ${avatarColor(selectedEmp.fullName)}`}>
                      {initials(selectedEmp.fullName)}
                    </div>
                    <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white bg-emerald-400" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-bold text-slate-900 leading-tight">{selectedEmp.fullName}</p>
                    <p className="mt-0.5 text-[12px] text-slate-400">
                      {selectedEmp.employeeCode}{selectedEmp.documentNumber ? ` · DNI ${selectedEmp.documentNumber}` : ""}
                    </p>
                    {/* Detail fields */}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5 text-[11px]">
                      <div>
                        <p className="text-slate-400">Área</p>
                        <p className="font-semibold text-teal-600">{selectedEmp.area || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Cargo</p>
                        <p className="font-semibold text-slate-700">{selectedEmp.position || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Horario</p>
                        <p className="font-semibold text-slate-700">{selectedEmp.expectedSchedule || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Turno</p>
                        <p className="font-semibold text-slate-700">{selectedEmp.shiftName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Estado</p>
                        {todayRecordQuery.isLoading
                          ? <span className="text-slate-400"><Loader2 className="inline size-3 animate-spin" /></span>
                          : <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${todayRecord ? `${STATUS_META[resolveStatus(todayRecord)].bg} ${STATUS_META[resolveStatus(todayRecord)].text}` : "bg-slate-100 text-slate-500"}`}>
                              {todayRecord ? STATUS_META[resolveStatus(todayRecord)].label : "Sin registro"}
                            </span>
                        }
                      </div>
                      <div>
                        <p className="text-slate-400">Ingreso</p>
                        <p className={`font-bold ${todayRecord?.checkInAtUtc ? "text-emerald-600" : "text-slate-400"}`}>
                          {todayRecord ? formatTime(todayRecord.checkInAtUtc, tz) : "--:--"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Salida</p>
                        <p className={`font-bold ${todayRecord?.checkOutAtUtc ? "text-emerald-600" : "text-slate-400"}`}>
                          {todayRecord ? formatTime(todayRecord.checkOutAtUtc, tz) : "--:--"}
                        </p>
                      </div>
                      {todayRecord && todayRecord.lateMinutes > 0 && (
                        <div>
                          <p className="text-slate-400">Tardanza</p>
                          <p className="font-bold text-amber-600">{formatMinutes(todayRecord.lateMinutes)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button type="button" disabled={!canCheckIn || checkInMutation.isPending}
                    onClick={() => checkInMutation.mutate(selectedEmp.id)}
                    title={!canCheckIn ? (todayRecord?.isAbsent ? "Ya tiene falta registrada" : todayRecord?.checkInAtUtc ? "Ya registró ingreso hoy" : "") : ""}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 text-[12px] font-semibold text-white shadow-sm shadow-teal-500/20 transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40">
                    {checkInMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-4" />}
                    Registrar Ingreso
                  </button>
                  <button type="button" disabled={!canCheckOut || checkOutMutation.isPending}
                    onClick={() => todayRecord?.id && checkOutMutation.mutate(todayRecord.id)}
                    title={!canCheckOut ? (!todayRecord?.checkInAtUtc ? "No ha registrado ingreso aún" : todayRecord?.checkOutAtUtc ? "Ya registró salida hoy" : "") : ""}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3.5 text-[12px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40">
                    {checkOutMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-4" />}
                    Registrar salida
                  </button>
                  <button type="button" disabled={!canMarkAbsent}
                    onClick={() => setAbsentTarget({ id: selectedEmp.id, name: selectedEmp.fullName })}
                    title={!canMarkAbsent ? (todayRecord?.isAbsent ? "Ya tiene falta registrada" : todayRecord?.checkInAtUtc ? "Ya tiene ingreso registrado" : "") : ""}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 text-[12px] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
                    <UserX className="size-4" /> Marcar falta
                  </button>
                  {canJustify && (
                    <button type="button"
                      onClick={() => todayRecord && setJustifyTarget({ id: todayRecord.id, name: selectedEmp.fullName })}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-300 bg-white px-3.5 text-[12px] font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50">
                      <ShieldCheck className="size-4" /> Justificar
                    </button>
                  )}
                  {todayRecord && (
                    <button type="button" onClick={() => setDetailRecord(todayRecord)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
                      <Eye className="size-4" /> Ver detalle
                    </button>
                  )}
                  <button type="button" onClick={() => handleViewHistory(selectedEmp)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
                    <Clock3 className="size-4" /> Ver historial
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
                <UserCheck className="size-8 text-slate-200" />
                <p className="text-[13px] font-medium text-slate-400">Selecciona un empleado para registrar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Historial ───────────────────────────────────────────────────────── */}
      <div id="historial-asistencia" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-[14px] font-bold text-slate-800">Historial de asistencia</h2>
        </div>

        {/* Filter bar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="flex flex-wrap items-end gap-2.5">
            {/* Vista */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vista</span>
              <select value={histViewMode} onChange={(e) => { setHistViewMode(e.target.value as "daily" | "weekly" | "monthly"); setHistPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-teal-400 focus:outline-none">
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            {/* Fecha desde */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha desde</span>
              <input type="date" value={histDateFrom} onChange={(e) => { setHistDateFrom(e.target.value); setHistPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-teal-400 focus:outline-none" />
            </div>
            {/* Fecha hasta */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha hasta</span>
              <input type="date" value={histDateTo} onChange={(e) => { setHistDateTo(e.target.value); setHistPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-teal-400 focus:outline-none" />
            </div>
            {/* Búsqueda */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Búsqueda</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input type="text" value={histSearchInput} onChange={(e) => setHistSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Buscar empleado..."
                  className="h-9 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[12px] text-slate-700 focus:border-teal-400 focus:outline-none" />
              </div>
            </div>
            {/* Área */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Área</span>
              <select value={histAreaId} onChange={(e) => { setHistAreaId(e.target.value); setHistPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-teal-400 focus:outline-none">
                <option value="">Todas las áreas</option>
                {catalogsQuery.data?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {/* Estado */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</span>
              <select value={histEstado} onChange={(e) => { setHistEstado(e.target.value); setHistPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:border-teal-400 focus:outline-none">
                <option value="">Todos</option>
                <option value="late">Tardanza</option>
                <option value="absent">Falta</option>
              </select>
            </div>
            {/* Buttons */}
            <div className="flex items-end gap-1.5 pb-0">
              <button type="button" onClick={applyFilters}
                className="h-9 rounded-lg bg-teal-500 px-4 text-[12px] font-semibold text-white hover:bg-teal-600">
                Aplicar
              </button>
              <button type="button" onClick={clearHistFilters}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                Limpiar
              </button>
              <button type="button" onClick={handleExport}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                <Download className="size-3.5" /> Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <SortableHeader col="employeeName"    label="Empleado"  sortKey={histSortKey} sortDir={histSortDir} onSort={toggleHistSort} first />
                <SortableHeader col="attendanceDate"  label="Fecha"     sortKey={histSortKey} sortDir={histSortDir} onSort={toggleHistSort} />
                <SortableHeader col="checkInAtUtc"    label="Ingreso"   sortKey={histSortKey} sortDir={histSortDir} onSort={toggleHistSort} />
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Salida</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">Estado</th>
                <SortableHeader col="lateMinutes"     label="Tardanza"  sortKey={histSortKey} sortDir={histSortDir} onSort={toggleHistSort} />
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 last:pr-5">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {histQuery.isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto size-5 animate-spin text-slate-400" /></td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center gap-3 py-14 text-center">
                      <div className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50">
                        <Clock3 className="size-6 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-slate-700">No hay registros para los filtros seleccionados</p>
                        <p className="mt-1 text-[12px] text-slate-400">Prueba cambiando el rango de fechas o limpiando los filtros.</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setHistDateFrom(todayIso(tz)); setHistDateTo(todayIso(tz)); setHistPage(1); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[12px] font-semibold text-teal-700 hover:bg-teal-100">
                          <CalendarDays className="size-3.5" /> Ver hoy
                        </button>
                        <button type="button" onClick={clearHistFilters}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                          <X className="size-3.5" /> Limpiar filtros
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : sortedHistRows.map((r) => {
                const status = resolveStatus(r);
                return (
                  <tr key={r.id} className="group transition hover:bg-slate-50/80">
                    {/* Empleado */}
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${avatarColor(r.employeeName)}`}>
                          {initials(r.employeeName)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{r.employeeName}</p>
                          <p className="text-[11px] text-slate-400">{r.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    {/* Fecha */}
                    <td className="px-4 py-3 text-slate-500">{formatDateWithDay(r.attendanceDate, tz)}</td>
                    {/* Ingreso */}
                    <td className="px-4 py-3">
                      {r.checkInAtUtc ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`size-2 shrink-0 rounded-full ${r.lateMinutes > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />
                          <span className="font-medium text-slate-700">{formatTime(r.checkInAtUtc, tz)}</span>
                        </span>
                      ) : <span className="text-slate-400">--:--</span>}
                    </td>
                    {/* Salida */}
                    <td className="px-4 py-3">
                      {r.checkOutAtUtc ? (
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
                          <span className="font-medium text-slate-700">{formatTime(r.checkOutAtUtc, tz)}</span>
                        </span>
                      ) : <span className="text-slate-400">--:--</span>}
                    </td>
                    {/* Estado */}
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    {/* Tardanza */}
                    <td className="px-4 py-3">
                      {r.lateMinutes > 0
                        ? <span className="font-semibold text-amber-600">{formatMinutes(r.lateMinutes)}</span>
                        : <span className="text-slate-400">--</span>
                      }
                    </td>
                    {/* Acción */}
                    <td className="px-4 py-3 pr-5">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setDetailRecord(r)}
                          className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                          <Eye className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => handleViewHistory({ id: r.employeeId, fullName: r.employeeName })}
                          className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                          <Clock3 className="size-3.5" />
                        </button>
                        <RowMenu row={r}
                          onDetail={() => setDetailRecord(r)}
                          onJustify={() => setJustifyTarget({ id: r.id, name: r.employeeName })}
                          onHistory={() => handleViewHistory({ id: r.employeeId, fullName: r.employeeName })}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
          <p className="text-[12px] text-slate-400">
            {total > 0
              ? `Mostrando ${((histPage - 1) * PAGE_SIZE) + 1} a ${Math.min(histPage * PAGE_SIZE, total)} de ${total} resultado${total !== 1 ? "s" : ""}`
              : "Sin resultados"
            }
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" disabled={histPage <= 1} onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = histPage <= 3 ? i + 1 : histPage >= totalPages - 2 ? totalPages - 4 + i : histPage - 2 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button key={pg} type="button" onClick={() => setHistPage(pg)}
                    className={`flex size-8 items-center justify-center rounded-lg text-[12px] font-semibold ${pg === histPage ? "bg-teal-500 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {pg}
                  </button>
                );
              })}
              <button type="button" disabled={histPage >= totalPages} onClick={() => setHistPage((p) => Math.min(totalPages, p + 1))}
                className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
