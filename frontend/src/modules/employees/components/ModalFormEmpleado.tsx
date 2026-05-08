import { useEffect, useRef, useState, type JSX } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Camera,
  Mail,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/FormField";
import { MiniModalCatalogo } from "@/modules/employees/components/MiniModalCatalogo";
import { createArea, createPosition } from "@/modules/org-structure/services/orgStructureApi";
import { createBranch } from "@/modules/configuration/services/configurationApi";
import type { EmployeeCatalogs, EmployeeDetail, EmployeePayload } from "@/modules/employees/types/employee.types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  employeeCode:   z.string().min(2, "Mínimo 2 caracteres").max(20, "Máximo 20 caracteres"),
  documentType:   z.string().min(1, "Selecciona un tipo"),
  documentNumber: z.string().min(1, "Requerido").refine((v) => v.trim().length >= 5, "Mínimo 5 caracteres"),
  firstName:      z.string().min(2, "Mínimo 2 caracteres").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Solo letras"),
  lastName:       z.string().min(2, "Mínimo 2 caracteres").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Solo letras"),
  birthDate:      z.string().optional(),
  phoneNumber:    z.string().min(7, "Mínimo 7 caracteres").regex(/^\+?[\d\s\-()+]+$/, "Formato no válido"),
  personalEmail:  z.string().email("Correo no válido"),
  workEmail:      z.string().email("Correo no válido"),
  hireDate:       z.string().min(1, "Fecha requerida"),
  branchId:       z.string().min(1, "Selecciona una sede"),
  areaId:         z.string().min(1, "Selecciona un área"),
  positionId:     z.string().min(1, "Selecciona un cargo"),
  contractTypeId: z.string().min(1, "Selecciona un tipo de contrato"),
  managerId:      z.string().optional(),
  baseSalary:     z.coerce.number({ invalid_type_error: "Ingresa un número" }).min(0, "Debe ser ≥ 0"),
});

type Values = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  mode: "create" | "edit";
  catalogs?: EmployeeCatalogs;
  employee: EmployeeDetail | null;
  loadingEmployee: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: EmployeePayload) => Promise<void>;
  onServerError?: (msg: string) => void;
};

const defaults: Values = {
  employeeCode: "", documentType: "DNI", documentNumber: "",
  firstName: "", lastName: "", birthDate: "", phoneNumber: "",
  personalEmail: "", workEmail: "",
  hireDate: "", branchId: "", areaId: "", positionId: "",
  contractTypeId: "", managerId: "", baseSalary: 0,
};

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-50">
        <Icon className="size-3.5 text-brand-600" />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ─── Quick-add button ─────────────────────────────────────────────────────────

function AddBtn({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Crear nuevo"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-brand-300 bg-brand-50 text-brand-500 transition hover:border-brand-400 hover:bg-brand-100"
    >
      <Plus className="size-4" />
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type MiniTarget = "area" | "position" | "branch" | null;

export function ModalFormEmpleado({
  open, mode, catalogs, employee, loadingEmployee, saving, onClose, onSubmit,
}: Props): JSX.Element | null {
  if (!open) return null;

  const queryClient = useQueryClient();
  const isEdit      = mode === "edit";
  const title       = isEdit ? "Editar empleado" : "Nuevo empleado";
  const subtitle    = isEdit ? "Modifica la información del colaborador" : "Completa la información del colaborador";

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mini modal state
  const [miniTarget, setMiniTarget]   = useState<MiniTarget>(null);
  const [miniError, setMiniError]     = useState<string | null>(null);

  // Form
  const {
    register, handleSubmit, reset, setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  // Populate on open
  useEffect(() => {
    if (!open) return;
    setPhotoError(null);
    setMiniTarget(null);
    setMiniError(null);
    if (isEdit && employee) {
      setPhotoPreview(employee.profilePhotoUrl || null);
      reset({
        employeeCode:   employee.employeeCode,
        firstName:      employee.firstName,
        lastName:       employee.lastName,
        documentType:   employee.documentType,
        documentNumber: employee.documentNumber,
        hireDate:       employee.hireDate,
        birthDate:      employee.birthDate || "",
        baseSalary:     employee.baseSalary,
        personalEmail:  employee.personalEmail,
        workEmail:      employee.workEmail,
        phoneNumber:    employee.phoneNumber,
        branchId:       employee.branchId,
        areaId:         employee.areaId,
        positionId:     employee.positionId,
        contractTypeId: employee.contractTypeId,
        managerId:      employee.managerId || "",
      });
    } else {
      setPhotoPreview(null);
      reset(defaults);
    }
  }, [open, mode, employee, reset]);

  // Photo handlers
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoError("Solo se aceptan archivos JPG o PNG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("La imagen no puede superar 2 MB.");
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removePhoto(): void { setPhotoPreview(null); setPhotoError(null); }

  // Submit
  const submit = handleSubmit(async (v) => {
    await onSubmit({
      employeeCode:          v.employeeCode.trim(),
      firstName:             v.firstName.trim(),
      lastName:              v.lastName.trim(),
      documentType:          v.documentType,
      documentNumber:        v.documentNumber.trim(),
      birthDate:             v.birthDate || "2000-01-01",
      hireDate:              v.hireDate,
      baseSalary:            Number(v.baseSalary),
      personalEmail:         v.personalEmail.trim(),
      workEmail:             v.workEmail.trim(),
      phoneNumber:           v.phoneNumber.trim(),
      profilePhotoUrl:       photoPreview ?? "",
      notes:                 "",
      emergencyContactName:  "",
      emergencyContactPhone: "",
      contractEndDate:       "",
      bankName:              "",
      bankAccountNumber:     "",
      bankAccountCci:        "",
      bankAccountType:       "",
      bankCurrency:          "PEN",
      branchId:              v.branchId,
      areaId:                v.areaId,
      positionId:            v.positionId,
      contractTypeId:        v.contractTypeId,
      managerId:             v.managerId || "",
    });
  });

  // ─── Mini modal mutations ────────────────────────────────────────────────────

  const areaMutation = useMutation({
    mutationFn: (p: { name: string; code: string }) => createArea({ name: p.name, code: p.code }),
    onSuccess: async (newItem) => {
      await queryClient.invalidateQueries({ queryKey: ["employee-catalogs"] });
      setValue("areaId", newItem.id);
      setMiniTarget(null);
      setMiniError(null);
    },
    onError: () => setMiniError("No se pudo crear el área. Verifica que el código no esté repetido."),
  });

  const positionMutation = useMutation({
    mutationFn: (p: { name: string; code: string }) => createPosition({ name: p.name, code: p.code }),
    onSuccess: async (newItem) => {
      await queryClient.invalidateQueries({ queryKey: ["employee-catalogs"] });
      setValue("positionId", newItem.id);
      setMiniTarget(null);
      setMiniError(null);
    },
    onError: () => setMiniError("No se pudo crear el cargo. Verifica que el código no esté repetido."),
  });

  const branchMutation = useMutation({
    mutationFn: (p: { name: string; code: string }) => createBranch({ name: p.name, code: p.code }),
    onSuccess: async (newItem) => {
      await queryClient.invalidateQueries({ queryKey: ["employee-catalogs"] });
      setValue("branchId", newItem.id);
      setMiniTarget(null);
      setMiniError(null);
    },
    onError: () => setMiniError("No se pudo crear la sede. Verifica que el código no esté repetido."),
  });

  function handleMiniSubmit(name: string, code: string): void {
    setMiniError(null);
    if (miniTarget === "area")     areaMutation.mutate({ name, code });
    if (miniTarget === "position") positionMutation.mutate({ name, code });
    if (miniTarget === "branch")   branchMutation.mutate({ name, code });
  }

  const miniSaving =
    areaMutation.isPending || positionMutation.isPending || branchMutation.isPending;

  function openMini(target: MiniTarget): void {
    setMiniError(null);
    setMiniTarget(target);
  }

  // Mini modal title
  const miniTitles: Record<NonNullable<MiniTarget>, string> = {
    area: "Nueva área", position: "Nuevo cargo", branch: "Nueva sede",
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Mini modal (z-60, floats above) */}
      <MiniModalCatalogo
        open={Boolean(miniTarget)}
        title={miniTarget ? miniTitles[miniTarget] : ""}
        saving={miniSaving}
        error={miniError}
        onClose={() => { setMiniTarget(null); setMiniError(null); }}
        onSubmit={handleMiniSubmit}
      />

      {/* Main modal */}
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
        <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:border">

          {/* ── Header ── */}
          <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-bold text-slate-900">{title}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="overflow-y-auto">
            {loadingEmployee ? (
              <div className="flex items-center justify-center py-16">
                <div className="size-7 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
                <span className="ml-3 text-sm text-slate-500">Cargando datos...</span>
              </div>
            ) : (
              <form id="emp-form" onSubmit={submit} noValidate>
                <div className="space-y-5 px-6 py-5">

                  {/* ── S1: Datos personales ── */}
                  <SectionTitle icon={User} label="Datos personales" />

                  {/* Photo block */}
                  <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="relative shrink-0">
                      <div className="size-20 overflow-hidden rounded-full border-2 border-white shadow-md ring-2 ring-slate-200">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Foto de perfil" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-brand-50">
                            <User className="size-8 text-brand-300" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-white shadow-sm transition hover:bg-brand-600"
                      >
                        <Camera className="size-3.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-700">Foto de perfil</p>
                      <p className="mt-0.5 text-[12px] text-slate-400">JPG o PNG · máximo 2 MB</p>
                      {photoError && <p className="mt-1 text-[12px] font-medium text-rose-500">{photoError}</p>}
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Camera className="size-3.5" />
                          {photoPreview ? "Cambiar foto" : "Subir foto"}
                        </button>
                        {photoPreview && (
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12px] font-semibold text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 className="size-3.5" />
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
                  </div>

                  {/* Personal fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Código de empleado" error={errors.employeeCode?.message} required>
                      <Input {...register("employeeCode")} placeholder="EMP-001" className={errors.employeeCode ? "border-rose-300" : ""} />
                    </FormField>

                    <FormField label="Tipo de documento" error={errors.documentType?.message} required>
                      <Select {...register("documentType")} className={errors.documentType ? "border-rose-300" : ""}>
                        <option value="DNI">DNI — Documento Nacional de Identidad</option>
                        <option value="CE">CE — Carné de Extranjería</option>
                        <option value="PAS">PAS — Pasaporte</option>
                      </Select>
                    </FormField>

                    <FormField label="Nombres" error={errors.firstName?.message} required>
                      <Input {...register("firstName")} placeholder="Ej. María Elena" className={errors.firstName ? "border-rose-300" : ""} />
                    </FormField>

                    <FormField label="Apellidos" error={errors.lastName?.message} required>
                      <Input {...register("lastName")} placeholder="Ej. García Ríos" className={errors.lastName ? "border-rose-300" : ""} />
                    </FormField>

                    <FormField label="Número de documento" error={errors.documentNumber?.message} required>
                      <Input {...register("documentNumber")} placeholder="Ej. 12345678" className={errors.documentNumber ? "border-rose-300" : ""} />
                    </FormField>

                    <FormField label="Fecha de nacimiento" error={errors.birthDate?.message}>
                      <Input type="date" {...register("birthDate")} className={errors.birthDate ? "border-rose-300" : ""} />
                    </FormField>

                    <FormField label="Teléfono" error={errors.phoneNumber?.message} required>
                      <Input {...register("phoneNumber")} placeholder="Ej. 999 888 777" className={errors.phoneNumber ? "border-rose-300" : ""} />
                    </FormField>
                  </div>

                  {/* ── S2: Contacto ── */}
                  <SectionTitle icon={Mail} label="Contacto" />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Correo personal" error={errors.personalEmail?.message} required>
                      <Input type="email" {...register("personalEmail")} placeholder="correo@personal.com" className={errors.personalEmail ? "border-rose-300" : ""} />
                    </FormField>

                    <FormField label="Correo corporativo" error={errors.workEmail?.message} required>
                      <Input type="email" {...register("workEmail")} placeholder="nombre@empresa.com" className={errors.workEmail ? "border-rose-300" : ""} />
                    </FormField>
                  </div>

                  {/* ── S3: Información laboral ── */}
                  <SectionTitle icon={Briefcase} label="Información laboral" />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Fecha de ingreso" error={errors.hireDate?.message} required>
                      <Input type="date" {...register("hireDate")} className={errors.hireDate ? "border-rose-300" : ""} />
                    </FormField>

                    {/* Sede + botón nueva sede */}
                    <FormField label="Sede" error={errors.branchId?.message} required>
                      <div className="flex gap-2">
                        <Select {...register("branchId")} className={errors.branchId ? "border-rose-300" : ""}>
                          <option value="">Seleccionar sede</option>
                          {catalogs?.branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </Select>
                        <AddBtn onClick={() => openMini("branch")} />
                      </div>
                    </FormField>

                    {/* Área + botón nueva área */}
                    <FormField label="Área" error={errors.areaId?.message} required>
                      <div className="flex gap-2">
                        <Select {...register("areaId")} className={errors.areaId ? "border-rose-300" : ""}>
                          <option value="">Seleccionar área</option>
                          {catalogs?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                        <AddBtn onClick={() => openMini("area")} />
                      </div>
                    </FormField>

                    {/* Cargo + botón nuevo cargo */}
                    <FormField label="Cargo" error={errors.positionId?.message} required>
                      <div className="flex gap-2">
                        <Select {...register("positionId")} className={errors.positionId ? "border-rose-300" : ""}>
                          <option value="">Seleccionar cargo</option>
                          {catalogs?.positions?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <AddBtn onClick={() => openMini("position")} />
                      </div>
                    </FormField>

                    <FormField label="Tipo de contrato" error={errors.contractTypeId?.message} required>
                      <Select {...register("contractTypeId")} className={errors.contractTypeId ? "border-rose-300" : ""}>
                        <option value="">Seleccionar contrato</option>
                        {catalogs?.contractTypes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    </FormField>

                    <FormField label="Jefe directo">
                      <Select {...register("managerId")}>
                        <option value="">Sin jefe asignado</option>
                        {catalogs?.managers?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </Select>
                    </FormField>

                    <FormField label="Sueldo base (S/.)" error={errors.baseSalary?.message} required>
                      <Input type="number" step="0.01" min="0" {...register("baseSalary")} placeholder="0.00" className={errors.baseSalary ? "border-rose-300" : ""} />
                    </FormField>
                  </div>

                </div>
              </form>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="emp-form"
                disabled={saving || loadingEmployee}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-6 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:from-brand-500 hover:to-brand-700 disabled:opacity-60 disabled:pointer-events-none"
              >
                {saving ? (
                  <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Guardando...</>
                ) : (
                  isEdit ? "Guardar cambios" : "Guardar empleado"
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export { ModalFormEmpleado as EmployeeFormModal };
