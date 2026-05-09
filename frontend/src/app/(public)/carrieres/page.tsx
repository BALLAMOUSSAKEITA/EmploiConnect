"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { publicApi } from "@/lib/publicApi";
import { utmSuffixFromSearchParams } from "@/lib/utm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MapPin, Briefcase, Building2, Search } from "lucide-react";

interface PublicCompany {
  id: number;
  name: string;
  city?: string | null;
}

interface PublicJobSummary {
  id: number;
  title: string;
  city?: string | null;
  location?: string | null;
  job_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  experience_years?: number | null;
  created_at: string;
  company: PublicCompany;
}

function CarrieresListFallback() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 h-16 rounded-xl bg-slate-100/80 animate-pulse" />
      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="h-24 rounded-2xl bg-white border border-slate-100 animate-pulse" />
        ))}
      </ul>
    </main>
  );
}

function CarrieresListContent() {
  const searchParams = useSearchParams();
  const utmQ = useMemo(() => utmSuffixFromSearchParams(searchParams), [searchParams]);
  const [jobs, setJobs] = useState<PublicJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await publicApi.get<PublicJobSummary[]>("/public/jobs", { params: { limit: 200 } });
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setError("Impossible de charger les offres pour le moment.");
          setJobs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(needle) ||
          (j.company?.name || "").toLowerCase().includes(needle) ||
          (j.city || "").toLowerCase().includes(needle),
      )
    : jobs;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Offres à pourvoir</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Postulez directement en ligne. Les liens partagés avec des paramètres UTM (ex. campagne LinkedIn) sont conservés
          lorsque vous ouvrez une fiche poste.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une offre, une entreprise, une ville…"
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
        />
      </div>

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-24 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </ul>
      ) : error ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 text-amber-900 px-4 py-3 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-slate-100 bg-white text-slate-500 text-sm">
          {jobs.length === 0 ? "Aucune offre ouverte pour l’instant." : "Aucun résultat pour cette recherche."}
        </div>
      ) : (
        <ul className="space-y-3 stagger">
          {filtered.map((j) => (
            <li key={j.id}>
              <Link
                href={`/carrieres/${j.id}${utmQ}`}
                className="block rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-900">{j.title}</h2>
                    <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 opacity-70" />
                        {j.company?.name}
                      </span>
                      {(j.city || j.location) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 opacity-70" />
                          {j.city || j.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 opacity-70" />
                        {j.job_type}
                      </span>
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400 shrink-0">
                    {j.salary_min != null || j.salary_max != null ? (
                      <p className="text-emerald-700 font-medium">
                        {j.salary_min != null ? formatCurrency(j.salary_min, j.salary_currency) : ""}
                        {j.salary_min != null && j.salary_max != null ? " — " : ""}
                        {j.salary_max != null ? formatCurrency(j.salary_max, j.salary_currency) : ""}
                      </p>
                    ) : null}
                    <p className="mt-0.5">{formatDate(j.created_at)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function CarrieresListPage() {
  return (
    <Suspense fallback={<CarrieresListFallback />}>
      <CarrieresListContent />
    </Suspense>
  );
}
