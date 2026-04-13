import { cn } from "@/lib/utils";
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full bg-white border rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all",
          "disabled:bg-slate-50 disabled:text-slate-400",
          error ? "border-red-300 focus:ring-red-500/20 focus:border-red-400" : "border-slate-200 hover:border-slate-300",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={3}
        className={cn(
          "w-full bg-white border rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none",
          error ? "border-red-300" : "border-slate-200 hover:border-slate-300",
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-red-500">⚠ {error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }>(
  ({ label, error, className, options, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          "w-full bg-white border rounded-xl px-3 py-2.5 text-sm text-slate-900",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none",
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19 9-7 7-7-7'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:14px_14px] pr-9",
          error ? "border-red-300" : "border-slate-200 hover:border-slate-300",
          className
        )}
        {...props}
      >
        <option value="">Sélectionner...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-500">⚠ {error}</p>}
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
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/20",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
  };
  const sizes = {
    xs: "px-2.5 py-1 text-[11px]",
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "rounded-xl font-medium transition-all duration-150 disabled:opacity-60 flex items-center gap-2 active:scale-[0.97]",
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
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h4>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      {children}
    </div>
  );
}
