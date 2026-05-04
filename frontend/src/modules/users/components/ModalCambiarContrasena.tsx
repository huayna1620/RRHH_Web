import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/forms/FormField";

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
};

export function ModalCambiarContrasena({ open, saving, onClose, onSubmit }: Props): JSX.Element {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  return (
    <Modal open={open} title="Cambiar contrasena" onClose={onClose}>
      <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); await onSubmit({ currentPassword, newPassword }); setCurrentPassword(""); setNewPassword(""); }}>
        <FormField label="Actual" required><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></FormField>
        <FormField label="Nueva" required><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || !currentPassword || !newPassword}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export { ModalCambiarContrasena as ChangePasswordModal };
