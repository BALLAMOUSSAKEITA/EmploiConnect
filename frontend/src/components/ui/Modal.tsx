"use client";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

export function Modal({ open, onClose, title, subtitle, children, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const hasHeader = Boolean(title?.trim() || subtitle?.trim());

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[6px] transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasHeader ? "modal-title" : undefined}
        className={cn(
          "relative w-full max-h-[min(90vh,880px)] overflow-hidden flex flex-col animate-fade-up",
          "bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] ring-1 ring-slate-900/[0.06]",
          sizes[size],
        )}
      >
        {hasHeader ? (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100/90 bg-gradient-to-b from-slate-50/80 to-white sticky top-0 z-10">
            <div className="min-w-0 pt-0.5">
              {title?.trim() ? (
                <h3 id="modal-title" className="text-[15px] font-semibold text-slate-900 tracking-tight">
                  {title}
                </h3>
              ) : null}
              {subtitle ? <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -m-1 hover:bg-slate-100 rounded-[var(--radius-md)] text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
              aria-label="Fermer"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 rounded-[var(--radius-md)] text-slate-400 hover:text-slate-700 hover:bg-slate-100/90 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
        <div className={cn("overflow-y-auto flex-1", hasHeader ? "px-6 py-5" : "p-6 pt-14")}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmer", loading, variant = "danger" }: ConfirmModalProps) {
  const colors = variant === "danger"
    ? { icon: "bg-red-50 text-red-500", btn: "bg-red-500 hover:bg-red-600", ring: "ring-red-100" }
    : { icon: "bg-yellow-50 text-yellow-500", btn: "bg-yellow-500 hover:bg-yellow-600", ring: "ring-yellow-100" };

  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="text-center pb-2">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ring-4", colors.icon, colors.ring)}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-[13px] font-semibold border border-[var(--border)] rounded-[var(--radius-lg)] hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 px-4 py-2.5 text-[13px] font-semibold text-white rounded-[var(--radius-lg)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm",
              colors.btn,
            )}
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
