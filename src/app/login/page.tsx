"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Briefcase, Users, Building2, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
type FormData = z.infer<typeof schema>;

const stats = [
  { label: "Entreprises partenaires", value: "120+", icon: Building2, color: "text-blue-400" },
  { label: "Talents recrutés", value: "2 400+", icon: Users, color: "text-violet-400" },
  { label: "Offres publiées", value: "850+", icon: Briefcase, color: "text-emerald-400" },
  { label: "Taux de placement", value: "94%", icon: TrendingUp, color: "text-orange-400" },
];

const features = [
  "Gestion centralisée des candidats et CVs",
  "Pipeline de recrutement en temps réel",
  "Planification d'entretiens intégrée",
  "Tableau de bord analytique avancé",
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#0f172a] flex-col justify-between p-12">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" style={{ animationDelay: "1.5s" }} />
          <div className="absolute -bottom-24 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg">GestRH</span>
            <span className="text-indigo-400 text-lg font-light"> Guinée</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              La plateforme RH<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                #1 en Guinée
              </span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Connectez les meilleurs talents aux entreprises guinéennes les plus ambitieuses.
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <Icon className={`w-5 h-5 mb-2 ${s.color}`} />
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10">
          <p className="text-slate-500 text-xs">
            © 2026 GestRH Guinée · Conakry, République de Guinée
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-xl">GestRH Guinée</span>
        </div>

        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Bienvenue 👋</h1>
            <p className="text-slate-500">Connectez-vous à votre espace agent RH</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Adresse email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="vous@gestrh.gn"
                autoComplete="email"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition shadow-sm"
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition shadow-sm"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-medium text-indigo-700 mb-1.5">Accès démonstration</p>
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>Email : <code className="bg-white rounded px-1.5 py-0.5 text-indigo-600 font-mono">admin@gestrh.gn</code></p>
                <p>Mdp : <code className="bg-white rounded px-1.5 py-0.5 text-indigo-600 font-mono">Admin@2024</code></p>
              </div>
              <button
                type="button"
                onClick={() => {
                  (document.querySelector('input[type="email"]') as HTMLInputElement).value = "admin@gestrh.gn";
                  (document.querySelector('input[type="password"]') as HTMLInputElement).value = "Admin@2024";
                }}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Remplir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
