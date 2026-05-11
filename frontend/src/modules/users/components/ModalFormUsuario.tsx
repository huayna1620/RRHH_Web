import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { AtSign, BriefcaseBusiness, CheckCircle2, KeyRound, ShieldCheck, UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { UserItem } from "@/modules/users/types/user.types";
import type { RoleItem } from "@/modules/roles/types/role.types";
import type { EmployeeListItem } from "@/modules/employees/types/employee.types";

export type UsuarioFormValues = {
  userName: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phoneNumber: string;
  area: string;
  branch: string;
  position: string;
  employeeId: string;
  roleId: string;
  status: "active" | "inactive" | "pending" | "blocked";
  sendActivationEmail: boolean;
  requirePasswordChange: boolean;
  allowPortalAccess: boolean;
  restrictAdminAccess: boolean;
};

type Props = {
  open: boolean;
  user: UserItem | null;
  saving: boolean;
  roles?: RoleItem[];
  employees?: EmployeeListItem[];
  existingUsers?: UserItem[];
  onClose: () => void;
  onSubmit: (values: UsuarioFormValues) => Promise<void>;
};

const defaults: UsuarioFormValues = {
  userName: "",
  email: "",
  fullName: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  documentNumber: "",
  phoneNumber: "",
  area: "",
  branch: "",
  position: "",
  employeeId: "",
  roleId: "",
  status: "active",
  sendActivationEmail: true,
  requirePasswordChange: true,
  allowPortalAccess: true,
  restrictAdminAccess: true,
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: fullName, lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "" };
}

function roleLabel(roleName: string): string {
  const normalized = roleName.toUpperCase();
  if (normalized === "SUPER_ADMIN") return "Super Administrador";
  if (normalized === "HR_MANAGER") return "Administrador";
  if (normalized === "EMPLOYEE") return "Empleado";
  return roleName;
}

function statusLabel(status: UsuarioFormValues["status"]): string {
  if (status === "active") return "Activo";
  if (status === "inactive") return "Inactivo";
  if (status === "blocked") return "Bloqueado";
  return "Pendiente de activación";
}

function FieldError({ message }: { message?: string }): JSX.Element | null {
  return message ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{message}</p> : null;
}

function Section({ title, description, icon, children }: {
  title: string;
  description: string;
  icon: JSX.Element;
  children: JSX.Element;
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</div>
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleField({ checked, label, description, onChange, disabled = false }: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-xl border px-3 py-3 ${disabled ? "border-slate-100 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
      <span>
        <span className="block text-[13px] font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
    </label>
  );
}

export function ModalFormUsuario({
  open,
  user,
  saving,
  roles = [],
  employees = [],
  existingUsers = [],
  onClose,
  onSubmit,
}: Props): JSX.Element | null {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UsuarioFormValues>({ defaultValues: defaults, mode: "onBlur" });

  const values = watch();
  const isEdit = Boolean(user);
  const selectedRole = roles.find((role) => role.id === values.roleId);
  const selectedEmployee = employees.find((employee) => employee.id === values.employeeId);
  const fullName = `${values.firstName} ${values.lastName}`.trim();

  const assignedModules = useMemo(() => {
    const normalized = selectedRole?.name.toUpperCase() ?? "";
    if (normalized === "SUPER_ADMIN") return ["Administración", "RRHH", "Reportes", "Analítica"];
    if (normalized === "HR_MANAGER") return ["RRHH", "Reportes", "Analítica"];
    if (normalized === "EMPLOYEE") return ["Mi portal", "Documentos", "Calendario"];
    return ["Según permisos del rol"];
  }, [selectedRole]);

  useEffect(() => {
    if (!open) return;
    if (user) {
      const names = splitName(user.fullName);
      const role = roles.find((item) => user.roles.some((roleName) => roleName.toUpperCase() === item.name.toUpperCase()));
      const employee = employees.find((item) => item.id === user.employeeId);
      reset({
        ...defaults,
        userName: user.userName,
        email: user.email,
        fullName: user.fullName,
        firstName: names.firstName,
        lastName: names.lastName,
        area: employee?.area ?? "",
        branch: employee?.branch ?? "",
        position: employee?.position ?? "",
        employeeId: user.employeeId ?? "",
        roleId: role?.id ?? "",
        status: user.isActive ? "active" : "inactive",
        sendActivationEmail: false,
        requirePasswordChange: false,
      });
    } else {
      reset(defaults);
    }
  }, [employees, open, reset, roles, user]);

  useEffect(() => {
    if (!selectedEmployee) return;
    setValue("area", selectedEmployee.area);
    setValue("branch", selectedEmployee.branch);
    setValue("position", selectedEmployee.position);
  }, [selectedEmployee, setValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center sm:p-5">
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-slate-50 shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <UserCog className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950">{isEdit ? "Editar usuario" : "Nuevo usuario"}</h2>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">
                {isEdit
                  ? "Actualiza la cuenta, su rol y la vinculación con colaboradores del sistema."
                  : "Crea una cuenta de acceso y asigna permisos dentro del sistema."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="min-h-0 overflow-auto" onSubmit={handleSubmit(async (formValues) => onSubmit({ ...formValues, fullName: `${formValues.firstName} ${formValues.lastName}`.trim() }))}>
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <Section
                title="Información de acceso"
                description="Define las credenciales iniciales y el canal principal de acceso."
                icon={<KeyRound className="size-5" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Nombre de usuario</span>
                    <Input
                      disabled={isEdit}
                      {...register("userName", {
                        required: "El nombre de usuario es obligatorio.",
                        validate: (value) => {
                          const duplicated = existingUsers.some((item) => item.id !== user?.id && item.userName.toLowerCase() === value.trim().toLowerCase());
                          return duplicated ? "Ya existe un usuario con ese nombre." : true;
                        },
                      })}
                    />
                    <FieldError message={errors.userName?.message} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Correo electrónico</span>
                    <Input
                      type="email"
                      {...register("email", {
                        required: "El correo es obligatorio.",
                        pattern: { value: /^\S+@\S+\.\S+$/, message: "Ingresa un correo válido." },
                        validate: (value) => {
                          const duplicated = existingUsers.some((item) => item.id !== user?.id && item.email.toLowerCase() === value.trim().toLowerCase());
                          return duplicated ? "Ya existe un usuario con ese correo." : true;
                        },
                      })}
                    />
                    <FieldError message={errors.email?.message} />
                  </label>
                  {!isEdit && (
                    <>
                      <label>
                        <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Contraseña temporal</span>
                        <Input
                          type="password"
                          {...register("password", {
                            required: "La contraseña temporal es obligatoria.",
                            minLength: { value: 8, message: "Debe tener al menos 8 caracteres." },
                            validate: (value) => /[A-Z]/.test(value) && /\d/.test(value) ? true : "Incluye al menos una mayúscula y un número.",
                          })}
                        />
                        <FieldError message={errors.password?.message} />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Confirmar contraseña</span>
                        <Input
                          type="password"
                          {...register("confirmPassword", {
                            required: "Confirma la contraseña.",
                            validate: (value) => value === values.password || "Las contraseñas no coinciden.",
                          })}
                        />
                        <FieldError message={errors.confirmPassword?.message} />
                      </label>
                    </>
                  )}
                  <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                    <ToggleField
                      checked={values.sendActivationEmail}
                      onChange={(checked) => setValue("sendActivationEmail", checked)}
                      disabled
                      label="Enviar correo de activación"
                      description="Preparado para backend de notificaciones. Aún no envía correos desde este flujo."
                    />
                    <ToggleField
                      checked={values.requirePasswordChange}
                      onChange={(checked) => setValue("requirePasswordChange", checked)}
                      disabled
                      label="Solicitar cambio en el primer ingreso"
                      description="Preparado para política de contraseña inicial."
                    />
                  </div>
                </div>
              </Section>

              <Section
                title="Información personal"
                description="Identifica a la persona y, si aplica, vincúlala con un colaborador existente."
                icon={<AtSign className="size-5" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Nombres</span>
                    <Input {...register("firstName", { required: "Los nombres son obligatorios." })} />
                    <FieldError message={errors.firstName?.message} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Apellidos</span>
                    <Input {...register("lastName", { required: "Los apellidos son obligatorios." })} />
                    <FieldError message={errors.lastName?.message} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Documento</span>
                    <Input {...register("documentNumber", { pattern: { value: /^[0-9A-Za-z-]*$/, message: "Usa solo letras, números o guiones." } })} />
                    <FieldError message={errors.documentNumber?.message} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Teléfono</span>
                    <Input {...register("phoneNumber")} />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Vincular con colaborador existente</span>
                    <Select {...register("employeeId")}>
                      <option value="">Crear cuenta independiente</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.fullName} · {employee.area}</option>
                      ))}
                    </Select>
                    {!isEdit && values.employeeId && (
                      <p className="mt-1 text-[11px] font-semibold text-amber-700">
                        Se creará la cuenta y luego se vinculará al colaborador con una actualización automática.
                      </p>
                    )}
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Área</span>
                    <Input {...register("area")} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Sede</span>
                    <Input {...register("branch")} />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Cargo</span>
                    <Input {...register("position")} />
                  </label>
                </div>
              </Section>

              <Section
                title="Rol y permisos"
                description="Asigna el rol principal y el estado inicial disponible en el backend."
                icon={<ShieldCheck className="size-5" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Rol principal</span>
                    <Select {...register("roleId", { required: "Selecciona un rol." })}>
                      <option value="">Seleccionar rol</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>
                      ))}
                    </Select>
                    <FieldError message={errors.roleId?.message} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Estado inicial</span>
                    <Select
                      {...register("status", {
                        validate: (value) => value === "active" || value === "inactive" || "Bloqueado y pendiente requieren backend específico.",
                      })}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="pending" disabled>Pendiente de activación · preparado</option>
                      <option value="blocked" disabled>Bloqueado · preparado</option>
                    </Select>
                    <FieldError message={errors.status?.message} />
                  </label>
                  <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[12px] font-bold text-slate-700">Acceso a módulos</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assignedModules.map((module) => (
                        <span key={module} className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">{module}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              <Section
                title="Seguridad"
                description="Opciones visibles para preparar políticas de seguridad y acceso."
                icon={<BriefcaseBusiness className="size-5" />}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleField
                    checked={values.allowPortalAccess}
                    onChange={(checked) => setValue("allowPortalAccess", checked)}
                    disabled
                    label="Permitir acceso al portal"
                    description="Preparado para control granular por módulo."
                  />
                  <ToggleField
                    checked={values.restrictAdminAccess}
                    onChange={(checked) => setValue("restrictAdminAccess", checked)}
                    disabled
                    label="Bloquear acceso administrativo si el rol es básico"
                    description="Cubierto por permisos del rol actual."
                  />
                </div>
              </Section>
            </div>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-4">
              <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Resumen</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-sm font-extrabold text-white">
                  {(fullName || values.userName || "NU").split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-extrabold text-slate-900">{fullName || "Nombre del usuario"}</p>
                  <p className="truncate text-[12px] font-semibold text-slate-500">@{values.userName || "usuario"}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-[13px]">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Correo</p>
                  <p className="mt-1 truncate font-semibold text-slate-800">{values.email || "correo@empresa.com"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Rol</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedRole ? roleLabel(selectedRole.name) : "Sin rol"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
                  <p className="mt-1 font-semibold text-slate-800">{statusLabel(values.status)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Área</p>
                  <p className="mt-1 font-semibold text-slate-800">{values.area || "Sin área vinculada"}</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-3">
                <p className="flex items-center gap-2 text-[12px] font-bold text-brand-800">
                  <CheckCircle2 className="size-4" />
                  Acciones al crear
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-brand-700">
                  <li>Cuenta registrada con rol principal.</li>
                  <li>Estado real aplicado como activo o inactivo.</li>
                  {values.employeeId && <li>Vinculación con colaborador existente.</li>}
                  <li>Correo de activación y cambio obligatorio quedan preparados.</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { ModalFormUsuario as UserFormModal };
