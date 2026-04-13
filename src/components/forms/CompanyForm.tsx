"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { Input, Textarea, Select, Button } from "@/components/ui/Forms";

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  sector: z.string().optional(),
  size: z.string().optional(),
  city: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ initial, onSuccess, onCancel }: Props) {
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
        await api.put(`/companies/${initial.id}`, data);
      } else {
        await api.post("/companies", data);
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
        <div className="md:col-span-2">
          <Input label="Nom de l'entreprise *" placeholder="BCRG, Orange Guinée..." {...register("name")} error={errors.name?.message} />
        </div>
        <Input label="Secteur d'activité" placeholder="Finance, Télécoms, Mines..." {...register("sector")} />
        <Select
          label="Taille"
          {...register("size")}
          options={[
            { value: "1-10", label: "1-10 employés" },
            { value: "11-50", label: "11-50 employés" },
            { value: "51-200", label: "51-200 employés" },
            { value: "201-500", label: "201-500 employés" },
            { value: "500+", label: "500+ employés" },
          ]}
        />
        <Input label="Email" type="email" placeholder="rh@entreprise.gn" {...register("email")} error={errors.email?.message} />
        <Input label="Téléphone" placeholder="+224 620 000 000" {...register("phone")} />
        <Input label="Ville" placeholder="Conakry" {...register("city")} />
        <Input label="Site web" placeholder="https://www.entreprise.gn" {...register("website")} />
        <div className="md:col-span-2">
          <Input label="Adresse" placeholder="Kaloum, Conakry..." {...register("address")} />
        </div>
        <div className="md:col-span-2">
          <Textarea label="Description" placeholder="Présentation de l'entreprise..." rows={3} {...register("description")} />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>
          {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {initial ? "Mettre à jour" : "Ajouter l'entreprise"}
        </Button>
      </div>
    </form>
  );
}
