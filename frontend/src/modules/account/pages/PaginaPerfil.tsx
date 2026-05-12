import { useEffect, useMemo, useState, type FormEvent, type JSX, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AtSign,
  BadgeCheck,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { getMyProfile, updateMyProfile, type AccountProfile } from "@/modules/account/services/accountApi";
import { getAuditLogs } from "@/modules/audit/services/auditApi";
import type { AuditLogItem, AuditLogQuery } from "@/modules/audit/types/audit.types";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { httpClient } from "@/services/api/httpClient";

type Feedback = { type: "success" | "error" | "info"; message: string };
type PasswordVisibility = { current: boolean; next: boolean; confirm: boolean };
type PreferenceState = { language: string; timezone: string; notifications: string };

const STORAGE_KEY = "sae_rrhh_profile_preferences";

const defaultPreferences: PreferenceState = {
  language: "es",
  timezone: "America/Lima",
  notifications: "email-system",
};

const defaultAuditQuery: AuditLogQuery = {
  search: "",
  module: "",
  action: "",
  userId: "",
  from: "",
  to: "",
  pageNumber: 1,
  pageSize: 4,
};

function initialsFromName(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SA";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(value?: string | null): string {
  if (!value) return "Hace un momento";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hace un momento";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    create: "Creación registrada",
    update: "Actualización registrada",
    delete: "Eliminación registrada",
    login: "Inicio de sesión",
    logout: "Cierre de sesión",
    changepassword: "Cambio de contraseña",
    change_password: "Cambio de contraseña",
    resetpassword: "Restablecimiento de contraseña",
  };
  const normalized = action.toLowerCase().replace(/\s+/g, "");
  return map[normalized] ?? action;
}

function moduleLabel(module: string): string {
  const map: Record<string, string> = {
    auth: "Seguridad",
    account: "Cuenta",
    users: "Usuarios",
    employees: "Empleados",
    roles: "Roles",
    documents: "Documentos",
    auditlog: "Auditoría",
  };
  return map[module.toLowerCase()] ?? module;
}

function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function passwordStrength(score: number): { label: string; bar: string; text: string } {
  if (score >= 5) return { label: "Muy segura", bar: "bg-emerald-500", text: "text-emerald-700" };
  if (score >= 4) return { label: "Segura", bar: "bg-teal-500", text: "text-teal-700" };
  if (score >= 3) return { label: "Media", bar: "bg-amber-500", text: "text-amber-700" };
  return { label: "Débil", bar: "bg-rose-500", text: "text-rose-700" };
}

function readPreferences(): PreferenceState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function Card({ children, className }: { children?: ReactNode; className?: string }): JSX.Element {
  return (
    <section className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/70", className)}>
      {children}
    </section>
  );
}

function CardTitle({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-black text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function InfoRow({ icon, label, value, detail }: { icon: ReactNode; label: string; value: ReactNode; detail?: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">{value}</div>
        {detail ? <p className="mt-0.5 truncate text-[12px] text-slate-500">{detail}</p> : null}
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  visible,
  autoComplete,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  visible: boolean;
  autoComplete: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}): JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-bold text-slate-600">{label}</span>
      <span className="relative block">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="pr-11"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

function ProfileSkeleton(): JSX.Element {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <div className="space-y-6">
        <Card className="h-80 animate-pulse bg-slate-100" />
        <Card className="h-96 animate-pulse bg-slate-100" />
      </div>
      <div className="space-y-6">
        <Card className="h-64 animate-pulse bg-slate-100" />
        <Card className="h-72 animate-pulse bg-slate-100" />
        <Card className="h-72 animate-pulse bg-slate-100" />
      </div>
    </div>
  );
}

export function PaginaPerfil(): JSX.Element {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibility, setVisibility] = useState<PasswordVisibility>({ current: false, next: false, confirm: false });
  const [preferences, setPreferences] = useState<PreferenceState>(() => readPreferences());
  const [preferencesDirty, setPreferencesDirty] = useState(false);

  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });
  const profile = profileQuery.data;

  const activityQuery = useQuery({
    queryKey: ["profile-activity", profile?.userName],
    queryFn: () => getAuditLogs({ ...defaultAuditQuery, userName: profile?.userName ?? "" }),
    enabled: Boolean(profile?.userName),
    retry: false,
  });

  useEffect(() => {
    if (profile && !editing) setFullName(profile.fullName);
  }, [profile, editing]);

  const strengthScore = passwordScore(newPassword);
  const strength = passwordStrength(strengthScore);
  const passwordRules = useMemo(
    () => [
      { label: "Mínimo 8 caracteres", ok: newPassword.length >= 8 },
      { label: "Mayúsculas", ok: /[A-Z]/.test(newPassword) },
      { label: "Minúsculas", ok: /[a-z]/.test(newPassword) },
      { label: "Números", ok: /\d/.test(newPassword) },
      { label: "Símbolos", ok: /[^A-Za-z0-9]/.test(newPassword) },
    ],
    [newPassword]
  );

  const canUpdatePassword = Boolean(currentPassword) && strengthScore >= 4 && newPassword === confirmPassword;

  const updateMutation = useMutation({
    mutationFn: () => updateMyProfile({ fullName: fullName.trim() }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      updateUser({ fullName: data.fullName });
      setEditing(false);
      setFeedback({ type: "success", message: "Perfil actualizado correctamente." });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar el perfil. Inténtalo nuevamente." }),
  });

  const passwordMutation = useMutation({
    mutationFn: () => httpClient.post("/api/v1/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ type: "success", message: "Contraseña actualizada correctamente." });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo cambiar la contraseña. Verifica tu contraseña actual." }),
  });

  function handleUpdateProfile(event: FormEvent): void {
    event.preventDefault();
    if (!fullName.trim()) {
      setFeedback({ type: "error", message: "El nombre completo es obligatorio." });
      return;
    }
    updateMutation.mutate();
  }

  function handlePasswordSubmit(event: FormEvent): void {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "La confirmación debe coincidir con la nueva contraseña." });
      return;
    }
    if (strengthScore < 4) {
      setFeedback({ type: "error", message: "La nueva contraseña debe cumplir los requisitos de seguridad." });
      return;
    }
    passwordMutation.mutate();
  }

  function handlePreferenceChange<K extends keyof PreferenceState>(key: K, value: PreferenceState[K]): void {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setPreferencesDirty(true);
  }

  function savePreferences(): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setPreferencesDirty(false);
    setFeedback({ type: "info", message: "Preferencias guardadas en este navegador. Falta backend para sincronizarlas en todos los dispositivos." });
  }

  if (profileQuery.isLoading) {
    return (
      <section className="mx-auto max-w-[1500px] space-y-6">
        <PageHeader title="Mi perfil" description="Información de tu cuenta" />
        <ProfileSkeleton />
      </section>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <section className="mx-auto max-w-[1500px] space-y-6">
        <PageHeader title="Mi perfil" description="Información de tu cuenta" />
        <Alert variant="error" message="No se pudo cargar la información de tu perfil." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Información de tu cuenta"
        action={
          <Badge variant="info" className="rounded-full px-3 py-1">
            Cuenta segura
          </Badge>
        }
      />

      {feedback ? <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-6">
          <ProfileSummaryCard
            profile={profile}
            editing={editing}
            fullName={fullName}
            setFullName={setFullName}
            setEditing={setEditing}
            onSubmit={handleUpdateProfile}
            isSaving={updateMutation.isPending}
          />

          <Card>
            <CardTitle
              icon={<LockKeyhole className="size-5" />}
              title="Cambiar contraseña"
              subtitle="Actualiza tu clave con una política segura."
            />
            <form onSubmit={handlePasswordSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <PasswordInput
                  label="Contraseña actual"
                  value={currentPassword}
                  visible={visibility.current}
                  autoComplete="current-password"
                  onChange={setCurrentPassword}
                  onToggle={() => setVisibility((prev) => ({ ...prev, current: !prev.current }))}
                />
                <PasswordInput
                  label="Nueva contraseña"
                  value={newPassword}
                  visible={visibility.next}
                  autoComplete="new-password"
                  onChange={setNewPassword}
                  onToggle={() => setVisibility((prev) => ({ ...prev, next: !prev.next }))}
                />
                <PasswordInput
                  label="Confirmar contraseña"
                  value={confirmPassword}
                  visible={visibility.confirm}
                  autoComplete="new-password"
                  onChange={setConfirmPassword}
                  onToggle={() => setVisibility((prev) => ({ ...prev, confirm: !prev.confirm }))}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-slate-600">Fortaleza de contraseña</p>
                  <span className={cn("text-[12px] font-black", strength.text)}>{strength.label}</span>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className={cn("h-2 rounded-full bg-slate-200", index < strengthScore ? strength.bar : "")}
                    />
                  ))}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {passwordRules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
                      <CheckCircle2 className={cn("size-4", rule.ok ? "text-emerald-500" : "text-slate-300")} />
                      {rule.label}
                    </div>
                  ))}
                </div>
                {confirmPassword && newPassword !== confirmPassword ? (
                  <p className="mt-3 text-[12px] font-semibold text-rose-600">La confirmación no coincide.</p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={!canUpdatePassword || passwordMutation.isPending}>
                  <KeyRound className="size-4" />
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <SecurityCard profile={profile} />
          <ActivityCard items={activityQuery.data?.items ?? []} isLoading={activityQuery.isFetching} isError={activityQuery.isError} />
          <PreferencesCard
            preferences={preferences}
            dirty={preferencesDirty}
            onChange={handlePreferenceChange}
            onSave={savePreferences}
          />
        </div>
      </div>
    </section>
  );
}

function ProfileSummaryCard({
  profile,
  editing,
  fullName,
  setFullName,
  setEditing,
  onSubmit,
  isSaving,
}: {
  profile: AccountProfile;
  editing: boolean;
  fullName: string;
  setFullName: (value: string) => void;
  setEditing: (value: boolean) => void;
  onSubmit: (event: FormEvent) => void;
  isSaving: boolean;
}): JSX.Element {
  const primaryRole = profile.roles[0] ?? "Sin rol";

  return (
    <Card className="overflow-hidden">
      <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 px-5 py-6 text-white">
        <div className="absolute right-6 top-0 h-24 w-24 rounded-full bg-brand-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-brand-700 shadow-lg shadow-slate-950/20 ring-4 ring-white/20">
            {initialsFromName(profile.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-black tracking-tight">{profile.fullName}</h2>
              <Badge variant="success" className="bg-white/15 text-white ring-white/20">
                {primaryRole}
              </Badge>
            </div>
            <p className="mt-2 max-w-xl text-sm text-slate-200">
              Perfil de acceso al sistema SAE - RRHH con información vinculada de cuenta, roles y colaborador.
            </p>
          </div>
          <Button type="button" variant="secondary" className="bg-white/95" onClick={() => setEditing(true)}>
            <Edit3 className="size-4" />
            Editar perfil
          </Button>
        </div>
      </div>

      <div className="p-5">
        {editing ? (
          <form onSubmit={onSubmit} className="mb-5 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
              <label className="block space-y-1.5">
                <span className="text-[12px] font-bold text-slate-600">Nombre completo</span>
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombre completo" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[12px] font-bold text-slate-600">Correo</span>
                <Input value={profile.email} disabled title="El backend actual no permite editar el correo desde Mi perfil." />
              </label>
            </div>
            <p className="mt-3 text-[12px] text-slate-500">
              Por ahora el backend permite editar el nombre. El correo queda protegido hasta ampliar la configuración de cuenta.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFullName(profile.fullName);
                  setEditing(false);
                }}
              >
                <X className="size-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || !fullName.trim()}>
                <Save className="size-4" />
                Guardar cambios
              </Button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-x-8 md:grid-cols-2">
          <InfoRow icon={<UserRound className="size-4" />} label="Empleado vinculado" value={profile.employeeName ?? "Sin empleado vinculado"} detail={profile.employeeCode ?? "Cuenta administrativa"} />
          <InfoRow icon={<AtSign className="size-4" />} label="Usuario" value={profile.userName} />
          <InfoRow icon={<Mail className="size-4" />} label="Correo" value={profile.email} />
          <InfoRow
            icon={<BadgeCheck className="size-4" />}
            label="Rol(es)"
            value={
              <span className="flex flex-wrap gap-1">
                {profile.roles.length ? profile.roles.map((role) => <Badge key={role} variant="neutral">{role}</Badge>) : "Sin roles"}
              </span>
            }
          />
        </div>
      </div>
    </Card>
  );
}

function SecurityCard({ profile }: { profile: AccountProfile }): JSX.Element {
  return (
    <Card>
      <CardTitle icon={<ShieldCheck className="size-5" />} title="Seguridad" subtitle="Estado actual de acceso y protección." />
      <div className="space-y-3 p-5">
        <SecurityRow
          icon={<Clock3 className="size-4" />}
          title="Último acceso"
          detail={formatDateTime(profile.lastLoginAtUtc)}
          aside={<Badge variant="success">Este dispositivo</Badge>}
        />
        <SecurityRow
          icon={<ShieldCheck className="size-4" />}
          title="Autenticación en dos pasos (2FA)"
          detail="Preparado para activar cuando exista backend de 2FA."
          aside={<Badge variant="warning">Próximamente</Badge>}
        />
        <SecurityRow
          icon={<Laptop className="size-4" />}
          title="Sesiones activas"
          detail="1 sesión detectada en este navegador."
          aside={<Badge variant="neutral">Actual</Badge>}
        />
        <Button type="button" variant="secondary" className="mt-2 w-full justify-between" disabled title="Requiere backend de sesiones y 2FA.">
          Administrar seguridad
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

function SecurityRow({ icon, title, detail, aside }: { icon: ReactNode; title: string; detail: string; aside: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-slate-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-black text-slate-800">{title}</p>
        <p className="mt-0.5 truncate text-[12px] text-slate-500">{detail}</p>
      </div>
      {aside}
    </div>
  );
}

function ActivityCard({ items, isLoading, isError }: { items: AuditLogItem[]; isLoading: boolean; isError: boolean }): JSX.Element {
  return (
    <Card>
      <CardTitle
        icon={<Activity className="size-5" />}
        title="Actividad reciente"
        subtitle="Últimos movimientos asociados a tu usuario."
        action={<button type="button" className="text-[12px] font-bold text-brand-700 hover:text-brand-900">Ver todo</button>}
      />
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : isError ? (
          <EmptyActivity message="No se pudo cargar la actividad. Puede faltar permiso de auditoría para este usuario." />
        ) : items.length ? (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-slate-800">{actionLabel(item.action)}</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {moduleLabel(item.module)} {item.entityType ? `- ${item.entityType}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatShortDate(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyActivity message="Aún no hay actividad reciente para mostrar." />
        )}
      </div>
    </Card>
  );
}

function EmptyActivity({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <CalendarClock className="mx-auto size-8 text-slate-300" />
      <p className="mt-3 text-[13px] font-semibold text-slate-600">{message}</p>
    </div>
  );
}

function PreferencesCard({
  preferences,
  dirty,
  onChange,
  onSave,
}: {
  preferences: PreferenceState;
  dirty: boolean;
  onChange: <K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) => void;
  onSave: () => void;
}): JSX.Element {
  return (
    <Card>
      <CardTitle icon={<Globe2 className="size-5" />} title="Preferencias" subtitle="Ajustes de experiencia del sistema." />
      <div className="space-y-4 p-5">
        <label className="block space-y-1.5">
          <span className="flex items-center gap-2 text-[12px] font-bold text-slate-600"><Globe2 className="size-4 text-slate-400" /> Idioma</span>
          <Select value={preferences.language} onChange={(event) => onChange("language", event.target.value)}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </Select>
        </label>
        <label className="block space-y-1.5">
          <span className="flex items-center gap-2 text-[12px] font-bold text-slate-600"><Clock3 className="size-4 text-slate-400" /> Zona horaria</span>
          <Select value={preferences.timezone} onChange={(event) => onChange("timezone", event.target.value)}>
            <option value="America/Lima">(GMT-05:00) Lima</option>
            <option value="America/Bogota">(GMT-05:00) Bogotá</option>
            <option value="America/Santiago">(GMT-04:00) Santiago</option>
          </Select>
        </label>
        <label className="block space-y-1.5">
          <span className="flex items-center gap-2 text-[12px] font-bold text-slate-600"><Bell className="size-4 text-slate-400" /> Notificaciones</span>
          <Select value={preferences.notifications} onChange={(event) => onChange("notifications", event.target.value)}>
            <option value="email-system">Email y sistema</option>
            <option value="system">Solo sistema</option>
            <option value="email">Solo email</option>
            <option value="none">Sin notificaciones</option>
          </Select>
        </label>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
          Estas preferencias se guardan localmente por ahora. Falta backend para sincronizarlas entre dispositivos.
        </div>
        <Button type="button" className="w-full" disabled={!dirty} onClick={onSave}>
          <Save className="size-4" />
          Guardar preferencias
        </Button>
      </div>
    </Card>
  );
}
