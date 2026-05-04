import { Home, Menu, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const links = [
  { to: "/app/dashboard", label: "Dashboard", icon: Home },
  { to: "/app/employees", label: "Empleados", icon: Users },
];

export function Sidebar({ mobileOpen, onClose }: SidebarProps): JSX.Element {
  return (
    <>
      <aside className="hidden w-64 border-r bg-white lg:block">
        <div className="p-4 text-lg font-bold">HRMS</div>
        <nav className="space-y-1 p-2">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `flex items-center gap-2 rounded px-3 py-2 text-sm ${isActive ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}>
                <Icon className="size-4" /> {l.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} aria-label="Cerrar" />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r bg-white transition-transform lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 text-lg font-bold">HRMS <button onClick={onClose}><Menu className="size-4" /></button></div>
        <nav className="space-y-1 p-2">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink key={l.to} to={l.to} onClick={onClose} className={({ isActive }) => `flex items-center gap-2 rounded px-3 py-2 text-sm ${isActive ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}>
                <Icon className="size-4" /> {l.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}


