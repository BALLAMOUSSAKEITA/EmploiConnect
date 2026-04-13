"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { LoadingSpinner, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Forms";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDate, formatDateTime, formatCurrency, STATUS_COLORS } from "@/lib/utils";
import { ArrowLeft, MapPin, Clock, Building2, Users, Plus, User, Calendar } from "lucide-react";
import ApplicationForm from "@/components/forms/ApplicationForm";

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppForm, setShowAppForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get(`/jobs/${id}`),
      api.get("/applications", { params: { job_id: id } })
    ]).then(([jobRes, appRes]) => {
      setJob(jobRes.data);
      setApplications(appRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (appId: number, status: string) => {
    try {
      await api.put(`/applications/${appId}`, { status });
      const { data } = await api.get("/applications", { params: { job_id: id } });
      setApplications(data);
      toast("Statut mis à jour", "success");
    } catch {
      toast("Erreur", "error");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!job) return <div className="text-center py-12 text-slate-400">Offre introuvable</div>;

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux offres
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{job.title}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                  {job.company && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.company.name}</span>}
                  {(job.city || job.location) && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.city || job.location}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDate(job.created_at)}</span>
                </div>
              </div>
              <Badge className={cn(STATUS_COLORS[job.status] || "bg-gray-100")}>
                {job.status}
              </Badge>
            </div>

            <div className="flex gap-2 flex-wrap mb-5">
              <Badge className="bg-blue-50 text-blue-700">{job.job_type}</Badge>
              {job.experience_years && <Badge className="bg-slate-100 text-slate-600">{job.experience_years} ans d'exp.</Badge>}
              {job.education_level && <Badge className="bg-slate-100 text-slate-600">{job.education_level}</Badge>}
              {(job.salary_min || job.salary_max) && (
                <Badge className="bg-green-50 text-green-700">
                  {job.salary_min ? formatCurrency(job.salary_min, job.salary_currency) : ""}
                  {job.salary_min && job.salary_max ? " - " : ""}
                  {job.salary_max ? formatCurrency(job.salary_max, job.salary_currency) : ""}
                </Badge>
              )}
            </div>

            {job.description && (
              <div className="mb-4">
                <h4 className="font-semibold text-slate-700 mb-2">Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
            {job.requirements && (
              <div className="mb-4">
                <h4 className="font-semibold text-slate-700 mb-2">Profil recherché</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
              </div>
            )}
            {job.responsibilities && (
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Missions</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{job.responsibilities}</p>
              </div>
            )}
          </div>

          {/* Applications */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Candidatures ({applications.length})
              </h3>
              <Button size="sm" onClick={() => setShowAppForm(true)}>
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </Button>
            </div>
            {applications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Aucune candidature pour cette offre</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {applications.map((app) => (
                  <div key={app.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {app.candidate_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{app.candidate_name}</p>
                      <p className="text-xs text-slate-400">{formatDate(app.applied_at)}</p>
                    </div>
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {["Candidature reçue","Présélection","Entretien","Offre envoyée","Embauché","Refusé"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h4 className="font-semibold text-slate-700 mb-3">Résumé</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Candidatures</span><span className="font-medium text-blue-600">{applications.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Embauchés</span><span className="font-medium text-green-600">{applications.filter((a) => a.status === "Embauché").length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">En cours</span><span className="font-medium text-orange-600">{applications.filter((a) => a.status === "Entretien").length}</span></div>
              {job.deadline && <div className="flex justify-between"><span className="text-slate-500">Deadline</span><span className="font-medium">{formatDate(job.deadline)}</span></div>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showAppForm} onClose={() => setShowAppForm(false)} title="Ajouter une candidature" size="md">
        <ApplicationForm
          jobId={Number(id)}
          onSuccess={() => {
            setShowAppForm(false);
            api.get("/applications", { params: { job_id: id } }).then((r) => setApplications(r.data));
            toast("Candidature ajoutée", "success");
          }}
          onCancel={() => setShowAppForm(false)}
        />
      </Modal>
    </div>
  );
}
