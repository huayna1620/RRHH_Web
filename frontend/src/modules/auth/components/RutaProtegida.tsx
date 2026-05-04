import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export function RutaProtegida(): JSX.Element {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted">Cargando sesi?n...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
