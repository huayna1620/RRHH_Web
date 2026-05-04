import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { ModalPermisosRol } from "@/modules/roles/components/ModalPermisosRol";
import { createRole, getRoles } from "@/modules/roles/services/rolesApi";

export function PaginaRoles(): JSX.Element {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: getRoles });
  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      setCreateOpen(false);
      setName("");
      setDescription("");
      setFeedback({ type: "success", message: "Rol creado." });
    },
    onError: () => setFeedback({ type: "error", message: "No se pudo crear rol." }),
  });

  const rows = rolesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <PageHeader title="Roles" description="Gestion de roles y permisos" action={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Nuevo rol</Button>} />
      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Nombre</th><th className="px-3 py-2 text-left">Descripcion</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-left">Acciones</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2">{r.description || "-"}</td>
                <td className="px-3 py-2">{r.isActive ? "Activo" : "Inactivo"}</td>
                <td className="px-3 py-2"><Button size="sm" variant="secondary" onClick={() => setPermissionsRoleId(r.id)}><LockKeyhole className="size-4" /> Permisos</Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Sin roles</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} title="Nuevo rol" onClose={() => setCreateOpen(false)}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await createMutation.mutateAsync({ name, description }); }}>
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Descripcion" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button type="submit" disabled={createMutation.isPending || !name}>{createMutation.isPending ? "Guardando..." : "Guardar"}</Button></div>
        </form>
      </Modal>

      <ModalPermisosRol open={Boolean(permissionsRoleId)} roleId={permissionsRoleId} onClose={() => setPermissionsRoleId(null)} onSaved={() => setFeedback({ type: "success", message: "Permisos actualizados." })} />
    </section>
  );
}
