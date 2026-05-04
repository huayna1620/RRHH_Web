import { type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, TrendingUp, Calendar, Clock, FileText, CreditCard, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAnalyticsSummary } from "@/modules/analytics/services/analyticsApi";
import { Skeleton } from "@/components/ui/skeleton";

function MetricCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string;
  icon?: React.ElementType; accent?: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        {Icon && (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accent ?? "bg-brand-50 text-brand-600"}`}>
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-800">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function RowStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export function PaginaDashboard(): JSX.Element {
  const { data, isLoading } = useQuery({ queryKey: ["analytics-summary"], queryFn: getAnalyticsSummary });

  const fmt = (n: number | undefined): string =>
    n !== undefined ? n.toLocaleString("es-PE") : "—";

  const pct = (n: number | undefined): string =>
    n !== undefined ? `${(n * 100).toFixed(1)}%` : "—";

  const money = (n: number | undefined): string =>
    n !== undefined ? `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "—";

  if (isLoading) {
    return (
      <section className="space-y-6">
        <PageHeader title="Dashboard" description="Resumen general del sistema" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Dashboard" description="Resumen general del sistema RRHH" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Empleados totales" value={fmt(data?.totalEmployees)} icon={Users} accent="bg-brand-50 text-brand-600" />
        <MetricCard label="Empleados activos" value={fmt(data?.activeEmployees)} icon={UserCheck} accent="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Nuevos este mes" value={fmt(data?.newHiresThisMonth)} icon={TrendingUp} accent="bg-blue-50 text-blue-600" />
        <MetricCard label="Bajas este mes" value={fmt(data?.terminationsThisMonth)} icon={UserMinus} accent="bg-rose-50 text-rose-600" />
        <MetricCard label="Tasa asistencia" value={pct(data?.attendanceRate)} icon={Clock} accent="bg-amber-50 text-amber-600" sub={`Tardanzas: ${pct(data?.lateRate)}`} />
        <MetricCard label="Vacaciones pendientes" value={fmt(data?.pendingVacations)} icon={Calendar} accent="bg-violet-50 text-violet-600" />
        <MetricCard label="Permisos pendientes" value={fmt(data?.pendingLeaves)} icon={FileText} accent="bg-sky-50 text-sky-600" />
        <MetricCard label="Reclutamientos abiertos" value={fmt(data?.openRecruitments)} icon={Users} accent="bg-teal-50 text-teal-600" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-brand-500" />
              <CardTitle>Planilla</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            <RowStat label="Costo total" value={money(data?.totalPayrollCost)} />
            <RowStat label="Promedio por empleado" value={money(data?.averagePayrollCost)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-brand-500" />
              <CardTitle>Pendientes de aprobación</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            <RowStat label="Vacaciones por aprobar" value={fmt(data?.pendingVacations)} />
            <RowStat label="Permisos por aprobar" value={fmt(data?.pendingLeaves)} />
            <RowStat label="Documentos pendientes" value={fmt(data?.pendingDocuments)} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
