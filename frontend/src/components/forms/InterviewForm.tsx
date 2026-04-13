"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { Input, Textarea, Select, Button } from "@/components/ui/Forms";

const schema = z.object({
  application_id: z.coerce.number().min(1, "Candidature requise"),
  interviewer_id: z.coerce.number().min(1, "Interviewer requis"),
  interview_type: z.string().min(1, "Type requis"),
  scheduled_at: z.string().min(1, "Date et heure requises"),
  duration_minutes: z.coerce.number().default(60),
  location: z.string().optional(),
  meeting_link: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InterviewForm({ initial, onSuccess, onCancel }: Props) {
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initial ? {
      ...initial,
      scheduled_at: initial.scheduled_at ? new Date(initial.scheduled_at).toISOString().slice(0, 16) : undefined,
    } : { duration_minutes: 60 },
  });

  const interviewType = watch("interview_type");

  useEffect(() => {
    api.get("/applications").then((r) => setApplications(r.data));
    api.get("/auth/me").then((r) => setUsers([r.data]));
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const payload = { ...data, scheduled_at: new Date(data.scheduled_at).toISOString() };
      if (initial) {
        await api.put(`/interviews/${initial.id}`, payload);
      } else {
        await api.post("/interviews", payload);
      }
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

      <Select
        label="Candidature *"
        {...register("application_id")}
        error={errors.application_id?.message}
        options={applications.map((a) => ({
          value: String(a.id),
          label: `${a.candidate_name} → ${a.job_title}`,
        }))}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Type d'entretien *"
          {...register("interview_type")}
          error={errors.interview_type?.message}
          options={[
            { value: "Téléphone", label: "Téléphone" },
            { value: "Vidéo", label: "Vidéo" },
            { value: "Présentiel", label: "Présentiel" },
          ]}
        />
        <Select
          label="Interviewer *"
          {...register("interviewer_id")}
          error={errors.interviewer_id?.message}
          options={users.map((u) => ({ value: String(u.id), label: u.full_name }))}
        />
        <Input label="Date et heure *" type="datetime-local" {...register("scheduled_at")} error={errors.scheduled_at?.message} />
        <Input label="Durée (minutes)" type="number" placeholder="60" {...register("duration_minutes")} />
      </div>

      {interviewType === "Présentiel" && (
        <Input label="Lieu" placeholder="Bureau, adresse..." {...register("location")} />
      )}
      {interviewType === "Vidéo" && (
        <Input label="Lien de réunion" placeholder="https://meet.google.com/..." {...register("meeting_link")} />
      )}

      <Textarea label="Notes / Instructions" placeholder="Points à aborder, documents à apporter..." rows={3} {...register("notes")} />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>
          {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {initial ? "Mettre à jour" : "Planifier l'entretien"}
        </Button>
      </div>
    </form>
  );
}
