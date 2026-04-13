"use client";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const ROUTES: Record<string, { label: string; parent?: string; parentHref?: string }> = {
  "/dashboard":   { label: "Tableau de bord" },
  "/offres":      { label: "Offres d'emploi" },
  "/candidats":   { label: "Candidats" },
  "/entreprises": { label: "Entreprises" },
  "/entretiens":  { label: "Entretiens" },
  "/parametres":  { label: "Paramètres" },
};

function getBreadcrumb(pathname: string) {
  for (const [key, val] of Object.entries(ROUTES)) {
    if (pathname === key) return [{ label: val.label, href: key }];
    if (pathname.startsWith(key + "/") && key !== "/") {
      const sub = pathname.slice(key.length + 1);
      const subLabel = sub === "nouveau" || sub === "nouvelle" || sub === "planifier"
        ? "Nouveau"
        : `#${sub}`;
      return [
        { label: val.label, href: key },
        { label: subLabel, href: pathname },
      ];
    }
  }
  return [{ label: "EmploiConnect", href: "/" }];
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
  const [notifications] = useState(3);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) router.push(`/candidats?search=${encodeURIComponent(searchVal.trim())}`);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-4 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-slate-400 text-xs hidden sm:inline">EmploiConnect</span>
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0 hidden sm:block" />
            <span className={i === crumbs.length - 1
              ? "font-semibold text-slate-800 truncate"
              : "text-slate-400 hover:text-slate-600 cursor-pointer truncate"
            }>
              {c.label}
            </span>
          </span>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Rechercher un candidat..."
              className="w-52 pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 focus:bg-white transition"
            />
          </div>
        </form>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors">
          <Bell className="w-4.5 h-4.5" size={18} />
          {notifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />

        {/* User */}
        <div className="flex items-center gap-2.5 cursor-pointer group pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-slate-400">{getGreeting()} 👋</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent group-hover:ring-indigo-200 transition-all">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
