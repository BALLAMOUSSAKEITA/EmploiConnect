"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui";
import { Briefcase, Users, Building2, CalendarDays, TrendingUp, UserCheck, ArrowUpRight, Clock, Plus } from "lucide-react";
import { cn, formatDate, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";

interface Stats {
  total_jobs: number; open_jobs: number; total_candidates: number;
  total_companies: number; total_applications: number; hired_count: number;
  upcoming_interviews: number;
  recent_applications: Array<{ id: number; candidate_name: string; job_title: string; company_name: string; status: string; applied_at: string }>;
}

const KPI_CONFIG = [
  { key: "open_jobs",            label: "Offres actives",    subKey: "total_jobs",         subLabel: "au total",     Icon: Briefcase,   from: "from-blue-500",    to: "to-blue-600",    shadow: "shadow-blue-500/25",   bg: "bg-blue-50",   iconColor: "text-blue-600"   },
  { key: "total_candidates",     label: "Candidats",          subKey: null,                 subLabel: "dans la base", Icon: Users,        from: "from-violet-500",  to: "to-violet-600",  shadow: "shadow-violet-500/25", bg: "bg-violet-50", iconColor: "text-violet-600" },
  { key: "total_companies",      label: "Entreprises",        subKey: null,                 subLabel: "partenaires",  Icon: Building2,    from: "from-emerald-500", to: "to-emerald-600", shadow: "shadow-emerald-500/25",bg: "bg-emerald-50",iconColor: "text-emerald-600"},
  { key: "total_applications",   label: "Candidatures",       subKey: null,                 subLabel: "reçues",       Icon: TrendingUp,   from: "from-orange-500",  to: "to-orange-600",  shadow: "shadow-orange-500/25", bg: "bg-orange-50", iconColor: "text-orange-600" },
  { key: "hired_count",          label: "Embauchés",          subKey: null,                 subLabel: "ce mois",      Icon: UserCheck,    from: "from-green-500",   to: "to-green-600",   shadow: "shadow-green-500/25",  bg: "bg-green-50",  iconColor: "text-green-600"  },
  { key: "upcoming_interviews",  label: "Entretiens",         subKey: null,                 subLabel: "planifiés",    Icon: CalendarDays, from: "from-pink-500",    to: "to-pink-600",    shadow: "shadow-pink-500/25",   bg: "bg-pink-50",   iconColor: "text-pink-600"   },
];

function SkeletonKPI() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton w-10 h-10 rounded-xl" />
      </div>
      <div className="skeleton h-8 w-16 rounded" />
      <div className="skeleton h-2.5 w-20 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const hiringRate = stats && stats.total_applications > 0
    ? Math.round((stats.hired_count / stats.total_applications) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0f172a] via-indigo-950 to-violet-950 rounded-2xl p-6 shadow-lg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 right-24 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-indigo-300 text-sm font-medium mb-1">
              {getGreeting()}, {user?.full_name?.split(" ")[0]} 👋
            </p>
            <h2 className="text-white text-xl font-bold mb-1">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            {stats && (
              <p className="text-slate-400 text-sm">
                {stats.open_jobs} offre{stats.open_jobs !== 1 ? "s" : ""} active{stats.open_jobs !== 1 ? "s" : ""}
                {stats.upcoming_interviews > 0 && ` · ${stats.upcoming_interviews} entretien${stats.upcoming_interviews !== 1 ? "s" : ""} à venir`}
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/offres"
              className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors border border-white/10">
              <Briefcase className="w-3.5 h-3.5" /> Voir les offres
            </Link>
            <Link href="/candidats"
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors shadow-md shadow-indigo-500/30">
              <Plus className="w-3.5 h-3.5" /> Candidat
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 stagger">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonKPI key={i} />)
          : KPI_CONFIG.map((cfg) => {
              const value = (stats as any)?.[cfg.key] ?? 0;
              const subValue = cfg.subKey ? (stats as any)?.[cfg.subKey] : null;
              const Icon = cfg.Icon;
              return (
                <div key={cfg.key} className="bg-white rounded-2xl border border-slate-100 p-4 card-hover animate-fade-up">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-slate-500">{cfg.label}</p>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", cfg.bg)}>
                      <Icon size={16} className={cfg.iconColor} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {subValue !== null ? `${subValue} ` : ""}{cfg.subLabel}
                  </p>
                </div>
              );
            })
        }
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Recent Applications ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Dernières candidatures</h3>
              <p className="text-xs text-slate-400 mt-0.5">Activité récente du pipeline</p>
            </div>
            <Link href="/offres" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-2.5 w-48 rounded" />
                  </div>
                  <div className="skeleton h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : stats?.recent_applications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Aucune candidature</p>
              <p className="text-slate-400 text-xs mt-1">Les candidatures apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats?.recent_applications.map((app, i) => (
                <div key={app.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                    ["bg-gradient-to-br from-blue-400 to-blue-600", "from-violet-400 to-violet-600", "from-emerald-400 to-emerald-600", "from-orange-400 to-orange-600", "from-pink-400 to-pink-600"][i % 5],
                    "bg-gradient-to-br"
                  )}>
                    {app.candidate_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{app.candidate_name}</p>
                    <p className="text-xs text-slate-400 truncate">{app.job_title} · <span className="text-slate-500">{app.company_name}</span></p>
                  </div>
                  <Badge className={cn("text-[11px] whitespace-nowrap", STATUS_COLORS[app.status] || "bg-gray-100 text-gray-600")}>
                    {app.status}
                  </Badge>
                  <span className="text-[11px] text-slate-400 flex-shrink-0 hidden sm:block">{formatDate(app.applied_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Hiring funnel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-1">Taux de conversion</h3>
            <p className="text-xs text-slate-400 mb-4">Candidatures → Embauches</p>
            {loading ? (
              <div className="space-y-2">
                <div className="skeleton h-3 rounded w-full" />
                <div className="skeleton h-3 rounded w-4/5" />
                <div className="skeleton h-3 rounded w-3/5" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Candidatures reçues", value: stats?.total_applications ?? 0, max: stats?.total_applications ?? 1, color: "bg-indigo-500" },
                  { label: "En entretien",         value: stats?.upcoming_interviews ?? 0, max: stats?.total_applications ?? 1, color: "bg-violet-500" },
                  { label: "Embauchés",            value: stats?.hired_count ?? 0,        max: stats?.total_applications ?? 1, color: "bg-emerald-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-semibold text-slate-800">{item.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", item.color)}
                        style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Taux global</span>
                  <span className={cn(
                    "text-lg font-bold",
                    hiringRate >= 50 ? "text-emerald-600" : hiringRate >= 25 ? "text-orange-600" : "text-slate-600"
                  )}>
                    {hiringRate}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Actions rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/offres",      label: "Offres",      emoji: "📋", bg: "hover:bg-blue-50   hover:border-blue-200   hover:text-blue-700" },
                { href: "/candidats",   label: "Candidats",   emoji: "👤", bg: "hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700" },
                { href: "/entreprises", label: "Entreprises", emoji: "🏢", bg: "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700" },
                { href: "/entretiens",  label: "Entretiens",  emoji: "📅", bg: "hover:bg-orange-50  hover:border-orange-200  hover:text-orange-700" },
              ].map((a) => (
                <Link key={a.href} href={a.href}
                  className={cn("flex flex-col items-center justify-center gap-1.5 p-3 border border-slate-100 rounded-xl text-slate-600 transition-all text-center", a.bg)}>
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-xs font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
