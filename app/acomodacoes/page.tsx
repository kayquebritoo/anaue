// ============================================================
// app/acomodacoes/page.tsx
// Catálogo Completo de Acomodações — Server Component
// ============================================================

import type { Metadata } from 'next';
import { getRoomsAsync } from '@/lib/supabaseData';
import { VerticalRoomCard } from '@/components/search/VerticalRoomCard';
import { BottomNav } from '@/components/layout/BottomNav';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Todas as Acomodações — Anauê Amazônia',
  description: 'Conheça todos os nossos bangalôs, chalés e suítes ecológicas na Amazônia.',
};

export default async function AllRoomsPage() {
  const rooms = await getRoomsAsync();

  return (
    <main className="min-h-screen bg-forest-950 text-white pt-24 sm:pt-28 pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top bar com botão de retorno */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-xs text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Início</span>
          </Link>
          <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1 text-xs text-gold-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coleção Completa</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">
            Nossas Acomodações
          </h1>
          <p className="text-white/50 text-sm max-w-xl leading-relaxed">
            Cada bangalô e chalé foi projetado para integrar você à floresta amazônica com conforto, sustentabilidade e sofisticação.
          </p>
        </div>

        {/* Listagem vertical de todas as acomodações */}
        <div className="space-y-4 pt-2">
          {rooms.map((room, index) => (
            <VerticalRoomCard key={room.id} room={room} index={index} />
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
