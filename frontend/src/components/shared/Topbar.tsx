import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { NotificationBell } from "@/components/shared/NotificationBell";

type TopbarProps = {
  onOpenMenu: () => void;
};

export function Topbar({ onOpenMenu }: TopbarProps): JSX.Element {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b bg-white">
      <div className="flex h-14 items-center justify-between px-3 md:px-6">
        <button className="rounded p-2 hover:bg-slate-100 lg:hidden" onClick={onOpenMenu} aria-label="Menu">
          <Menu className="size-5" />
        </button>
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <div className="text-sm font-medium text-slate-700">{user?.fullName || "Usuario"}</div>
          <button className="rounded p-2 hover:bg-slate-100" onClick={() => void logout()} aria-label="Salir">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

