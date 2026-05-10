import {
  useEffect, useMemo, useRef, useState,
  type ChangeEvent, type FormEvent, type JSX,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  AlertCircle, AlertTriangle, CalendarDays, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown,
  ClipboardCheck, Clock, Download, Eye, FileText, FileWarning,
  Loader2, RefreshCw, Search, ShieldCheck, Timer, X, XCircle,
} from "lucide-react";
import {
  approveIncident,
  getIncidentStats,
  getIncidents,
  rejectIncident,
  submitJustification,
} from "@/modules/incidents/services/incidentsApi";
import type { AttendanceIncident } from "@/modules/incidents/types/incident.types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50];

// ─── Mapas de tipo / estado ───────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  tardanza:          "Tardanza",
  falta:             "Falta",
  salida_anticipada: "Salida anticipada",
  no_marcacion:      "No marcación",
};

const TYPE_COLOR: Record<string, string> = {
  tardanza:          "bg-amber-50 text-amber-700 border-amber-200",
  falta:             "bg-rose-50 text-rose-700 border-rose-200",
  salida_anticipada: "bg-violet-50 text-violet-700 border-violet-200",
  no_marcacion:      "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  open:      { label: "Abierta",     cls: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-400"   },
  justified: { label: "Justificada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected:  { label: "Rechazada",   cls: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500"    },
  expired:   { label: "Expirada",    cls: "bg-slate-100 text-slate-500 border-slate-200",      dot: "bg-slate-400"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const COLS = [
    "bg-teal-500", "bg-brand-500", "bg-violet-500", "bg-amber-500",
    "bg-rose-500",  "bg-sky-500",  "bg-emerald-500","bg-pink-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLS[Math.abs(h) % COLS.length];
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DIAS  = ["dom","lun","mar","mié","jue","vie","sáb"];

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return `${DIAS[dt.getDay()]} ${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]} ${y}`;
}

function fmtDateShort(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", {
    timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtMinutes(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function fmtDeadline(isoUtc: string | null): { text: string; urgent: boolean } | null {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) return null;
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diffDays < 0)  return { text: "Plazo vencido",    urgent: true  };
  if (diffDays === 0) return { text: "Vence hoy",        urgent: true  };
  if (diffDays === 1) return { text: "Vence mañana",     urgent: true  };
  return                     { text: `Vence en ${diffDays} días`, urgent: false };
}

function extractErr(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { message?: string; error?: string } } };
  const d = e?.response?.data;
  return d?.message?.trim() || d?.error?.trim() || fallback;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { variant: "success" | "error"; message: string };

function Toast({ message, variant, onClose }: ToastState & { onClose: () => void }): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  const cls = variant === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800";
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`fixed right-5 top-5 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${cls}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 text-[13px] font-medium leading-snug">{message}</p>
      <button onClick={onClose} className="shrink-0 opacity-50 transition hover:opacity-100">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }): JSX.Element {
  return (
    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColor(name)}`}>
      {initials(name)}
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
  const Icon   = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
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

type IconFC = (props: { className?: string }) => JSX.Element | null;

function KpiCard({ label, value, icon: Icon, iconCls, sub }: {
  label: string; value: number | "—"; icon: IconFC; iconCls: string; sub?: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-[22px] font-extrabold leading-none text-slate-800">{value}</p>
        {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── IncidentContextCard ──────────────────────────────────────────────────────

function IncidentContextCard({ r }: { r: AttendanceIncident }): JSX.Element {
  const statusInfo = STATUS_MAP[r.status];
  const deadline   = fmtDeadline(r.justificationDeadlineUtc);
  return (
    <div className="mx-5 mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Incidencia</p>
      <div className="mb-3 flex items-start gap-3">
        <Avatar name={r.employeeName} />
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-tight text-slate-800">{r.employeeName}</p>
          <p className="text-[11px] text-slate-500">{r.employeeCode} · {r.area}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-slate-400">Tipo</span>
          <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[r.incidentType] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {TYPE_LABEL[r.incidentType] ?? r.incidentType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-slate-400">Estado</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo?.cls ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
            <span className={`size-1.5 rounded-full ${statusInfo?.dot ?? "bg-slate-400"}`} />
            {statusInfo?.label ?? r.status}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Fecha · </span>
          <span className="font-medium text-slate-700">{fmtDate(r.incidentDate)}</span>
        </div>
        <div>
          <span className="text-slate-400">Afectado · </span>
          <span className="font-medium text-slate-700">{fmtMinutes(r.minutesImpacted)}</span>
        </div>
        {deadline && (
          <div className="col-span-2">
            <span className="text-slate-400">Plazo · </span>
            <span className={`font-medium ${deadline.urgent ? "text-rose-600" : "text-slate-700"}`}>
              {deadline.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── JustifyModal ─────────────────────────────────────────────────────────────

function JustifyModal({ incident, saving, serverError, onClose, onSubmit }: {
  incident: AttendanceIncident;
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (text: string) => void;
}): JSX.Element {
  const [text,      setText]      = useState("");
  const [touched,   setTouched]   = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const textErr  = touched && text.trim().length < 10;
  const hasPrev  = !!incident.justificationText;

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    setTouched(true);
    if (text.trim().length < 10) return;
    onSubmit(text.trim());
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) { setFileLabel(null); return; }
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo no puede superar los 5 MB.");
      e.target.value = ""; setFileLabel(null); return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      alert("Solo se permiten archivos PDF, JPG o PNG.");
      e.target.value = ""; setFileLabel(null); return;
    }
    setFileLabel(file.name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <ClipboardCheck className="size-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-800">
                {hasPrev ? "Actualizar justificación" : "Justificar incidencia"}
              </h2>
              <p className="text-[12px] text-slate-500">
                Registra el sustento de la incidencia del colaborador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Cuerpo scroll ── */}
        <div className="max-h-[72vh] overflow-y-auto">
          <IncidentContextCard r={incident} />

          {/* Justificación previa */}
          {hasPrev && incident.justificationText && (
            <div className="mx-5 mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                Justificación existente
              </p>
              <p className="text-[13px] leading-relaxed text-amber-900">{incident.justificationText}</p>
            </div>
          )}

          <form id="justify-form" onSubmit={handleSubmit} noValidate>
            <div className="space-y-4 px-5 py-4">

              {/* Error servidor */}
              {serverError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {serverError}
                </div>
              )}

              {/* Texto justificación */}
              <label className="block space-y-1.5">
                <span className="text-[12px] font-semibold text-slate-700">
                  Justificación <span className="text-rose-500">*</span>
                </span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder={
                    hasPrev
                      ? "Escribe la justificación actualizada (mínimo 10 caracteres)..."
                      : "Describe el motivo o sustento de la incidencia con el detalle necesario (mínimo 10 caracteres)..."
                  }
                  className={`w-full resize-none rounded-xl border px-3 py-2.5 text-[13px] text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 ${textErr ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}
                />
                <div className="flex items-center justify-between">
                  {textErr ? (
                    <p className="flex items-center gap-1 text-[12px] text-rose-600">
                      <AlertCircle className="size-3" />
                      Escribe al menos 10 caracteres
                    </p>
                  ) : <span />}
                  <span className={`text-[11px] ${touched && text.length < 10 ? "text-rose-400" : "text-slate-400"}`}>
                    {text.length} caracteres
                  </span>
                </div>
              </label>

              {/* Adjunto — UI preparada (el backend solo acepta texto) */}
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
                  Sustento adjunto{" "}
                  <span className="text-[11px] font-normal text-slate-400">(opcional)</span>
                </p>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-5 text-center transition hover:border-teal-300 hover:bg-teal-50/20"
                >
                  {fileLabel ? (
                    <>
                      <FileText className="size-6 text-teal-500" />
                      <span className="max-w-[260px] truncate text-[13px] font-medium text-teal-700">
                        {fileLabel}
                      </span>
                      <span className="text-[11px] text-slate-400">Clic para cambiar archivo</span>
                    </>
                  ) : (
                    <>
                      <FileWarning className="size-6 text-slate-400" />
                      <span className="text-[13px] text-slate-500">Arrastra o haz clic para adjuntar</span>
                      <span className="text-[11px] text-slate-400">PDF · JPG · PNG &nbsp;·&nbsp; Máx. 5 MB</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFile}
                  className="hidden"
                />
                <p className="mt-1.5 text-[10px] text-slate-400">
                  El adjunto queda como referencia interna. El texto de justificación es lo que se registra en el sistema.
                </p>
              </div>

            </div>
          </form>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="justify-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {hasPrev ? "Actualizar justificación" : "Registrar justificación"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── ReviewModal ──────────────────────────────────────────────────────────────

function ReviewModal({ incident, approving, rejecting, serverError, readOnly, onClose, onApprove, onReject }: {
  incident: AttendanceIncident;
  approving: boolean;
  rejecting: boolean;
  serverError: string | null;
  readOnly: boolean;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
}): JSX.Element {
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
              <ShieldCheck className="size-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-800">
                {readOnly ? "Detalle de incidencia" : "Revisar justificación"}
              </h2>
              <p className="text-[12px] text-slate-500">
                {readOnly
                  ? "Información completa de la incidencia y su resolución"
                  : "Revisa y aprueba o rechaza la justificación enviada"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Cuerpo scroll ── */}
        <div className="max-h-[72vh] overflow-y-auto">
          <IncidentContextCard r={incident} />

          <div className="space-y-4 px-5 py-4">

            {/* Justificación del empleado */}
            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-teal-600">
                Justificación del empleado
              </p>
              {incident.justificationText ? (
                <p className="text-[13px] leading-relaxed text-teal-900">
                  {incident.justificationText}
                </p>
              ) : (
                <p className="text-[13px] italic text-teal-400">Sin texto de justificación</p>
              )}
              {incident.justificationSubmittedAtUtc && (
                <p className="mt-2 text-[11px] text-teal-500">
                  Enviado el {fmtDateShort(incident.justificationSubmittedAtUtc)}
                </p>
              )}
            </div>

            {/* Revisión previa (justified / rejected) */}
            {incident.reviewedByUserName && (
              <div className={`rounded-2xl border px-4 py-3 ${incident.status === "justified" ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
                <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-widest ${incident.status === "justified" ? "text-emerald-600" : "text-rose-600"}`}>
                  {incident.status === "justified" ? "Aprobada por" : "Rechazada por"}
                </p>
                <p className={`text-[13px] font-semibold ${incident.status === "justified" ? "text-emerald-800" : "text-rose-800"}`}>
                  {incident.reviewedByUserName}
                </p>
                {incident.reviewerComment && (
                  <p className={`mt-1 text-[12px] ${incident.status === "justified" ? "text-emerald-700" : "text-rose-700"}`}>
                    {incident.reviewerComment}
                  </p>
                )}
                {incident.reviewedAtUtc && (
                  <p className={`mt-1.5 text-[11px] ${incident.status === "justified" ? "text-emerald-400" : "text-rose-400"}`}>
                    el {fmtDateShort(incident.reviewedAtUtc)}
                  </p>
                )}
              </div>
            )}

            {/* Formulario revisión (solo si no es readOnly) */}
            {!readOnly && (
              <>
                {serverError && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {serverError}
                  </div>
                )}
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-semibold text-slate-700">
                    Comentario del revisor{" "}
                    <span className="text-[11px] font-normal text-slate-400">(opcional)</span>
                  </span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Agrega una nota sobre la decisión tomada..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {readOnly ? "Cerrar" : "Cancelar"}
          </button>
          {!readOnly && (
            <div className="flex gap-2">
              <button
                onClick={() => onReject(comment)}
                disabled={rejecting || approving}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {rejecting && <Loader2 className="size-3.5 animate-spin" />}
                <XCircle className="size-3.5" />
                Rechazar
              </button>
              <button
                onClick={() => onApprove(comment)}
                disabled={approving || rejecting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {approving && <Loader2 className="size-3.5 animate-spin" />}
                <CheckCircle2 className="size-3.5" />
                Aprobar
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── PaginaIncidencias ────────────────────────────────────────────────────────

export function PaginaIncidencias(): JSX.Element {
  const qc = useQueryClient();

  // ── Filtros locales (pendientes de aplicar) ──────────────────────────────
  const [search,       setSearch]       = useState("");
  const [status,       setStatus]       = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");

  // ── Filtros aplicados (disparan el fetch) ────────────────────────────────
  const [aSearch, setASearch] = useState("");
  const [aStatus, setAStatus] = useState("");
  const [aType,   setAType]   = useState("");
  const [aFrom,   setAFrom]   = useState("");
  const [aTo,     setATo]     = useState("");

  // ── Paginación y orden ───────────────────────────────────────────────────
  const [page,    setPage]    = useState(1);
  const [pgSize,  setPgSize]  = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── UI ───────────────────────────────────────────────────────────────────
  const [toast,       setToast]       = useState<ToastState | null>(null);
  const [justifyItem, setJustifyItem] = useState<AttendanceIncident | null>(null);
  const [reviewItem,  setReviewItem]  = useState<AttendanceIncident | null>(null);
  const [reviewRO,    setReviewRO]    = useState(false);
  const [justifyErr,  setJustifyErr]  = useState<string | null>(null);
  const [reviewErr,   setReviewErr]   = useState<string | null>(null);

  const ok   = (msg: string): void => setToast({ variant: "success", message: msg });

  // ── Sort ─────────────────────────────────────────────────────────────────
  function toggleSort(col: string): void {
    if (sortKey === col) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("desc"); }
    } else {
      setSortKey(col); setSortDir("asc");
    }
  }

  // ── Filtros helpers ──────────────────────────────────────────────────────
  function applyFilters(): void {
    setASearch(search); setAStatus(status); setAType(incidentType);
    setAFrom(fromDate); setATo(toDate); setPage(1);
  }

  function clearFilters(): void {
    setSearch(""); setStatus(""); setIncidentType(""); setFromDate(""); setToDate("");
    setASearch(""); setAStatus(""); setAType(""); setAFrom(""); setATo(""); setPage(1);
  }

  function viewPending(): void {
    setStatus("open");
    setASearch(search); setAStatus("open"); setAType(incidentType);
    setAFrom(fromDate); setATo(toDate); setPage(1);
  }

  const hasFilters = !!(aSearch || aStatus || aType || aFrom || aTo);

  // ── Queries ──────────────────────────────────────────────────────────────
  const listParams = {
    employeeId: "", search: aSearch, status: aStatus, incidentType: aType,
    fromDate: aFrom, toDate: aTo, pageNumber: page, pageSize: pgSize,
  };

  const listQ = useQuery({
    queryKey: ["incidents", listParams],
    queryFn:  () => getIncidents(listParams),
  });

  // Stats sin filtro de estado → siempre muestra el desglose completo en KPIs
  const statsParams = {
    employeeId: "", search: aSearch, status: "", incidentType: aType,
    fromDate: aFrom, toDate: aTo, pageNumber: 1, pageSize: 1,
  };

  const statsQ = useQuery({
    queryKey: ["incidents-stats", statsParams],
    queryFn:  () => getIncidentStats(statsParams),
  });

  const rows       = listQ.data?.items      ?? [];
  const total      = listQ.data?.totalCount ?? 0;
  const stats      = statsQ.data;
  const totalPages = Math.max(1, Math.ceil(total / pgSize));

  // ── Sort client-side ─────────────────────────────────────────────────────
  const sortedRows = useMemo(() => {
    const arr = [...rows];
    if (!sortKey) {
      return arr.sort((a, b) =>
        String(b.createdAtUtc ?? "").localeCompare(String(a.createdAtUtc ?? ""))
      );
    }
    return arr.sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      const cmp = av.localeCompare(bv, "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  // ── Refresh ──────────────────────────────────────────────────────────────
  const refreshAll = (): Promise<unknown> => Promise.all([
    qc.invalidateQueries({ queryKey: ["incidents"] }),
    qc.invalidateQueries({ queryKey: ["incidents-stats"] }),
  ]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const justifyMut = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => submitJustification(id, text),
    onSuccess: async () => {
      await refreshAll();
      ok("Justificación registrada correctamente.");
      setJustifyItem(null); setJustifyErr(null);
    },
    onError: (e: unknown) =>
      setJustifyErr(extractErr(e, "No se pudo registrar la justificación.")),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => approveIncident(id, comment),
    onSuccess: async () => {
      await refreshAll();
      ok("Justificación aprobada correctamente.");
      setReviewItem(null); setReviewErr(null);
    },
    onError: (e: unknown) =>
      setReviewErr(extractErr(e, "No se pudo aprobar la incidencia.")),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectIncident(id, comment),
    onSuccess: async () => {
      await refreshAll();
      ok("Justificación rechazada.");
      setReviewItem(null); setReviewErr(null);
    },
    onError: (e: unknown) =>
      setReviewErr(extractErr(e, "No se pudo rechazar la incidencia.")),
  });

  // ── Exportar ─────────────────────────────────────────────────────────────
  function handleExport(): void {
    if (rows.length === 0) return;
    const data = rows.map((r) => ({
      Empleado:                r.employeeName,
      Código:                  r.employeeCode,
      Área:                    r.area,
      Tipo:                    TYPE_LABEL[r.incidentType] ?? r.incidentType,
      Fecha:                   r.incidentDate,
      "Tiempo afectado (min)": r.minutesImpacted,
      Estado:                  STATUS_MAP[r.status]?.label ?? r.status,
      Justificación:           r.justificationText ?? "",
      "Comentario revisor":    r.reviewerComment   ?? "",
      "Revisado por":          r.reviewedByUserName ?? "",
      "Enviado el":            r.justificationSubmittedAtUtc
        ? fmtDateShort(r.justificationSubmittedAtUtc) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    XLSX.writeFile(
      wb,
      `incidencias${aStatus ? `_${aStatus}` : ""}${aType ? `_${aType}` : ""}.xlsx`,
    );
  }

  // ── Paginación ───────────────────────────────────────────────────────────
  function getPages(cur: number, tot: number): (number | "…")[] {
    if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (cur > 3) pages.push("…");
    for (let i = Math.max(2, cur - 1); i <= Math.min(tot - 1, cur + 1); i++) pages.push(i);
    if (cur < tot - 2) pages.push("…");
    pages.push(tot);
    return pages;
  }

  const pageNums  = useMemo(() => getPages(page, totalPages), [page, totalPages]);
  const rangeFrom = (page - 1) * pgSize + 1;
  const rangeTo   = Math.min(page * pgSize, total);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="space-y-5">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ════════════════════════════════════ ENCABEZADO ════════════════════════════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight text-slate-800">
            Incidencias de asistencia
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Gestión de tardanzas, faltas, salidas anticipadas y justificaciones
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => { void refreshAll(); }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="size-3.5" />
            Actualizar
          </button>
          {aStatus !== "open" && (
            <button
              onClick={viewPending}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[13px] font-medium text-amber-700 shadow-sm transition hover:bg-amber-100"
            >
              <AlertTriangle className="size-3.5" />
              Ver pendientes
              {stats && stats.open > 0 && (
                <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">
                  {stats.open > 99 ? "99+" : stats.open}
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-40"
          >
            <Download className="size-3.5" />
            Exportar
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════ KPI ROW 1 ═════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total"
          value={stats?.total ?? "—"}
          icon={CalendarDays}
          iconCls="bg-slate-100 text-slate-500"
        />
        <KpiCard
          label="Abiertas"
          value={stats?.open ?? "—"}
          icon={AlertTriangle}
          iconCls="bg-amber-100 text-amber-600"
          sub="Pendientes de acción"
        />
        <KpiCard
          label="Justificadas"
          value={stats?.justified ?? "—"}
          icon={CheckCircle2}
          iconCls="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          label="Rechazadas"
          value={stats?.rejected ?? "—"}
          icon={XCircle}
          iconCls="bg-rose-100 text-rose-600"
        />
      </div>

      {/* ════════════════════════════════════ KPI ROW 2 ═════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Expiradas"
          value={stats?.expired ?? "—"}
          icon={Clock}
          iconCls="bg-slate-100 text-slate-400"
          sub="Plazo vencido sin justificar"
        />
        <KpiCard
          label="En revisión"
          value={stats?.openPendingReview ?? "—"}
          icon={Eye}
          iconCls="bg-sky-100 text-sky-600"
          sub="Justificación enviada"
        />
        <KpiCard
          label="Por justificar"
          value={stats?.openAwaitingJustification ?? "—"}
          icon={Timer}
          iconCls="bg-orange-100 text-orange-600"
          sub="Sin justificación aún"
        />
      </div>

      {/* ════════════════════════════════════ FILTROS ═══════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400">
            Filtros de búsqueda
          </p>
          {hasFilters && total > 0 && (
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600">
              {total} resultado{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Búsqueda */}
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Empleado, código o área..."
                className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            {/* Estado */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Todos los estados</option>
              <option value="open">Abierta</option>
              <option value="justified">Justificada</option>
              <option value="rejected">Rechazada</option>
              <option value="expired">Expirada</option>
            </select>
            {/* Tipo */}
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Todos los tipos</option>
              <option value="tardanza">Tardanza</option>
              <option value="falta">Falta</option>
              <option value="salida_anticipada">Salida anticipada</option>
              <option value="no_marcacion">No marcación</option>
            </select>
            {/* Fechas */}
            <div className="flex gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 flex-1 rounded-xl border border-slate-200 px-2 text-[12px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 flex-1 rounded-xl border border-slate-200 px-2 text-[12px] text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>

          {/* Acciones filtro */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="rounded-xl bg-teal-600 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-teal-700"
            >
              Aplicar
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-[13px] text-slate-500 transition hover:bg-slate-50"
              >
                <X className="size-3" />
                Limpiar
              </button>
            )}
            {aStatus === "open" && stats && stats.openAwaitingJustification > 0 && (
              <span className="ml-1 text-[12px] text-amber-600">
                <AlertTriangle className="mr-1 inline size-3" />
                {stats.openAwaitingJustification} sin justificación aún
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════ TABLA ═════════════════════════════════════════ */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">

        {/* Cabecera tabla */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400">
            {listQ.isLoading ? "Cargando…" : `${total} incidencia${total !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            Mostrar
            <select
              value={pgSize}
              onChange={(e) => { setPgSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-600 outline-none focus:border-teal-400"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            por página
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr>
                <SortableHeader col="employeeName"    label="Empleado"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader col="incidentType"    label="Tipo"      sortKey={sortKey} sortDir={sortDir} align="center" onSort={toggleSort} />
                <SortableHeader col="incidentDate"    label="Fecha"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader col="minutesImpacted" label="Afectado"  sortKey={sortKey} sortDir={sortDir} align="center" onSort={toggleSort} />
                <SortableHeader col="status"          label="Estado"    sortKey={sortKey} sortDir={sortDir} align="center" onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Justificación
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">

              {/* Loading */}
              {listQ.isLoading && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-teal-400" />
                    <p className="mt-2 text-[13px] text-slate-400">Cargando incidencias…</p>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!listQ.isLoading && sortedRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16">
                    <div className="mx-auto max-w-xs text-center">
                      <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-slate-100">
                        <CalendarDays className="size-7 text-slate-400" />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-600">
                        No hay incidencias
                      </p>
                      <p className="mt-1 text-[12px] text-slate-400">
                        {hasFilters
                          ? "No se encontraron resultados con los filtros actuales"
                          : "No hay incidencias registradas en el sistema"}
                      </p>
                      {hasFilters && (
                        <div className="mt-4 flex justify-center gap-2">
                          <button
                            onClick={clearFilters}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-[12px] text-slate-500 transition hover:bg-slate-50"
                          >
                            Limpiar filtros
                          </button>
                          <button
                            onClick={viewPending}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-700 transition hover:bg-amber-100"
                          >
                            Ver pendientes
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Filas */}
              {!listQ.isLoading && sortedRows.map((r) => {
                const typeCls      = TYPE_COLOR[r.incidentType] ?? "bg-slate-100 text-slate-600 border-slate-200";
                const typeLabel    = TYPE_LABEL[r.incidentType] ?? r.incidentType;
                const statusInfo   = STATUS_MAP[r.status] ?? { label: r.status, cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" };
                const awaitJustify = r.status === "open" && !r.justificationText;
                const pendReview   = r.status === "open" && !!r.justificationText;
                const isClosed     = r.status !== "open";

                return (
                  <tr key={r.id} className="group transition-colors hover:bg-slate-50/70">

                    {/* Empleado */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.employeeName} />
                        <div>
                          <p className="text-[13px] font-semibold leading-tight text-slate-800">
                            {r.employeeName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {r.employeeCode} · {r.area}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${typeCls}`}>
                        {typeLabel}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-slate-700">{fmtDate(r.incidentDate)}</p>
                    </td>

                    {/* Tiempo afectado */}
                    <td className="px-4 py-3.5 text-center">
                      {r.minutesImpacted > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          <Timer className="size-3" />
                          {fmtMinutes(r.minutesImpacted)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusInfo.cls}`}>
                        <span className={`size-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Justificación */}
                    <td className="max-w-[180px] px-4 py-3.5">
                      {awaitJustify && (
                        <span className="text-[12px] font-medium text-amber-600">Sin justificar</span>
                      )}
                      {pendReview && (
                        <div>
                          <p className="text-[11px] font-semibold text-sky-600">En revisión</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={r.justificationText ?? ""}>
                            {r.justificationText}
                          </p>
                        </div>
                      )}
                      {isClosed && r.justificationText && (
                        <div>
                          <p className="truncate text-[11px] text-slate-500" title={r.justificationText}>
                            {r.justificationText}
                          </p>
                          {r.reviewedByUserName && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              Rev. {r.reviewedByUserName}
                            </p>
                          )}
                        </div>
                      )}
                      {isClosed && !r.justificationText && (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {awaitJustify && (
                          <button
                            onClick={() => { setJustifyItem(r); setJustifyErr(null); }}
                            className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[12px] font-semibold text-teal-700 transition hover:bg-teal-100"
                          >
                            Justificar
                          </button>
                        )}
                        {pendReview && (
                          <button
                            onClick={() => { setReviewItem(r); setReviewRO(false); setReviewErr(null); }}
                            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-[12px] font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            Revisar
                          </button>
                        )}
                        {isClosed && r.justificationText && (
                          <button
                            onClick={() => { setReviewItem(r); setReviewRO(true); setReviewErr(null); }}
                            title="Ver detalle"
                            className="flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                          >
                            <Eye className="size-3.5" />
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

        {/* Paginación */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
            <p className="text-[12px] text-slate-400">
              {rangeFrom}–{rangeTo} de {total} resultado{total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              {pageNums.map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="flex size-8 items-center justify-center text-[13px] text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex size-8 items-center justify-center rounded-xl text-[13px] font-medium transition ${
                      p === page
                        ? "bg-teal-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════ MODALS ════════════════════════════════════════ */}
      {justifyItem && (
        <JustifyModal
          incident={justifyItem}
          saving={justifyMut.isPending}
          serverError={justifyErr}
          onClose={() => { setJustifyItem(null); setJustifyErr(null); }}
          onSubmit={(text) => justifyMut.mutate({ id: justifyItem.id, text })}
        />
      )}
      {reviewItem && (
        <ReviewModal
          incident={reviewItem}
          approving={approveMut.isPending}
          rejecting={rejectMut.isPending}
          serverError={reviewErr}
          readOnly={reviewRO}
          onClose={() => { setReviewItem(null); setReviewErr(null); }}
          onApprove={(comment) => approveMut.mutate({ id: reviewItem.id, comment })}
          onReject={(comment)  => rejectMut.mutate({ id: reviewItem.id, comment  })}
        />
      )}

    </section>
  );
}
