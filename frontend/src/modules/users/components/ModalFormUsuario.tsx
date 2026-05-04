import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/forms/FormField";
import type { UserItem } from "@/modules/users/types/user.types";

type FormValues = {
  userName: string;
  email: string;
  fullName: string;
  password: string;
  roleId: string;
};

type Props = {
  open: boolean;
  user: UserItem | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
};

const defaults: FormValues = { userName: "", email: "", fullName: "", password: "", roleId: "" };

export function ModalFormUsuario({ open, user, saving, onClose, onSubmit }: Props): JSX.Element {
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: defaults });

  useEffect(() => {
    if (!open) return;
    if (user) {
      reset({ userName: user.userName, email: user.email, fullName: user.fullName, password: "", roleId: user.roles?.[0] || "" });
    } else {
      reset(defaults);
    }
  }, [open, user, reset]);

  return (
    <Modal open={open} title={user ? "Editar usuario" : "Nuevo usuario"} onClose={onClose}>
      <form className="grid gap-3" onSubmit={handleSubmit(async (v) => onSubmit(v))}>
        <FormField label="Usuario" required><Input {...register("userName")} disabled={Boolean(user)} /></FormField>
        <FormField label="Nombre" required><Input {...register("fullName")} /></FormField>
        <FormField label="Correo" required><Input type="email" {...register("email")} /></FormField>
        {!user && <FormField label="Contrasena" required><Input type="password" {...register("password")} /></FormField>}
        <FormField label="Rol principal"><Select {...register("roleId")}><option value="">Sin rol</option><option value="admin">admin</option><option value="rrhh">rrhh</option></Select></FormField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export { ModalFormUsuario as UserFormModal };
