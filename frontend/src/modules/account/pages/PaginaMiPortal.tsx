import { type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { getEmployeeDashboard } from "@/modules/account/services/accountApi";

export function PaginaMiPortal(): JSX.Element {
  const { data, isLoading } = useQuery({ queryKey: ["employee-dashboard"], queryFn: getEmployeeDashboard });

  if (isLoading) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;

  if (!data) {
    return (
      <section className="space-y-4">
        <PageHeader title="Mi portal" description="Portal del empleado" />
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500 text-sm">
          No tienes un perfil de empleado asociado a tu cuenta.
        </div>
      </section>
    );
  }

  const fmt = (n: number): string => n.toLocaleString("es-PE");
  const fmtMoney = (n: number | null): string => n != null ? `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "—";

  return (
    <section className="space-y-6">
      <PageHeader title="Mi portal" description="Resumen de tu situación laboral" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 space-y-1 col-span-full lg:col-span-1">
          <p className="font-bold text-lg text-slate-800">{data.fullName}</p>
          <p className="text-sm text-slate-500">{data.positionName}</p>
          <p className="text-sm text-slate-400">{data.areaName}</p>
          <p className="text-xs text-slate-400">Código: {data.employeeCode}</p>
          <p className="text-xs text-slate-400">Ingreso: {data.hireDate}</p>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h2 className="font-semibold text-slate-700">Asistencia</h2>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Presentes</span><span className="font-medium text-green-600">{fmt(data.attendanceDaysPresent)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Ausentes</span><span className="font-medium text-red-500">{fmt(data.attendanceDaysAbsent)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Tardanzas</span><span className="font-medium text-yellow-600">{fmt(data.attendanceDaysLate)}</span></div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h2 className="font-semibold text-slate-700">Vacaciones</h2>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Disponibles</span><span className="font-medium">{fmt(data.vacationDaysAvailable)} días</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Usados</span><span className="font-medium">{fmt(data.vacationDaysUsed)} días</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Pendientes</span><span className="font-medium">{fmt(data.vacationDaysPending)} días</span></div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h2 className="font-semibold text-slate-700">Permisos</h2>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span>{fmt(data.leaveRequestsTotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Aprobados</span><span className="text-green-600">{fmt(data.leaveRequestsApproved)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Pendientes</span><span className="text-yellow-600">{fmt(data.leaveRequestsPending)}</span></div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2">
          <h2 className="font-semibold text-slate-700">Último pago</h2>
          {data.lastNetPay != null ? (
            <>
              <p className="text-2xl font-bold text-slate-800">{fmtMoney(data.lastNetPay)}</p>
              <p className="text-xs text-slate-400">{data.lastPayrollYear}/{String(data.lastPayrollMonth).padStart(2, "0")}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Sin registros</p>
          )}
        </div>

        {data.upcomingEvents.length > 0 && (
          <div className="rounded-lg border bg-white p-4 space-y-2 col-span-full lg:col-span-1">
            <h2 className="font-semibold text-slate-700">Próximos eventos</h2>
            {data.upcomingEvents.map((ev, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-500">{ev.title}</span>
                <span className="text-slate-400">{ev.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
