import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number, currency = "GNF") {
  return new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: currency === "GNF" ? "GNF" : "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const STATUS_COLORS: Record<string, string> = {
  "Candidature reçue": "bg-blue-100 text-blue-700",
  "Présélection": "bg-yellow-100 text-yellow-700",
  "Entretien": "bg-purple-100 text-purple-700",
  "Offre envoyée": "bg-orange-100 text-orange-700",
  "Embauché": "bg-green-100 text-green-700",
  "Refusé": "bg-red-100 text-red-700",
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
  draft: "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  "En attente": "bg-yellow-100 text-yellow-700",
  "Validé": "bg-green-100 text-green-700",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  closed: "Fermé",
  draft: "Brouillon",
  paused: "En pause",
};
