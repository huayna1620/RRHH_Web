import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  AlertCircle, BriefcaseMedical, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, ClipboardList, Clock,
  Download, Eye, Loader2, Plus, RefreshCw, Search,
  Shield, X, XCircle,
} from "lucide-react";
import {
  approveLeaveRequest, cancelLeaveRequest, createLeaveRequest,
  getLeaveCatalogs, getLeaves, rejectLeaveRequest,
} from "@/modules/leaves/services/leavesApi";
import type { LeaveItem, LeaveType } from "@/modules/leaves/types/leave.types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CUR_YEAR   = new Date().getFullYear();
const YEARS      = [CUR_YEAR - 2, CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1, CUR_YEAR + 2];
const PAGE_SIZES = [10, 25, 50];

// ─── Traducción de tipos ──────────────────────────────────────────────────────

const LEAVE_TYPE_LABEL: Record<string, string> = {
  personal:           "Personal",
  medical:            "Médico",
  study:              "Estudio",
  maternity_paternity:"Maternidad / Paternidad",
  other:              "Otro",
};

const LEAVE_TYPE_ICON: Record<string, JSX.Element> = {
  medical:            <BriefcaseMedical className="size-3" />,
  study:              <ClipboardList className="size-3" />,
  maternity_paternity:<Shield className="size-3" />,
  personal:           <CalendarDays className="size-3" />,
  other:              <CalendarDays className="size-3" />,
};

const LEAVE_TYPE_COLOR: Record<string, string> = {
  medical:            "bg-sky-50 text-sky-700 border-sky-200",
  study:              "bg-violet-50 text-violet-700 border-violet-200",
  maternity_paternity:"bg-pink-50 text-pink-700 border-pink-200",
  personal:           "bg-amber-50 text-amber-700 border-amber-200",
  other:              "bg-slate-100 text-slate-600 border-slate-200",
};

function leaveTypeLabel(code: string): string {
  return LEAVE_TYPE_LABEL[code] ?? code;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const COLS = [
    "bg-teal-500","bg-brand-500","bg-violet-500","bg-amber-500",
    "bg-rose-500","bg-sky-500","bg-emerald-500","bg-pink-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLS[Math.abs(h) % COLS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]} ${y}`;
}

function fmtDateShort(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { variant: "success" | "error"; message: string };

function Toast({ message, variant, onClose }: ToastState & { onClose: () => void }): JSX.Element {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  const colors = variant === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800";
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${colors}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 text-[13px] font-medium leading-snug">{message}</p>
      <button onClick={onClose} className="shrink-0 opacity-50 hover:opacity-100 transition"><X className="size-3.5" /></button>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  pending:   { label: "Pendiente",  cls: "bg-amber-50 text-amber-700 border-amber-200",       Icon: Clock },
  approved:  { label: "Aprobado",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  rejected:  { label: "Rechazado",  cls: "bg-rose-50 text-rose-700 border-rose-200",          Icon: XCircle },
  cancelled: { label: "Cancelado",  cls: "bg-slate-100 text-slate-500 border-slate-200",      Icon: X },
};

function StatusBadge({ status }: { status: string }): JSX.Element {
  const m = STATUS_MAP[status] ?? { label: status, cls: "bg-slate-100 text-slate-500 border-slate-200", Icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${m.cls}`}>
      <m.Icon className="size-3" />{m.label}
    </span>
  );
}

// ─── LeaveTypeBadge ───────────────────────────────────────────────────────────

function LeaveTypeBadge({ code }: { code: string }): JSX.Element {
  const cls  = LEAVE_TYPE_COLOR[code] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const icon = LEAVE_TYPE_ICON[code] ?? <CalendarDays className="size-3" />;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {icon}{leaveTypeLabel(code)}
    </span>
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
          ? <div className="mt-1.5 h-7 w-10 animate-pulse rounded-lg bg-slate-200" />
          : <p className="mt-0.5 text-[28px] font-extrabold leading-none text-slate-900">{value}</p>
        }
        {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }): JSX.Element {
  const color = avatarColor(name);
  const sz = { sm: "size-7 text-[10px]", md: "size-9 text-[12px]", lg: "size-12 text-[15px]" }[size];
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${color} ${sz}`}>
      {initials(name)}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onClear, onCreate }: { onClear: () => void; onCreate: () => void }): JSX.Element {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
            <ClipboardList className="size-8 stroke-[1.5] text-slate-400" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-700">Sin solicitudes</p>
            <p className="mt-1 text-[13px] text-slate-400">No hay permisos que coincidan con los filtros actuales.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClear} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
              <X className="size-3.5" />Limpiar filtros
            </button>
            <button onClick={onCreate} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-brand-600">
              <Plus className="size-3.5" />Nueva solicitud
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmCls, saving, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; confirmCls: string;
  saving: boolean; onConfirm: () => void; onCancel: () => void;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-3 px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
            <AlertCircle className="size-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button onClick={onCancel} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            No, mantener
          </button>
          <button disabled={saving} onClick={onConfirm} className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white shadow-sm disabled:opacity-60 ${confirmCls}`}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DetailModal ─────────────────────────────────────────────────────────────

function DetailModal({ item, onClose }: { item: LeaveItem; onClose: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 px-5 py-4">
          <Avatar name={item.employeeName} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-[16px] font-bold text-slate-900">{item.employeeName}</h3>
            <p className="text-[12px] text-slate-400">{item.employeeCode} · {item.area}</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X className="size-4" />
          </button>
        </div>
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</p>
            <div className="mt-1.5"><LeaveTypeBadge code={item.leaveType} /></div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
            <div className="mt-1.5"><StatusBadge status={item.status} /></div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inicio</p>
            <p className="mt-1 text-[14px] font-semibold text-slate-800">{fmtDate(item.startDate)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fin</p>
            <p className="mt-1 text-[14px] font-semibold text-slate-800">{fmtDate(item.endDate)}</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Días solicitados</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none text-teal-700">{item.requestedDays}</p>
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Remunerado</p>
            <span className={`mt-1.5 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.isPaid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
              {item.isPaid ? "Sí" : "No"}
            </span>
          </div>
        </div>
        {/* Detalles adicionales */}
        <div className="space-y-3 px-5 pb-4">
          {item.reason && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Motivo</p>
              <p className="mt-1 text-[13px] text-slate-700">{item.reason}</p>
            </div>
          )}
          {item.reviewerComment && (
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Comentario del revisor</p>
              <p className="mt-1 text-[13px] text-slate-700">{item.reviewerComment}</p>
            </div>
          )}
          {item.requestedAtUtc && (
            <p className="text-[11px] text-slate-400">Registrado el {fmtDateShort(item.requestedAtUtc)}</p>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ReviewModal ─────────────────────────────────────────────────────────────

function ReviewModal({ item, saving, onClose, onApprove, onReject }: {
  item: LeaveItem; saving: boolean;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
}): JSX.Element {
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const commentErr = touched && comment.trim().length < 2;

  function handleReject(): void {
    setTouched(true);
    if (comment.trim().length < 2) return;
    onReject(comment.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Revisar solicitud</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">Aprueba o rechaza esta solicitud de permiso</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <Avatar name={item.employeeName} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-slate-800">{item.employeeName}</p>
              <p className="text-[11px] text-slate-500">
                <LeaveTypeBadge code={item.leaveType} />
                <span className="ml-2">{fmtDate(item.startDate)} → {fmtDate(item.endDate)}</span>
                <span className="ml-1.5 font-bold text-teal-600">· {item.requestedDays} días</span>
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2 px-5 py-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Comentario <span className="text-rose-500">*</span>
              <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">— requerido para rechazar</span>
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Escribe un comentario de revisión..."
              className={`w-full resize-none rounded-xl border px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
                commentErr ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
              }`}
            />
            {commentErr && (
              <p className="flex items-center gap-1 text-[12px] text-rose-600">
                <AlertCircle className="size-3" />Mínimo 2 caracteres para rechazar
              </p>
            )}
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Cancelar
          </button>
          <button disabled={saving} onClick={handleReject} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-[13px] font-semibold text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-60">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            <XCircle className="size-3.5" />Rechazar
          </button>
          <button disabled={saving} onClick={() => onApprove(comment.trim())} className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-60">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            <CheckCircle2 className="size-3.5" />Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CreateModal ─────────────────────────────────────────────────────────────

type EmpOption = { id: string; label: string };
type TypeOption = { code: LeaveType; name: string };

function CreateModal({ employees, leaveTypes, saving, serverError, onClose, onSubmit }: {
  employees: EmpOption[];
  leaveTypes: TypeOption[];
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (p: { employeeId: string; leaveType: string; startDate: string; endDate: string; isPaid: boolean; reason: string }) => void;
}): JSX.Element {
  const [empQuery, setEmpQuery]       = useState("");
  const [empOpen, setEmpOpen]         = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmpOption | null>(null);
  const [leaveType, setLeaveType]     = useState("");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [isPaid, setIsPaid]           = useState(false);
  const [reason, setReason]           = useState("");
  const [touched, setTouched]         = useState(false);
  const empRef = useRef<HTMLInputElement>(null);

  // Autocomplete
  const filteredEmps = useMemo(() => {
    const q = empQuery.toLowerCase();
    if (!q) return employees.slice(0, 8);
    return employees.filter((e) => e.label.toLowerCase().includes(q)).slice(0, 8);
  }, [employees, empQuery]);

  // Cálculo de días (calendario)
  const calDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    return Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
  }, [startDate, endDate]);

  // Errores
  const empErr    = touched && !selectedEmp;
  const typeErr   = touched && !leaveType;
  const startErr  = touched && !startDate;
  const endErr    = touched && (!endDate || (!!startDate && endDate < startDate));
  const reasonErr = touched && reason.trim().length < 5;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setTouched(true);
    if (!selectedEmp || !leaveType || !startDate || !endDate || endDate < startDate || reason.trim().length < 5) return;
    onSubmit({ employeeId: selectedEmp.id, leaveType, startDate, endDate, isPaid, reason: reason.trim() });
  }

  function pickEmp(emp: EmpOption): void {
    setSelectedEmp(emp); setEmpQuery(emp.label); setEmpOpen(false); empRef.current?.blur();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh]">

        {/* Encabezado */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 shadow-sm shadow-brand-500/30">
            <ClipboardList className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-slate-900">Nueva solicitud de permiso</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">Registra y envía el permiso a aprobación</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <X className="size-4" />
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <div className="overflow-y-auto">
          <form id="leave-form" onSubmit={handleSubmit} noValidate>

            {/* ── Bloque 1: Colaborador ── */}
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">1 · Colaborador</p>

              {/* Autocomplete */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={empRef}
                  type="text"
                  value={empQuery}
                  placeholder="Buscar por nombre o código..."
                  onFocus={() => setEmpOpen(true)}
                  onBlur={() => setTimeout(() => setEmpOpen(false), 150)}
                  onChange={(e) => { setEmpQuery(e.target.value); setSelectedEmp(null); setEmpOpen(true); }}
                  className={`h-9 w-full rounded-xl border pl-9 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
                    empErr ? "border-rose-300 bg-rose-50" : "border-slate-200"
                  }`}
                />
                {empOpen && filteredEmps.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {filteredEmps.map((emp) => (
                      <li key={emp.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickEmp(emp)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition"
                        >
                          <Avatar name={emp.label} size="sm" />
                          <span className="flex-1 truncate text-[13px] font-medium text-slate-800">{emp.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {empErr && <p className="mt-1.5 flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Selecciona un empleado</p>}

              {/* Mini-card del empleado */}
              {selectedEmp && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 to-slate-50 px-4 py-3">
                  <Avatar name={selectedEmp.label} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-slate-900">{selectedEmp.label}</p>
                    <p className="text-[11px] text-slate-500">Colaborador seleccionado</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedEmp(null); setEmpQuery(""); empRef.current?.focus(); }}
                    className="ml-auto shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Bloque 2: Solicitud ── */}
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">2 · Detalle del permiso</p>
              <div className="space-y-3">

                {/* Tipo */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Tipo de permiso <span className="text-rose-500">*</span></span>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className={`h-9 w-full rounded-xl border px-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
                      typeErr ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <option value="">Seleccionar tipo...</option>
                    {leaveTypes.map((t) => (
                      <option key={t.code} value={t.code}>{leaveTypeLabel(t.code)}</option>
                    ))}
                  </select>
                  {typeErr && <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Selecciona un tipo de permiso</p>}
                </label>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">Fecha inicio <span className="text-rose-500">*</span></span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); }}
                      className={`h-9 w-full rounded-xl border px-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
                        startErr ? "border-rose-300 bg-rose-50" : "border-slate-200"
                      }`}
                    />
                    {startErr && <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Requerido</p>}
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">Fecha fin <span className="text-rose-500">*</span></span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`h-9 w-full rounded-xl border px-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
                        endErr ? "border-rose-300 bg-rose-50" : "border-slate-200"
                      }`}
                    />
                    {endErr && <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Fecha inválida</p>}
                  </label>
                </div>

                {/* Remunerado */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">Permiso remunerado</p>
                    <p className="text-[11px] text-slate-500">El empleado recibirá su pago habitual durante el período</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaid((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors ${
                      isPaid ? "border-brand-500 bg-brand-500" : "border-slate-300 bg-slate-200"
                    }`}
                  >
                    <span className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${isPaid ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                {/* Motivo */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Motivo <span className="text-rose-500">*</span></span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Describe el motivo del permiso (mínimo 5 caracteres)..."
                    className={`w-full resize-none rounded-xl border px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
                      reasonErr ? "border-rose-300 bg-rose-50" : "border-slate-200"
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    {reasonErr
                      ? <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Mínimo 5 caracteres</p>
                      : <span />
                    }
                    <span className="text-[11px] text-slate-400">{reason.length}/500</span>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Bloque 3: Resumen dinámico ── */}
            <div className="px-5 py-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">3 · Resumen</p>
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tipo</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-slate-700">
                    {leaveType ? leaveTypeLabel(leaveType) : <span className="text-slate-300">—</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Duración estimada</p>
                  <p className={`mt-0.5 text-[18px] font-extrabold ${calDays !== null ? "text-teal-700" : "text-slate-300"}`}>
                    {calDays !== null ? `~${calDays} días` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Período</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-700">
                    {startDate && endDate
                      ? `${fmtDate(startDate)} → ${fmtDate(endDate)}`
                      : <span className="text-slate-300">—</span>
                    }
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Remunerado</p>
                  <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                    isPaid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}>
                    {isPaid ? "Sí" : "No"}
                  </span>
                </div>
              </div>
              {calDays !== null && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <CalendarDays className="size-3.5 shrink-0 text-teal-500" />
                  Duración estimada de ~{calDays} días calendario. El sistema validará días hábiles al registrar.
                </p>
              )}
              {serverError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                  <p className="text-[12px] font-medium text-rose-700">{serverError}</p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 shrink-0">
          <p className="text-[11px] text-slate-400">
            <span className="text-rose-500">*</span> Campos obligatorios
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              form="leave-form"
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-5 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 hover:from-brand-500 hover:to-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              {saving ? "Guardando..." : "Guardar solicitud"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function PaginaPermisos(): JSX.Element {
  const qc = useQueryClient();

  // ── Filtros ──
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [status, setStatus]           = useState("");
  const [leaveType, setLeaveType]     = useState("");
  const [year, setYear]               = useState(CUR_YEAR);
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);

  // ── UI ──
  const [toast, setToast]             = useState<ToastState | null>(null);
  const [detailItem, setDetailItem]   = useState<LeaveItem | null>(null);
  const [reviewItem, setReviewItem]   = useState<LeaveItem | null>(null);
  const [cancelItem, setCancelItem]   = useState<LeaveItem | null>(null);
  const [createOpen, setCreateOpen]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const ok   = (msg: string) => setToast({ variant: "success", message: msg });
  const fail = (msg: string) => setToast({ variant: "error",   message: msg });

  async function refreshAll(): Promise<void> {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["leaves"] }),
      qc.invalidateQueries({ queryKey: ["leaves-kpi"] }),
    ]);
  }

  async function handleManualRefresh(): Promise<void> {
    setIsRefreshing(true);
    await refreshAll();
    setIsRefreshing(false);
  }

  function clearFilters(): void {
    setSearchInput(""); setSearch(""); setStatus(""); setLeaveType(""); setYear(CUR_YEAR); setPage(1);
  }

  function applyFilters(): void {
    setSearch(searchInput); setPage(1);
  }

  const hasActiveFilters = !!(search || status || leaveType || year !== CUR_YEAR);

  // ── KPIs (4 queries reales) ──
  const kpiBase = { search: "", employeeId: "", startDateFrom: "", startDateTo: "", leaveType: "" as never, pageNumber: 1, pageSize: 1 };
  const kpiTotal    = useQuery({ queryKey: ["leaves-kpi", "total",    year], queryFn: () => getLeaves({ ...kpiBase, year, status: "" as never }) });
  const kpiPending  = useQuery({ queryKey: ["leaves-kpi", "pending",  year], queryFn: () => getLeaves({ ...kpiBase, year, status: "pending"  }) });
  const kpiApproved = useQuery({ queryKey: ["leaves-kpi", "approved", year], queryFn: () => getLeaves({ ...kpiBase, year, status: "approved" }) });
  const kpiRejected = useQuery({ queryKey: ["leaves-kpi", "rejected", year], queryFn: () => getLeaves({ ...kpiBase, year, status: "rejected" }) });

  // ── Lista ──
  const listQuery = useQuery({
    queryKey: ["leaves", search, status, leaveType, year, page, pageSize],
    queryFn: () => getLeaves({
      search, employeeId: "", status: status as never, leaveType: leaveType as never,
      startDateFrom: "", startDateTo: "", year, pageNumber: page, pageSize,
    }),
  });

  // ── Catálogos ──
  const catalogsQuery = useQuery({ queryKey: ["leave-catalogs"], queryFn: getLeaveCatalogs });
  const employees  = catalogsQuery.data?.employees ?? [];
  const leaveTypes = catalogsQuery.data?.leaveTypes ?? [];

  const rows       = listQuery.data?.items ?? [];
  const total      = listQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom  = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo    = Math.min(page * pageSize, total);

  // Páginas numeradas con ventana deslizante
  const pageNumbers = useMemo((): number[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const half = 3;
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + 6);
    start = Math.max(1, end - 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, page]);

  // ── Exportar Excel ──
  function handleExport(): void {
    if (rows.length === 0) return;
    const data = rows.map((r) => ({
      Empleado:       r.employeeName,
      Código:         r.employeeCode,
      Área:           r.area,
      Tipo:           leaveTypeLabel(r.leaveType),
      Inicio:         r.startDate,
      Fin:            r.endDate,
      Días:           r.requestedDays,
      Remunerado:     r.isPaid ? "Sí" : "No",
      Estado:         STATUS_MAP[r.status]?.label ?? r.status,
      "Solicitado el": r.requestedAtUtc ? fmtDateShort(r.requestedAtUtc) : "",
      Motivo:         r.reason ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Permisos");
    XLSX.writeFile(wb, `permisos_${year}${status ? `_${status}` : ""}.xlsx`);
  }

  // ── Mutaciones ──
  const createMut = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: async () => {
      await refreshAll();
      ok("Solicitud de permiso registrada correctamente.");
      setCreateOpen(false); setCreateError(null);
    },
    onError: () => setCreateError("No se pudo registrar la solicitud. Verifica los datos e intenta nuevamente."),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => approveLeaveRequest(id, comment),
    onSuccess: async () => { await refreshAll(); ok("Permiso aprobado correctamente."); setReviewItem(null); },
    onError: () => fail("No se pudo aprobar el permiso."),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectLeaveRequest(id, comment),
    onSuccess: async () => { await refreshAll(); ok("Permiso rechazado."); setReviewItem(null); },
    onError: () => fail("No se pudo rechazar el permiso."),
  });

  const cancelMut = useMutation({
    mutationFn: cancelLeaveRequest,
    onSuccess: async () => { await refreshAll(); ok("Permiso cancelado."); setCancelItem(null); },
    onError: () => { fail("No se pudo cancelar el permiso."); setCancelItem(null); },
  });

  return (
    <section className="space-y-5 pb-10">

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 shadow-sm shadow-brand-500/30">
            <ClipboardList className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Permisos</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">Gestión y aprobación de solicitudes de permiso</p>
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
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            title="Exportar a Excel"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition"
          >
            <Download className="size-4" />Exportar
          </button>
          <button
            onClick={() => { setCreateOpen(true); setCreateError(null); }}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 hover:from-brand-500 hover:to-brand-700 transition"
          >
            <Plus className="size-4" />Nueva solicitud
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Total del año"
          value={kpiTotal.data?.totalCount ?? 0}
          sub={`año ${year}`}
          loading={kpiTotal.isLoading}
          iconBg="bg-brand-50 shadow-brand-100"
          icon={<ClipboardList className="size-5 text-brand-500" />}
        />
        <KpiCard
          label="Pendientes"
          value={kpiPending.data?.totalCount ?? 0}
          sub="en espera de revisión"
          loading={kpiPending.isLoading}
          iconBg="bg-amber-50 shadow-amber-100"
          icon={<Clock className="size-5 text-amber-500" />}
        />
        <KpiCard
          label="Aprobados"
          value={kpiApproved.data?.totalCount ?? 0}
          sub={`año ${year}`}
          loading={kpiApproved.isLoading}
          iconBg="bg-emerald-50 shadow-emerald-100"
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
        />
        <KpiCard
          label="Rechazados"
          value={kpiRejected.data?.totalCount ?? 0}
          sub={`año ${year}`}
          loading={kpiRejected.isLoading}
          iconBg="bg-rose-50 shadow-rose-100"
          icon={<XCircle className="size-5 text-rose-500" />}
        />
      </div>

      {/* ── Barra de filtros ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 px-4 py-4">
          {/* Búsqueda */}
          <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Nombre o código..."
                className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          {/* Estado */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tipo</label>
            <select
              value={leaveType}
              onChange={(e) => { setLeaveType(e.target.value); setPage(1); }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Todos los tipos</option>
              {leaveTypes.map((t) => (
                <option key={t.code} value={t.code}>{leaveTypeLabel(t.code)}</option>
              ))}
            </select>
          </div>
          {/* Año */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Año</label>
            <select
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Botones */}
          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-500 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-600 transition"
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
          {/* Contador */}
          {total > 0 && (
            <p className="ml-auto self-end text-[12px] text-slate-400">
              {rangeFrom}–{rangeTo} de <b className="text-slate-600">{total}</b> registros
            </p>
          )}
        </div>
        {/* Acceso rápido pendientes */}
        {(kpiPending.data?.totalCount ?? 0) > 0 && !status && (
          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              onClick={() => { setStatus("pending"); setPage(1); }}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600 hover:text-amber-700 transition"
            >
              <Clock className="size-3.5" />
              Ver {kpiPending.data!.totalCount} solicitud{kpiPending.data!.totalCount !== 1 ? "es" : ""} pendiente{kpiPending.data!.totalCount !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-[13px]">Cargando permisos...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {[
                    { label: "Empleado",      align: "left"   },
                    { label: "Tipo",          align: "left"   },
                    { label: "Período",       align: "left"   },
                    { label: "Días",          align: "center" },
                    { label: "Remunerado",    align: "center" },
                    { label: "Estado",        align: "left"   },
                    { label: "Solicitado",    align: "left"   },
                    { label: "Acciones",      align: "right"  },
                  ].map(({ label, align }) => (
                    <th key={label} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-${align}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0
                  ? <EmptyState onClear={clearFilters} onCreate={() => { setCreateOpen(true); setCreateError(null); }} />
                  : rows.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-slate-50/60">

                      {/* Empleado */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.employeeName} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-800">{r.employeeName}</p>
                            <p className="text-[11px] text-slate-400">{r.employeeCode} · {r.area}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <LeaveTypeBadge code={r.leaveType} />
                      </td>

                      {/* Período */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-700">
                          <CalendarDays className="size-3.5 shrink-0 text-slate-300" />
                          <span>{fmtDate(r.startDate)}</span>
                          <span className="text-slate-300">→</span>
                          <span>{fmtDate(r.endDate)}</span>
                        </div>
                      </td>

                      {/* Días */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex size-8 items-center justify-center rounded-full bg-teal-50 text-[13px] font-extrabold text-teal-700">
                          {r.requestedDays}
                        </span>
                      </td>

                      {/* Remunerado */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          r.isPaid
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}>
                          {r.isPaid ? "Sí" : "No"}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Solicitado */}
                      <td className="px-4 py-3 text-[12px] text-slate-500">
                        {r.requestedAtUtc ? fmtDateShort(r.requestedAtUtc) : "—"}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailItem(r)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
                          >
                            <Eye className="size-3" />Ver
                          </button>
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => setReviewItem(r)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700 shadow-sm hover:bg-brand-100 transition"
                              >
                                Revisar
                              </button>
                              <button
                                onClick={() => setCancelItem(r)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-600 shadow-sm hover:bg-rose-100 transition"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Paginación ── */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-brand-400"
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
                className={`inline-flex size-8 items-center justify-center rounded-lg text-[12px] font-semibold transition ${
                  p === page
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
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

          <p className="text-[12px] text-slate-400">
            Mostrando <b className="text-slate-600">{rangeFrom}–{rangeTo}</b> de <b className="text-slate-600">{total}</b>
          </p>
        </div>
      )}

      {/* ── Modales ── */}
      {detailItem && <DetailModal item={detailItem} onClose={() => setDetailItem(null)} />}

      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          saving={approveMut.isPending || rejectMut.isPending}
          onClose={() => setReviewItem(null)}
          onApprove={(comment) => approveMut.mutate({ id: reviewItem.id, comment })}
          onReject={(comment) => rejectMut.mutate({ id: reviewItem.id, comment })}
        />
      )}

      {cancelItem && (
        <ConfirmModal
          title="Cancelar solicitud"
          message={`¿Confirmas que deseas cancelar el permiso de ${cancelItem.employeeName}? (${leaveTypeLabel(cancelItem.leaveType)} · ${fmtDate(cancelItem.startDate)} → ${fmtDate(cancelItem.endDate)})`}
          confirmLabel="Sí, cancelar permiso"
          confirmCls="bg-rose-600 hover:bg-rose-700"
          saving={cancelMut.isPending}
          onConfirm={() => cancelMut.mutate(cancelItem.id)}
          onCancel={() => setCancelItem(null)}
        />
      )}

      {createOpen && (
        <CreateModal
          employees={employees}
          leaveTypes={leaveTypes}
          saving={createMut.isPending}
          serverError={createError}
          onClose={() => { setCreateOpen(false); setCreateError(null); }}
          onSubmit={(payload) => createMut.mutate(payload)}
        />
      )}
    </section>
  );
}
