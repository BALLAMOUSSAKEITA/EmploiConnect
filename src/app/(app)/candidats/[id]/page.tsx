"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { LoadingSpinner, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Forms";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDate, STATUS_COLORS } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, FileText, Upload, Download, Plus, Calendar } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import ApplicationForm from "@/components/forms/ApplicationForm";

export default function CandidateDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get(`/candidates/${id}`),
      api.get("/applications", { params: { candidate_id: id } })
    ]).then(([candRes, appRes]) => {
      setCandidate(candRes.data);
      setApplications(appRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const uploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await api.post(`/candidates/${id}/cv`, form, { headers: { "Content-Type": "multipart/form-data" } });
      const { data } = await api.get(`/candidates/${id}`);
      setCandidate(data);
      toast("CV uploadé avec succès", "success");
    } catch (e: any) {
      toast(e?.response?.data?.detail || "Erreur lors de l'upload", "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!candidate) return <div className="text-center py-12 text-slate-400">Candidat introuvable</div>;

  const skills = candidate.skills ? candidate.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  const languages = candidate.languages ? candidate.languages.split(",").map((l: string) => l.trim()).filter(Boolean) : [];

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5">
        <ArrowLeft className="w-4 h-4" /> Retour aux candidats
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
              {candidate.first_name.charAt(0)}{candidate.last_name.charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{candidate.first_name} {candidate.last_name}</h2>
            {candidate.current_position && (
              <p className="text-sm text-slate-500 mt-0.5">{candidate.current_position}</p>
            )}
            {candidate.current_company && (
              <p className="text-xs text-slate-400">{candidate.current_company}</p>
            )}
            <div className="mt-4 space-y-2 text-sm text-left">
              <div className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4 text-slate-400" />{candidate.email}</div>
              {candidate.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-400" />{candidate.phone}</div>}
              {candidate.city && <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" />{candidate.city}{candidate.nationality ? `, ${candidate.nationality}` : ""}</div>}
              {candidate.experience_years !== null && candidate.experience_years !== undefined && (
                <div className="flex items-center gap-2 text-slate-600"><Briefcase className="w-4 h-4 text-slate-400" />{candidate.experience_years} ans d'expérience</div>
              )}
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h4 className="font-semibold text-slate-700 mb-3 text-sm">Compétences</h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((s: string) => (
                  <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h4 className="font-semibold text-slate-700 mb-3 text-sm">Langues</h4>
              <div className="flex flex-wrap gap-2">
                {languages.map((l: string) => (
                  <span key={l} className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full">{l}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-5">
          {/* CVs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" />CV & Documents</h3>
              <div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={uploadCV} />
                <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Upload..." : "Uploader CV"}
                </Button>
              </div>
            </div>
            {candidate.cv_files.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Aucun CV enregistré</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {candidate.cv_files.map((cv: any) => (
                  <div key={cv.id} className="px-6 py-3 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 flex-1 truncate">{cv.file_name}</span>
                    {cv.is_primary && <Badge className="bg-blue-50 text-blue-600">Principal</Badge>}
                    <span className="text-xs text-slate-400">{formatDate(cv.uploaded_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {candidate.notes && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h4 className="font-semibold text-slate-700 mb-2 text-sm">Notes</h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}

          {/* Applications */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Briefcase className="w-4 h-4 text-violet-500" />Candidatures ({applications.length})</h3>
              <Button size="sm" onClick={() => setShowAppForm(true)}><Plus className="w-3.5 h-3.5" />Postuler</Button>
            </div>
            {applications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Aucune candidature</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {applications.map((app: any) => (
                  <div key={app.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{app.job_title}</p>
                      <p className="text-xs text-slate-400">{app.company_name} · {formatDate(app.applied_at)}</p>
                    </div>
                    <Badge className={cn("text-xs", STATUS_COLORS[app.status] || "bg-gray-100 text-gray-600")}>{app.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={showAppForm} onClose={() => setShowAppForm(false)} title="Nouvelle candidature" size="md">
        <ApplicationForm
          candidateId={Number(id)}
          onSuccess={() => {
            setShowAppForm(false);
            api.get("/applications", { params: { candidate_id: id } }).then((r) => setApplications(r.data));
            toast("Candidature ajoutée", "success");
          }}
          onCancel={() => setShowAppForm(false)}
        />
      </Modal>
    </div>
  );
}
