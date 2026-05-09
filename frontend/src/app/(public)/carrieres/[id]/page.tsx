"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { publicApi } from "@/lib/publicApi";
import { appendUtmToFormData, utmSuffixFromSearchParams } from "@/lib/utm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Building2, MapPin, Briefcase, Send } from "lucide-react";

interface PublicJobDetail {
  id: number;
  title: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
  location?: string | null;
  city?: string | null;
  job_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  experience_years?: number | null;
  education_level?: string | null;
  deadline?: string | null;
  created_at: string;
  company: { id: number; name: string; city?: string | null; sector?: string | null };
}

function CarrieresJobContent() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const utmQ = useMemo(() => utmSuffixFromSearchParams(searchParams), [searchParams]);

  const [job, setJob] = useState<PublicJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ message: string } | null>(null);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await publicApi.get<PublicJobDetail>(`/public/jobs/${id}`);
        if (!cancelled) setJob(data);
      } catch {
        if (!cancelled) setJob(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("first_name", firstName.trim());
      fd.append("last_name", lastName.trim());
      fd.append("email", email.trim());
      if (phone.trim()) fd.append("phone", phone.trim());
      if (coverLetter.trim()) fd.append("cover_letter", coverLetter.trim());
      appendUtmToFormData(fd, searchParams);
      if (typeof window !== "undefined") {
        fd.append("landing_page", window.location.pathname + window.location.search);
        if (document.referrer) fd.append("referrer_url", document.referrer.slice(0, 2000));
      }
      if (cvFile) fd.append("cv", cvFile);

      await publicApi.post(`/public/jobs/${id}/apply`, fd);
      setDone({ message: "Votre candidature a bien été enregistrée. Nous vous recontacterons si votre profil correspond." });
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Réessayez plus tard.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="h-40 rounded-2xl bg-white border border-slate-100 animate-pulse" />
      </main>
    );
  }

  if (!job) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 text-center text-slate-600">
        <p>Cette offre n’est pas disponible.</p>
        <Link href={`/carrieres${utmQ}`} className="text-indigo-600 text-sm mt-4 inline-block">
          ← Toutes les offres
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-6 py-8 text-center">
          <p className="text-emerald-900 font-medium mb-2">Merci !</p>
          <p className="text-sm text-emerald-800">{done.message}</p>
          <Link href={`/carrieres${utmQ}`} className="inline-block mt-6 text-sm text-indigo-600 font-medium">
            ← Voir les autres offres
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href={`/carrieres${utmQ}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux offres
      </Link>

      <article className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 md:p-8 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{job.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 mb-6">
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-4 h-4 opacity-70" />
            {job.company?.name}
          </span>
          {(job.city || job.location) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-4 h-4 opacity-70" />
              {job.city || job.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Briefcase className="w-4 h-4 opacity-70" />
            {job.job_type}
          </span>
          {job.experience_years != null && <span>{job.experience_years} an{job.experience_years !== 1 ? "s" : ""} d’exp. souhaitée</span>}
        </div>
        {(job.salary_min != null || job.salary_max != null) && (
          <p className="text-emerald-700 font-semibold text-sm mb-6">
            {job.salary_min != null ? formatCurrency(job.salary_min, job.salary_currency) : ""}
            {job.salary_min != null && job.salary_max != null ? " — " : ""}
            {job.salary_max != null ? formatCurrency(job.salary_max, job.salary_currency) : ""}
          </p>
        )}
        <div className="text-xs text-slate-400 mb-6">Publiée le {formatDate(job.created_at)}</div>

        <section className="prose prose-slate prose-sm max-w-none">
          <h2 className="text-base font-semibold text-slate-800">Description</h2>
          <p className="whitespace-pre-wrap text-slate-600">{job.description}</p>
          {job.requirements && (
            <>
              <h2 className="text-base font-semibold text-slate-800 mt-6">Profil recherché</h2>
              <p className="whitespace-pre-wrap text-slate-600">{job.requirements}</p>
            </>
          )}
          {job.responsibilities && (
            <>
              <h2 className="text-base font-semibold text-slate-800 mt-6">Missions</h2>
              <p className="whitespace-pre-wrap text-slate-600">{job.responsibilities}</p>
            </>
          )}
        </section>
      </article>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6 md:p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Postuler</h2>
        <p className="text-xs text-slate-600 mb-5">
          Vos informations permettent de créer ou de mettre à jour votre fiche candidat. Les paramètres de campagne (UTM) sont
          enregistrés avec votre candidature.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prénom *</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nom *</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Lettre de motivation</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CV (PDF, DOC, DOCX — max 8 Mo)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white font-medium px-6 py-3 text-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Envoyer ma candidature
          </button>
        </form>
      </section>
    </main>
  );
}

function CarrieresJobFallback() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="h-12 w-40 rounded-lg bg-slate-100 animate-pulse mb-6" />
      <div className="h-64 rounded-2xl bg-white border border-slate-100 animate-pulse" />
    </main>
  );
}

export default function CarrieresJobPage() {
  return (
    <Suspense fallback={<CarrieresJobFallback />}>
      <CarrieresJobContent />
    </Suspense>
  );
}
