import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { downloadExcel, getAttendanceReport, getEmployeesReport, getLeavesReport, getPayrollReport, getVacationsReport } from "@/modules/reports/services/reportsApi";

export function ReportsPage(): JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [feedback, setFeedback] = useState<string | null>(null);

  const employeesQuery = useQuery({ queryKey: ["report-employees"], queryFn: getEmployeesReport });
  const attendanceQuery = useQuery({
    queryKey: ["report-attendance", year, month],
    queryFn: () => getAttendanceReport(Number(year), Number(month), { startDate: `${year}-${String(month).padStart(2, "0")}-01`, endDate: `${year}-${String(month).padStart(2, "0")}-31` }),
  });
  const vacationsQuery = useQuery({ queryKey: ["report-vacations", year], queryFn: () => getVacationsReport(Number(year)) });
  const leavesQuery = useQuery({ queryKey: ["report-leaves", year], queryFn: () => getLeavesReport(Number(year)) });
  const payrollQuery = useQuery({ queryKey: ["report-payroll", year, month], queryFn: () => getPayrollReport(Number(year), Number(month)) });

  const loading = employeesQuery.isLoading || attendanceQuery.isLoading || vacationsQuery.isLoading || leavesQuery.isLoading || payrollQuery.isLoading;
  const cards = useMemo(() => [
    { label: "Total empleados", value: employeesQuery.data?.totalEmployees ?? 0 },
    { label: "Asistencias", value: attendanceQuery.data?.totalRecords ?? 0 },
    { label: "Vacaciones", value: vacationsQuery.data?.totalRequests ?? 0 },
    { label: "Permisos", value: leavesQuery.data?.totalRequests ?? 0 },
    { label: "Registros planilla", value: payrollQuery.data?.recordsCount ?? 0 },
  ], [employeesQuery.data, attendanceQuery.data, vacationsQuery.data, leavesQuery.data, payrollQuery.data]);

  return (
    <section className="space-y-4">
      <PageHeader title="Reportes" description="Panel de reportes operativos" />
      {feedback && <Alert variant="info" message={feedback} onClose={() => setFeedback(null)} />}

      <div className="grid gap-2 md:grid-cols-4">
        <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Anio" />
        <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="Mes" />
        <Button variant="secondary" onClick={() => downloadExcel(`/api/v1/reports/payroll?year=${year}&month=${month}`, `planilla_${year}_${month}.xlsx`)}>Exportar planilla</Button>
        <Button variant="secondary" onClick={() => downloadExcel(`/api/v1/reports/attendance?year=${year}&month=${month}`, `asistencia_${year}_${month}.xlsx`)}>Exportar asistencia</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando reportes...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border bg-white p-3">
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

