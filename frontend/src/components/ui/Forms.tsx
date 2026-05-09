import { cn } from "@/lib/utils";
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full bg-white border rounded-[var(--radius-lg)] px-3.5 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 shadow-[var(--shadow-sm)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-[box-shadow,border-color,background-color] duration-150",
          "disabled:bg-slate-50 disabled:text-slate-400",
          error ? "border-red-300 focus:ring-red-500/25 focus:border-red-400" : "border-[var(--border)] hover:border-[var(--border-strong)]",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 flex items-center gap-1">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={3}
        className={cn(
          "w-full bg-white border rounded-[var(--radius-lg)] px-3.5 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 shadow-[var(--shadow-sm)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-[box-shadow,border-color] duration-150 resize-y min-h-[5rem]",
          error ? "border-red-300" : "border-[var(--border)] hover:border-[var(--border-strong)]",
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }>(
  ({ label, error, className, options, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em]">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          "w-full bg-white border rounded-[var(--radius-lg)] px-3.5 py-2.5 text-[13px] text-slate-900 shadow-[var(--shadow-sm)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-[box-shadow,border-color] duration-150 appearance-none",
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19 9-7 7-7-7'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:14px_14px] pr-9",
          error ? "border-red-300" : "border-[var(--border)] hover:border-[var(--border-strong)]",
          className
        )}
        {...props}
      >
        <option value="">Sélectionner...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ children, variant = "primary", size = "md", loading, className, disabled, ...props }: ButtonProps) {
  const variants = {
    primary:
      "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm shadow-indigo-900/10 hover:shadow-md hover:shadow-indigo-900/10 ring-1 ring-black/[0.04]",
    secondary: "bg-slate-100/90 text-slate-800 hover:bg-slate-200/90 border border-[var(--border)]",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm ring-1 ring-red-900/10",
    ghost: "text-slate-600 hover:bg-slate-100/90",
    outline: "border border-[var(--border)] text-slate-800 hover:bg-slate-50 hover:border-[var(--border-strong)] bg-white shadow-[var(--shadow-sm)]",
  };
  const sizes = {
    xs: "px-2.5 py-1 text-[11px] rounded-[var(--radius-md)]",
    sm: "px-3 py-1.5 text-xs rounded-[var(--radius-md)]",
    md: "px-4 py-2.5 text-[13px] rounded-[var(--radius-lg)]",
    lg: "px-5 py-3 text-[15px] rounded-[var(--radius-lg)]",
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "font-semibold transition-[transform,box-shadow,background-color,border-color] duration-150 disabled:opacity-60 flex items-center gap-2 active:scale-[0.98]",
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {loading && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />}
      {children}
    </button>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em]">{title}</h4>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
      </div>
      {children}
    </div>
  );
}
