"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Forms";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDateTime } from "@/lib/utils";
import { Plus, Calendar, Clock, MapPin, Video, Phone, User, CheckCircle2, XCircle, AlertCircle, ChevronDown } from "lucide-react";
import InterviewForm from "@/components/forms/InterviewForm";

const RESULT_CONFIG: Record<string, { label: string; icon: any; badge: string; select: string }> = {
  "En attente": { label: "En attente",  icon: AlertCircle,   badge: "bg-yellow-50 text-yellow-700 border-yellow-200",  select: "bg-yellow-50 text-yellow-700" },
  "Validé":     { label: "Validé",      icon: CheckCircle2,  badge: "bg-emerald-50 text-emerald-700 border-emerald-200",select: "bg-emerald-50 text-emerald-700" },
  "Refusé":     { label: "Refusé",      icon: XCircle,       badge: "bg-red-50 text-red-700 border-red-200",            select: "bg-red-50 text-red-700" },
};

const TYPE_CONFIG: Record<string, { icon: any; bg: string; color: string }> = {
  "Téléphone": { icon: Phone,    bg: "bg-blue-50",   color: "text-blue-600"   },
  "Vidéo":     { icon: Video,    bg: "bg-violet-50", color: "text-violet-600" },
  "Présentiel":{ icon: User,     bg: "bg-emerald-50",color: "text-emerald-600"},
};

export default function EntretiensPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editInterview, setEditInterview] = useState<any>(null);
  const { toast } = useToast();

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/interviews");
      setInterviews(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

  const updateResult = async (id: number, result: string) => {
    try {
      await api.put(`/interviews/${id}`, { result });
      fetchInterviews();
      toast("Résultat mis à jour", "success");
    } catch { toast("Erreur", "error"); }
  };

  const upcoming = interviews.filter((i) => i.result === "En attente");
  const past     = interviews.filter((i) => i.result !== "En attente");

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Entretiens</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {upcoming.length} à venir · {past.length} passé{past.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => { setEditInterview(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Planifier
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-48 rounded" />
                  <div className="skeleton h-3 w-64 rounded" />
                </div>
                <div className="skeleton h-7 w-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-slate-700 font-semibold mb-1">Aucun entretien planifié</h3>
          <p className="text-slate-400 text-sm mb-4">Planifiez des entretiens avec vos candidats présélectionnés</p>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />Planifier un entretien</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-ring" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">À venir ({upcoming.length})</h3>
              </div>
              <div className="space-y-3 stagger">
                {upcoming.map((i) => (
                  <InterviewCard key={i.id} interview={i} onUpdate={updateResult}
                    onEdit={() => { setEditInterview(i); setShowForm(true); }} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-slate-300 rounded-full" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Passés ({past.length})</h3>
              </div>
              <div className="space-y-3 stagger">
                {past.map((i) => (
                  <InterviewCard key={i.id} interview={i} onUpdate={updateResult}
                    onEdit={() => { setEditInterview(i); setShowForm(true); }} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editInterview ? "Modifier l'entretien" : "Planifier un entretien"}
        subtitle="Coordonnez un entretien avec un candidat" size="lg">
        <InterviewForm
          initial={editInterview}
          onSuccess={() => { setShowForm(false); fetchInterviews(); toast(editInterview ? "Entretien mis à jour" : "Entretien planifié", "success"); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function InterviewCard({ interview, onUpdate, onEdit }: any) {
  const typeConf = TYPE_CONFIG[interview.interview_type] ?? TYPE_CONFIG["Présentiel"];
  const TypeIcon = typeConf.icon;
  const resultConf = RESULT_CONFIG[interview.result] ?? RESULT_CONFIG["En attente"];
  const ResultIcon = resultConf.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 animate-fade-up">
      <div className="flex items-start gap-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", typeConf.bg)}>
          <TypeIcon className={cn("w-5 h-5", typeConf.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-slate-800 text-sm">{interview.candidate_name}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500 truncate">{interview.job_title}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(interview.scheduled_at)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{interview.duration_minutes} min</span>
            {interview.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{interview.location}</span>}
            <span className="text-slate-500 font-medium">{interview.interview_type}</span>
          </div>
          {interview.notes && (
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2 italic border-l-2 border-slate-200">
              {interview.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Result selector */}
          <div className="relative">
            <select
              value={interview.result}
              onChange={(e) => onUpdate(interview.id, e.target.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-xl border cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none pr-7",
                resultConf.badge
              )}
            >
              {Object.keys(RESULT_CONFIG).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
          </div>
          <button onClick={onEdit}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
