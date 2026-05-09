"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { Select, Textarea, Button } from "@/components/ui/Forms";
import { JOB_STATUS_LABELS } from "@/lib/utils";

const schema = z.object({
  candidate_id: z.coerce.number().min(1, "Candidat requis"),
  job_post_id: z.coerce.number().min(1, "Offre requise"),
  cover_letter: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  candidateId?: number;
  jobId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ApplicationForm({ candidateId, jobId, onSuccess, onCancel }: Props) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      candidate_id: candidateId,
      job_post_id: jobId,
    },
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setListsLoading(true);
      setListsError("");
      try {
        const needCandidates = !candidateId;
        const needJobs = !jobId;
        const [cRes, jRes] = await Promise.all([
          needCandidates ? api.get("/candidates") : Promise.resolve({ data: [] }),
          needJobs ? api.get("/jobs", { params: { limit: 200 } }) : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        if (needCandidates) setCandidates(cRes.data);
        if (needJobs) {
          const rows = Array.isArray(jRes.data) ? jRes.data : [];
          setJobs(rows.filter((j: any) => j.status !== "closed"));
        }
      } catch {
        if (!cancelled) {
          setListsError("Impossible de charger les listes. Vérifiez la connexion ou réessayez.");
          setCandidates([]);
          setJobs([]);
        }
      } finally {
        if (!cancelled) setListsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [candidateId, jobId]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      await api.post("/applications", data);
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {listsError && <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-sm">{listsError}</div>}

      {!candidateId && (
        <div className={listsLoading ? "opacity-70 pointer-events-none" : ""}>
          <Select
            label="Candidat *"
            {...register("candidate_id")}
            error={errors.candidate_id?.message}
            options={candidates.map((c) => ({ value: String(c.id), label: `${c.first_name} ${c.last_name}` }))}
          />
          {!listsLoading && candidates.length === 0 && (
            <p className="text-[11px] text-slate-500 mt-1">Aucun candidat dans le vivier — ajoutez-en depuis Candidats.</p>
          )}
        </div>
      )}
      {!jobId && (
        <div className={listsLoading ? "opacity-70 pointer-events-none" : ""}>
          <Select
            label="Offre d'emploi *"
            {...register("job_post_id")}
            error={errors.job_post_id?.message}
            options={jobs.map((j) => ({
              value: String(j.id),
              label: `${j.title}${j.company?.name ? ` — ${j.company.name}` : ""}${
                j.status && j.status !== "open"
                  ? ` (${JOB_STATUS_LABELS[j.status] || j.status})`
                  : ""
              }`,
            }))}
          />
          {!listsLoading && jobs.length === 0 && (
            <p className="text-[11px] text-slate-500 mt-1">
              Aucune offre disponible (les offres fermées sont masquées). Créez ou rouvrez une offre dans Offres d&apos;emploi.
            </p>
          )}
        </div>
      )}
      <Textarea label="Lettre de motivation" placeholder="Motivations du candidat pour ce poste..." rows={4} {...register("cover_letter")} />
      <Textarea label="Notes internes" placeholder="Commentaires de l'agent RH..." rows={2} {...register("notes")} />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading || listsLoading}>
          {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Créer la candidature
        </Button>
      </div>
    </form>
  );
}
