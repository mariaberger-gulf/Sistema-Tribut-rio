"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Receipt, Settings, Scale, LogOut, Sun, Moon, FileMinus2, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Notas", href: "/notas", icon: Receipt },
  { label: "Retenções na Fonte", href: "/retencoes", icon: FileMinus2 },
  { label: "Empresa", href: "/empresa", icon: Building2 },
  { label: "Configuração", href: "/configuracao", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<{ nome: string; funcao: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-zinc-900 text-zinc-100 shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-zinc-800">
        <Scale className="w-6 h-6 text-emerald-400 shrink-0" />
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-base tracking-tight">Ecotruck</span>
          <span className="text-xs text-zinc-400 font-normal">Reforma Tributária</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-500 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-800 space-y-1">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-zinc-100 truncate">{user.nome}</p>
            <p className="text-xs text-zinc-500 truncate">{user.funcao}</p>
          </div>
        )}

        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors group"
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 shrink-0 group-hover:text-emerald-400 transition-colors" />
            : <Moon className="w-4 h-4 shrink-0 group-hover:text-emerald-400 transition-colors" />}
          <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors group"
        >
          <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400 transition-colors" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
