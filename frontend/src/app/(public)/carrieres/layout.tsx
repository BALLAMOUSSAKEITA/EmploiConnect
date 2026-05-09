import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offres d’emploi — EmploiConnect",
  description: "Découvrez les postes ouverts et postulez en ligne — Guinée",
};

export default function CarrieresLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/carrieres" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm shadow-sm">
              E
            </span>
            EmploiConnect
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/carrieres" className="text-slate-600 hover:text-indigo-600 transition-colors">
              Offres
            </Link>
            <Link
              href="/login"
              className="text-indigo-600 font-medium hover:text-indigo-700"
            >
              Espace RH
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
