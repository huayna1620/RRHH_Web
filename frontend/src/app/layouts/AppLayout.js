import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BarraLateral } from "@/components/shared/BarraLateral";
import { BarraSuperior } from "@/components/shared/BarraSuperior";
export function AppLayout() {
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
        if (!mobileMenuOpen)
            return;
        const onKey = (e) => {
            if (e.key === "Escape")
                setMobileMenuOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [mobileMenuOpen]);
    useEffect(() => {
        const media = window.matchMedia("(min-width: 1024px)");
        const handleChange = (event) => {
            if (event.matches)
                setMobileMenuOpen(false);
        };
        if (media.matches)
            setMobileMenuOpen(false);
        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);
    return (_jsxs("div", { className: "flex min-h-screen overflow-x-clip", children: [_jsx(BarraLateral, { mobileOpen: mobileMenuOpen, onClose: () => setMobileMenuOpen(false) }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50/40", children: [_jsx(BarraSuperior, { onOpenMenu: () => setMobileMenuOpen(true) }), _jsx("main", { className: "flex-1 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6", children: _jsx("div", { className: "mx-auto w-full max-w-[1520px]", children: _jsx(Outlet, {}) }) })] })] }));
}
export function PlaceholderModule() {
    return (_jsxs("section", { className: "rounded-xl border bg-white p-10 text-center shadow-panel", children: [_jsx("div", { className: "mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-slate-100", children: _jsx("span", { className: "text-2xl", children: "M" }) }), _jsx("h2", { className: "text-base font-bold", children: "Modulo en preparacion" }), _jsx("p", { className: "mt-1.5 text-sm text-muted", children: "Este espacio esta reservado para la siguiente fase." })] }));
}
export function RootRedirect() {
    return _jsx(Navigate, { to: "/app/dashboard", replace: true });
}
