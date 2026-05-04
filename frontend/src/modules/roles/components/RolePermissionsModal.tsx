import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getPermissions, getRolePermissionIds, updateRolePermissions } from "@/modules/roles/services/rolesApi";

type Props = {
  open: boolean;
  roleId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ModalPermisosRol({ open, roleId, onClose, onSaved }: Props): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Array<{ id: string; code: string; name: string; module: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !roleId) return;
    setLoading(true);
    Promise.all([getPermissions(), getRolePermissionIds(roleId)])
      .then(([perms, ids]) => {
        setPermissions(perms);
        setSelected(new Set(ids));
      })
      .finally(() => setLoading(false));
  }, [open, roleId]);

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Modal open={open} title="Permisos del rol" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[50vh] overflow-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Permiso</th><th className="px-3 py-2 text-left">Modulo</th><th className="px-3 py-2">Activo</th></tr></thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2"><div className="font-medium">{p.name}</div><div className="text-xs text-slate-500">{p.code}</div></td>
                    <td className="px-3 py-2">{p.module}</td>
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={!roleId || saving}
              onClick={async () => {
                if (!roleId) return;
                setSaving(true);
                try {
                  await updateRolePermissions(roleId, Array.from(selected));
                  onSaved();
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export { ModalPermisosRol as RolePermissionsModal };
