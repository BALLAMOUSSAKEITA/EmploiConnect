"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { History } from "lucide-react";

interface Entry {
  id: number;
  user_name?: string | null;
  action: string;
  meta?: Record<string, unknown> | string | null;
  created_at: string;
}

function formatAction(action: string, meta: Entry["meta"]): string {
  if (action === "status_changed" && meta && typeof meta === "object") {
    const m = meta as Record<string, string>;
    return `Statut : ${m.old ?? "?"} → ${m.new ?? "?"}`;
  }
  if (action === "created") return "Candidature créée";
  if (action === "comment_added") return "Commentaire ajouté";
  if (action === "duplicated_from") return "Offre dupliquée à partir d’une autre";
  if (action === "template_saved") return "Modèle enregistré";
  if (action === "created_from_template") return "Offre créée depuis un modèle";
  if (action === "updated") return "Modifié";
  return action.replace(/_/g, " ");
}

export default function ActivityFeed({ kind, entityId }: { kind: "candidate" | "job"; entityId: number }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path =
      kind === "candidate" ? `/activity/candidate/${entityId}` : `/activity/job/${entityId}`;
    api
      .get(path)
      .then((r) => setEntries(r.data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [kind, entityId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="skeleton h-10 rounded-lg" />
        <div className="skeleton h-10 rounded-lg" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm flex flex-col items-center gap-2">
        <History className="w-8 h-8 opacity-40" />
        <p>Aucune activité enregistrée pour l’instant.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm border-l-2 border-indigo-200 pl-3 py-0.5">
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-medium">{formatAction(e.action, e.meta)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {e.user_name || "Utilisateur"} · {formatDateTime(e.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
