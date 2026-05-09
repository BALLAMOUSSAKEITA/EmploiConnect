"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ROUTES: Record<string, { label: string }> = {
  "/dashboard": { label: "Tableau de bord" },
  "/offres": { label: "Offres d’emploi" },
  "/offres/modeles": { label: "Modèles d’offre" },
  "/candidats": { label: "Candidats" },
  "/candidatures": { label: "Candidatures" },
  "/entreprises": { label: "Entreprises" },
  "/entretiens": { label: "Entretiens" },
  "/parametres": { label: "Paramètres" },
};

function getBreadcrumb(pathname: string): { label: string; href: string }[] {
  if (pathname.startsWith("/offres/modeles")) {
    return [
      { label: "Offres d’emploi", href: "/offres" },
      { label: "Modèles d’offre", href: "/offres/modeles" },
    ];
  }
  if (pathname.startsWith("/offres/") && pathname !== "/offres") {
    const id = pathname.replace("/offres/", "").split("/")[0];
    if (id && /^\d+$/.test(id)) {
      return [
        { label: "Offres d’emploi", href: "/offres" },
        { label: `Offre #${id}`, href: pathname },
      ];
    }
  }
  for (const [key, val] of Object.entries(ROUTES)) {
    if (pathname === key) return [{ label: val.label, href: key }];
    if (pathname.startsWith(key + "/") && key !== "/" && key !== "/offres") {
      const sub = pathname.slice(key.length + 1);
      const subLabel =
        sub === "nouveau" || sub === "nouvelle" || sub === "planifier" ? "Nouveau" : `#${sub}`;
      return [
        { label: val.label, href: key },
        { label: subLabel, href: pathname },
      ];
    }
  }
  if (pathname.startsWith("/offres")) {
    return [{ label: "Offres d’emploi", href: "/offres" }];
  }
  return [{ label: "EmploiConnect", href: "/dashboard" }];
}

const GREETINGS = ["Bonjour", "Bonsoir"];
function getGreeting() {
  const h = new Date().getHours();
  return h < 18 ? GREETINGS[0] : GREETINGS[1];
}

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const crumbs = getBreadcrumb(pathname);
  const [searchVal, setSearchVal] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) router.push(`/candidats?search=${encodeURIComponent(searchVal.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 flex-shrink-0 glass border-b border-slate-200/70 px-5 lg:px-8 h-[60px] flex items-center justify-between gap-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-1 min-w-0 text-[13px]">
        <span className="text-slate-400 hidden sm:inline font-medium truncate">Espace RH</span>
        {crumbs.map((c, i) => (
          <span key={`${c.href}-${i}`} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" strokeWidth={2} />
            {i < crumbs.length - 1 ? (
              <Link
                href={c.href}
                className="text-slate-500 hover:text-indigo-600 font-medium truncate transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-semibold text-slate-900 tracking-tight truncate">{c.label}</span>
            )}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <form onSubmit={handleSearch} className="hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Rechercher un candidat…"
              className={cn(
                "w-52 lg:w-64 pl-9 pr-3 py-2 text-[13px] rounded-full",
                "bg-slate-50/90 border border-slate-200/80 text-slate-800 placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-indigo-300 focus:bg-white transition-all",
              )}
            />
          </div>
        </form>

        <button
          type="button"
          className="relative p-2 rounded-full hover:bg-slate-100/80 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="hidden sm:block w-px h-7 bg-slate-200/90" />

        <div className="flex items-center gap-3 pl-0 sm:pl-1">
          <div className="text-right hidden lg:block min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate max-w-[160px]">
              {user?.full_name}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">{getGreeting()}</p>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-md shadow-indigo-500/15"
            aria-hidden
          >
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
