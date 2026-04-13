import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline";
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      variant === "outline" && "border",
      className
    )}>
      {children}
    </span>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  trend?: string;
}

export function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">📋</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
