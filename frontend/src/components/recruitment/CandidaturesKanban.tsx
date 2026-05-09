"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { cn, formatDate, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, GripVertical } from "lucide-react";

export interface KanbanApplication {
  id: number;
  candidate_id: number;
  job_post_id: number;
  status: string;
  candidate_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  applied_at: string;
}

const STATUS_ORDER = [
  "Candidature reçue",
  "Présélection",
  "Entretien",
  "Offre envoyée",
  "Embauché",
  "Refusé",
];

function ColumnDrop({ status, children }: { status: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[280px] rounded-xl border-2 border-dashed p-2 transition-colors",
        isOver ? "border-indigo-300 bg-indigo-50/40" : "border-slate-100 bg-slate-50/30"
      )}
    >
      {children}
    </div>
  );
}

function AppCard({ app }: { app: KanbanApplication }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(app.id) });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div
        className={cn(
          "bg-white rounded-xl border border-slate-100 p-3 shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
          isDragging && "opacity-60 shadow-lg ring-2 ring-indigo-200"
        )}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <Link
              href={`/candidats/${app.candidate_id}`}
              className="text-sm font-medium text-slate-800 hover:text-indigo-600 block truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {app.candidate_name || "Candidat"}
            </Link>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
              <Briefcase className="w-3 h-3 flex-shrink-0" />
              <Link href={`/offres/${app.job_post_id}`} onClick={(e) => e.stopPropagation()} className="truncate hover:text-indigo-600">
                {app.job_title || "—"}
              </Link>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{app.company_name} · {formatDate(app.applied_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  applications: KanbanApplication[];
  onStatusChange: (applicationId: number, newStatus: string) => Promise<void>;
}

export default function CandidaturesKanban({ applications, onStatusChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const appId = Number(active.id);
    let newStatus: string | null = null;
    if (typeof over.id === "string" && STATUS_ORDER.includes(over.id)) {
      newStatus = over.id;
    } else {
      const overApp = applications.find((a) => String(a.id) === String(over.id));
      if (overApp) newStatus = overApp.status;
    }
    if (!newStatus) return;
    const prev = applications.find((a) => a.id === appId);
    if (!prev || prev.status === newStatus) return;
    await onStatusChange(appId, newStatus);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {STATUS_ORDER.map((status) => {
          const colApps = applications.filter((a) => a.status === status);
          return (
            <div key={status} className="flex-shrink-0 w-[280px] snap-start">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide truncate pr-2">{status}</h3>
                <span className="text-[11px] font-bold text-slate-400 tabular-nums">{colApps.length}</span>
              </div>
              <ColumnDrop status={status}>
                {colApps.map((app) => (
                  <AppCard key={app.id} app={app} />
                ))}
              </ColumnDrop>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}

export { STATUS_ORDER as KANBAN_STATUS_ORDER };
