"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { LoadingSpinner, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Forms";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDate, formatCurrency, STATUS_COLORS } from "@/lib/utils";
import { ArrowLeft, MapPin, Clock, Building2, Users, Plus, Copy, FileStack, UserPlus, Trash2, ClipboardList } from "lucide-react";
import ApplicationForm from "@/components/forms/ApplicationForm";
import ActivityFeed from "@/components/recruitment/ActivityFeed";

const JOB_TEAM_ROLES: { value: string; label: string }[] = [
  { value: "lead_recruiter", label: "Recruteur principal" },
  { value: "sourcer", label: "Sourcing" },
  { value: "coordinator", label: "Coordinateur" },
  { value: "hiring_manager", label: "Manager / Décideur" },
];

function jobTeamRoleLabel(role: string): string {
  return JOB_TEAM_ROLES.find((r) => r.value === role)?.label ?? role;
}

interface JobTeamRow {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: string;
}

interface InterviewGuideEditRow {
  category: string;
  question: string;
}

function guideItemsFromJob(jobData: { interview_guide?: { items?: { category?: string | null; question?: string }[] } }): InterviewGuideEditRow[] {
  const items = jobData.interview_guide?.items ?? [];
  return items.map((i) => ({
    category: i.category ?? "",
    question: i.question ?? "",
  }));
}

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppForm, setShowAppForm] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [team, setTeam] = useState<JobTeamRow[]>([]);
  const [teamUsers, setTeamUsers] = useState<Array<{ id: number; full_name: string; email?: string }>>([]);
  const [teamUserId, setTeamUserId] = useState("");
  const [teamRole, setTeamRole] = useState("lead_recruiter");
  const [teamSaving, setTeamSaving] = useState(false);
  const [guideItems, setGuideItems] = useState<InterviewGuideEditRow[]>([]);
  const [guideSaving, setGuideSaving] = useState(false);
  const { toast } = useToast();

  const loadTeam = () => {
    api.get(`/jobs/${id}/team`).then((r) => setTeam(r.data)).catch(() => setTeam([]));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/jobs/${id}`),
      api.get("/applications", { params: { job_id: id } }),
    ])
      .then(([jobRes, appRes]) => {
        const j = jobRes.data;
        setJob(j);
        setGuideItems(guideItemsFromJob(j));
        setApplications(appRes.data);
      })
      .catch(() => {
        setJob(null);
        setApplications([]);
      })
      .finally(() => setLoading(false));

    api.get(`/jobs/${id}/team`).then((r) => setTeam(r.data)).catch(() => setTeam([]));
    api.get("/auth/users").then((r) => setTeamUsers(r.data)).catch(() => setTeamUsers([]));
  }, [id]);

  const addTeamMember = async () => {
    if (!teamUserId) {
      toast("Choisissez un collaborateur", "error");
      return;
    }
    setTeamSaving(true);
    try {
      await api.post(`/jobs/${id}/team`, { user_id: Number(teamUserId), role: teamRole });
      toast("Membre ajouté à l’équipe", "success");
      setTeamUserId("");
      loadTeam();
    } catch (e: any) {
      toast(e?.response?.data?.detail || "Impossible d’ajouter", "error");
    } finally {
      setTeamSaving(false);
    }
  };

  const removeTeamMember = async (memberId: number) => {
    try {
      await api.delete(`/jobs/${id}/team/${memberId}`);
      toast("Membre retiré", "success");
      loadTeam();
    } catch {
      toast("Erreur", "error");
    }
  };

  const duplicateJob = async () => {
    setDupLoading(true);
    try {
      const { data } = await api.post(`/jobs/${id}/duplicate`);
      toast("Offre dupliquée (brouillon)", "success");
      router.push(`/offres/${data.id}`);
    } catch {
      toast("Impossible de dupliquer l’offre", "error");
    } finally {
      setDupLoading(false);
    }
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      toast("Indiquez un nom pour le modèle", "error");
      return;
    }
    setSavingTemplate(true);
    try {
      await api.post(`/job-templates/from-job/${id}`, { name });
      toast("Modèle enregistré", "success");
      setShowTemplateModal(false);
      setTemplateName("");
    } catch {
      toast("Erreur à l’enregistrement", "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveInterviewGuide = async () => {
    setGuideSaving(true);
    try {
      const itemsPayload = guideItems
        .map((row) => ({
          category: row.category.trim() || null,
          question: row.question.trim(),
        }))
        .filter((row) => row.question.length > 0);
      const { data } = await api.put(`/jobs/${id}`, { interview_guide: { items: itemsPayload } });
      setJob(data);
      setGuideItems(guideItemsFromJob(data));
      toast("Guide d’entretien enregistré", "success");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast(typeof msg === "string" ? msg : "Impossible d’enregistrer le guide", "error");
    } finally {
      setGuideSaving(false);
    }
  };

  const clearInterviewGuide = async () => {
    if (!confirm("Vider tout le guide d’entretien pour cette offre ?")) return;
    setGuideSaving(true);
    try {
      const { data } = await api.put(`/jobs/${id}`, { interview_guide: { items: [] } });
      setJob(data);
      setGuideItems([]);
      toast("Guide vidé", "success");
    } catch {
      toast("Erreur", "error");
    } finally {
      setGuideSaving(false);
    }
  };

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
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Badge className={cn(STATUS_COLORS[job.status] || "bg-gray-100")}>
                  {job.status}
                </Badge>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <Button size="sm" variant="secondary" onClick={duplicateJob} disabled={dupLoading}>
                    <Copy className="w-3.5 h-3.5" />
                    {dupLoading ? "…" : "Dupliquer"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setTemplateName(`${job.title} — modèle`); setShowTemplateModal(true); }}>
                    <FileStack className="w-3.5 h-3.5" /> Modèle
                  </Button>
                </div>
              </div>
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

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-violet-500 shrink-0" />
                  Guide d&apos;entretien
                </h4>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => setGuideItems((rows) => [...rows, { category: "", question: "" }])}
                  >
                    <Plus className="w-3.5 h-3.5" /> Question
                  </Button>
                  <Button size="sm" type="button" onClick={saveInterviewGuide} disabled={guideSaving}>
                    {guideSaving ? "…" : "Enregistrer le guide"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Banque de questions par offre (optionnel : thème / catégorie). Les lignes sans texte de question sont ignorées à l&apos;enregistrement.
              </p>
              {guideItems.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-2">Aucune question pour l&apos;instant — ajoutez-en une pour structurer vos entretiens.</p>
              ) : (
                <ul className="space-y-3">
                  {guideItems.map((row, idx) => (
                    <li key={idx} className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 space-y-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setGuideItems((rows) => rows.filter((_, i) => i !== idx))}
                          className="p-1 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Retirer cette question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Thème / catégorie (optionnel)</label>
                        <input
                          value={row.category}
                          onChange={(e) =>
                            setGuideItems((rows) =>
                              rows.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r))
                            )
                          }
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                          placeholder="ex. Soft skills, Technique, Motivation…"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Question</label>
                        <textarea
                          value={row.question}
                          onChange={(e) =>
                            setGuideItems((rows) =>
                              rows.map((r, i) => (i === idx ? { ...r, question: e.target.value } : r))
                            )
                          }
                          rows={3}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-y min-h-[4rem]"
                          placeholder="Formulez votre question…"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {guideItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearInterviewGuide}
                  disabled={guideSaving}
                  className="mt-4 text-xs text-slate-500 hover:text-red-600 underline-offset-2 hover:underline"
                >
                  Vider tout le guide
                </button>
              )}
            </div>
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

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" /> Co-recrutement
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">
              Qui joue quel rôle sur cette offre (plusieurs personnes possibles).
            </p>
            {team.length > 0 && (
              <ul className="space-y-2 mb-4">
                {[...team]
                  .sort((a, b) => jobTeamRoleLabel(a.role).localeCompare(jobTeamRoleLabel(b.role)) || a.user_name.localeCompare(b.user_name))
                  .map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-2 text-xs border border-slate-100 rounded-xl px-3 py-2 bg-slate-50/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{m.user_name}</p>
                        <p className="text-slate-400 truncate">{m.user_email}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {jobTeamRoleLabel(m.role)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTeamMember(m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 shrink-0"
                        title="Retirer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-slate-500">Ajouter un membre</label>
              <div className="flex flex-col gap-2">
                <select
                  value={teamUserId}
                  onChange={(e) => setTeamUserId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Collaborateur…</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
                <select
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {JOB_TEAM_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <Button size="sm" type="button" onClick={addTeamMember} disabled={teamSaving} className="w-full justify-center">
                  {teamSaving ? "…" : "Ajouter au pipeline"}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h4 className="font-semibold text-slate-700 mb-3">Historique d&apos;activité</h4>
            <ActivityFeed kind="job" entityId={Number(id)} />
          </div>
        </div>
      </div>

      <Modal open={showTemplateModal} onClose={() => { setShowTemplateModal(false); setTemplateName(""); }} title="Enregistrer comme modèle" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom du modèle</label>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="ex. Développeur senior — standard"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowTemplateModal(false); setTemplateName(""); }}>Annuler</Button>
            <Button onClick={saveAsTemplate} disabled={savingTemplate}>{savingTemplate ? "…" : "Enregistrer"}</Button>
          </div>
        </div>
      </Modal>

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
