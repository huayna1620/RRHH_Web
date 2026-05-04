import { type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import {
  getAnalyticsSummary,
  getAreaDistribution,
  getAttendanceTrend,
  getHeadcountTrend,
  getLaborCostTrend,
  getTurnoverRisk,
} from "@/modules/analytics/services/analyticsApi";

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }): JSX.Element {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-1">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function PaginaAnalitica(): JSX.Element {
  const summary = useQuery({ queryKey: ["analytics-summary"], queryFn: getAnalyticsSummary });
  const headcount = useQuery({ queryKey: ["headcount-trend"], queryFn: () => getHeadcountTrend(12) });
  const laborCost = useQuery({ queryKey: ["labor-cost-trend"], queryFn: () => getLaborCostTrend(12) });
  const attendance = useQuery({ queryKey: ["attendance-trend"], queryFn: () => getAttendanceTrend(12) });
  const areas = useQuery({ queryKey: ["area-distribution"], queryFn: getAreaDistribution });
  const risk = useQuery({ queryKey: ["turnover-risk"], queryFn: () => getTurnoverRisk(10) });

  const pct = (n: number | undefined): string => n !== undefined ? `${(n * 100).toFixed(1)}%` : "—";
  const fmt = (n: number | undefined): string => n !== undefined ? n.toLocaleString("es-PE") : "—";

  return (
    <section className="space-y-6">
      <PageHeader title="Analítica" description="Métricas y tendencias del capital humano" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Empleados activos" value={fmt(summary.data?.activeEmployees)} />
        <Card label="Nuevos este mes" value={fmt(summary.data?.newHiresThisMonth)} />
        <Card label="Tasa asistencia" value={pct(summary.data?.attendanceRate)} sub={`Tardanzas: ${pct(summary.data?.lateRate)}`} />
        <Card label="Costo total planilla" value={`S/ ${fmt(summary.data?.totalPayrollCost)}`} sub={`Promedio: S/ ${fmt(summary.data?.averagePayrollCost)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Tendencia de headcount</h2>
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50"><tr><th className="px-2 py-1 text-left">Mes</th><th className="px-2 py-1 text-right">Activos</th><th className="px-2 py-1 text-right">Ingresos</th><th className="px-2 py-1 text-right">Bajas</th></tr></thead>
              <tbody>
                {(headcount.data ?? []).map((r) => (
                  <tr key={`${r.year}-${r.month}`} className="border-t">
                    <td className="px-2 py-1">{r.label}</td>
                    <td className="px-2 py-1 text-right">{r.activeCount}</td>
                    <td className="px-2 py-1 text-right text-green-600">+{r.hiresCount}</td>
                    <td className="px-2 py-1 text-right text-red-500">-{r.terminationsCount}</td>
                  </tr>
                ))}
                {(headcount.data ?? []).length === 0 && <tr><td className="px-2 py-4 text-center text-slate-400" colSpan={4}>Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Tendencia de costo laboral</h2>
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50"><tr><th className="px-2 py-1 text-left">Mes</th><th className="px-2 py-1 text-right">Costo total</th><th className="px-2 py-1 text-right">Promedio</th></tr></thead>
              <tbody>
                {(laborCost.data ?? []).map((r) => (
                  <tr key={`${r.year}-${r.month}`} className="border-t">
                    <td className="px-2 py-1">{r.label}</td>
                    <td className="px-2 py-1 text-right">S/ {r.totalCost.toLocaleString("es-PE")}</td>
                    <td className="px-2 py-1 text-right">S/ {r.averageCost.toLocaleString("es-PE")}</td>
                  </tr>
                ))}
                {(laborCost.data ?? []).length === 0 && <tr><td className="px-2 py-4 text-center text-slate-400" colSpan={3}>Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Distribución por área</h2>
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50"><tr><th className="px-2 py-1 text-left">Área</th><th className="px-2 py-1 text-right">Empleados</th><th className="px-2 py-1 text-right">Salario prom.</th><th className="px-2 py-1 text-right">Costo total</th></tr></thead>
              <tbody>
                {(areas.data ?? []).map((r) => (
                  <tr key={r.areaName} className="border-t">
                    <td className="px-2 py-1">{r.areaName}</td>
                    <td className="px-2 py-1 text-right">{r.employeeCount}</td>
                    <td className="px-2 py-1 text-right">S/ {r.averageSalary.toLocaleString("es-PE")}</td>
                    <td className="px-2 py-1 text-right">S/ {r.totalCost.toLocaleString("es-PE")}</td>
                  </tr>
                ))}
                {(areas.data ?? []).length === 0 && <tr><td className="px-2 py-4 text-center text-slate-400" colSpan={4}>Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Riesgo de rotación</h2>
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50"><tr><th className="px-2 py-1 text-left">Empleado</th><th className="px-2 py-1 text-right">Score</th><th className="px-2 py-1 text-center">Nivel</th></tr></thead>
              <tbody>
                {(risk.data ?? []).map((r) => (
                  <tr key={r.employeeId} className="border-t">
                    <td className="px-2 py-1"><div>{r.employeeName}</div><div className="text-slate-400">{r.areaName}</div></td>
                    <td className="px-2 py-1 text-right">{r.riskScore.toFixed(1)}</td>
                    <td className="px-2 py-1 text-center">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${r.riskLevel === "high" ? "bg-red-100 text-red-700" : r.riskLevel === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        {r.riskLevel === "high" ? "Alto" : r.riskLevel === "medium" ? "Medio" : "Bajo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(risk.data ?? []).length === 0 && <tr><td className="px-2 py-4 text-center text-slate-400" colSpan={3}>Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-slate-700">Tendencia de asistencia</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr><th className="px-2 py-1 text-left">Mes</th><th className="px-2 py-1 text-right">Total</th><th className="px-2 py-1 text-right">Presentes</th><th className="px-2 py-1 text-right">Ausentes</th><th className="px-2 py-1 text-right">Tardanzas</th><th className="px-2 py-1 text-right">% Asist.</th></tr>
            </thead>
            <tbody>
              {(attendance.data ?? []).map((r) => (
                <tr key={`${r.year}-${r.month}`} className="border-t">
                  <td className="px-2 py-1">{r.label}</td>
                  <td className="px-2 py-1 text-right">{r.totalRecords}</td>
                  <td className="px-2 py-1 text-right text-green-600">{r.presentCount}</td>
                  <td className="px-2 py-1 text-right text-red-500">{r.absentCount}</td>
                  <td className="px-2 py-1 text-right text-yellow-600">{r.lateCount}</td>
                  <td className="px-2 py-1 text-right font-medium">{(r.attendancePercent * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {(attendance.data ?? []).length === 0 && <tr><td className="px-2 py-4 text-center text-slate-400" colSpan={6}>Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
