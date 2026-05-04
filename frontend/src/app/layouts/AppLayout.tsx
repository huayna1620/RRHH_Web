import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BarraLateral } from "@/components/shared/BarraLateral";
import { BarraSuperior } from "@/components/shared/BarraSuperior";

export function AppLayout(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent): void => {
      if (event.matches) setMobileMenuOpen(false);
    };

    if (media.matches) setMobileMenuOpen(false);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="flex min-h-screen overflow-x-clip">
      <BarraLateral mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50/40">
        <BarraSuperior onOpenMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PlaceholderModule(): JSX.Element {
  return (
    <section className="rounded-xl border bg-white p-10 text-center shadow-panel">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-slate-100">
        <span className="text-2xl">M</span>
      </div>
      <h2 className="text-base font-bold">Modulo en preparacion</h2>
      <p className="mt-1.5 text-sm text-muted">Este espacio esta reservado para la siguiente fase.</p>
    </section>
  );
}

export function RootRedirect(): JSX.Element {
  return <Navigate to="/app/dashboard" replace />;
}
