'use client';

// ============================================================
// components/checkout/BookingComingSoon.tsx
// Tela exibida no checkout enquanto as reservas online estão
// desabilitadas (modo pré-lançamento).
// ============================================================

import Link from 'next/link';
import { CalendarClock, Home, MessageCircle, Trees } from 'lucide-react';
import { ONLINE_BOOKING_DISABLED_MESSAGE, getContactWhatsApp } from '@/lib/launchMode';

export function BookingComingSoon({ roomName }: { roomName?: string | null }) {
  const whatsapp = getContactWhatsApp();
  const text = encodeURIComponent(
    `Olá! Gostaria de consultar disponibilidade${roomName ? ` para ${roomName}` : ''} no Anauê Amazônia. 🌿`
  );

  return (
    <div className="min-h-screen gradient-amazon flex items-center justify-center px-4 py-16">
      <div className="glass-dark rounded-3xl p-8 sm:p-10 max-w-md w-full border border-white/10 shadow-2xl text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-forest-500/20 border border-forest-400/30 flex items-center justify-center">
          <CalendarClock className="w-7 h-7 text-forest-300" aria-hidden />
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-300/80 font-semibold">Em breve</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">Reservas online</h1>
          <p className="text-white/65 text-sm leading-relaxed">{ONLINE_BOOKING_DISABLED_MESSAGE}</p>
        </div>
        <div className="grid gap-3 pt-2">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${text}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-forest-500 hover:bg-forest-400 text-white text-sm font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" aria-hidden />
              Falar com a equipe no WhatsApp
            </a>
          )}
          <Link
            href="/acomodacoes"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl glass border border-white/10 text-white text-sm font-medium hover:border-white/25 transition-colors"
          >
            <Trees className="w-4 h-4" aria-hidden />
            Conhecer as acomodações
          </Link>
          <Link href="/" className="flex items-center justify-center gap-2 py-2 text-white/50 hover:text-white text-sm transition-colors">
            <Home className="w-4 h-4" aria-hidden />
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
