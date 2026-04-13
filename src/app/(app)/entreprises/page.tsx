"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Forms";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { Plus, Search, Pencil, Trash2, Globe, Phone, Mail, Briefcase, Building2, MapPin, ExternalLink } from "lucide-react";
import CompanyForm from "@/components/forms/CompanyForm";
import { cn } from "@/lib/utils";

interface Company {
  id: number; name: string; sector?: string; size?: string; city?: string;
  email?: string; phone?: string; website?: string; created_at: string; job_count: number;
}

const SECTOR_COLORS: Record<string, string> = {
  "Finance":     "bg-blue-50   text-blue-700",
  "Télécoms":    "bg-cyan-50   text-cyan-700",
  "Mines":       "bg-amber-50  text-amber-700",
  "Commerce":    "bg-emerald-50 text-emerald-700",
  "Énergie":     "bg-orange-50 text-orange-700",
  "BTP":         "bg-stone-50  text-stone-700",
  "Santé":       "bg-red-50    text-red-700",
  "Éducation":   "bg-violet-50 text-violet-700",
};

const LOGO_GRADIENTS = [
  "from-blue-500 to-blue-700",    "from-emerald-500 to-emerald-700",
  "from-violet-500 to-violet-700","from-orange-500 to-orange-700",
  "from-pink-500 to-pink-700",    "from-cyan-500 to-cyan-700",
  "from-indigo-500 to-indigo-700","from-teal-500 to-teal-700",
];

export default function EntreprisesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editComp, setEditComp] = useState<Company | null>(null);
  const [deleteComp, setDeleteComp] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const { data } = await api.get("/companies", { params });
      setCompanies(data);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleDelete = async () => {
    if (!deleteComp) return;
    setDeleting(true);
    try {
      await api.delete(`/companies/${deleteComp.id}`);
      toast("Entreprise archivée", "success");
      setDeleteComp(null);
      fetchCompanies();
    } catch { toast("Erreur", "error"); }
    finally { setDeleting(false); }
  };

  const totalJobs = companies.reduce((s, c) => s + c.job_count, 0);

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Entreprises clientes</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {companies.length} partenaire{companies.length !== 1 ? "s" : ""} · {totalJobs} offre{totalJobs !== 1 ? "s" : ""} active{totalJobs !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => { setEditComp(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Nouvelle entreprise
        </Button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white" />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton w-12 h-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
              </div>
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-slate-700 font-semibold mb-1">Aucune entreprise</h3>
          <p className="text-slate-400 text-sm">Ajoutez vos premières entreprises partenaires</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {companies.map((comp) => {
            const gradient = LOGO_GRADIENTS[comp.id % LOGO_GRADIENTS.length];
            const sectorColor = SECTOR_COLORS[comp.sector ?? ""] || "bg-slate-100 text-slate-600";
            return (
              <div key={comp.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group animate-fade-up">
                {/* Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm bg-gradient-to-br", gradient)}>
                      {comp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{comp.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {comp.sector && (
                          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", sectorColor)}>
                            {comp.sector}
                          </span>
                        )}
                        {comp.size && <span className="text-[11px] text-slate-400">{comp.size}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500">
                    {comp.email && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{comp.email}</span>
                      </div>
                    )}
                    {comp.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span>{comp.phone}</span>
                      </div>
                    )}
                    {comp.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span>{comp.city}</span>
                      </div>
                    )}
                    {comp.website && (
                      <a href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`}
                        target="_blank" rel="noopener"
                        className="flex items-center gap-2 text-indigo-500 hover:text-indigo-700 transition-colors">
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{comp.website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                    <Briefcase className="w-3 h-3" />
                    {comp.job_count} offre{comp.job_count !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditComp(comp); setShowForm(true); }}
                      className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-slate-700 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteComp(comp)}
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

      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editComp ? "Modifier l'entreprise" : "Nouvelle entreprise"}
        subtitle="Renseignez les informations de l'entreprise partenaire" size="lg">
        <CompanyForm
          initial={editComp}
          onSuccess={() => { setShowForm(false); fetchCompanies(); toast(editComp ? "Entreprise mise à jour" : "Entreprise ajoutée", "success"); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteComp} onClose={() => setDeleteComp(null)} onConfirm={handleDelete}
        title="Archiver cette entreprise"
        message={`Voulez-vous archiver "${deleteComp?.name}" ? Les offres associées seront conservées.`}
        confirmLabel="Archiver" loading={deleting}
      />
    </div>
  );
}
