import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/forms/FormField";
import type { EmployeeCatalogs, EmployeeDetail, EmployeePayload } from "@/modules/employees/types/employee.types";

const schema = z.object({
  employeeCode: z.string().min(2),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  documentType: z.string().min(2),
  documentNumber: z.string().min(5),
  hireDate: z.string().min(1),
  birthDate: z.string().optional(),
  baseSalary: z.coerce.number().min(0),
  personalEmail: z.string().email(),
  workEmail: z.string().email(),
  phoneNumber: z.string().min(6),
  branchId: z.string().min(1),
  areaId: z.string().min(1),
  positionId: z.string().min(1),
  contractTypeId: z.string().min(1),
  managerId: z.string().optional(),
});

type Values = z.infer<typeof schema>;

type Props = {
  open: boolean;
  mode: "create" | "edit";
  catalogs?: EmployeeCatalogs;
  employee: EmployeeDetail | null;
  loadingEmployee: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: EmployeePayload) => Promise<void>;
};

const defaults: Values = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  documentType: "DNI",
  documentNumber: "",
  hireDate: "",
  birthDate: "",
  baseSalary: 0,
  personalEmail: "",
  workEmail: "",
  phoneNumber: "",
  branchId: "",
  areaId: "",
  positionId: "",
  contractTypeId: "",
  managerId: "",
};

export function ModalFormEmpleado({ open, mode, catalogs, employee, loadingEmployee, saving, onClose, onSubmit }: Props): JSX.Element {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && employee) {
      reset({
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        documentType: employee.documentType,
        documentNumber: employee.documentNumber,
        hireDate: employee.hireDate,
        birthDate: employee.birthDate || "",
        baseSalary: employee.baseSalary,
        personalEmail: employee.personalEmail,
        workEmail: employee.workEmail,
        phoneNumber: employee.phoneNumber,
        branchId: employee.branchId,
        areaId: employee.areaId,
        positionId: employee.positionId,
        contractTypeId: employee.contractTypeId,
        managerId: employee.managerId || "",
      });
    } else {
      reset(defaults);
    }
  }, [open, mode, employee, reset]);

  const submit = handleSubmit(async (v) => {
    await onSubmit({
      employeeCode: v.employeeCode.trim(),
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      documentType: v.documentType,
      documentNumber: v.documentNumber.trim(),
      birthDate: v.birthDate || "2000-01-01",
      hireDate: v.hireDate,
      baseSalary: Number(v.baseSalary || 0),
      personalEmail: v.personalEmail.trim(),
      workEmail: v.workEmail.trim(),
      phoneNumber: v.phoneNumber.trim(),
      profilePhotoUrl: "",
      notes: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      contractEndDate: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountCci: "",
      bankAccountType: "",
      bankCurrency: "PEN",
      branchId: v.branchId,
      areaId: v.areaId,
      positionId: v.positionId,
      contractTypeId: v.contractTypeId,
      managerId: v.managerId || "",
    });
  });

  return (
    <Modal open={open} title={mode === "create" ? "Nuevo empleado" : "Editar empleado"} onClose={onClose}>
      {loadingEmployee ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <FormField label="Codigo" error={errors.employeeCode?.message} required><Input {...register("employeeCode")} /></FormField>
          <FormField label="Tipo documento" error={errors.documentType?.message} required>
            <Select {...register("documentType")}><option value="DNI">DNI</option><option value="CE">CE</option></Select>
          </FormField>
          <FormField label="Nombres" error={errors.firstName?.message} required><Input {...register("firstName")} /></FormField>
          <FormField label="Apellidos" error={errors.lastName?.message} required><Input {...register("lastName")} /></FormField>
          <FormField label="Documento" error={errors.documentNumber?.message} required><Input {...register("documentNumber")} /></FormField>
          <FormField label="Telefono" error={errors.phoneNumber?.message} required><Input {...register("phoneNumber")} /></FormField>
          <FormField label="Correo personal" error={errors.personalEmail?.message} required><Input type="email" {...register("personalEmail")} /></FormField>
          <FormField label="Correo corporativo" error={errors.workEmail?.message} required><Input type="email" {...register("workEmail")} /></FormField>
          <FormField label="Fecha ingreso" error={errors.hireDate?.message} required><Input type="date" {...register("hireDate")} /></FormField>
          <FormField label="Fecha nacimiento"><Input type="date" {...register("birthDate")} /></FormField>
          <FormField label="Sueldo" error={errors.baseSalary?.message} required><Input type="number" step="0.01" {...register("baseSalary")} /></FormField>
          <FormField label="Area" error={errors.areaId?.message} required>
            <Select {...register("areaId")}><option value="">Seleccionar</option>{catalogs?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </FormField>
          <FormField label="Cargo" error={errors.positionId?.message} required>
            <Select {...register("positionId")}><option value="">Seleccionar</option>{catalogs?.positions?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </FormField>
          <FormField label="Sede" error={errors.branchId?.message} required>
            <Select {...register("branchId")}><option value="">Seleccionar</option>{catalogs?.branches?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </FormField>
          <FormField label="Contrato" error={errors.contractTypeId?.message} required>
            <Select {...register("contractTypeId")}><option value="">Seleccionar</option>{catalogs?.contractTypes?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </FormField>
          <FormField label="Jefe">
            <Select {...register("managerId")}><option value="">Sin jefe</option>{catalogs?.managers?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </FormField>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export { ModalFormEmpleado as EmployeeFormModal };
