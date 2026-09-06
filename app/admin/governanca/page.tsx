'use client';

// ============================================================
// app/admin/governanca/page.tsx
// Painel de Controle de Governança & Higienização — Anauê PMS
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  Brush,
  AlertTriangle,
  Clock,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { HousekeepingCard } from '@/components/admin/HousekeepingCard';
import { getRoomsAsync, getHousekeepingAsync, updateHousekeepingAsync } from '@/lib/supabaseData';
import type { Room, RoomHousekeeping, HousekeepingStatus } from '@/types';

export default function AdminHousekeepingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [housekeeping, setHousekeeping] = useState<RoomHousekeeping[]>([]);

  const loadData = useCallback(async () => {
    const [loadedRooms, loadedHk] = await Promise.all([
      getRoomsAsync(),
      getHousekeepingAsync(),
    ]);
    setRooms(loadedRooms);
    setHousekeeping(loadedHk);
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('anaue_reservation_updated', handleUpdate);
    return () => window.removeEventListener('anaue_reservation_updated', handleUpdate);
  }, [loadData]);

  // Cálculos de resumo
  const summary = useMemo(() => {
    const total = housekeeping.length || 4;
    const cleanCount = housekeeping.filter(
      (h) => h.status === 'clean' || h.status === 'inspected'
    ).length;
    const cleaningCount = housekeeping.filter((h) => h.status === 'cleaning').length;
    const dirtyCount = housekeeping.filter((h) => h.status === 'dirty').length;
    const percentReady = total > 0 ? Math.round((cleanCount / total) * 100) : 0;

    return {
      total,
      cleanCount,
      cleaningCount,
      dirtyCount,
      percentReady,
    };
  }, [housekeeping]);

  const handleMarkAllClean = async () => {
    await Promise.all(
      rooms.map((room) =>
        updateHousekeepingAsync(room.id, 'clean', 'Higienização geral concluída.')
      )
    );
    loadData();
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── Cabeçalho & Ações em Lote ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-forest-400" />
            Controle de Governança & Limpeza
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Status de higienização em tempo real das 4 acomodações do sítio
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleMarkAllClean}
            className="flex items-center gap-2 glass hover:bg-forest-500/20 text-forest-300 hover:text-white border border-forest-500/30 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Marcar Todos como Limpos</span>
          </button>
        </div>
      </div>

      {/* ── Card de Resumo & Prontidão ── */}
      <div className="glass-dark rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Taxa de Prontidão para Check-in
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-white">
                {summary.percentReady}%
              </span>
              <span className="text-xs text-white/60">
                ({summary.cleanCount} de {summary.total} quartos prontos para receber hóspedes)
              </span>
            </div>
          </div>

          {/* Mini Badges de Contagem */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-forest-500/20 text-forest-300 border border-forest-500/30 text-xs font-semibold">
              {summary.cleanCount} Prontos
            </span>
            <span className="px-3 py-1 rounded-xl bg-gold-500/20 text-gold-300 border border-gold-500/30 text-xs font-semibold">
              {summary.cleaningCount} Em Limpeza
            </span>
            <span className="px-3 py-1 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold">
              {summary.dirtyCount} Pendentes
            </span>
          </div>
        </div>

        {/* Barra de Progresso Geral */}
        <div className="h-2.5 w-full bg-white/8 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${summary.percentReady}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-forest-500 to-forest-400 rounded-full"
          />
        </div>
      </div>

      {/* ── Grid dos 4 Quartos Reais ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {rooms.map((room) => {
          const hk =
            housekeeping.find((h) => h.roomId === room.id) || {
              roomId: room.id,
              roomName: room.name,
              status: 'clean' as HousekeepingStatus,
              lastCleanedAt: new Date().toISOString(),
              housekeeperName: 'Equipe Anauê',
              notes: 'Pronto.',
              maintenanceAlert: null,
            };

          return (
            <HousekeepingCard
              key={room.id}
              room={room}
              housekeeping={hk}
              onUpdated={loadData}
            />
          );
        })}
      </div>
    </div>
  );
}
