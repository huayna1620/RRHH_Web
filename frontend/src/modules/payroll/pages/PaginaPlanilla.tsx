import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  approvePayroll,
  downloadBulkPayslips,
  downloadPayslip,
  generatePayroll,
  getPayroll,
  getPayrollCatalogs,
  markPayrollPaid,
  updatePayrollAdjustments,
} from "@/modules/payroll/services/payrollApi";
import type { PayrollItem } from "@/modules/payroll/types/payroll.types";

const pageSize = 10;

const statusLabels: Record<string, string> = { draft: "Borrador", approved: "Aprobado", paid: "Pagado" };
type BadgeVariant = "success" | "danger" | "neutral" | "warning" | "info";
const payrollStatusVariants: Record<string, BadgeVariant> = { draft: "neutral", approved: "info", paid: "success" };

export function PaginaPlanilla(): JSX.Element {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<PayrollItem | null>(null);

  const [genEmployeeId, setGenEmployeeId] = useState("");
  const [genForce, setGenForce] = useState(false);
  const [adjBonuses, setAdjBonuses] = useState("0");
  const [adjDeductions, setAdjDeductions] = useState("0");
  const [adjNotes, setAdjNotes] = useState("");

  const query = { search, employeeId: "", areaId, year, month, startDate: "", endDate: "", pageNumber, pageSize };
  const catalogsQuery = useQuery({ queryKey: ["payroll-catalogs"], queryFn: getPayrollCatalogs });
  const listQuery = useQuery({ queryKey: ["payroll", query], queryFn: () => getPayroll(query) });

  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["payroll"] });
  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const generateMutation = useMutation({
    mutationFn: generatePayroll,
    onSuccess: async (res) => { await refresh(); ok(`Generados: ${res.generatedCount}, actualizados: ${res.updatedCount}.`); setGenerateOpen(false); },
    onError: () => fail("No se pudo generar la planilla."),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { bonuses: number; deductions: number; notes: string } }) => updatePayrollAdjustments(id, payload),
    onSuccess: async () => { await refresh(); ok("Ajuste guardado."); setAdjustOpen(false); },
    onError: () => fail("No se pudo guardar el ajuste."),
  });

  const approveMutation = useMutation({
    mutationFn: () => approvePayroll(year, month),
    onSuccess: async (res) => { await refresh(); ok(`${res.approvedCount} registros aprobados.`); },
    onError: () => fail("No se pudo aprobar la planilla."),
  });

  const paidMutation = useMutation({
    mutationFn: () => markPayrollPaid(year, month),
    onSuccess: async (res) => { await refresh(); ok(`${res.paidCount} registros marcados como pagados.`); },
    onError: () => fail("No se pudo marcar como pagado."),
  });

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  function handleDownloadPayslip(id: string): void {
    downloadPayslip(id).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `boleta_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => fail("No se pudo descargar la boleta."));
  }

  function handleBulkDownload(): void {
    downloadBulkPayslips(year, month).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `boletas_${year}_${month}.zip`; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => fail("No se pudo descargar."));
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Planilla" description="Gestión de nómina mensual" action={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleBulkDownload}>Descargar boletas</Button>
          <Button onClick={() => setGenerateOpen(true)}>Generar planilla</Button>
        </div>
      } />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-5">
        <Input type="number" value={year} onChange={(e) => { setYear(Number(e.target.value)); setPageNumber(1); }} placeholder="Año" />
        <Select value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPageNumber(1); }}>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("es-PE", { month: "long" })}</option>)}
        </Select>
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} placeholder="Buscar" />
        <Select value={areaId} onChange={(e) => { setAreaId(e.target.value); setPageNumber(1); }}>
          <option value="">Todas las áreas</option>
          {catalogsQuery.data?.areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <div className="text-sm text-slate-500 self-center">{total} registros</div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>Aprobar todos</Button>
        <Button variant="secondary" disabled={paidMutation.isPending} onClick={() => paidMutation.mutate()}>Marcar pagados</Button>
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Salario base</th>
              <th className="px-3 py-2">Bonificaciones</th>
              <th className="px-3 py-2">Descuentos</th>
              <th className="px-3 py-2">Neto</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-semibold">{r.employeeName}</div>
                  <div className="text-xs text-slate-500">{r.employeeCode} · {r.area}</div>
                </td>
                <td className="px-3 py-2">S/ {r.baseSalary.toLocaleString("es-PE")}</td>
                <td className="px-3 py-2">S/ {r.bonuses.toLocaleString("es-PE")}</td>
                <td className="px-3 py-2">S/ {r.deductions.toLocaleString("es-PE")}</td>
                <td className="px-3 py-2 font-semibold">S/ {r.netPay.toLocaleString("es-PE")}</td>
                <td className="px-3 py-2">
                  <Badge variant={payrollStatusVariants[r.status] ?? "neutral"}>
                    {statusLabels[r.status] ?? r.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 flex gap-1 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => handleDownloadPayslip(r.id)}>Boleta</Button>
                  {r.status === "draft" && (
                    <Button size="sm" onClick={() => { setSelected(r); setAdjBonuses(String(r.bonuses)); setAdjDeductions(String(r.deductions)); setAdjNotes(r.notes ?? ""); setAdjustOpen(true); }}>Ajustar</Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Página {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>

      <Modal open={generateOpen} title="Generar planilla" onClose={() => setGenerateOpen(false)}>
        <div className="space-y-3">
          <Select value={genEmployeeId} onChange={(e) => setGenEmployeeId(e.target.value)}>
            <option value="">Todos los empleados</option>
            {catalogsQuery.data?.employees?.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={genForce} onChange={(e) => setGenForce(e.target.checked)} />
            Forzar recalculo
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            <Button
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate({ year, month, employeeId: genEmployeeId, forceRecalculate: genForce })}
            >
              Generar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={adjustOpen} title="Ajustar planilla" onClose={() => setAdjustOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600 font-semibold">{selected?.employeeName}</p>
          <div>
            <label className="text-xs text-slate-500">Bonificaciones manuales</label>
            <Input type="number" value={adjBonuses} onChange={(e) => setAdjBonuses(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Descuentos manuales</label>
            <Input type="number" value={adjDeductions} onChange={(e) => setAdjDeductions(e.target.value)} />
          </div>
          <Textarea value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Notas" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button
              disabled={adjustMutation.isPending}
              onClick={() => selected && adjustMutation.mutate({ id: selected.id, payload: { bonuses: Number(adjBonuses), deductions: Number(adjDeductions), notes: adjNotes } })}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
