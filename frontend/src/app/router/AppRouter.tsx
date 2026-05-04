import { Component, Suspense, lazy, useEffect, type JSX, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout, PlaceholderModule, RootRedirect } from "@/app/layouts/AppLayout";
import { RutaProtegida } from "@/modules/auth/components/RutaProtegida";
import { PaginaLogin } from "@/modules/auth/pages/PaginaLogin";

class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-700">Error al cargar el módulo</p>
          <p className="mt-1 text-sm text-rose-500">{this.state.error.message}</p>
          <button className="mt-3 text-sm text-brand-600 underline" onClick={() => this.setState({ error: null })}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PaginaDashboard = lazy(() => import("@/modules/dashboard/pages/PaginaDashboard").then((m) => ({ default: m.PaginaDashboard })));
const PaginaEmpleados = lazy(() => import("@/modules/employees/pages/PaginaEmpleados").then((m) => ({ default: m.PaginaEmpleados })));
const PaginaEstructuraOrg = lazy(() => import("@/modules/org-structure/pages/PaginaEstructuraOrg").then((m) => ({ default: m.PaginaEstructuraOrg })));
const PaginaAsistencia = lazy(() => import("@/modules/attendance/pages/PaginaAsistencia").then((m) => ({ default: m.PaginaAsistencia })));
const PaginaVacaciones = lazy(() => import("@/modules/vacations/pages/PaginaVacaciones").then((m) => ({ default: m.PaginaVacaciones })));
const PaginaPermisos = lazy(() => import("@/modules/leaves/pages/PaginaPermisos").then((m) => ({ default: m.PaginaPermisos })));
const PaginaPlanilla = lazy(() => import("@/modules/payroll/pages/PaginaPlanilla").then((m) => ({ default: m.PaginaPlanilla })));
const PaginaConceptosPlanilla = lazy(() => import("@/modules/payroll/pages/PaginaConceptosPlanilla").then((m) => ({ default: m.PaginaConceptosPlanilla })));
const PaginaPrestamos = lazy(() => import("@/modules/payroll/pages/PaginaPrestamos").then((m) => ({ default: m.PaginaPrestamos })));
const PaginaReclutamiento = lazy(() => import("@/modules/recruitment/pages/PaginaReclutamiento").then((m) => ({ default: m.PaginaReclutamiento })));
const PaginaConvocatorias = lazy(() => import("@/modules/recruitment/pages/PaginaConvocatorias").then((m) => ({ default: m.PaginaConvocatorias })));
const PaginaReportes = lazy(() => import("@/modules/reports/pages/PaginaReportes").then((m) => ({ default: m.PaginaReportes })));
const PaginaConfiguracion = lazy(() => import("@/modules/configuration/pages/PaginaConfiguracion").then((m) => ({ default: m.PaginaConfiguracion })));
const PaginaUsuarios = lazy(() => import("@/modules/users/pages/PaginaUsuarios").then((m) => ({ default: m.PaginaUsuarios })));
const PaginaRoles = lazy(() => import("@/modules/roles/pages/PaginaRoles").then((m) => ({ default: m.PaginaRoles })));
const PaginaAuditoria = lazy(() => import("@/modules/audit/pages/PaginaAuditoria").then((m) => ({ default: m.PaginaAuditoria })));
const PaginaFeriados = lazy(() => import("@/modules/holidays/pages/PaginaFeriados").then((m) => ({ default: m.PaginaFeriados })));
const PaginaIncidencias = lazy(() => import("@/modules/incidents/pages/PaginaIncidencias").then((m) => ({ default: m.PaginaIncidencias })));
const PaginaPerfil = lazy(() => import("@/modules/account/pages/PaginaPerfil").then((m) => ({ default: m.PaginaPerfil })));
const PaginaMiPortal = lazy(() => import("@/modules/account/pages/PaginaMiPortal").then((m) => ({ default: m.PaginaMiPortal })));
const PaginaCalendario = lazy(() => import("@/modules/account/pages/PaginaCalendario").then((m) => ({ default: m.PaginaCalendario })));
const PaginaOnboarding = lazy(() => import("@/modules/onboarding/pages/PaginaOnboarding").then((m) => ({ default: m.PaginaOnboarding })));
const PaginaEvaluaciones = lazy(() => import("@/modules/evaluations/pages/PaginaEvaluaciones").then((m) => ({ default: m.PaginaEvaluaciones })));
const PaginaDocumentos = lazy(() => import("@/modules/documents/pages/PaginaDocumentos").then((m) => ({ default: m.PaginaDocumentos })));
const PaginaAnalitica = lazy(() => import("@/modules/analytics/pages/PaginaAnalitica").then((m) => ({ default: m.PaginaAnalitica })));
const PaginaIntegraciones = lazy(() => import("@/modules/integrations/pages/PaginaIntegraciones").then((m) => ({ default: m.PaginaIntegraciones })));

function withSuspense(element: JSX.Element): JSX.Element {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Cargando modulo...</div>}>
        {element}
      </Suspense>
    </PageErrorBoundary>
  );
}

function ScrollToTop(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export function AppRouter(): JSX.Element {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<PaginaLogin />} />

        <Route element={<RutaProtegida />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<RootRedirect />} />
            <Route path="dashboard" element={withSuspense(<PaginaDashboard />)} />
            <Route path="employees" element={withSuspense(<PaginaEmpleados />)} />
            <Route path="org-structure" element={withSuspense(<PaginaEstructuraOrg />)} />
            <Route path="attendance" element={withSuspense(<PaginaAsistencia />)} />
            <Route path="vacations" element={withSuspense(<PaginaVacaciones />)} />
            <Route path="leaves" element={withSuspense(<PaginaPermisos />)} />
            <Route path="payroll" element={withSuspense(<PaginaPlanilla />)} />
            <Route path="payroll-concepts" element={withSuspense(<PaginaConceptosPlanilla />)} />
            <Route path="payroll-loans" element={withSuspense(<PaginaPrestamos />)} />
            <Route path="recruitment" element={withSuspense(<PaginaReclutamiento />)} />
            <Route path="job-postings" element={withSuspense(<PaginaConvocatorias />)} />
            <Route path="reports" element={withSuspense(<PaginaReportes />)} />
            <Route path="configuration" element={withSuspense(<PaginaConfiguracion />)} />
            <Route path="users" element={withSuspense(<PaginaUsuarios />)} />
            <Route path="roles" element={withSuspense(<PaginaRoles />)} />
            <Route path="holidays" element={withSuspense(<PaginaFeriados />)} />
            <Route path="incidents" element={withSuspense(<PaginaIncidencias />)} />
            <Route path="audit-log" element={withSuspense(<PaginaAuditoria />)} />
            <Route path="profile" element={withSuspense(<PaginaPerfil />)} />
            <Route path="my-portal" element={withSuspense(<PaginaMiPortal />)} />
            <Route path="calendar" element={withSuspense(<PaginaCalendario />)} />
            <Route path="onboarding" element={withSuspense(<PaginaOnboarding />)} />
            <Route path="evaluations" element={withSuspense(<PaginaEvaluaciones />)} />
            <Route path="documents" element={withSuspense(<PaginaDocumentos />)} />
            <Route path="analytics" element={withSuspense(<PaginaAnalitica />)} />
            <Route path="integrations" element={withSuspense(<PaginaIntegraciones />)} />
            <Route path="*" element={<PlaceholderModule />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  );
}
