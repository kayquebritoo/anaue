'use client';

// ============================================================
// components/layout/Footer.tsx
// Rodapé discreto do site público + acesso à Área Restrita (/admin/login)
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, CalendarDays } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();

  // Não renderizar o rodapé público no painel administrativo (/admin)
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="relative z-10 border-t border-white/8" aria-label="Rodapé">
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-8 md:pt-10 pb-24 md:pb-8 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4">
        <p className="text-white/30 text-xs tracking-wide">
          © {new Date().getFullYear()} Anauê Amazônia — Refúgio Ecológico
        </p>

        <div className="flex items-center gap-2">
          {/* Consultar reserva */}
          <Link
            href="/minhas-reservas"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/5 text-xs font-medium"
            aria-label="Consultar sua reserva"
          >
            <CalendarDays className="w-3 h-3 text-forest-400" />
            <span>Minhas Reservas</span>
          </Link>

          {/* Acesso discreto ao painel administrativo */}
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/5 text-xs font-medium"
            aria-label="Acessar área restrita de gestão"
          >
            <Lock className="w-3 h-3 text-gold-400" />
            <span>Área Restrita</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
