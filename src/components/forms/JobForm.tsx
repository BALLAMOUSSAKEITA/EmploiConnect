"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { Input, Textarea, Select, Button } from "@/components/ui/Forms";

const schema = z.object({
  title: z.string().min(2, "Titre requis"),
  description: z.string().min(10, "Description requise"),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  job_type: z.string().optional(),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
  experience_years: z.coerce.number().optional(),
  education_level: z.string().optional(),
  status: z.string().optional(),
  company_id: z.coerce.number().min(1, "Entreprise requise"),
  deadline: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function JobForm({ initial, onSuccess, onCancel }: Props) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initial ? {
      ...initial,
      company_id: initial.company?.id || initial.company_id,
      deadline: initial.deadline ? new Date(initial.deadline).toISOString().split("T")[0] : undefined,
    } : {},
  });

  useEffect(() => {
    api.get("/companies").then((r) => setCompanies(r.data));
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = { ...data, deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined };
      if (initial) {
        await api.put(`/jobs/${initial.id}`, payload);
      } else {
        await api.post("/jobs", payload);
      }
      onSuccess();
    } catch (e: any) {
      console.error(e?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input label="Titre du poste *" placeholder="Ex: Directeur Financier" {...register("title")} error={errors.title?.message} />
        </div>
        <Select
          label="Entreprise *"
          {...register("company_id")}
          error={errors.company_id?.message}
          options={companies.map((c) => ({ value: String(c.id), label: c.name }))}
        />
        <Select
          label="Type de contrat"
          {...register("job_type")}
          options={[
            { value: "CDI", label: "CDI" },
            { value: "CDD", label: "CDD" },
            { value: "Stage", label: "Stage" },
            { value: "Freelance", label: "Freelance" },
            { value: "Temps partiel", label: "Temps partiel" },
          ]}
        />
        <Input label="Ville" placeholder="Conakry" {...register("city")} />
        <Select
          label="Statut"
          {...register("status")}
          options={[
            { value: "open", label: "Ouvert" },
            { value: "draft", label: "Brouillon" },
            { value: "paused", label: "En pause" },
            { value: "closed", label: "Fermé" },
          ]}
        />
        <Input label="Salaire minimum (GNF)" type="number" placeholder="5000000" {...register("salary_min")} />
        <Input label="Salaire maximum (GNF)" type="number" placeholder="10000000" {...register("salary_max")} />
        <Input label="Années d'expérience" type="number" placeholder="3" {...register("experience_years")} />
        <Input label="Niveau d'études" placeholder="Bac+5, Master..." {...register("education_level")} />
        <Input label="Date limite" type="date" {...register("deadline")} />
      </div>
      <Textarea label="Description du poste *" placeholder="Décrivez le poste en détail..." rows={4} {...register("description")} error={errors.description?.message} />
      <Textarea label="Missions & responsabilités" placeholder="Listez les principales missions..." rows={3} {...register("responsibilities")} />
      <Textarea label="Profil recherché" placeholder="Compétences, qualités requises..." rows={3} {...register("requirements")} />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>
          {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {initial ? "Mettre à jour" : "Créer l'offre"}
        </Button>
      </div>
    </form>
  );
}
