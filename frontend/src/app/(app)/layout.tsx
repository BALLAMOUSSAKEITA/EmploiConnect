"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--sidebar-bg)]">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/25 mb-5">
          E
        </div>
        <div
          className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mb-4"
          aria-hidden
        />
        <p className="text-slate-400 text-sm font-medium tracking-wide">Chargement de l’espace…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sidebar-bg)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 rounded-tl-2xl sm:rounded-tl-3xl bg-[var(--bg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <Header />
        <main className="flex-1 overflow-y-auto bg-app-main min-h-0">
          <div className="p-5 lg:p-8 max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
