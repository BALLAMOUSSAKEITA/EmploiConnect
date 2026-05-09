"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Forms";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Eye, Pencil, Trash2, Phone, Mail, MapPin, FileText, Briefcase, Download, Tag, ListFilter, BellRing, FolderPlus, Upload, AlertTriangle } from "lucide-react";
import CandidateForm from "@/components/forms/CandidateForm";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TalentListRow {
  id: number;
  name: string;
  description?: string | null;
  member_count: number;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  current_position?: string;
  current_company?: string;
  experience_years?: number;
  skills?: string;
  created_at: string;
  tags?: string[];
  recontact_at?: string | null;
  recontact_note?: string | null;
  talent_lists?: { id: number; name: string }[];
  cv_files: Array<{ id: number; file_name: string; is_primary: boolean }>;
}

function isRecontactDue(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() <= Date.now();
}

interface BulkImportRow {
  file_name: string;
  status: string;
  candidate_id?: number | null;
  message?: string | null;
  email_detected?: string | null;
}

interface BulkImportResponse {
  results: BulkImportRow[];
  created: number;
  attached: number;
  skipped: number;
  errors: number;
}

interface DuplicateGroup {
  reason: string;
  key: string;
  candidates: { id: number; email: string; first_name: string; last_name: string; phone?: string | null }[];
}

function bulkStatusLabel(status: string): string {
  switch (status) {
    case "created":
      return "Créé";
    case "attached":
      return "CV relié";
    case "skipped_duplicate":
      return "Ignoré";
    case "duplicate_file":
      return "Fichier déjà connu";
    case "error":
      return "Erreur";
    default:
      return status;
  }
}

const AVATAR_GRADIENTS = [
  "from-blue-400 to-blue-600", "from-violet-400 to-violet-600",
  "from-emerald-400 to-emerald-600", "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600", "from-cyan-400 to-cyan-600",
  "from-red-400 to-red-600", "from-indigo-400 to-indigo-600",
];

function getAvatarGradient(id: number) {
  return AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CandidatsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCand, setEditCand] = useState<Candidate | null>(null);
  const [deleteCand, setDeleteCand] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [talentLists, setTalentLists] = useState<TalentListRow[]>([]);
  const [listFilter, setListFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState("");
  const [recontactDueOnly, setRecontactDueOnly] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkOnDuplicate, setBulkOnDuplicate] = useState<"attach_cv" | "skip">("attach_cv");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResponse | null>(null);
  const [showDupModal, setShowDupModal] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    api.get<TalentListRow[]>("/talent-lists").then((r) => setTalentLists(r.data)).catch(() => setTalentLists([]));
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean> = {};
      if (search) params.search = search;
      if (listFilter) params.list_id = listFilter;
      if (tagFilter.trim()) params.tag = tagFilter.trim();
      if (recontactDueOnly) params.recontact_due = true;
      const { data } = await api.get<Candidate[]>("/candidates", { params });
      setCandidates(data);
    } finally {
      setLoading(false);
    }
  }, [search, listFilter, tagFilter, recontactDueOnly]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleDelete = async () => {
    if (!deleteCand) return;
    setDeleting(true);
    try {
      await api.delete(`/candidates/${deleteCand.id}`);
      toast("Candidat supprimé", "success");
      setDeleteCand(null);
      fetchCandidates();
    } catch { toast("Erreur", "error"); }
    finally { setDeleting(false); }
  };

  const exportCsv = async () => {
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (listFilter) params.list_id = listFilter;
      if (tagFilter.trim()) params.tag = tagFilter.trim();
      if (recontactDueOnly) params.recontact_due = "true";
      const res = await api.get("/export/candidates.csv", { params, responseType: "blob" });
      downloadBlob(res.data, "candidats.csv");
      toast("Export téléchargé", "success");
    } catch {
      toast("Erreur d’export", "error");
    }
  };

  const createTalentList = async () => {
    const name = newListName.trim();
    if (!name) {
      toast("Indiquez un nom de liste", "error");
      return;
    }
    setCreatingList(true);
    try {
      await api.post("/talent-lists", { name });
      toast("Liste créée", "success");
      setShowListModal(false);
      setNewListName("");
      const { data } = await api.get<TalentListRow[]>("/talent-lists");
      setTalentLists(data);
    } catch {
      toast("Erreur", "error");
    } finally {
      setCreatingList(false);
    }
  };

  const openDupModal = async () => {
    setShowDupModal(true);
    setDupLoading(true);
    setDupGroups([]);
    try {
      const { data } = await api.get<{ groups: DuplicateGroup[] }>("/candidates/duplicate-candidates");
      setDupGroups(data.groups);
    } catch {
      toast("Impossible de charger les doublons", "error");
    } finally {
      setDupLoading(false);
    }
  };

  const runBulkImport = async () => {
    if (bulkFiles.length === 0) {
      toast("Sélectionnez au moins un fichier PDF ou DOCX", "error");
      return;
    }
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const fd = new FormData();
      bulkFiles.forEach((f) => fd.append("files", f));
      fd.append("on_duplicate", bulkOnDuplicate);
      const { data } = await api.post<BulkImportResponse>("/candidates/bulk-cv-import", fd);
      setBulkResult(data);
      toast(
        `Import terminé : ${data.created} créé(s), ${data.attached} relié(s), ${data.skipped} ignoré(s), ${data.errors} erreur(s)`,
        data.errors > 0 ? "error" : "success",
      );
      fetchCandidates();
    } catch {
      toast("Échec de l’import", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Candidats</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {candidates.length} talent{candidates.length !== 1 ? "s" : ""} dans votre vivier
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="secondary" onClick={openDupModal} title="Analyser les doublons potentiels">
            <AlertTriangle className="w-4 h-4" /> Doublons
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setBulkFiles([]);
              setBulkResult(null);
              setShowBulkModal(true);
            }}
            title="Importer plusieurs CV (PDF/DOCX)"
          >
            <Upload className="w-4 h-4" /> Import CV masse
          </Button>
          <Button variant="secondary" onClick={exportCsv} title="Export CSV (filtre recherche appliqué côté serveur)">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditCand(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Ajouter un candidat
          </Button>
        </div>
      </div>

      {/* Recherche & filtres vivier */}
      <div className="flex flex-col xl:flex-row gap-3 mb-5 xl:items-end">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, compétences..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white min-h-[38px]">
            <ListFilter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              className="text-sm bg-transparent border-0 focus:ring-0 py-0 pr-2 max-w-[200px]"
            >
              <option value="">Toutes les listes</option>
              {talentLists.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.name} ({l.member_count})
                </option>
              ))}
            </select>
          </div>
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Tag vivier…"
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 w-36 bg-white"
          />
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer border border-slate-200 rounded-xl px-3 py-2 bg-white whitespace-nowrap">
            <input
              type="checkbox"
              checked={recontactDueOnly}
              onChange={(e) => setRecontactDueOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            <BellRing className="w-3.5 h-3.5 text-amber-500" />
            Rappels dus
          </label>
          <Button variant="secondary" size="sm" type="button" onClick={() => { setNewListName(""); setShowListModal(true); }}>
            <FolderPlus className="w-3.5 h-3.5" /> Liste
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <h3 className="text-slate-700 font-semibold mb-1">Aucun candidat</h3>
          <p className="text-slate-400 text-sm">Commencez à constituer votre vivier de talents</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {candidates.map((cand) => {
            const skills = cand.skills ? cand.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
            const hasCv = cand.cv_files.some((f) => f.is_primary);
            return (
              <div key={cand.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group animate-fade-up">
                {/* Top section */}
                <div className="p-5 pb-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm bg-gradient-to-br",
                      getAvatarGradient(cand.id)
                    )}>
                      {cand.first_name.charAt(0)}{cand.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight">
                        {cand.first_name} {cand.last_name}
                      </h3>
                      {cand.current_position ? (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {cand.current_position}
                          {cand.current_company && <span className="text-slate-400"> · {cand.current_company}</span>}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Poste non renseigné</p>
                      )}
                    </div>
                    {hasCv && (
                      <div title="CV disponible" className="flex-shrink-0">
                        <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5 text-green-600" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{cand.email}</span>
                    </div>
                    {cand.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span>{cand.phone}</span>
                      </div>
                    )}
                    {cand.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span>{cand.city}</span>
                      </div>
                    )}
                    {cand.experience_years !== undefined && cand.experience_years !== null && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span>{cand.experience_years} an{cand.experience_years !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 3).map((s) => (
                        <span key={s} className="bg-indigo-50 text-indigo-600 text-[11px] font-medium px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="text-[11px] text-slate-400 px-1 py-0.5">+{skills.length - 3}</span>
                      )}
                    </div>
                  )}
                  {(cand.tags && cand.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 items-center mt-2">
                      <Tag className="w-3 h-3 text-amber-600 shrink-0 opacity-80" />
                      {cand.tags.slice(0, 6).map((t) => (
                        <span
                          key={t}
                          className="bg-amber-50 text-amber-900 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-100/80"
                        >
                          {t}
                        </span>
                      ))}
                      {cand.tags.length > 6 && (
                        <span className="text-[10px] text-slate-400">+{cand.tags.length - 6}</span>
                      )}
                    </div>
                  )}
                  {(cand.talent_lists && cand.talent_lists.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {cand.talent_lists.map((tl) => (
                        <span key={tl.id} className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {tl.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {cand.recontact_at && (
                    <div
                      className={cn(
                        "mt-2 text-[11px] flex items-center gap-1.5 rounded-lg px-2 py-1.5",
                        isRecontactDue(cand.recontact_at)
                          ? "bg-red-50 text-red-800 border border-red-100"
                          : "bg-sky-50 text-sky-800 border border-sky-100",
                      )}
                    >
                      <BellRing className="w-3.5 h-3.5 shrink-0" />
                      {isRecontactDue(cand.recontact_at)
                        ? "Rappel recontact à traiter"
                        : `Recontact prévu : ${formatDate(cand.recontact_at)}`}
                    </div>
                  )}
                </div>

                {/* Bottom actions */}
                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{formatDate(cand.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <Link href={`/candidats/${cand.id}`}>
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                    <button onClick={() => { setEditCand(cand); setShowForm(true); }}
                      className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-slate-700 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteCand(cand)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showListModal} onClose={() => { setShowListModal(false); setNewListName(""); }} title="Nouvelle liste du vivier" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom</label>
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="ex. Développeurs React — Q2"
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => { setShowListModal(false); setNewListName(""); }}>
              Annuler
            </Button>
            <Button type="button" onClick={createTalentList} disabled={creatingList}>
              {creatingList ? "…" : "Créer"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showBulkModal} onClose={() => { setShowBulkModal(false); setBulkResult(null); setBulkFiles([]); }} title="Import CV masse" size="md">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Formats pris en charge : <strong>PDF</strong> et <strong>DOCX</strong>. Un email valide doit apparaître dans le document pour associer le CV
            (création ou fusion avec un candidat existant). Les fichiers strictement identiques à un CV déjà stocké sont refusés.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fichiers</label>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700"
              onChange={(e) => setBulkFiles(Array.from(e.target.files || []))}
            />
            {bulkFiles.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1">{bulkFiles.length} fichier(s) sélectionné(s)</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Si l’email existe déjà</label>
            <select
              value={bulkOnDuplicate}
              onChange={(e) => setBulkOnDuplicate(e.target.value as "attach_cv" | "skip")}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              <option value="attach_cv">Ajouter le CV au candidat existant</option>
              <option value="skip">Ignorer (ne pas importer ce fichier)</option>
            </select>
          </div>
          <Button className="w-full justify-center" type="button" onClick={runBulkImport} disabled={bulkLoading || bulkFiles.length === 0}>
            {bulkLoading ? "Import en cours…" : "Lancer l’import"}
          </Button>
          {bulkResult && (
            <div className="border border-slate-100 rounded-xl max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-600">Fichier</th>
                    <th className="text-left p-2 font-medium text-slate-600">Statut</th>
                    <th className="text-left p-2 font-medium text-slate-600">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResult.results.map((r, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="p-2 text-slate-700 break-all">{r.file_name}</td>
                      <td className="p-2">
                        <span
                          className={cn(
                            "font-medium",
                            r.status === "created" && "text-green-700",
                            r.status === "attached" && "text-blue-700",
                            (r.status === "skipped_duplicate" || r.status === "duplicate_file") && "text-amber-700",
                            r.status === "error" && "text-red-600",
                          )}
                        >
                          {bulkStatusLabel(r.status)}
                        </span>
                        {r.candidate_id != null && (
                          <Link href={`/candidats/${r.candidate_id}`} className="block text-[10px] text-indigo-600 underline mt-0.5">
                            Fiche n°{r.candidate_id}
                          </Link>
                        )}
                      </td>
                      <td className="p-2 text-slate-500">{r.message}{r.email_detected ? ` — ${r.email_detected}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showDupModal} onClose={() => setShowDupModal(false)} title="Doublons potentiels" size="md">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Groupes détectés : même numéro de téléphone (normalisé), ou même nom + prénom avec <strong>des emails différents</strong>.
          </p>
          {dupLoading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Analyse…</p>
          ) : dupGroups.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Aucun groupe suspect pour l’instant.</p>
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {dupGroups.map((g, idx) => (
                <div key={idx} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-sm">
                  <p className="text-[11px] font-semibold text-amber-900 mb-2">
                    {g.reason === "phone" ? "Téléphone" : "Nom identique, emails distincts"} — {g.key.replace("|", " · ")}
                  </p>
                  <ul className="space-y-2">
                    {g.candidates.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-slate-700">
                        <Link href={`/candidats/${c.id}`} className="font-medium text-indigo-600 hover:underline">
                          {c.first_name} {c.last_name}
                        </Link>
                        <span className="text-slate-400">{c.email}</span>
                        {c.phone && <span className="text-slate-500">{c.phone}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editCand ? "Modifier le candidat" : "Nouveau candidat"} size="xl">
        <CandidateForm
          initial={editCand}
          onSuccess={() => { setShowForm(false); fetchCandidates(); toast(editCand ? "Candidat mis à jour" : "Candidat ajouté", "success"); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteCand} onClose={() => setDeleteCand(null)} onConfirm={handleDelete}
        title="Supprimer ce candidat"
        message={`Voulez-vous supprimer ${deleteCand?.first_name} ${deleteCand?.last_name} ?`}
        confirmLabel="Supprimer" loading={deleting}
      />
    </div>
  );
}
