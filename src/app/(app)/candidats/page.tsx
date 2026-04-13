"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Forms";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Eye, Pencil, Trash2, Phone, Mail, MapPin, FileText, Briefcase, Star } from "lucide-react";
import CandidateForm from "@/components/forms/CandidateForm";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Candidate {
  id: number;
  first_name: string; last_name: string; email: string; phone?: string;
  city?: string; current_position?: string; current_company?: string;
  experience_years?: number; skills?: string; created_at: string;
  cv_files: Array<{ id: number; file_name: string; is_primary: boolean }>;
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

export default function CandidatsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCand, setEditCand] = useState<Candidate | null>(null);
  const [deleteCand, setDeleteCand] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const { data } = await api.get("/candidates", { params });
      setCandidates(data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

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
        <Button onClick={() => { setEditCand(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Ajouter un candidat
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, email, compétences..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white"
        />
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
          <p className="text-slate-400 text-sm mb-4">Commencez à constituer votre vivier de talents</p>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />Ajouter un candidat</Button>
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
