"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button, Textarea } from "@/components/ui/Forms";
import { formatDateTime } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

interface UserOpt {
  id: number;
  full_name: string;
  email: string;
}

interface Comment {
  id: number;
  user_name?: string | null;
  body: string;
  mentioned_user_ids?: number[] | null;
  created_at: string;
}

export default function ApplicationCommentsModal({
  applicationId,
  onClose,
}: {
  applicationId: number;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [body, setBody] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/applications/${applicationId}/comments`),
      api.get("/users"),
    ])
      .then(([cRes, uRes]) => {
        setComments(cRes.data);
        setUsers(uRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [applicationId]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.post(`/applications/${applicationId}/comments`, {
        body: body.trim(),
        mentioned_user_ids: selectedMentions.length ? selectedMentions : undefined,
      });
      setBody("");
      setSelectedMentions([]);
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Notes visibles par l&apos;équipe. Mentionnez des collègues pour les alerte (sélection ci-dessous).
      </p>
      {loading ? (
        <div className="skeleton h-24 rounded-xl" />
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Aucun commentaire</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border border-slate-100 p-2.5 text-sm">
                <p className="text-slate-800 whitespace-pre-wrap">{c.body}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {c.user_name} · {formatDateTime(c.created_at)}
                  {c.mentioned_user_ids && c.mentioned_user_ids.length > 0 && (
                    <span className="ml-1">· @ {c.mentioned_user_ids.length} mention(s)</span>
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      <Textarea
        label="Nouveau commentaire"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Écrire une note… Utilisez les mentions ci-dessous pour notifier des collègues."
      />
      <div>
        <p className="text-[11px] font-medium text-slate-600 mb-1.5">Mentionner (optionnel)</p>
        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
          {users.map((u) => {
            const on = selectedMentions.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() =>
                  setSelectedMentions((prev) =>
                    on ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                  )
                }
                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                  on
                    ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {u.full_name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Fermer
        </Button>
        <Button type="button" onClick={send} disabled={sending || !body.trim()}>
          {sending && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <MessageCircle className="w-3.5 h-3.5" /> Publier
        </Button>
      </div>
    </div>
  );
}
