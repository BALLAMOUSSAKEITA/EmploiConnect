"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Forms";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDate, STATUS_COLORS } from "@/lib/utils";
import { Plus, Search, ClipboardList, Briefcase, LayoutGrid, List, Download, MessageSquare } from "lucide-react";
import ApplicationForm from "@/components/forms/ApplicationForm";
import Link from "next/link";
import CandidaturesKanban from "@/components/recruitment/CandidaturesKanban";
import ApplicationCommentsModal from "@/components/recruitment/ApplicationCommentsModal";

interface ApplicationRow {
  id: number;
  candidate_id: number;
  job_post_id: number;
  status: string;
  candidate_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  applied_at: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  landing_page?: string | null;
}

const STATUS_OPTIONS = ["Candidature reçue", "Présélection", "Entretien", "Offre envoyée", "Embauché", "Refusé"];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CandidaturesPage() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [commentsAppId, setCommentsAppId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/applications", { params: { limit: 500 } });
      setApplications(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (appId: number, status: string) => {
    try {
      await api.put(`/applications/${appId}`, { status });
      const { data } = await api.get("/applications", { params: { limit: 500 } });
      setApplications(data);
      toast("Statut mis à jour", "success");
    } catch {
      toast("Erreur", "error");
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get("/export/applications.csv", { responseType: "blob" });
      downloadBlob(res.data, "candidatures.csv");
      toast("Export téléchargé", "success");
    } catch {
      toast("Erreur d’export", "error");
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? applications.filter((a) =>
        [a.candidate_name, a.job_title, a.company_name, a.utm_source, a.utm_campaign, a.landing_page].some((x) =>
          (x || "").toLowerCase().includes(q),
        ),
      )
    : applications;

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Candidatures</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Pipeline, Kanban et notes d&apos;équipe. Export CSV pour Excel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50/80">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-3.5 h-3.5" /> Liste
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === "kanban" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nouvelle candidature
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Candidat, offre, entreprise…"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <p className="text-xs text-slate-500">
          Astuce : depuis le détail d&apos;une{" "}
          <Link href="/offres" className="text-indigo-600 hover:underline">offre</Link>
          {" "}ou d&apos;un{" "}
          <Link href="/candidats" className="text-indigo-600 hover:underline">candidat</Link>.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="skeleton h-4 w-48 rounded mb-2" />
              <div className="skeleton h-3 w-full max-w-md rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-slate-700 font-semibold mb-1">
            {applications.length === 0 ? "Aucune candidature pour l’instant" : "Aucun résultat"}
          </h3>
          <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
            Une candidature relie un candidat du vivier à une offre.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nouvelle candidature
          </Button>
        </div>
      ) : view === "kanban" ? (
        <CandidaturesKanban applications={filtered} onStatusChange={updateStatus} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map((app) => (
              <div key={app.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Link
                      href={`/candidats/${app.candidate_id}`}
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {app.candidate_name || "Candidat"}
                    </Link>
                    <span className="text-slate-300 hidden sm:inline">·</span>
                    <span className="text-sm text-slate-600 truncate flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <Link href={`/offres/${app.job_post_id}`} className="hover:text-indigo-600 truncate">
                        {app.job_title || "Offre"}
                      </Link>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {app.company_name || "—"} · {formatDate(app.applied_at)}
                    {(app.utm_source || app.utm_campaign) && (
                      <span className="ml-2 text-violet-600">
                        · Source : {app.utm_source || "—"}
                        {app.utm_campaign ? ` / ${app.utm_campaign}` : ""}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setCommentsAppId(app.id)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    title="Commentaires équipe"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className={cn(
                      "text-xs font-medium border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white max-w-[200px]",
                      STATUS_COLORS[app.status] || "border-slate-200 text-slate-700"
                    )}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle candidature" subtitle="Choisissez le candidat et l’offre concernés" size="md">
        <ApplicationForm
          onSuccess={() => {
            setShowForm(false);
            fetchApplications();
            toast("Candidature ajoutée", "success");
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        open={commentsAppId !== null}
        onClose={() => setCommentsAppId(null)}
        title="Commentaires équipe"
        subtitle={commentsAppId ? `Candidature #${commentsAppId}` : undefined}
        size="md"
      >
        {commentsAppId !== null && (
          <ApplicationCommentsModal applicationId={commentsAppId} onClose={() => setCommentsAppId(null)} />
        )}
      </Modal>
    </div>
  );
}
