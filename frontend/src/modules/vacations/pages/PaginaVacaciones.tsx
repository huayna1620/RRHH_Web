import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Eye, Loader2, Plus, Search, SlidersHorizontal, Umbrella, X, XCircle,
} from "lucide-react";
import {
  approveVacationRequest, cancelVacationRequest, createVacationRequest,
  getVacationCatalogs, getVacations, rejectVacationRequest,
} from "@/modules/vacations/services/vacationsApi";
import type { VacationItem, VacationEmployeeBalance } from "@/modules/vacations/types/vacation.types";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE  = 10;
const CUR_YEAR   = new Date().getFullYear();
const YEARS      = [CUR_YEAR - 2, CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1, CUR_YEAR + 2];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const COLORS = [
    "bg-teal-500","bg-brand-500","bg-violet-500","bg-amber-500",
    "bg-rose-500","bg-sky-500","bg-emerald-500","bg-pink-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastProps = { message: string; variant: "success" | "error"; onClose: () => void };
function Toast({ message, variant, onClose }: ToastProps): JSX.Element {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  const colors = variant === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800";
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`fixed right-5 top-5 z-[100] flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg ${colors} animate-in fade-in slide-in-from-top-2`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="text-[13px] font-medium">{message}</span>
      <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100"><X className="size-3.5" /></button>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  pending:   { label: "Pendiente",  className: "bg-amber-50 text-amber-700 border-amber-200",   Icon: Clock },
  approved:  { label: "Aprobado",   className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  rejected:  { label: "Rechazado",  className: "bg-rose-50 text-rose-700 border-rose-200",      Icon: XCircle },
  cancelled: { label: "Cancelado",  className: "bg-slate-100 text-slate-500 border-slate-200",  Icon: X },
};

function StatusBadge({ status }: { status: string }): JSX.Element {
  const meta = STATUS_META[status] ?? { label: status, className: "bg-slate-100 text-slate-500 border-slate-200", Icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      <meta.Icon className="size-3" />
      {meta.label}
    </span>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string; value: number | string; loading?: boolean;
  icon: JSX.Element; accent: string;
};
function KpiCard({ label, value, loading, icon, accent }: KpiCardProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        {loading
          ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-200" />
          : <p className="text-[26px] font-extrabold leading-none text-slate-900">{value}</p>
        }
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState(): JSX.Element {
  return (
    <tr>
      <td colSpan={6} className="py-14 text-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Umbrella className="size-10 stroke-[1.5]" />
          <p className="text-[14px] font-medium">Sin solicitudes</p>
          <p className="text-[12px]">Prueba con otros filtros o crea una nueva solicitud.</p>
        </div>
      </td>
    </tr>
  );
}

// ─── DetailModal ──────────────────────────────────────────────────────────────

function DetailModal({ item, onClose }: { item: VacationItem; onClose: () => void }): JSX.Element {
  const color = avatarColor(item.employeeName);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-full text-[13px] font-bold text-white ${color}`}>
              {initials(item.employeeName)}
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">{item.employeeName}</h3>
              <p className="text-[12px] text-slate-400">{item.employeeCode} · {item.area}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inicio</p>
              <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{fmtDate(item.startDate)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fin</p>
              <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{fmtDate(item.endDate)}</p>
            </div>
            <div className="rounded-xl bg-teal-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Días solicitados</p>
              <p className="mt-0.5 text-[22px] font-extrabold text-teal-700">{item.requestedDays}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
              <div className="mt-1"><StatusBadge status={item.status} /></div>
            </div>
          </div>
          {item.reason && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Motivo</p>
              <p className="mt-1 text-[13px] text-slate-700">{item.reason}</p>
            </div>
          )}
          {item.reviewerComment && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Comentario del revisor</p>
              <p className="mt-1 text-[13px] text-slate-700">{item.reviewerComment}</p>
            </div>
          )}
          {item.requestedAtUtc && (
            <p className="text-[11px] text-slate-400">
              Solicitado: {new Date(item.requestedAtUtc).toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })}
            </p>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ReviewModal ─────────────────────────────────────────────────────────────

type ReviewModalProps = {
  item: VacationItem;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  saving: boolean;
};
function ReviewModal({ item, onClose, onApprove, onReject, saving }: ReviewModalProps): JSX.Element {
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const commentErr = touched && comment.trim().length < 2;
  const color = avatarColor(item.employeeName);

  function handleReject(): void {
    setTouched(true);
    if (comment.trim().length < 2) return;
    onReject(comment.trim());
  }
  function handleApprove(): void {
    onApprove(comment.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Revisar solicitud</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">Aprueba o rechaza esta solicitud de vacaciones</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {/* Employee info */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${color}`}>
              {initials(item.employeeName)}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800">{item.employeeName}</p>
              <p className="text-[11px] text-slate-500">{fmtDate(item.startDate)} → {fmtDate(item.endDate)} · <b>{item.requestedDays} días</b></p>
            </div>
          </div>
          {/* Comment */}
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Comentario <span className="text-rose-500">*</span> <span className="font-normal normal-case text-slate-400">(requerido para rechazar)</span>
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario..."
              rows={3}
              className={`w-full resize-none rounded-lg border px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${commentErr ? "border-rose-300" : "border-slate-200"}`}
            />
            {commentErr && (
              <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Mínimo 2 caracteres para rechazar</p>
            )}
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={handleReject}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-[13px] font-semibold text-rose-700 shadow-sm hover:bg-rose-100 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Rechazar
          </button>
          <button
            disabled={saving}
            onClick={handleApprove}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 hover:from-brand-500 hover:to-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel, saving }: {
  message: string; onConfirm: () => void; onCancel: () => void; saving: boolean;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50">
            <AlertCircle className="size-5 text-rose-500" />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900">Confirmar acción</h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-slate-600">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button onClick={onCancel} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            No, mantener
          </button>
          <button
            disabled={saving}
            onClick={onConfirm}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Sí, cancelar solicitud
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CreateModal ─────────────────────────────────────────────────────────────

type CreateModalProps = {
  employees: VacationEmployeeBalance[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { employeeId: string; startDate: string; endDate: string; reason: string }) => void;
};

function CreateModal({ employees, saving, error, onClose, onSubmit }: CreateModalProps): JSX.Element {
  const [empSearch, setEmpSearch]   = useState("");
  const [empOpen, setEmpOpen]       = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<VacationEmployeeBalance | null>(null);
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [reason, setReason]         = useState("");
  const [touched, setTouched]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredEmps = useMemo(() => {
    const q = empSearch.toLowerCase();
    return employees.filter((e) => e.label.toLowerCase().includes(q)).slice(0, 8);
  }, [employees, empSearch]);

  // Estimated days (calendar, not business days — backend calculates real business days)
  const estDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000 + 1;
    return diff;
  }, [startDate, endDate]);

  const overBudget = selectedEmp && estDays !== null && estDays > selectedEmp.availableDays;

  const startErr  = touched && !startDate;
  const endErr    = touched && (!endDate || endDate < startDate);
  const empErr    = touched && !selectedEmp;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setTouched(true);
    if (!selectedEmp || !startDate || !endDate || endDate < startDate) return;
    onSubmit({ employeeId: selectedEmp.id, startDate, endDate, reason });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Nueva solicitud de vacaciones</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">Completa los datos para registrar la solicitud</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-5 py-4">

            {/* Employee autocomplete */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Empleado <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={empSearch}
                  onFocus={() => setEmpOpen(true)}
                  onBlur={() => setTimeout(() => setEmpOpen(false), 150)}
                  onChange={(e) => { setEmpSearch(e.target.value); setSelectedEmp(null); setEmpOpen(true); }}
                  placeholder="Buscar empleado..."
                  className={`h-9 w-full rounded-lg border pl-9 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${empErr ? "border-rose-300" : "border-slate-200"}`}
                />
                {empOpen && filteredEmps.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredEmps.map((emp) => (
                      <li key={emp.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedEmp(emp); setEmpSearch(emp.label); setEmpOpen(false); }}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor(emp.label)}`}>
                              {initials(emp.label)}
                            </div>
                            <span className="text-[13px] font-medium text-slate-800">{emp.label}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-teal-600">{emp.availableDays} días disp.</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {empErr && <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Selecciona un empleado</p>}
            </div>

            {/* Balance mini-card */}
            {selectedEmp && (
              <div className="grid grid-cols-4 gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600">Días/año</p>
                  <p className="mt-0.5 text-[18px] font-extrabold text-teal-700">{selectedEmp.annualEntitlementDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Usados</p>
                  <p className="mt-0.5 text-[18px] font-extrabold text-slate-700">{selectedEmp.usedDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Pendientes</p>
                  <p className="mt-0.5 text-[18px] font-extrabold text-amber-700">{selectedEmp.pendingDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Disponibles</p>
                  <p className="mt-0.5 text-[18px] font-extrabold text-emerald-700">{selectedEmp.availableDays}</p>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Inicio <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`h-9 w-full rounded-lg border px-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${startErr ? "border-rose-300" : "border-slate-200"}`}
                />
                {startErr && <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Requerido</p>}
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Fin <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`h-9 w-full rounded-lg border px-3 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${endErr ? "border-rose-300" : "border-slate-200"}`}
                />
                {endErr && <p className="flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="size-3" />Fecha inválida</p>}
              </label>
            </div>

            {/* Day estimator */}
            {estDays !== null && (
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${overBudget ? "border-rose-200 bg-rose-50" : "border-teal-100 bg-teal-50"}`}>
                <CalendarDays className={`size-4 shrink-0 ${overBudget ? "text-rose-500" : "text-teal-600"}`} />
                <p className={`text-[12px] font-medium ${overBudget ? "text-rose-700" : "text-teal-700"}`}>
                  ~{estDays} días calendario seleccionados
                  {overBudget ? ` — excede los ${selectedEmp!.availableDays} días disponibles` : " · El sistema calculará los días hábiles exactos"}
                </p>
              </div>
            )}

            {/* Reason */}
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Motivo (opcional)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe brevemente el motivo..."
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            {/* Server error */}
            {error && (
              <p className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                <AlertCircle className="size-3.5 shrink-0" />{error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 hover:from-brand-500 hover:to-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {saving ? "Guardando..." : "Crear solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PaginaVacaciones(): JSX.Element {
  const qc = useQueryClient();

  // ── Filters ──
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus]           = useState("");
  const [year, setYear]               = useState(CUR_YEAR);
  const [page, setPage]               = useState(1);

  // ── UI state ──
  const [toast, setToast]             = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [detailItem, setDetailItem]   = useState<VacationItem | null>(null);
  const [reviewItem, setReviewItem]   = useState<VacationItem | null>(null);
  const [cancelItem, setCancelItem]   = useState<VacationItem | null>(null);
  const [createOpen, setCreateOpen]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Helpers ──
  const ok   = (msg: string): void => setToast({ variant: "success", message: msg });
  const fail = (msg: string): void => setToast({ variant: "error", message: msg });

  async function refreshAll(): Promise<void> {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["vacations"] }),
      qc.invalidateQueries({ queryKey: ["vacation-catalogs"] }),
      qc.invalidateQueries({ queryKey: ["vac-kpi"] }),
    ]);
  }

  // ── KPI queries ──
  const baseKpiQuery = { search: "", employeeId: "", startDateFrom: "", startDateTo: "", year, pageNumber: 1, pageSize: 1 };
  const kpiPending  = useQuery({ queryKey: ["vac-kpi", "pending",  year], queryFn: () => getVacations({ ...baseKpiQuery, status: "pending"  }) });
  const kpiApproved = useQuery({ queryKey: ["vac-kpi", "approved", year], queryFn: () => getVacations({ ...baseKpiQuery, status: "approved" }) });
  const kpiRejected = useQuery({ queryKey: ["vac-kpi", "rejected", year], queryFn: () => getVacations({ ...baseKpiQuery, status: "rejected" }) });

  // ── List query ──
  const listQuery = useQuery({
    queryKey: ["vacations", search, status, year, page],
    queryFn: () => getVacations({
      search, employeeId: "", status: status as never,
      startDateFrom: "", startDateTo: "",
      year, pageNumber: page, pageSize: PAGE_SIZE,
    }),
  });

  // ── Catalogs ──
  const catalogsQuery = useQuery({
    queryKey: ["vacation-catalogs", year],
    queryFn: () => getVacationCatalogs(year),
  });

  const employees = catalogsQuery.data?.employees ?? [];
  const rows      = listQuery.data?.items ?? [];
  const total     = listQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: createVacationRequest,
    onSuccess: async () => {
      await refreshAll();
      ok("Solicitud creada correctamente.");
      setCreateOpen(false);
      setCreateError(null);
    },
    onError: () => { setCreateError("No se pudo crear la solicitud. Verifica los datos."); },
  });

  const approveMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => approveVacationRequest(id, comment),
    onSuccess: async () => { await refreshAll(); ok("Solicitud aprobada."); setReviewItem(null); },
    onError: () => fail("No se pudo aprobar la solicitud."),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectVacationRequest(id, comment),
    onSuccess: async () => { await refreshAll(); ok("Solicitud rechazada."); setReviewItem(null); },
    onError: () => fail("No se pudo rechazar la solicitud."),
  });

  const cancelMut = useMutation({
    mutationFn: cancelVacationRequest,
    onSuccess: async () => { await refreshAll(); ok("Solicitud cancelada."); setCancelItem(null); },
    onError: () => { fail("No se pudo cancelar la solicitud."); setCancelItem(null); },
  });

  function applySearch(): void { setSearch(searchInput); setPage(1); }

  return (
    <section className="space-y-5 pb-8">
      {/* Toast */}
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500 shadow-sm shadow-teal-500/30">
              <Umbrella className="size-5 text-white" />
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Vacaciones</h1>
          </div>
          <p className="mt-1 text-[13px] text-slate-500 pl-[46px]">Gestión de solicitudes de vacaciones del personal</p>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setCreateError(null); }}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:from-brand-500 hover:to-brand-700"
        >
          <Plus className="size-4" />
          Nueva solicitud
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Pendientes"
          value={kpiPending.data?.totalCount ?? 0}
          loading={kpiPending.isLoading}
          accent="bg-amber-50 text-amber-500"
          icon={<Clock className="size-5" />}
        />
        <KpiCard
          label="Aprobadas"
          value={kpiApproved.data?.totalCount ?? 0}
          loading={kpiApproved.isLoading}
          accent="bg-emerald-50 text-emerald-600"
          icon={<CheckCircle2 className="size-5" />}
        />
        <KpiCard
          label="Rechazadas"
          value={kpiRejected.data?.totalCount ?? 0}
          loading={kpiRejected.isLoading}
          accent="bg-rose-50 text-rose-500"
          icon={<XCircle className="size-5" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <SlidersHorizontal className="size-4 shrink-0 text-slate-400" />
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Buscar empleado..."
            className="h-8 w-44 rounded-lg border border-slate-200 pl-8 pr-3 text-[12px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button
          onClick={applySearch}
          className="inline-flex h-8 items-center rounded-lg border border-brand-200 bg-brand-50 px-3 text-[12px] font-semibold text-brand-700 hover:bg-brand-100"
        >
          Buscar
        </button>
        {/* Status */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        {/* Year */}
        <select
          value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {/* Reset */}
        {(search || status || year !== CUR_YEAR) && (
          <button
            onClick={() => { setSearch(""); setSearchInput(""); setStatus(""); setYear(CUR_YEAR); setPage(1); }}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-slate-500 hover:text-slate-700"
          >
            <X className="size-3.5" />Limpiar
          </button>
        )}
        <span className="ml-auto text-[12px] text-slate-400">{total} registros</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Empleado</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Período</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">Días</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Solicitado</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? <EmptyState /> : rows.map((r) => {
                  const color = avatarColor(r.employeeName);
                  return (
                    <tr key={r.id} className="group transition hover:bg-slate-50/60">
                      {/* Employee */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${color}`}>
                            {initials(r.employeeName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 truncate">{r.employeeName}</p>
                            <p className="text-[11px] text-slate-400">{r.employeeCode} · {r.area}</p>
                          </div>
                        </div>
                      </td>
                      {/* Period */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-700">
                          <CalendarDays className="size-3.5 shrink-0 text-slate-400" />
                          <span>{fmtDate(r.startDate)}</span>
                          <span className="text-slate-300">→</span>
                          <span>{fmtDate(r.endDate)}</span>
                        </div>
                      </td>
                      {/* Days */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-teal-50 text-[13px] font-bold text-teal-700">
                          {r.requestedDays}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      {/* Requested at */}
                      <td className="px-4 py-3 text-[12px] text-slate-500">
                        {r.requestedAtUtc
                          ? new Date(r.requestedAtUtc).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailItem(r)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                          >
                            <Eye className="size-3" />Ver
                          </button>
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => setReviewItem(r)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700 shadow-sm hover:bg-brand-100"
                              >
                                Revisar
                              </button>
                              <button
                                onClick={() => setCancelItem(r)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" />Anterior
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`size-8 rounded-lg text-[12px] font-semibold transition ${p === page ? "bg-brand-500 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          >
            Siguiente<ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Modals */}
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
          message={`¿Seguro que deseas cancelar la solicitud de ${cancelItem.employeeName} (${fmtDate(cancelItem.startDate)} → ${fmtDate(cancelItem.endDate)})?`}
          saving={cancelMut.isPending}
          onConfirm={() => cancelMut.mutate(cancelItem.id)}
          onCancel={() => setCancelItem(null)}
        />
      )}

      {createOpen && (
        <CreateModal
          employees={employees}
          saving={createMut.isPending}
          error={createError}
          onClose={() => { setCreateOpen(false); setCreateError(null); }}
          onSubmit={(payload) => createMut.mutate(payload)}
        />
      )}
    </section>
  );
}
