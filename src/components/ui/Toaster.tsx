"use client";
import { useState, createContext, useContext, ReactNode, useCallback } from "react";
import { X, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast { id: string; message: string; type: ToastType; }

interface ToastCtx { toast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

const CONFIG: Record<ToastType, { icon: any; container: string; icon_cls: string }> = {
  success: { icon: CheckCircle2,  container: "bg-white border border-emerald-200 shadow-emerald-500/10", icon_cls: "text-emerald-500" },
  error:   { icon: XCircle,       container: "bg-white border border-red-200 shadow-red-500/10",     icon_cls: "text-red-500"     },
  info:    { icon: Info,           container: "bg-white border border-blue-200 shadow-blue-500/10",   icon_cls: "text-blue-500"    },
  warning: { icon: AlertTriangle,  container: "bg-white border border-yellow-200 shadow-yellow-500/10", icon_cls: "text-yellow-500" },
};

export function Toaster({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-[360px] w-full pointer-events-none">
        {toasts.map((t) => {
          const { icon: Icon, container, icon_cls } = CONFIG[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-lg pointer-events-auto animate-fade-up",
                container
              )}
            >
              <Icon className={cn("w-4.5 h-4.5 flex-shrink-0 mt-0.5", icon_cls)} size={18} />
              <p className="text-sm text-slate-700 flex-1 leading-relaxed">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
