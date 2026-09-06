'use client';

// ============================================================
// app/busca/page.tsx
// Página de Resultados de Busca — Client Component
// ============================================================

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getRooms } from '@/lib/mockData';
import {
  getRoomsAsync,
  getUnavailableRoomIdsAsync,
} from '@/lib/supabaseData';
import { SearchFiltersBar, type FilterCategory } from '@/components/search/SearchFiltersBar';
import { VerticalRoomCard } from '@/components/search/VerticalRoomCard';
import { BottomNav } from '@/components/layout/BottomNav';
import { Compass, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import type { Room } from '@/types';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const guests = parseInt(searchParams.get('guests') || '2', 10);
  const initialType = (searchParams.get('type') as FilterCategory) || 'todos';

  const hasDates = Boolean(checkIn && checkOut);

  const [activeFilter, setActiveFilter] = useState<FilterCategory>(initialType);

  // Pintura imediata com mock; em seguida sincroniza com Supabase
  const [allRooms, setAllRooms] = useState<Room[]>(() => getRooms());
  // IDs de quartos com conflito de agenda para o intervalo buscado
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rooms, unavailable] = await Promise.all([
        getRoomsAsync(),
        hasDates && checkIn && checkOut
          ? getUnavailableRoomIdsAsync(checkIn, checkOut)
          : Promise.resolve(new Set<string>()),
      ]);
      if (cancelled) return;
      setAllRooms(rooms);
      setUnavailableIds(unavailable);
    })();
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, hasDates]);

  // Query string carregada adiante: Busca → Detalhes → Checkout
  const carryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (checkIn) p.set('checkIn', checkIn);
    if (checkOut) p.set('checkOut', checkOut);
    p.set('guests', String(guests));
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [checkIn, checkOut, guests]);

  const filteredRooms = useMemo(() => {
    return allRooms.filter((room) => {
      // Filtro por hóspedes
      if (guests > room.maxGuests) return false;

      // Filtro por categoria / tag selecionada
      if (activeFilter === 'todos') return true;
      if (activeFilter === 'piscina') {
        return room.amenities.some((a) => a.name.toLowerCase().includes('piscina')) || room.tags.includes('piscina');
      }
      if (activeFilter === 'vista-rio') {
        return room.tags.includes('vista-rio') || room.amenities.some((a) => a.name.toLowerCase().includes('rio'));
      }
      return room.type === activeFilter;
    });
  }, [allRooms, guests, activeFilter]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── Topo com Filtros ── */}
      <SearchFiltersBar
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
      />

      {/* ── Cabeçalho dos Resultados ── */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
          Acomodações Disponíveis
        </h1>
        <span className="glass rounded-full px-3.5 py-1 text-xs text-forest-300 font-medium border border-forest-500/30">
          {filteredRooms.length} {filteredRooms.length === 1 ? 'encontrada' : 'encontradas'}
        </span>
      </div>

      {/* ── Listagem Vertical ── */}
      {filteredRooms.length > 0 ? (
        <div className="space-y-4">
          {filteredRooms.map((room, index) => (
            <VerticalRoomCard
              key={room.id}
              room={room}
              index={index}
              queryString={carryParams}
              availableForDates={hasDates ? !unavailableIds.has(room.id) : null}
            />
          ))}
        </div>
      ) : (
        /* ── Estado Vazio Elegante ── */
        <div className="glass-dark rounded-3xl p-8 sm:p-12 text-center space-y-6 my-10 border border-white/10">
          <div className="w-16 h-16 rounded-full glass-gold mx-auto flex items-center justify-center text-gold-400">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="font-serif text-xl font-bold text-white">
              Nenhuma acomodação encontrada
            </h2>
            <p className="text-sm text-white/50 leading-relaxed">
              Não encontramos bangalôs ou chalés para o filtro selecionado ({guests} hóspedes). Tente ajustar o número de pessoas ou remover os filtros.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveFilter('todos')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-forest-500 hover:bg-forest-400 text-white text-xs font-semibold transition-colors shadow-lg shadow-forest-900/50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver todas as opções</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Voltar ao início</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-forest-950 text-white pt-24 sm:pt-28 pb-32">
      <Suspense fallback={<div className="text-center py-20 text-white/40">Carregando busca...</div>}>
        <SearchResultsContent />
      </Suspense>

      {/* Floating Bottom Nav (Mobile) */}
      <BottomNav />
    </main>
  );
}
