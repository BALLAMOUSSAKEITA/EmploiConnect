"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui/Forms";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDate, STATUS_COLORS, JOB_STATUS_LABELS } from "@/lib/utils";
import { Plus, Search, Eye, Pencil, Trash2, MapPin, Clock, Building2, Users, LayoutGrid, List, Filter } from "lucide-react";
import JobForm from "@/components/forms/JobForm";
import Link from "next/link";

interface Job {
  id: number; title: string; job_type: string; status: string;
  city?: string; location?: string; deadline?: string;
  created_at: string; application_count: number;
  company: { id: number; name: string } | null;
}

const STATUS_TABS = [
  { key: "",        label: "Tous",          color: "bg-slate-100 text-slate-700"  },
  { key: "open",    label: "Ouverts",       color: "bg-green-100 text-green-700"  },
  { key: "draft",   label: "Brouillons",    color: "bg-yellow-100 text-yellow-700"},
  { key: "paused",  label: "En pause",      color: "bg-orange-100 text-orange-700"},
  { key: "closed",  label: "Fermés",        color: "bg-gray-100 text-gray-600"    },
];

const JOB_TYPE_COLORS: Record<string, string> = {
  "CDI": "bg-blue-50 text-blue-700 border-blue-100",
  "CDD": "bg-cyan-50 text-cyan-700 border-cyan-100",
  "Stage": "bg-purple-50 text-purple-700 border-purple-100",
  "Freelance": "bg-orange-50 text-orange-700 border-orange-100",
  "Temps partiel": "bg-pink-50 text-pink-700 border-pink-100",
};

function JobCard({ job, onEdit, onDelete }: { job: Job; onEdit: () => void; onDelete: () => void }) {
  const statusColors: Record<string, { dot: string; badge: string }> = {
    open:   { dot: "bg-green-500",  badge: "bg-green-50 text-green-700"   },
    draft:  { dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700" },
    paused: { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700" },
    closed: { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600"  },
  };
  const s = statusColors[job.status] ?? statusColors.closed;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
      {/* Color accent top */}
      <div className={cn("h-1", job.status === "open" ? "bg-gradient-to-r from-green-400 to-emerald-500" : job.status === "draft" ? "bg-gradient-to-r from-yellow-400 to-amber-500" : "bg-slate-200")} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", s.dot)} />
              <h3 className="font-semibold text-slate-800 text-sm leading-tight">{job.title}</h3>
            </div>
            {job.company && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Building2 className="w-3 h-3" />
                <span>{job.company.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Link href={`/offres/${job.id}`}>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <Eye className="w-3.5 h-3.5" />
              </button>
            </Link>
            <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", JOB_TYPE_COLORS[job.job_type] || "bg-slate-100 text-slate-600 border-slate-200")}>
            {job.job_type}
          </span>
          {job.city && (
            <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />{job.city}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
            <Users className="w-3 h-3" />{job.application_count} candidature{job.application_count !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3" />{formatDate(job.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function JobRow({ job, onEdit, onDelete }: { job: Job; onEdit: () => void; onDelete: () => void }) {
  const s = STATUS_COLORS[job.status] || "bg-gray-100 text-gray-600";
  return (
    <div className="bg-white rounded-xl border border-slate-100 px-4 py-3.5 flex items-center gap-4 hover:shadow-sm hover:border-slate-200 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-slate-800 text-sm truncate">{job.title}</h3>
          <Badge className={cn("text-[11px] flex-shrink-0", s)}>{JOB_STATUS_LABELS[job.status] || job.status}</Badge>
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0", JOB_TYPE_COLORS[job.job_type] || "bg-slate-100 text-slate-600 border-slate-200")}>
            {job.job_type}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
          {job.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company.name}</span>}
          {job.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(job.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 hidden sm:flex">
          <Users className="w-3 h-3" />{job.application_count}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/offres/${job.id}`}>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
          </Link>
          <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

export default function OffresPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get("/jobs", { params });
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async () => {
    if (!deleteJob) return;
    setDeleting(true);
    try {
      await api.delete(`/jobs/${deleteJob.id}`);
      toast("Offre fermée avec succès", "success");
      setDeleteJob(null);
      fetchJobs();
    } catch {
      toast("Erreur", "error");
    } finally {
      setDeleting(false);
    }
  };

  const counts = STATUS_TABS.map((tab) => ({
    ...tab,
    count: tab.key ? jobs.filter((j) => j.status === tab.key).length : jobs.length,
  }));

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Offres d'emploi</h2>
          <p className="text-sm text-slate-400 mt-0.5">{jobs.length} offre{jobs.length !== 1 ? "s" : ""} au total</p>
        </div>
        <Button onClick={() => { setEditJob(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Nouvelle offre
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {counts.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
              statusFilter === tab.key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {tab.label}
            <span className={cn(
              "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
              statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            )}>
              {tab.count}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white w-40"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600")}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600")}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={cn("gap-4", viewMode === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3" : "flex flex-col")}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="flex gap-2 mt-2">
                <div className="skeleton h-5 w-12 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-slate-700 font-semibold mb-1">Aucune offre trouvée</h3>
          <p className="text-slate-400 text-sm mb-4">Créez votre première offre pour commencer le recrutement</p>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />Créer une offre</Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job}
              onEdit={() => { setEditJob(job); setShowForm(true); }}
              onDelete={() => setDeleteJob(job)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 stagger">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job}
              onEdit={() => { setEditJob(job); setShowForm(true); }}
              onDelete={() => setDeleteJob(job)}
            />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editJob ? "Modifier l'offre" : "Nouvelle offre d'emploi"} size="xl">
        <JobForm
          initial={editJob}
          onSuccess={() => { setShowForm(false); fetchJobs(); toast(editJob ? "Offre mise à jour" : "Offre créée", "success"); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteJob} onClose={() => setDeleteJob(null)} onConfirm={handleDelete}
        title="Fermer cette offre"
        message={`Voulez-vous fermer l'offre "${deleteJob?.title}" ?`}
        confirmLabel="Fermer l'offre" loading={deleting}
      />
    </div>
  );
}

function Briefcase({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V14.15M15.75 9.75V7.5a3.75 3.75 0 0 0-7.5 0v2.25m7.5 0h-7.5m7.5 0H18a2.25 2.25 0 0 1 2.25 2.25v2.625M5.25 9.75H3.75A2.25 2.25 0 0 0 1.5 12v2.625" /></svg>;
}
