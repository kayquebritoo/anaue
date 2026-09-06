'use client';

// ============================================================
// components/admin/CalendarTimeline.tsx
// Grid Interativo de Timeline / Mapa de Ocupação do Anauê PMS
// Eixo Y: Acomodações | Eixo X: Dias do Mês Selecionado
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowLeft,
  User,
  Clock,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { ReservationDetailModal } from '@/components/admin/ReservationDetailModal';
import type { Room, Reservation, ReservationStatus } from '@/types';

interface CalendarTimelineProps {
  rooms: Room[];
  reservations: Reservation[];
  onReservationUpdated?: () => void;
}

const STATUS_STYLE: Record<
  ReservationStatus,
  { label: string; gradient: string; dot: string }
> = {
  pending: {
    label: 'Pendente',
    gradient: 'bg-gradient-to-r from-amber-600/90 to-amber-500/90 border-amber-400 text-white shadow-amber-950/60',
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmada',
    gradient: 'bg-gradient-to-r from-forest-600/90 to-forest-500/90 border-forest-400 text-white shadow-forest-950/60',
    dot: 'bg-forest-400',
  },
  checked_in: {
    label: 'Hospedado',
    gradient: 'bg-gradient-to-r from-gold-600/90 to-gold-500/90 border-gold-400 text-white shadow-gold-950/60',
    dot: 'bg-gold-400',
  },
  checked_out: {
    label: 'Finalizada',
    gradient: 'bg-white/20 border-white/30 text-white/80',
    dot: 'bg-white/40',
  },
  cancelled: {
    label: 'Cancelada',
    gradient: 'bg-red-500/15 border-red-500/30 text-red-300/70',
    dot: 'bg-red-400/60',
  },
};

export function CalendarTimeline({
  rooms,
  reservations,
  onReservationUpdated,
}: CalendarTimelineProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedRes, setSelectedRes] = useState<{ res: Reservation; roomName: string } | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<{
    res: Reservation;
    roomName: string;
    x: number;
    y: number;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const isCurrentMonthView = year === todayYear && month === todayMonth;

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);

  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate),
    [currentDate],
  );

  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date(todayYear, todayMonth, 1));

  const getDayOfWeekShort = (d: number) =>
    new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(new Date(year, month, d));

  const isWeekend = (d: number) => {
    const dow = new Date(year, month, d).getDay();
    return dow === 0 || dow === 6;
  };

  const getStatusConfig = useCallback(
    (status: string) => STATUS_STYLE[status as ReservationStatus] || STATUS_STYLE.confirmed,
    [],
  );

  const formatDateShort = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  const handleMouseEnterBooking = useCallback(
    (e: React.MouseEvent, res: Reservation, roomName: string) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoveredBooking({
        res,
        roomName,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    [],
  );

  const handleMouseLeaveBooking = useCallback(() => {
    setHoveredBooking(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Barra de Controles do Calendário ── */}
      <div className="glass-dark rounded-3xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-300">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-white tracking-tight">
              {monthLabelCapitalized}
            </h2>
            <p className="text-xs text-white/50">Mapa de ocupação e disponibilidade</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl glass hover:bg-white/10 text-xs font-semibold text-white/60 hover:text-white transition-colors border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 rounded-2xl glass hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors"
          >
            Mês Atual
          </button>

          <div className="flex items-center gap-1 glass rounded-2xl p-1 border border-white/10">
            <button
              onClick={handlePrevMonth}
              title="Mês anterior"
              aria-label="Mês anterior"
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              title="Próximo mês"
              aria-label="Próximo mês"
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Legenda de Cores ── */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/60 px-1">
        <span className="font-medium text-white/40">Legenda:</span>
        {(Object.entries(STATUS_STYLE) as [ReservationStatus, (typeof STATUS_STYLE)[ReservationStatus]][]).map(
          ([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${cfg.dot} border border-white/20`} />
              <span>{cfg.label}</span>
            </div>
          ),
        )}
      </div>

      {/* ── Grid Timeline com Scroll Horizontal ── */}
      <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[900px]">
            {/* Linha do Cabeçalho de Dias */}
            <div className="grid border-b border-white/10 bg-black/25" style={{ gridTemplateColumns: '180px 1fr' }}>
              <div className="sticky left-0 z-20 glass-dark p-3.5 border-r border-white/10 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/50">
                <span>Acomodação</span>
                <span className="text-[10px] text-white/30">{rooms.length} Quartos</span>
              </div>

              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}
              >
                {daysArray.map((day) => {
                  const isToday = isCurrentMonthView && day === todayDay;
                  const weekend = isWeekend(day);

                  return (
                    <div
                      key={day}
                      className={`p-2 text-center border-r border-white/5 transition-colors ${
                        isToday
                          ? 'bg-forest-500/25 text-forest-300 font-bold border-b-2 border-b-forest-400'
                          : weekend
                          ? 'bg-white/2 text-white/40'
                          : 'text-white/60'
                      }`}
                    >
                      <span className="text-[10px] block uppercase leading-none mb-1 font-medium">
                        {getDayOfWeekShort(day)}
                      </span>
                      <span className={`text-xs block ${isToday ? 'text-forest-300 font-bold' : ''}`}>
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linhas das Acomodações */}
            <div className="divide-y divide-white/8">
              {rooms.map((room) => {
                const roomReservations = reservations.filter(
                  (res) => res.roomId === room.id && res.status !== 'cancelled',
                );

                return (
                  <div
                    key={room.id}
                    className="grid hover:bg-white/2 transition-colors relative"
                    style={{ gridTemplateColumns: '180px 1fr' }}
                  >
                    {/* Coluna Fixa do Quarto */}
                    <div className="sticky left-0 z-10 glass-dark p-3.5 border-r border-white/10 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-forest-600/30 border border-forest-500/30 flex items-center justify-center text-forest-300 font-serif font-bold text-sm shrink-0">
                        {room.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold font-serif text-white truncate">{room.name}</p>
                        <p className="text-[10px] text-white/40 truncate">
                          {room.category.toUpperCase()} • {room.maxGuests}p
                        </p>
                      </div>
                    </div>

                    {/* Área de Células de Dias */}
                    <div
                      className="relative grid"
                      style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}
                    >
                      {daysArray.map((day) => {
                        const isToday = isCurrentMonthView && day === todayDay;
                        const weekend = isWeekend(day);

                        return (
                          <div
                            key={day}
                            className={`h-16 border-r border-white/5 ${
                              isToday ? 'bg-forest-500/10' : weekend ? 'bg-white/1' : ''
                            }`}
                          />
                        );
                      })}

                      {/* Blocos de Reservas */}
                      {roomReservations.map((res) => {
                        const start = new Date(res.checkIn);
                        const end = new Date(res.checkOut);
                        const monthStart = new Date(year, month, 1);
                        const monthEnd = new Date(year, month, daysInMonth);

                        if (end < monthStart || start > monthEnd) return null;

                        const startDay = start < monthStart ? 1 : Math.max(1, start.getDate());
                        const endDay = end > monthEnd ? daysInMonth : Math.min(daysInMonth, end.getDate());
                        const span = Math.max(1, endDay - startDay);

                        const cfg = getStatusConfig(res.status);

                        return (
                          <motion.button
                            key={res.id}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedRes({ res, roomName: room.name })}
                            onMouseEnter={(e) => handleMouseEnterBooking(e, res, room.name)}
                            onMouseLeave={handleMouseLeaveBooking}
                            style={{ gridColumn: `${startDay} / span ${span}` }}
                            className={`absolute inset-y-2 z-10 mx-1 px-2.5 rounded-2xl border flex items-center justify-between gap-1.5 shadow-lg text-left transition-all overflow-hidden cursor-pointer ${cfg.gradient}`}
                            title={`${res.guestName} — ${formatDateShort(res.checkIn)} a ${formatDateShort(res.checkOut)} (${res.bookingCode})`}
                          >
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="font-semibold text-xs truncate leading-tight">
                                {res.guestName}
                              </span>
                            </div>

                            <span className="hidden sm:inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/25 shrink-0">
                              {res.bookingCode}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tooltip Flutuante no Hover ── */}
      <AnimatePresence>
        {hoveredBooking && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: hoveredBooking.x,
              top: hoveredBooking.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="glass-dark rounded-2xl border border-white/15 shadow-2xl p-3.5 min-w-[220px] max-w-[280px]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${getStatusConfig(hoveredBooking.res.status).dot}`} />
                  <span className="text-xs font-bold text-white truncate">
                    {hoveredBooking.res.guestName}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-white/60 shrink-0">
                  {hoveredBooking.res.bookingCode}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/60">
                  <span className="font-semibold text-white/40 w-14">Quarto</span>
                  <span className="text-white/80">{hoveredBooking.roomName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60">
                  <span className="font-semibold text-white/40 w-14">Status</span>
                  <span className="text-white/80">{getStatusConfig(hoveredBooking.res.status).label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60">
                  <Clock className="w-3 h-3 text-white/40 shrink-0" />
                  <span className="text-white/80">
                    {formatDateShort(hoveredBooking.res.checkIn)} → {formatDateShort(hoveredBooking.res.checkOut)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60">
                  <User className="w-3 h-3 text-white/40 shrink-0" />
                  <span className="text-white/80">
                    {hoveredBooking.res.guests} {hoveredBooking.res.guests === 1 ? 'hóspede' : 'hóspedes'}
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/8 text-[10px] text-white/40 text-center">
                Clique para ver detalhes
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes da Reserva Clicada */}
      <ReservationDetailModal
        reservation={selectedRes?.res || null}
        roomName={selectedRes?.roomName || ''}
        onClose={() => setSelectedRes(null)}
        onStatusUpdated={() => {
          if (onReservationUpdated) onReservationUpdated();
        }}
      />
    </div>
  );
}
