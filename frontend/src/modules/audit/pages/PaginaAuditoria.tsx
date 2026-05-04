import { useMemo, useState, type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getAuditLogs } from "@/modules/audit/services/auditApi";

const pageSize = 20;

export function PaginaAuditoria(): JSX.Element {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  const query = { search, module, action, userId: "", from, to, pageNumber, pageSize };
  const listQuery = useQuery({ queryKey: ["audit-logs", query], queryFn: () => getAuditLogs(query) });

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <section className="space-y-4">
      <PageHeader title="Auditoría" description="Registro de actividad del sistema" />

      <div className="grid gap-2 md:grid-cols-5">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} placeholder="Buscar" />
        <Input value={module} onChange={(e) => { setModule(e.target.value); setPageNumber(1); }} placeholder="Módulo" />
        <Input value={action} onChange={(e) => { setAction(e.target.value); setPageNumber(1); }} placeholder="Acción" />
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPageNumber(1); }} />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPageNumber(1); }} />
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Módulo</th>
              <th className="px-3 py-2">Acción</th>
              <th className="px-3 py-2">Entidad</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(r.timestamp).toLocaleString("es-PE")}</td>
                <td className="px-3 py-2">{r.userName}</td>
                <td className="px-3 py-2">{r.module}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">{r.action}</span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{r.entityType} #{r.entityId.slice(0, 8)}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.ipAddress ?? "—"}</td>
                <td className="px-3 py-2 max-w-xs truncate text-xs text-slate-500">{r.details ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Página {pageNumber} de {totalPages} · {total} registros</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>
    </section>
  );
}
