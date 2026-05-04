import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { cancelPayrollLoan, createPayrollLoan, getPayrollLoans } from "@/modules/payroll/services/payrollLoansApi";
import { getPayrollCatalogs } from "@/modules/payroll/services/payrollApi";
import type { PayrollLoan } from "@/modules/payroll/types/payroll.types";

const pageSize = 10;

export function PaginaPrestamos(): JSX.Element {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PayrollLoan | null>(null);

  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newLoanType, setNewLoanType] = useState<"loan" | "advance">("loan");
  const [newAmount, setNewAmount] = useState("");
  const [newInstallments, setNewInstallments] = useState("12");
  const [newStartDate, setNewStartDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const params = { employeeId, activeOnly, pageNumber, pageSize };
  const catalogsQuery = useQuery({ queryKey: ["payroll-catalogs"], queryFn: getPayrollCatalogs });
  const listQuery = useQuery({ queryKey: ["payroll-loans", params], queryFn: () => getPayrollLoans(params) });

  const refresh = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });
  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const createMutation = useMutation({
    mutationFn: createPayrollLoan,
    onSuccess: async () => {
      await refresh(); ok("Préstamo creado.");
      setCreateOpen(false); setNewEmployeeId(""); setNewAmount(""); setNewInstallments("12"); setNewStartDate(""); setNewNotes("");
    },
    onError: () => fail("No se pudo crear el préstamo."),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelPayrollLoan(id),
    onSuccess: async () => { await refresh(); ok("Préstamo cancelado."); },
    onError: () => fail("No se pudo cancelar."),
  });

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <section className="space-y-4">
      <PageHeader title="Préstamos" description="Gestión de préstamos y adelantos de planilla" action={<Button onClick={() => setCreateOpen(true)}>Nuevo préstamo</Button>} />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-3">
        <Select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPageNumber(1); }}>
          <option value="">Todos los empleados</option>
          {catalogsQuery.data?.employees?.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm self-center">
          <input type="checkbox" checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setPageNumber(1); }} />
          Solo activos
        </label>
        <div className="text-sm text-slate-500 self-center">{total} registros</div>
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Monto total</th>
              <th className="px-3 py-2">Cuota mensual</th>
              <th className="px-3 py-2">Pagadas</th>
              <th className="px-3 py-2">Pendientes</th>
              <th className="px-3 py-2">Saldo</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-semibold">{r.employeeName}</div>
                  <div className="text-xs text-slate-500">{r.employeeCode}</div>
                </td>
                <td className="px-3 py-2 capitalize">{r.loanType === "loan" ? "Préstamo" : "Adelanto"}</td>
                <td className="px-3 py-2">S/ {r.totalAmount.toLocaleString("es-PE")}</td>
                <td className="px-3 py-2">S/ {r.monthlyInstallment.toLocaleString("es-PE")}</td>
                <td className="px-3 py-2">{r.paidInstallments}</td>
                <td className="px-3 py-2">{r.remainingInstallments}</td>
                <td className="px-3 py-2">S/ {r.remainingAmount.toLocaleString("es-PE")}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {r.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-3 py-2 flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setDetailItem(r)}>Detalle</Button>
                  {r.isActive && <Button size="sm" variant="danger" onClick={() => cancelMutation.mutate(r.id)}>Cancelar</Button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={9}>Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-slate-600">Página {pageNumber} de {totalPages}</span>
        <Button variant="secondary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
      </div>

      <Modal open={createOpen} title="Nuevo préstamo" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <Select value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)}>
            <option value="">Seleccionar empleado</option>
            {catalogsQuery.data?.employees?.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </Select>
          <Select value={newLoanType} onChange={(e) => setNewLoanType(e.target.value as "loan" | "advance")}>
            <option value="loan">Préstamo</option>
            <option value="advance">Adelanto</option>
          </Select>
          <div><label className="text-xs text-slate-500">Monto total</label><Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} /></div>
          <div><label className="text-xs text-slate-500">Número de cuotas</label><Input type="number" value={newInstallments} onChange={(e) => setNewInstallments(e.target.value)} /></div>
          <div><label className="text-xs text-slate-500">Inicio de descuento</label><Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} /></div>
          <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notas" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              disabled={!newEmployeeId || !newAmount || !newStartDate || createMutation.isPending}
              onClick={() => createMutation.mutate({ employeeId: newEmployeeId, loanType: newLoanType, totalAmount: Number(newAmount), totalInstallments: Number(newInstallments), startDate: newStartDate, notes: newNotes })}
            >
              Crear
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailItem} title="Cuotas del préstamo" onClose={() => setDetailItem(null)}>
        <div className="space-y-2 max-h-96 overflow-auto">
          {detailItem?.installments?.map((inst) => (
            <div key={inst.id} className="flex justify-between text-sm border-b py-1">
              <span>Cuota {inst.installmentNumber} — {inst.year}/{String(inst.month).padStart(2, "0")}</span>
              <span>S/ {inst.amount.toLocaleString("es-PE")}</span>
              <span className={inst.isPaid ? "text-green-600" : "text-slate-400"}>{inst.isPaid ? "Pagado" : "Pendiente"}</span>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
}
