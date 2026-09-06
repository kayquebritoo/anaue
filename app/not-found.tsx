// ============================================================
// app/not-found.tsx
// Página 404 Estilizada — Identidade Visual Anauê Amazônia
// ============================================================

import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-forest-950 text-white flex items-center justify-center p-5">
      <div className="glass-dark rounded-4xl p-8 sm:p-12 max-w-lg w-full text-center space-y-6 border border-white/10 shadow-2xl">
        <div className="w-20 h-20 rounded-3xl glass-gold mx-auto flex items-center justify-center text-gold-400">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-gold-400 uppercase tracking-widest">
            Erro 404 · Trilha Desconhecida
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
            Página Não Encontrada
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Parece que esta trilha ou acomodação não existe no mapa do Anauê Amazônia. Retorne ao refúgio principal para continuar explorando.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-forest-500 hover:bg-forest-400 text-white font-semibold text-sm transition-colors shadow-lg shadow-forest-900/50"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Link>
          <Link
            href="/busca"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full glass hover:bg-white/10 text-white/90 font-medium text-sm transition-colors border border-white/15"
          >
            <Search className="w-4 h-4" />
            <span>Buscar Acomodações</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
