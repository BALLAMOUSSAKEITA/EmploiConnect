"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/Forms";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDateTime } from "@/lib/utils";
import { Plus, Calendar, Clock, MapPin, Video, Phone, User, CheckCircle2, XCircle, AlertCircle, ChevronDown, ClipboardList, List, LayoutGrid, ChevronLeft, ChevronRight, Download } from "lucide-react";
import InterviewForm from "@/components/forms/InterviewForm";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";

type ScoreItem = { label: string; score: number; max: number };

const DEFAULT_SCORECARD_ITEMS: ScoreItem[] = [
  { label: "Compétences techniques", score: 0, max: 5 },
  { label: "Communication", score: 0, max: 5 },
  { label: "Adéquation au poste", score: 0, max: 5 },
  { label: "Motivation", score: 0, max: 5 },
];

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EntretiensPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editInterview, setEditInterview] = useState<any>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/interviews", { params: { limit: 500 } });
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

  const downloadSingleIcs = async (id: number) => {
    try {
      const res = await api.get("/export/interviews.ics", { params: { interview_id: id }, responseType: "blob" });
      downloadBlob(res.data, `entretien-${id}.ics`);
      toast("Fichier .ics téléchargé — importez-le dans votre agenda", "success");
    } catch {
      toast("Erreur d’export", "error");
    }
  };

  const upcoming = interviews.filter((i) => i.result === "En attente");
  const past     = interviews.filter((i) => i.result !== "En attente");

  const exportMonthIcs = async () => {
    const month = format(cursorMonth, "yyyy-MM");
    try {
      const res = await api.get("/export/interviews.ics", { params: { month }, responseType: "blob" });
      downloadBlob(res.data, `entretiens-${month}.ics`);
      toast("Fichier calendrier téléchargé (ouvrez-le dans Outlook, Google Agenda…)", "success");
    } catch {
      toast("Impossible de générer le fichier", "error");
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Entretiens</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {upcoming.length} à venir · {past.length} passé{past.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <List className="w-3.5 h-3.5" /> Liste
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === "calendar" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Calendrier
            </button>
          </div>
          {view === "calendar" && (
            <Button variant="secondary" size="sm" type="button" onClick={exportMonthIcs}>
              <Download className="w-3.5 h-3.5" /> .ics du mois
            </Button>
          )}
          <Button onClick={() => { setEditInterview(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Planifier
          </Button>
        </div>
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
          <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
            Créez d’abord une <Link href="/candidatures" className="text-indigo-600 font-medium hover:underline">candidature</Link>
            {" "}(candidat + offre), puis planifiez un entretien à partir de cette candidature.
          </p>
        </div>
      ) : view === "calendar" ? (
        <InterviewsMonthCalendar
          interviews={interviews}
          cursorMonth={cursorMonth}
          onPrevMonth={() => setCursorMonth((d) => subMonths(d, 1))}
          onNextMonth={() => setCursorMonth((d) => addMonths(d, 1))}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onUpdateResult={updateResult}
          onEdit={(i) => { setEditInterview(i); setShowForm(true); }}
          onRefresh={fetchInterviews}
        />
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
                    onEdit={() => { setEditInterview(i); setShowForm(true); }}
                    onRefresh={fetchInterviews}
                    onDownloadIcs={downloadSingleIcs} />
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
                    onEdit={() => { setEditInterview(i); setShowForm(true); }}
                    onRefresh={fetchInterviews}
                    onDownloadIcs={downloadSingleIcs} />
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

function InterviewsMonthCalendar({
  interviews,
  cursorMonth,
  onPrevMonth,
  onNextMonth,
  selectedDay,
  onSelectDay,
  onUpdateResult,
  onEdit,
  onRefresh,
}: {
  interviews: any[];
  cursorMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDay: Date | null;
  onSelectDay: (d: Date | null) => void;
  onUpdateResult: (id: number, result: string) => void;
  onEdit: (i: any) => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const i of interviews) {
      try {
        const d = parseISO(i.scheduled_at);
        if (Number.isNaN(d.getTime())) continue;
        const k = format(d, "yyyy-MM-dd");
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(i);
      } catch {
        /* ignore */
      }
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    }
    return m;
  }, [interviews]);

  const monthStart = startOfMonth(cursorMonth);
  const monthEnd = endOfMonth(cursorMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const dayList = selectedKey ? (byDay.get(selectedKey) ?? []) : [];

  const dlIcs = async (id: number) => {
    try {
      const res = await api.get("/export/interviews.ics", { params: { interview_id: id }, responseType: "blob" });
      downloadBlob(res.data, `entretien-${id}.ics`);
      toast("Fichier .ics téléchargé", "success");
    } catch {
      toast("Erreur", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-4 py-3">
        <button type="button" onClick={onPrevMonth} className="p-2 rounded-xl hover:bg-slate-50 text-slate-600" aria-label="Mois précédent">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-semibold text-slate-800 capitalize">
          {format(cursorMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <button type="button" onClick={onNextMonth} className="p-2 rounded-xl hover:bg-slate-50 text-slate-600" aria-label="Mois suivant">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[560px]">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((w) => (
            <div key={w} className="text-center text-[10px] font-semibold text-slate-400 py-2 uppercase tracking-wide">
              {w}
            </div>
          ))}
          {days.map((day) => {
            const k = format(day, "yyyy-MM-dd");
            const list = byDay.get(k) ?? [];
            const inMonth = isSameMonth(day, cursorMonth);
            const isToday = isSameDay(day, today);
            const sel = selectedDay ? isSameDay(day, selectedDay) : false;
            return (
              <button
                type="button"
                key={k}
                onClick={() => onSelectDay(day)}
                className={cn(
                  "min-h-[72px] sm:min-h-[88px] rounded-xl border p-1.5 text-left transition-all",
                  inMonth ? "bg-white border-slate-100 hover:border-indigo-200" : "bg-slate-50/50 border-transparent text-slate-300",
                  isToday && "ring-2 ring-indigo-400/40",
                  sel && "border-indigo-400 bg-indigo-50/40"
                )}
              >
                <span className={cn("text-xs font-semibold", inMonth ? "text-slate-800" : "text-slate-400")}>
                  {format(day, "d")}
                </span>
                <div className="mt-1 flex flex-wrap gap-0.5 items-center">
                  {list.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0"
                      title={`${ev.candidate_name} · ${format(parseISO(ev.scheduled_at), "HH:mm")}`}
                    />
                  ))}
                  {list.length > 3 && (
                    <span className="text-[9px] text-slate-400 font-medium">+{list.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          {selectedDay
            ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })
            : "Sélectionnez un jour"}
        </h4>
        {!selectedDay ? (
          <p className="text-sm text-slate-400">
            Cliquez sur une date pour afficher les créneaux. Utilisez « .ics du mois » pour importer tout le mois dans Outlook, Google Agenda ou Apple Calendrier.
          </p>
        ) : dayList.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun entretien ce jour-là.</p>
        ) : (
          <div className="space-y-3">
            {dayList.map((i) => (
              <InterviewCard
                key={i.id}
                interview={i}
                onUpdate={onUpdateResult}
                onEdit={() => onEdit(i)}
                onRefresh={onRefresh}
                onDownloadIcs={dlIcs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewCard({
  interview,
  onUpdate,
  onEdit,
  onRefresh,
  onDownloadIcs,
}: {
  interview: Record<string, unknown>;
  onUpdate: (id: number, result: string) => void;
  onEdit: () => void;
  onRefresh: () => void;
  onDownloadIcs?: (id: number) => void;
}) {
  const typeConf = TYPE_CONFIG[String(interview.interview_type)] ?? TYPE_CONFIG["Présentiel"];
  const TypeIcon = typeConf.icon;
  const resultConf = RESULT_CONFIG[String(interview.result)] ?? RESULT_CONFIG["En attente"];
  const avg = interview.scorecard_average_pct as number | null | undefined;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 animate-fade-up">
      <div className="flex items-start gap-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", typeConf.bg)}>
          <TypeIcon className={cn("w-5 h-5", typeConf.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-slate-800 text-sm">{String(interview.candidate_name)}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500 truncate">{String(interview.job_title)}</span>
            {avg != null && (
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Grille {avg}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(String(interview.scheduled_at))}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Number(interview.duration_minutes)} min</span>
            {interview.location != null && interview.location !== "" && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{String(interview.location)}</span>
            )}
            <span className="text-slate-500 font-medium">{String(interview.interview_type)}</span>
          </div>
          {interview.notes != null && String(interview.notes).length > 0 && (
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2 italic border-l-2 border-slate-200">
              {String(interview.notes)}
            </p>
          )}
          <InterviewScorecardSection interview={interview} onSaved={onRefresh} />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Result selector */}
          <div className="relative">
            <select
              value={String(interview.result)}
              onChange={(e) => onUpdate(Number(interview.id), e.target.value)}
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
          <button type="button" onClick={onEdit}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            </svg>
          </button>
          {onDownloadIcs && (
            <button
              type="button"
              title="Télécharger .ics (agenda)"
              onClick={() => onDownloadIcs(Number(interview.id))}
              className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InterviewScorecardSection({
  interview,
  onSaved,
}: {
  interview: Record<string, unknown>;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ScoreItem[]>(() => DEFAULT_SCORECARD_ITEMS.map((x) => ({ ...x })));
  const [globalNote, setGlobalNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sc = interview.scorecard as { items?: ScoreItem[]; global_note?: string } | null | undefined;
    if (sc?.items?.length) {
      setItems(sc.items.map((it) => ({ label: it.label, score: it.score, max: it.max })));
      setGlobalNote(sc.global_note ?? "");
    } else {
      setItems(DEFAULT_SCORECARD_ITEMS.map((x) => ({ ...x })));
      setGlobalNote("");
    }
  }, [open, interview.scorecard]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/interviews/${interview.id}`, {
        scorecard: {
          items: items.map((it) => ({
            label: it.label.trim() || "Critère",
            score: Math.min(Math.max(0, it.score), it.max),
            max: Math.min(10, Math.max(1, it.max)),
          })),
          global_note: globalNote.trim() || null,
        },
      });
      toast("Grille enregistrée", "success");
      onSaved();
      setOpen(false);
    } catch {
      toast("Erreur d’enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border border-slate-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
          Grille d&apos;évaluation
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3 bg-white border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Notez chaque critère (scorecards type ATS). La moyenne est calculée automatiquement.
          </p>
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <input
                  value={it.label}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setItems(next);
                  }}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5"
                  placeholder="Critère"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={it.max}
                    value={it.score}
                    onChange={(e) => {
                      const next = [...items];
                      const v = Number(e.target.value);
                      next[idx] = { ...next[idx], score: Number.isFinite(v) ? v : 0 };
                      setItems(next);
                    }}
                    className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-center"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={it.max}
                    onChange={(e) => {
                      const next = [...items];
                      const v = Number(e.target.value);
                      next[idx] = { ...next[idx], max: Number.isFinite(v) ? v : 5 };
                      setItems(next);
                    }}
                    className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-center"
                  />
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, { label: "Nouveau critère", score: 0, max: 5 }])}
            className="text-[11px] text-indigo-600 font-medium hover:underline"
          >
            + Ajouter un critère
          </button>
          <textarea
            value={globalNote}
            onChange={(e) => setGlobalNote(e.target.value)}
            placeholder="Commentaire global pour ce passage…"
            rows={2}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? "…" : "Enregistrer la grille"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
