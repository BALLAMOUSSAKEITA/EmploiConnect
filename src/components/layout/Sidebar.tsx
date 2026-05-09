"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  CalendarDays,
  LogOut,
  Settings,
  ChevronRight,
  ClipboardList,
  LayoutTemplate,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Pilotage",
    items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }],
  },
  {
    title: "Recrutement",
    items: [
      { href: "/offres", label: "Offres d’emploi", icon: Briefcase },
      { href: "/offres/modeles", label: "Modèles d’offre", icon: LayoutTemplate },
      { href: "/candidats", label: "Candidats", icon: Users },
      { href: "/candidatures", label: "Candidatures", icon: ClipboardList },
      { href: "/entretiens", label: "Entretiens", icon: CalendarDays },
    ],
  },
  {
    title: "Référentiels",
    items: [{ href: "/entreprises", label: "Entreprises", icon: Building2 }],
  },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/offres/modeles") {
    return pathname === "/offres/modeles" || pathname.startsWith("/offres/modeles/");
  }
  if (href === "/offres") {
    if (pathname === "/offres/modeles" || pathname.startsWith("/offres/modeles/")) return false;
    return pathname === "/offres" || /^\/offres\/\d+(?:\/|$)/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-[268px] min-w-[268px] flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] select-none">
      <div className="px-4 pt-6 pb-5 border-b border-[var(--sidebar-border)]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-950/50 ring-1 ring-white/10 flex-shrink-0">
            <Briefcase className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-[15px] leading-tight tracking-tight group-hover:text-indigo-100 transition-colors">
              EmploiConnect
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-medium mt-0.5">
              Recrutement
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500/90">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] text-[13px] font-medium transition-all duration-200",
                        active
                          ? "bg-white/[0.08] text-[var(--sidebar-text-active)] shadow-sm ring-1 ring-white/[0.06]"
                          : "text-[var(--sidebar-text)] hover:bg-white/[0.04] hover:text-slate-200",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-400 rounded-full shadow-[0_0_12px_rgba(129,140,248,0.5)]" />
                      )}
                      <Icon
                        size={18}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-400",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="flex-1 leading-tight">{item.label}</span>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" strokeWidth={2} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="pt-2 border-t border-[var(--sidebar-border)]">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500/90">
            Candidats
          </p>
          <Link
            href="/carrieres"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] text-[13px] font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-200 transition-all border border-transparent hover:border-rose-500/20"
          >
            <ExternalLink size={18} className="text-rose-400/90 flex-shrink-0" strokeWidth={1.75} />
            <span className="leading-tight">Page carrière publique</span>
          </Link>
        </div>
      </nav>

      <div className="px-3 pb-5 pt-2 border-t border-[var(--sidebar-border)] space-y-0.5">
        <Link
          href="/parametres"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] text-[13px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors"
        >
          <Settings size={18} className="text-slate-500" strokeWidth={1.75} />
          Paramètres
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-slate-400 hover:bg-red-500/[0.12] hover:text-red-300 rounded-[var(--radius-lg)] transition-colors text-left"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Déconnexion
        </button>

        <div className="mt-3 mx-0.5 p-3 rounded-[var(--radius-lg)] bg-white/[0.04] ring-1 ring-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white/10">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-100 truncate">{user?.full_name}</p>
              <div className="flex items-center gap-1.5 mt-1">
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
