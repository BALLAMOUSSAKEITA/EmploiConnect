"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/Forms";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, FileStack, Briefcase, Plus } from "lucide-react";

interface JobTemplate {
  id: number;
  name: string;
  title: string;
  company_id: number | null;
  created_at: string;
}

interface Company {
  id: number;
  name: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JobTemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState<JobTemplate | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([api.get<JobTemplate[]>("/job-templates"), api.get<Company[]>("/companies")]);
      setTemplates(tRes.data);
      setCompanies(cRes.data);
    } catch {
      toast("Impossible de charger les modèles", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (t: JobTemplate) => {
    setCreatingFor(t);
    setTitleOverride(t.title);
    const fallback = t.company_id != null ? String(t.company_id) : companies[0]?.id != null ? String(companies[0].id) : "";
    setCompanyId(fallback);
  };

  const createJobFromTemplate = async () => {
    if (!creatingFor || !companyId) {
      toast("Choisissez une entreprise", "error");
      return;
    }
    setSubmitting(true);
    try {
      const body: { company_id: number; title_override?: string } = { company_id: Number(companyId) };
      const trimmed = titleOverride.trim();
      if (trimmed && trimmed !== creatingFor.title) body.title_override = trimmed;
      const { data } = await api.post(`/job-templates/${creatingFor.id}/create-job`, body);
      toast("Offre créée (brouillon)", "success");
      setCreatingFor(null);
      router.push(`/offres/${data.id}`);
    } catch {
      toast("Création impossible", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const exportTemplatesAsCsv = async () => {
    try {
      const header = ["id", "nom_modele", "titre_offre", "entreprise_id", "date_creation"];
      const lines = [header.join(";")];
      for (const t of templates) {
        lines.push(
          [t.id, t.name.replaceAll(";", ","), t.title.replaceAll(";", ","), t.company_id ?? "", t.created_at].join(";")
        );
      }
      const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, "modeles-offres.csv");
      toast("Export téléchargé", "success");
    } catch {
      toast("Erreur d’export", "error");
    }
  };

  return (
    <div className="animate-fade-up max-w-4xl">
      <button
        type="button"
        onClick={() => router.push("/offres")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux offres
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <FileStack className="w-6 h-6 text-cyan-500" />
            Modèles d&apos;offre
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Dupliquez le contenu d&apos;une offre enregistrée en modèle, puis créez une nouvelle offre en un clic.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportTemplatesAsCsv} disabled={templates.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 skeleton h-20" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <FileStack className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-medium text-slate-700">Aucun modèle</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Sur la fiche d&apos;une offre, utilisez « Modèle » pour enregistrer le texte et les critères comme modèle réutilisable.
          </p>
          <Link href="/offres" className="inline-flex mt-4 text-sm text-indigo-600 font-medium hover:underline">
            Voir les offres
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{t.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{t.title}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-2">{formatDate(t.created_at)}</p>
              </div>
              <Button size="sm" onClick={() => openCreate(t)}>
                <Plus className="w-3.5 h-3.5" /> Nouvelle offre
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!creatingFor}
        onClose={() => { setCreatingFor(null); setTitleOverride(""); setCompanyId(""); }}
        title="Créer une offre depuis le modèle"
        size="md"
      >
        {creatingFor && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Modèle : <span className="font-medium text-slate-700">{creatingFor.name}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entreprise</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
              >
                <option value="">Sélectionner…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Titre de l&apos;offre</label>
              <input
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => { setCreatingFor(null); setTitleOverride(""); setCompanyId(""); }}>
                Annuler
              </Button>
              <Button onClick={createJobFromTemplate} disabled={submitting || !companyId}>
                {submitting ? "…" : "Créer le brouillon"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
