'use client';

// ============================================================
// app/admin/page.tsx
// Dashboard de Visão Geral — Anauê PMS Manager
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Percent,
  LogIn,
  LogOut,
  Users,
  BedDouble,
  Sparkles,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';

import { MetricCard } from '@/components/admin/MetricCard';
import { ActionsFeed } from '@/components/admin/ActionsFeed';
import {
  getRoomsAsync,
  getHousekeepingAsync,
  getBookingsAsync,
} from '@/lib/supabaseData';
import {
  getAdminKPIs,
  getDailyActions,
} from '@/lib/mockData';
import type { AdminKPIs, Room, RoomHousekeeping, Reservation } from '@/types';

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<AdminKPIs>({
    occupancyRate: 75,
    occupiedRoomsCount: 3,
    totalRoomsCount: 4,
    pendingCheckInsCount: 2,
    pendingCheckOutsCount: 1,
    activeGuestsCount: 6,
    monthlyRevenueEstimated: 35050,
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [housekeeping, setHousekeeping] = useState<RoomHousekeeping[]>([]);
  const [dailyActions, setDailyActions] = useState<any[]>([]);
  const [todayStr, setTodayStr] = useState('');

  const loadDashboardData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    setTodayStr(today);

    const [loadedRooms, loadedHk] = await Promise.all([
      getRoomsAsync(),
      getHousekeepingAsync(),
    ]);

    setRooms(loadedRooms);
    setHousekeeping(loadedHk);
    setKpis(getAdminKPIs(today));

    const actions = getDailyActions(today);
    setDailyActions(actions.allToday);
  }, []);

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('anaue_reservation_updated', handleUpdate);
    return () => window.removeEventListener('anaue_reservation_updated', handleUpdate);
  }, [loadDashboardData]);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── Banner de Boas-Vindas Operacional ── */}
      <div className="relative glass-dark rounded-3xl p-6 sm:p-8 border border-white/10 overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-forest-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 opacity-10 hidden lg:block pointer-events-none">
          <div className="relative w-48 h-48">
            <Image
              src="/images/logo/icon-white.svg"
              alt="Anauê"
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-500/20 border border-forest-500/30 text-forest-300 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-forest-400 animate-pulse" />
            Visão Geral Operacional
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
            Controle do Sítio & Recepção
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Acompanhe a ocupação em tempo real, gerencie check-ins, check-outs e garanta a melhor experiência amazônica aos hóspedes.
          </p>
        </div>
      </div>

      {/* ── Cards de Métricas Rápidas (Animados) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Taxa de Ocupação Hoje"
          value={kpis.occupancyRate}
          suffix="%"
          subtitle={`${kpis.occupiedRoomsCount} de ${kpis.totalRoomsCount} acomodações ocupadas`}
          icon={Percent}
          color="forest"
          progress={kpis.occupancyRate}
        />

        <MetricCard
          title="Check-ins Hoje"
          value={kpis.pendingCheckInsCount}
          subtitle="Hóspedes aguardando chegada"
          icon={LogIn}
          color="gold"
        />

        <MetricCard
          title="Check-outs Hoje"
          value={kpis.pendingCheckOutsCount}
          subtitle="Saídas programadas para o dia"
          icon={LogOut}
          color="agua"
        />

        <MetricCard
          title="Hóspedes no Sítio"
          value={kpis.activeGuestsCount}
          subtitle="Pessoas hospedadas hoje"
          icon={Users}
          color="amber"
        />
      </div>

      {/* ── Status Rápido dos 4 Quartos Reais ── */}
      <div className="glass-dark rounded-3xl p-5 sm:p-6 md:p-7 border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/8">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-forest-400" />
              Status das 4 Acomodações Reais
            </h2>
            <p className="text-xs text-white/50">Disponibilidade e governança em tempo real</p>
          </div>

          <Link
            href="/admin/calendario"
            className="flex items-center gap-1.5 text-xs font-semibold text-forest-300 hover:text-forest-200 transition-colors"
          >
            <span>Ver mapa no calendário</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const hk = housekeeping.find((h) => h.roomId === room.id);
            const statusColor =
              hk?.status === 'clean' || hk?.status === 'inspected'
                ? 'bg-forest-500/20 text-forest-300 border-forest-500/30'
                : hk?.status === 'cleaning'
                ? 'bg-gold-500/20 text-gold-300 border-gold-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/30';

            const statusLabel =
              hk?.status === 'clean'
                ? 'Limpo'
                : hk?.status === 'inspected'
                ? 'Inspecionado'
                : hk?.status === 'cleaning'
                ? 'Em Limpeza'
                : 'Necessita Limpeza';

            return (
              <div
                key={room.id}
                className="glass rounded-2xl p-4 border border-white/8 hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-white text-base">
                    {room.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="text-xs text-white/50 space-y-1">
                  <p>Capacidade: Até {room.maxGuests} pessoas</p>
                  <p className="text-white/70 font-medium">Diária: R$ {room.pricePerNight}</p>
                </div>

                <div className="pt-2 border-t border-white/8 flex items-center justify-between text-[11px] text-white/40">
                  <span>Resp: {hk?.housekeeperName || 'Equipe'}</span>
                  <Link
                    href="/admin/governanca"
                    className="text-forest-400 hover:underline font-semibold"
                  >
                    Alterar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Feed de Ações do Dia ── */}
      <ActionsFeed
        actions={dailyActions}
        onActionCompleted={loadDashboardData}
      />
    </div>
  );
}
