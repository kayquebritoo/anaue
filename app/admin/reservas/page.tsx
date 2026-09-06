'use client';

// ============================================================
// app/admin/reservas/page.tsx
// Listagem Completa de Reservas com Ações Rápidas de Status
// Anauê PMS Manager
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Filter,
  CalendarDays,
  BedDouble,
  Users,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Ban,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { getRoomsAsync, getBookingsAsync } from '@/lib/supabaseData';
import { StatusActions } from '@/components/admin/StatusActions';
import { ReservationDetailModal } from '@/components/admin/ReservationDetailModal';
import type { Room, Reservation, ReservationStatus } from '@/types';

type StatusFilter = 'all' | ReservationStatus;

const STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; bg: string; text: string; border: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pendente',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/35',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'bg-forest-500/20',
    text: 'text-forest-300',
    border: 'border-forest-500/35',
    icon: CheckCircle2,
  },
  checked_in: {
    label: 'Hospedado',
    bg: 'bg-gold-500/20',
    text: 'text-gold-300',
    border: 'border-gold-500/35',
    icon: LogIn,
  },
  checked_out: {
    label: 'Finalizada',
    bg: 'bg-white/10',
    text: 'text-white/50',
    border: 'border-white/20',
    icon: LogOut,
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    border: 'border-red-500/35',
    icon: Ban,
  },
};

export default function AdminReservasPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRes, setSelectedRes] = useState<{ res: Reservation; roomName: string } | null>(null);

  const loadData = useCallback(async () => {
    const [loadedRooms, loadedBookings] = await Promise.all([
      getRoomsAsync(),
      getBookingsAsync(),
    ]);
    setRooms(loadedRooms);
    setReservations(loadedBookings);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('anaue_reservation_updated', handleUpdate);
    return () => window.removeEventListener('anaue_reservation_updated', handleUpdate);
  }, [loadData]);

  const getRoomName = useCallback(
    (roomId: string) => rooms.find((r) => r.id === roomId)?.name || '—',
    [rooms],
  );

  const filtered = useMemo(() => {
    let list = [...reservations];

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.guestName.toLowerCase().includes(q) ||
          r.bookingCode.toLowerCase().includes(q) ||
          r.guestEmail.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  }, [reservations, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reservations.length };
    for (const r of reservations) {
      c[r.status] = (c[r.status] || 0) + 1;
    }
    return c;
  }, [reservations]);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="p-1.5 rounded-xl glass hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Gestão de Reservas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/50 ml-8">
            Liste, busque e altere o status de qualquer reserva do sistema
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="glass-dark rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-4">
        {/* Barra de Busca */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por nome, código (AN-XXXX) ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-forest-500/50 focus:ring-1 focus:ring-forest-500/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros de Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="font-medium">Status:</span>
          </div>

          {(['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as StatusFilter[]).map(
            (s) => {
              const isActive = statusFilter === s;
              const cfg = s !== 'all' ? STATUS_CONFIG[s] : null;
              const Icon = cfg?.icon;
              const count = counts[s] || 0;

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                    isActive
                      ? s === 'all'
                        ? 'bg-white/15 border-white/30 text-white'
                        : `${cfg!.bg} ${cfg!.text} ${cfg!.border}`
                      : 'glass border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>
                    {s === 'all'
                      ? 'Todas'
                      : s === 'checked_in'
                      ? 'Hospedados'
                      : s === 'checked_out'
                      ? 'Finalizadas'
                      : cfg!.label}
                  </span>
                  <span className="opacity-60">({count})</span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Lista de Reservas */}
      {isLoading ? (
        <div className="glass-dark rounded-3xl p-8 border border-white/10 shadow-2xl flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-forest-400/40 border-t-forest-400 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/50">Carregando reservas…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-dark rounded-3xl p-12 border border-white/10 shadow-2xl text-center">
          <CalendarDays className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-sm text-white/50 font-medium">
            {search || statusFilter !== 'all'
              ? 'Nenhuma reserva encontrada com estes filtros.'
              : 'Nenhuma reserva registrada ainda.'}
          </p>
        </div>
      ) : (
        <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Contador */}
          <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
            <span className="text-xs text-white/40 font-medium">
              {filtered.length} reserva{filtered.length !== 1 ? 's' : ''}
              {search && ` · Busca: "${search}"`}
            </span>
          </div>

          {/* Cabeçalho da Tabela (Desktop) */}
          <div className="hidden lg:grid grid-cols-[1fr_140px_160px_130px_110px_180px] gap-3 px-5 py-2.5 border-b border-white/8 bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <span>Hóspede</span>
            <span>Código</span>
            <span>Acomodação</span>
            <span>Período</span>
            <span>Status</span>
            <span className="text-right">Ações</span>
          </div>

          {/* Linhas */}
          <div className="divide-y divide-white/6">
            <AnimatePresence mode="popLayout">
              {filtered.map((res) => {
                const cfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const roomName = getRoomName(res.roomId);

                return (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="hover:bg-white/3 transition-colors"
                  >
                    {/* Desktop Row */}
                    <div className="hidden lg:grid grid-cols-[1fr_140px_160px_130px_110px_180px] gap-3 items-center px-5 py-3.5">
                      {/* Hóspede */}
                      <div
                        className="flex items-center gap-3 cursor-pointer min-w-0"
                        onClick={() => setSelectedRes({ res, roomName })}
                      >
                        <div className="w-9 h-9 rounded-xl bg-forest-600/30 border border-forest-500/30 flex items-center justify-center text-forest-300 font-serif font-bold text-sm shrink-0">
                          {res.guestName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate hover:text-forest-300 transition-colors">
                            {res.guestName}
                          </p>
                          <p className="text-[11px] text-white/40 truncate">{res.guestEmail}</p>
                        </div>
                      </div>

                      {/* Código */}
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-white/8 text-white/70 border border-white/8 w-fit">
                        {res.bookingCode}
                      </span>

                      {/* Acomodação */}
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <BedDouble className="w-3.5 h-3.5 text-forest-400/60 shrink-0" />
                        <span className="truncate">{roomName}</span>
                      </div>

                      {/* Período */}
                      <div className="text-[11px] text-white/50">
                        <span>{res.checkIn}</span>
                        <span className="mx-1">→</span>
                        <span>{res.checkOut}</span>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border w-fit ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </div>

                      {/* Ações */}
                      <div className="flex justify-end">
                        <StatusActions reservation={res} onStatusChanged={loadData} />
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div
                      className="lg:hidden p-4 space-y-3 cursor-pointer"
                      onClick={() => setSelectedRes({ res, roomName })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-forest-600/30 border border-forest-500/30 flex items-center justify-center text-forest-300 font-serif font-bold text-sm shrink-0">
                            {res.guestName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{res.guestName}</p>
                            <p className="text-[10px] font-mono text-white/50">{res.bookingCode}</p>
                          </div>
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{cfg.label}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3 h-3 text-forest-400/60" />
                          {roomName}
                        </span>
                        <span>·</span>
                        <span>{res.checkIn} → {res.checkOut}</span>
                        <span>·</span>
                        <span>{res.guests} {res.guests === 1 ? 'hóspede' : 'hóspedes'}</span>
                      </div>

                      {/* Ações Mobile */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <StatusActions reservation={res} onStatusChanged={loadData} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      <ReservationDetailModal
        reservation={selectedRes?.res || null}
        roomName={selectedRes?.roomName || ''}
        onClose={() => setSelectedRes(null)}
        onStatusUpdated={loadData}
      />
    </div>
  );
}
