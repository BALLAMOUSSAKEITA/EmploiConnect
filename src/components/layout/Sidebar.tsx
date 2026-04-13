"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Users, Building2,
  CalendarDays, LogOut, Settings, ChevronRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",   label: "Tableau de bord",  icon: LayoutDashboard, color: "text-indigo-400" },
  { href: "/offres",      label: "Offres d'emploi",   icon: Briefcase,        color: "text-blue-400"   },
  { href: "/candidats",   label: "Candidats",          icon: Users,            color: "text-violet-400" },
  { href: "/entreprises", label: "Entreprises",        icon: Building2,        color: "text-emerald-400"},
  { href: "/entretiens",  label: "Entretiens",         icon: CalendarDays,     color: "text-orange-400" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-[240px] bg-[#0f172a] flex flex-col shadow-xl shadow-black/20">
      {/* ── Logo ── */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <Briefcase className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">GestRH</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Guinée</p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-3">Navigation</p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
              )}
              <Icon
                size={16}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  active ? item.color : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 text-slate-500" />}
            </Link>
          );
        })}
      </nav>

      {/* ── User section ── */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3 space-y-0.5">
        <Link href="/parametres"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
          <Settings size={16} className="text-slate-500" />
          Paramètres
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>

        {/* User card */}
        <div className="mt-2 mx-1 p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-indigo-500/30">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="status-dot active" />
                <p className="text-[10px] text-slate-500 truncate">
                  {user?.role === "admin" ? "Administrateur" : "Agent RH"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
