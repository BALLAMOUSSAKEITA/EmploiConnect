"use client";
import { ReactNode, useEffect } from "react";
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
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={cn(
        "relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-up",
        sizes[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <X className="w-4.5 h-4.5" size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
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
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn("flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm", colors.btn)}
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
