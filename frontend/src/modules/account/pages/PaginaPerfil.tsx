import { useEffect, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { getMyProfile, updateMyProfile } from "@/modules/account/services/accountApi";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { httpClient } from "@/services/api/httpClient";

export function PaginaPerfil(): JSX.Element {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [editing, setEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });

  useEffect(() => {
    if (profileQuery.data && !editing) setFullName(profileQuery.data.fullName);
  }, [profileQuery.data, editing]);

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const updateMutation = useMutation({
    mutationFn: () => updateMyProfile({ fullName }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      updateUser({ fullName: data.fullName });
      ok("Perfil actualizado.");
      setEditing(false);
    },
    onError: () => fail("No se pudo actualizar el perfil."),
  });

  const passwordMutation = useMutation({
    mutationFn: () => httpClient.post("/api/v1/auth/change-password", { currentPassword: oldPassword, newPassword }),
    onSuccess: () => { ok("Contraseña actualizada."); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); },
    onError: () => fail("No se pudo cambiar la contraseña."),
  });

  const profile = profileQuery.data;

  function handlePasswordSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (newPassword !== confirmPassword) { fail("Las contraseñas no coinciden."); return; }
    passwordMutation.mutate();
  }

  return (
    <section className="space-y-6 max-w-xl">
      <PageHeader title="Mi perfil" description="Información de tu cuenta" />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-700">Datos de la cuenta</h2>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">Usuario</label>
          <p className="text-sm text-slate-700">{profile?.userName ?? "—"}</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">Correo</label>
          <p className="text-sm text-slate-700">{profile?.email ?? "—"}</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">Nombre completo</label>
          {editing ? (
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          ) : (
            <p className="text-sm text-slate-700">{profile?.fullName ?? "—"}</p>
          )}
        </div>

        {profile?.employeeName && (
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Empleado vinculado</label>
            <p className="text-sm text-slate-700">{profile.employeeName} ({profile.employeeCode})</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-slate-500">Roles</label>
          <p className="text-sm text-slate-700">{profile?.roles?.join(", ") ?? "—"}</p>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>Guardar</Button>
              <Button variant="secondary" onClick={() => { setEditing(false); setFullName(profile?.fullName ?? ""); }}>Cancelar</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setEditing(true)}>Editar nombre</Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-700">Cambiar contraseña</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Contraseña actual</label>
            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <div>
            <label className="text-xs text-slate-500">Nueva contraseña</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <div>
            <label className="text-xs text-slate-500">Confirmar contraseña</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <Button type="submit" disabled={passwordMutation.isPending}>Cambiar contraseña</Button>
        </form>
      </div>
    </section>
  );
}
