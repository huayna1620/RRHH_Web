import { type JSX } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Mail,
  Pencil,
  Phone,
  User,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmployeeDetail } from "@/modules/employees/types/employee.types";

// ─── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
}

// ─── Field row ─────────────────────────────────────────────────────────────────

function Field({ label, value, icon: Icon }: {
  label: string;
  value: string | null | undefined;
  icon?: React.ElementType;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
        {Icon && <Icon className="size-3.5 shrink-0 text-slate-400" />}
        {value || "—"}
      </span>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-50">
        <Icon className="size-3.5 text-brand-600" />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  employee: EmployeeDetail | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ModalDetalleEmpleado({ open, employee, loading, onClose, onEdit }: Props): JSX.Element | null {
  if (!open) return null;

  const fullName = employee ? `${employee.firstName} ${employee.lastName}` : "";
  const color    = fullName ? avatarColor(fullName) : "bg-slate-100 text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:border">

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              {loading ? (
                <Skeleton className="size-14 rounded-full" />
              ) : employee?.profilePhotoUrl ? (
                <img
                  src={employee.profilePhotoUrl}
                  alt={fullName}
                  className="size-14 rounded-full border-2 border-white object-cover shadow-md ring-2 ring-slate-200"
                />
              ) : (
                <span className={`flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-md ring-2 ring-slate-200 ${color}`}>
                  {fullName ? initials(fullName) : "?"}
                </span>
              )}
              <div>
                {loading ? (
                  <>
                    <Skeleton className="mb-1.5 h-5 w-40" />
                    <Skeleton className="h-3.5 w-20" />
                  </>
                ) : (
                  <>
                    <h2 className="text-[17px] font-bold text-slate-900">{fullName || "—"}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[12px] text-slate-400">{employee?.employeeCode}</span>
                      <span className={[
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                        employee?.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-rose-50 text-rose-600 ring-rose-200",
                      ].join(" ")}>
                        <span className={`size-1.5 rounded-full ${employee?.isActive ? "bg-emerald-500" : "bg-rose-400"}`} />
                        {employee?.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-6">
              {[6, 2, 7].map((n, si) => (
                <div key={si} className="space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: n }).map((_, i) => (
                      <div key={i}>
                        <Skeleton className="mb-1 h-3 w-16" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !employee ? (
            <p className="py-10 text-center text-sm text-slate-400">No se pudo cargar el empleado.</p>
          ) : (
            <div className="space-y-6">

              {/* Datos personales */}
              <div className="space-y-4">
                <SectionTitle icon={User} label="Datos personales" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Código"            value={employee.employeeCode} icon={FileText} />
                  <Field label="Tipo de documento" value={employee.documentType} />
                  <Field label="Nombres"           value={employee.firstName} />
                  <Field label="Apellidos"         value={employee.lastName} />
                  <Field label="Nro. documento"    value={employee.documentNumber} icon={FileText} />
                  <Field label="Fecha nacimiento"  value={formatDate(employee.birthDate)} icon={Calendar} />
                  <Field label="Teléfono"          value={employee.phoneNumber} icon={Phone} />
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-4">
                <SectionTitle icon={Mail} label="Contacto" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Correo personal"    value={employee.personalEmail} icon={Mail} />
                  <Field label="Correo corporativo" value={employee.workEmail}     icon={Mail} />
                </div>
              </div>

              {/* Información laboral */}
              <div className="space-y-4">
                <SectionTitle icon={Briefcase} label="Información laboral" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Fecha de ingreso" value={formatDate(employee.hireDate)}  icon={Calendar} />
                  <Field label="Sede"             value={employee.branch}                icon={Building2} />
                  <Field label="Área"             value={employee.area}                  icon={Briefcase} />
                  <Field label="Cargo"            value={employee.position} />
                  <Field label="Tipo de contrato" value={employee.contractType} />
                  <Field label="Jefe directo"     value={employee.manager || "Sin jefe"} icon={User} />
                  <Field label="Sueldo base"      value={formatCurrency(employee.baseSalary)} icon={DollarSign} />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cerrar
            </button>
            {employee && (
              <button
                onClick={onEdit}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-5 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:from-brand-500 hover:to-brand-700"
              >
                <Pencil className="size-4" />
                Editar empleado
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
