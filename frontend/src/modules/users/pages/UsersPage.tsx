import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { ModalFormUsuario } from "@/modules/users/components/ModalFormUsuario";
import { ModalCambiarContrasena } from "@/modules/users/components/ModalCambiarContrasena";
import { changePassword, createUser, getUsers, updateUser, updateUserStatus } from "@/modules/users/services/usersApi";
import type { UserItem } from "@/modules/users/types/user.types";

type ModalState = { mode: "create" } | { mode: "edit"; user: UserItem } | null;

export function UsersPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => { await refresh(); setModalState(null); setFeedback({ type: "success", message: "Usuario creado." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo crear usuario." }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { fullName: string; email: string; roleIds: string[]; employeeId: string | null } }) => updateUser(id, payload),
    onSuccess: async () => { await refresh(); setModalState(null); setFeedback({ type: "success", message: "Usuario actualizado." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar usuario." }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateUserStatus(id, active),
    onSuccess: async () => { await refresh(); setFeedback({ type: "success", message: "Estado actualizado." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo actualizar estado." }),
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { setPasswordOpen(false); setFeedback({ type: "success", message: "Contrasena cambiada." }); },
    onError: () => setFeedback({ type: "error", message: "No se pudo cambiar contrasena." }),
  });

  const rows = usersQuery.data ?? [];
  const currentUser = modalState && modalState.mode === "edit" ? modalState.user : null;

  return (
    <section className="space-y-4">
      <PageHeader title="Usuarios" description="Gestion de usuarios" action={<Button onClick={() => setModalState({ mode: "create" })}><Plus className="size-4" /> Nuevo usuario</Button>} />
      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">Usuario</th><th className="px-3 py-2">Correo</th><th className="px-3 py-2">Roles</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2"><div className="font-semibold">{u.fullName}</div><div className="text-xs text-slate-500">{u.userName}</div></td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.roles.join(", ") || "-"}</td>
                <td className="px-3 py-2">{u.isActive ? "Activo" : "Inactivo"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setModalState({ mode: "edit", user: u })}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="secondary" onClick={() => setPasswordOpen(true)}><KeyRound className="size-4" /></Button>
                    <Button size="sm" variant={u.isActive ? "danger" : "primary"} onClick={() => statusMutation.mutate({ id: u.id, active: !u.isActive })}>{u.isActive ? "Desactivar" : "Activar"}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Sin usuarios</td></tr>}
          </tbody>
        </table>
      </div>

      <ModalFormUsuario
        open={Boolean(modalState)}
        user={currentUser}
        saving={createMutation.isPending || updateMutation.isPending}
        onClose={() => setModalState(null)}
        onSubmit={async (v) => {
          if (modalState?.mode === "edit" && currentUser) {
            await updateMutation.mutateAsync({ id: currentUser.id, payload: { fullName: v.fullName, email: v.email, roleIds: v.roleId ? [v.roleId] : [], employeeId: null } });
          } else {
            await createMutation.mutateAsync({ userName: v.userName, email: v.email, fullName: v.fullName, password: v.password, roleIds: v.roleId ? [v.roleId] : [] });
          }
        }}
      />

      <ModalCambiarContrasena open={passwordOpen} saving={passwordMutation.isPending} onClose={() => setPasswordOpen(false)} onSubmit={async (p) => passwordMutation.mutateAsync(p)} />
    </section>
  );
}

