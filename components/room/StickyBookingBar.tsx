'use client';

// ============================================================
// components/room/StickyBookingBar.tsx
// Barra de ação fixa no rodapé (Sticky Booking Bar)
// Mobile: expandível com seletores de datas/hóspedes
// Desktop: compacta com resumo + botão
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/mockData';
import { getUnavailableRoomIdsAsync } from '@/lib/supabaseData';
import { Calendar, CalendarX, ChevronUp, Users, Minus, Plus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Room } from '@/types';

interface StickyBookingBarProps {
  room: Room;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function StickyBookingBar({ room, checkIn, checkOut, guests }: StickyBookingBarProps) {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const [expanded, setExpanded] = useState(false);

  // Estado editável
  const [editCheckIn, setEditCheckIn] = useState<string>(checkIn || '');
  const [editCheckOut, setEditCheckOut] = useState<string>(checkOut || '');
  const [editGuests, setEditGuests] = useState<number>(guests || 2);

  // Sincronizar com props externas
  useEffect(() => {
    if (checkIn) setEditCheckIn(checkIn);
    if (checkOut) setEditCheckOut(checkOut);
    if (guests) setEditGuests(guests);
  }, [checkIn, checkOut, guests]);

  // Verifica conflito
  const [dateConflict, setDateConflict] = useState(false);
  useEffect(() => {
    if (!editCheckIn || !editCheckOut) {
      setDateConflict(false);
      return;
    }
    let cancelled = false;
    getUnavailableRoomIdsAsync(editCheckIn, editCheckOut).then((unavailable) => {
      if (!cancelled) setDateConflict(unavailable.has(room.id));
    });
    return () => { cancelled = true; };
  }, [room.id, editCheckIn, editCheckOut]);

  // Noites
  const nights = useMemo(() => {
    if (!editCheckIn || !editCheckOut) return 0;
    const diffMs = new Date(editCheckOut).getTime() - new Date(editCheckIn).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [editCheckIn, editCheckOut]);

  // Check-out mínimo
  const minCheckOut = useMemo(() => {
    if (!editCheckIn) return today;
    const d = new Date(editCheckIn);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [editCheckIn, today]);

  const hasDates = Boolean(editCheckIn && editCheckOut && nights > 0);
  const canBook = hasDates && !dateConflict;

  const checkoutUrl = useMemo(() => {
    const p = new URLSearchParams({ roomId: room.id });
    if (editCheckIn) p.set('checkIn', editCheckIn);
    if (editCheckOut) p.set('checkOut', editCheckOut);
    if (editGuests > 0) p.set('guests', String(editGuests));
    return `/reserva/checkout?${p.toString()}`;
  }, [room.id, editCheckIn, editCheckOut, editGuests]);

  const handleBooking = () => {
    if (!canBook) return;
    router.push(checkoutUrl);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-forest-950/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
      {/* ── Conteúdo Expansível (Mobile) ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-white/10"
          >
            <div className="max-w-4xl mx-auto p-4 space-y-3">
              {/* Datas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-forest-400" />
                    Check-in
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={editCheckIn}
                    onChange={(e) => {
                      setEditCheckIn(e.target.value);
                      if (editCheckOut && e.target.value && editCheckOut <= e.target.value) {
                        const d = new Date(e.target.value);
                        d.setDate(d.getDate() + 1);
                        setEditCheckOut(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs
                      [color-scheme:dark] focus:outline-none focus:border-forest-400/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gold-400" />
                    Check-out
                  </label>
                  <input
                    type="date"
                    min={minCheckOut}
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    disabled={!editCheckIn}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs
                      [color-scheme:dark] focus:outline-none focus:border-forest-400/50
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Hóspedes */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Users className="w-3.5 h-3.5 text-forest-400" />
                  Hóspedes
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditGuests((g) => Math.max(1, g - 1))}
                    className="w-7 h-7 rounded-full glass flex items-center justify-center text-white/50 hover:text-white text-sm"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-white font-bold text-sm w-6 text-center">{editGuests}</span>
                  <button
                    onClick={() => setEditGuests((g) => Math.min(room.maxGuests, g + 1))}
                    className="w-7 h-7 rounded-full glass flex items-center justify-center text-white/50 hover:text-white text-sm"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Conflito */}
              {dateConflict && (
                <p className="text-[11px] text-amber-300 flex items-center gap-1">
                  <CalendarX className="w-3 h-3" />
                  Quarto já possui reserva nestas datas
                </p>
              )}

              {/* Resumo */}
              {hasDates && !dateConflict && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">
                    {nights} {nights === 1 ? 'noite' : 'noites'} · {formatPrice(room.pricePerNight)} × {nights}
                  </span>
                  <span className="text-gradient-gold font-bold text-base font-serif">
                    {formatPrice(room.pricePerNight * nights)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Barra Principal ── */}
      <div className="max-w-4xl mx-auto p-4 flex items-center justify-between gap-3">
        {/* Toggle expand (mobile) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="lg:hidden shrink-0 w-9 h-9 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronUp className="w-4 h-4" />
          </motion.div>
        </button>

        {/* Resumo do Preço */}
        <div className="min-w-0 flex-1">
          {hasDates ? (
            <p className="text-white/45 text-[11px] font-medium tracking-wide flex items-center gap-1.5 truncate">
              <Calendar className="w-3 h-3 text-gold-400 shrink-0" />
              <span className="truncate">
                {formatDateBR(editCheckIn)} → {formatDateBR(editCheckOut)}
                {editGuests ? ` · ${editGuests}h` : ''}
              </span>
            </p>
          ) : (
            <p className="text-white/45 text-[11px] font-medium uppercase tracking-wider">
              Valor da Diária
            </p>
          )}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-gradient-gold text-xl sm:text-2xl font-bold font-serif">
              {hasDates ? formatPrice(room.pricePerNight * nights) : formatPrice(room.pricePerNight)}
            </span>
            <span className="text-white/50 text-xs font-light">
              {hasDates ? 'total' : '/ noite'}
            </span>
          </div>
        </div>

        {/* Botão */}
        <div className="shrink-0">
          {canBook ? (
            <motion.button
              onClick={handleBooking}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-full bg-forest-500 hover:bg-forest-400
                text-white font-bold text-sm shadow-lg shadow-forest-900/60 border border-forest-400/30 transition-colors"
            >
              <span className="hidden sm:inline">Reservar Agora</span>
              <span className="sm:hidden">Reservar</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 px-5 py-3 rounded-full glass text-white/40 font-medium text-xs cursor-not-allowed border border-red-500/20"
            >
              <CalendarX className="w-4 h-4 text-red-400/70" />
              <span>{dateConflict ? 'Indisponível' : 'Selecione datas'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
