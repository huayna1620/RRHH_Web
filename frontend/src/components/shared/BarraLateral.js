import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BarChart2, BookOpen, Briefcase, Building2, CalendarDays, CalendarRange, ChevronDown, ClipboardList, CreditCard, FileText, Home, Key, LayoutDashboard, Link2, Megaphone, PiggyBank, ScrollText, Settings, ShieldCheck, Star, TrendingUp, UserCog, UserPlus, Users, Wallet, X, } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
const navigation = [
    {
        label: "General",
        icon: Home,
        items: [
            { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { to: "/app/my-portal", label: "Mi portal", icon: Home },
            { to: "/app/calendar", label: "Calendario", icon: CalendarDays },
        ],
    },
    {
        label: "Empleados",
        icon: Users,
        items: [
            { to: "/app/employees", label: "Empleados", icon: Users },
            { to: "/app/org-structure", label: "Estructura org.", icon: Building2 },
            { to: "/app/onboarding", label: "Onboarding", icon: UserPlus },
        ],
    },
    {
        label: "Tiempo",
        icon: CalendarRange,
        items: [
            { to: "/app/attendance", label: "Asistencia", icon: ClipboardList },
            { to: "/app/vacations", label: "Vacaciones", icon: CalendarRange },
            { to: "/app/leaves", label: "Permisos", icon: BookOpen },
            { to: "/app/incidents", label: "Incidencias", icon: ShieldCheck },
            { to: "/app/holidays", label: "Feriados", icon: CalendarDays },
        ],
    },
    {
        label: "Nómina",
        icon: Wallet,
        items: [
            { to: "/app/payroll", label: "Planilla", icon: Wallet },
            { to: "/app/payroll-concepts", label: "Conceptos", icon: CreditCard },
            { to: "/app/payroll-loans", label: "Préstamos", icon: PiggyBank },
        ],
    },
    {
        label: "Talento",
        icon: Star,
        items: [
            { to: "/app/recruitment", label: "Candidatos", icon: UserCog },
            { to: "/app/job-postings", label: "Convocatorias", icon: Megaphone },
            { to: "/app/evaluations", label: "Evaluaciones", icon: Star },
        ],
    },
    {
        label: "Documentos",
        icon: FileText,
        items: [
            { to: "/app/documents", label: "Documentos", icon: FileText },
            { to: "/app/reports", label: "Reportes", icon: ScrollText },
            { to: "/app/analytics", label: "Analítica", icon: BarChart2 },
        ],
    },
    {
        label: "Sistema",
        icon: Settings,
        items: [
            { to: "/app/users", label: "Usuarios", icon: Users },
            { to: "/app/roles", label: "Roles", icon: Key },
            { to: "/app/configuration", label: "Configuración", icon: Settings },
            { to: "/app/audit-log", label: "Auditoría", icon: TrendingUp },
            { to: "/app/integrations", label: "Integraciones", icon: Link2 },
            { to: "/app/profile", label: "Mi perfil", icon: Briefcase },
        ],
    },
];
function SidebarContent({ onLinkClick }) {
    const [open, setOpen] = useState(() => {
        const init = {};
        navigation.forEach((g) => { init[g.label] = true; });
        return init;
    });
    const toggle = (label) => setOpen((prev) => ({ ...prev, [label]: !prev[label] }));
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto scrollbar-subtle bg-[#0d1b2a]", children: [_jsxs("div", { className: "flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4", children: [_jsx("div", { className: "flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-600/40", children: _jsx("span", { className: "text-[11px] font-black text-white", children: "RH" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-extrabold leading-none tracking-tight text-white", children: "SAE \u00B7 RRHH" }), _jsx("p", { className: "text-[10px] text-white/40 leading-none mt-0.5", children: "Sistema de Gesti\u00F3n" })] })] }), _jsx("nav", { className: "flex-1 space-y-0.5 px-2 py-3 pb-8", children: navigation.map((group) => {
                    const isOpen = open[group.label] !== false;
                    return (_jsxs("div", { className: "mb-1", children: [_jsxs("button", { onClick: () => toggle(group.label), className: "flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/30 hover:text-white/50 transition-colors", children: [_jsx("span", { children: group.label }), _jsx(ChevronDown, { className: `size-3 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}` })] }), isOpen && (_jsx("div", { className: "mt-0.5 space-y-0.5", children: group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (_jsx(NavLink, { to: item.to, onClick: onLinkClick, className: ({ isActive }) => `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${isActive
                                            ? "bg-brand-500/20 text-brand-300 shadow-sm"
                                            : "text-white/55 hover:bg-white/8 hover:text-white/90"}`, children: ({ isActive }) => (_jsxs(_Fragment, { children: [_jsx("span", { className: `flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${isActive ? "bg-brand-500/30 text-brand-300" : "text-white/40 group-hover:text-white/70"}`, children: _jsx(Icon, { className: "size-3.5" }) }), _jsx("span", { className: "truncate", children: item.label }), isActive && (_jsx("span", { className: "ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" }))] })) }, item.to));
                                }) }))] }, group.label));
                }) })] }));
}
export function BarraLateral({ mobileOpen, onClose }) {
    return (_jsxs(_Fragment, { children: [_jsx("aside", { className: "hidden w-60 shrink-0 lg:flex lg:flex-col", children: _jsx(SidebarContent, {}) }), mobileOpen && (_jsx("button", { className: "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden", onClick: onClose, "aria-label": "Cerrar men\u00FA" })), _jsxs("aside", { className: `fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-300 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`, children: [_jsx("div", { className: "absolute right-3 top-3 z-10", children: _jsx("button", { onClick: onClose, className: "flex size-7 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white", children: _jsx(X, { className: "size-4" }) }) }), _jsx(SidebarContent, { onLinkClick: onClose })] })] }));
}
