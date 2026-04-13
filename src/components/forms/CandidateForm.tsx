"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { Input, Textarea, Select, Button } from "@/components/ui/Forms";

const schema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  city: z.string().optional(),
  nationality: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  current_position: z.string().optional(),
  current_company: z.string().optional(),
  experience_years: z.coerce.number().optional(),
  education_level: z.string().optional(),
  skills: z.string().optional(),
  languages: z.string().optional(),
  linkedin_url: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CandidateForm({ initial, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initial || {},
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      if (initial) {
        await api.put(`/candidates/${initial.id}`, data);
      } else {
        await api.post("/candidates", data);
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Une erreur s'est produite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Prénom *" placeholder="Alpha" {...register("first_name")} error={errors.first_name?.message} />
        <Input label="Nom *" placeholder="Diallo" {...register("last_name")} error={errors.last_name?.message} />
        <Input label="Email *" type="email" placeholder="alpha.diallo@example.com" {...register("email")} error={errors.email?.message} />
        <Input label="Téléphone" placeholder="+224 620 000 000" {...register("phone")} />
        <Input label="Ville" placeholder="Conakry" {...register("city")} />
        <Input label="Nationalité" placeholder="Guinéenne" {...register("nationality")} />
        <Input label="Date de naissance" type="date" {...register("date_of_birth")} />
        <Select label="Genre" {...register("gender")} options={[{ value: "Homme", label: "Homme" }, { value: "Femme", label: "Femme" }]} />
        <Input label="Poste actuel" placeholder="Ingénieur financier" {...register("current_position")} />
        <Input label="Entreprise actuelle" placeholder="BCRG" {...register("current_company")} />
        <Input label="Années d'expérience" type="number" placeholder="5" {...register("experience_years")} />
        <Input label="Niveau d'études" placeholder="Bac+5, Master..." {...register("education_level")} />
      </div>

      <Input label="Compétences (séparées par virgule)" placeholder="Excel, Comptabilité, Management, ..." {...register("skills")} />
      <Input label="Langues (séparées par virgule)" placeholder="Français, Anglais, Peul, ..." {...register("languages")} />
      <Input label="LinkedIn" placeholder="https://linkedin.com/in/..." {...register("linkedin_url")} />
      <Textarea label="Notes internes" placeholder="Observations, disponibilité, prétentions salariales..." rows={3} {...register("notes")} />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>
          {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {initial ? "Mettre à jour" : "Ajouter le candidat"}
        </Button>
      </div>
    </form>
  );
}
