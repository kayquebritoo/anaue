'use client';

// ============================================================
// components/room/RoomBookingWidget.tsx
// Widget de reserva interativo na página de detalhe do quarto
// Permite escolher datas, hóspedes e ver cálculo dinâmico
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Minus, Plus, Moon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/mockData';
import { getUnavailableRoomIdsAsync } from '@/lib/supabaseData';
import type { Room } from '@/types';

interface RoomBookingWidgetProps {
  room: Room;
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  initialGuests?: number | null;
}

export function RoomBookingWidget({
  room,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}: RoomBookingWidgetProps) {
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState<string>(initialCheckIn || '');
  const [checkOut, setCheckOut] = useState<string>(initialCheckOut || '');
  const [guests, setGuests] = useState<number>(initialGuests || 2);
  const [dateConflict, setDateConflict] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Calcular noites
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const calculated = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return calculated > 0 ? calculated : 0;
  }, [checkIn, checkOut]);

  // Calcular subtotal
  const totalPrice = useMemo(() => {
    return room.pricePerNight * nights;
  }, [room.pricePerNight, nights]);

  // Verificar disponibilidade
  useEffect(() => {
    if (!checkIn || !checkOut || nights <= 0) {
      setDateConflict(false);
      return;
    }

    let cancelled = false;
    setCheckingAvailability(true);

    getUnavailableRoomIdsAsync(checkIn, checkOut).then((unavailable) => {
      if (!cancelled) {
        setDateConflict(unavailable.has(room.id));
        setCheckingAvailability(false);
      }
    });

    return () => { cancelled = true; };
  }, [room.id, checkIn, checkOut, nights]);

  // Ajustar check-out mínimo quando check-in muda
  const minCheckOut = useMemo(() => {
    if (!checkIn) return today;
    const d = new Date(checkIn);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [checkIn, today]);

  const canBook = checkIn && checkOut && nights > 0 && !dateConflict && !checkingAvailability;
  const showPrice = checkIn && checkOut && nights > 0;

  const handleBook = () => {
    if (!canBook) return;
    const params = new URLSearchParams({
      roomId: room.id,
      checkIn,
      checkOut,
      guests: String(guests),
    });
    router.push(`/reserva/checkout?${params.toString()}`);
  };

  return (
    <div className="glass-dark rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-white/40 text-[10px] uppercase tracking-widest">
          Valor da Diária
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-gradient-gold text-3xl font-bold font-serif">
            {formatPrice(room.pricePerNight)}
          </span>
          <span className="text-white/50 text-sm font-light">/ noite</span>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-forest-400" />
            Check-in
          </label>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              // Reset check-out se anterior ao novo check-in
              if (checkOut && e.target.value && checkOut <= e.target.value) {
                const d = new Date(e.target.value);
                d.setDate(d.getDate() + 1);
                setCheckOut(d.toISOString().split('T')[0]);
              }
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
              [color-scheme:dark] focus:outline-none focus:border-forest-400/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gold-400" />
            Check-out
          </label>
          <input
            type="date"
            min={minCheckOut}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            disabled={!checkIn}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
              [color-scheme:dark] focus:outline-none focus:border-forest-400/50 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Hóspedes */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
          <Users className="w-3 h-3 text-forest-400" />
          Hóspedes
        </label>
        <div className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
          <button
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white
              hover:bg-white/10 transition-all active:scale-90"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-white font-bold text-lg">{guests}</span>
          <button
            onClick={() => setGuests((g) => Math.min(room.maxGuests, g + 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white
              hover:bg-white/10 transition-all active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-white/30 text-[10px] text-center">
          Máximo {room.maxGuests} {room.maxGuests === 1 ? 'hóspede' : 'hóspedes'}
        </p>
      </div>

      {/* Resumo de preço */}
      {showPrice && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 pt-2 border-t border-white/10"
        >
          <div className="flex justify-between text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <Moon className="w-3 h-3 text-forest-400" />
              {nights} {nights === 1 ? 'noite' : 'noites'}
            </span>
            <span>{formatPrice(room.pricePerNight)} × {nights}</span>
          </div>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-white/50 text-xs">Total</span>
            <span className="text-gradient-gold text-xl font-bold font-serif">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Conflito de datas */}
      {dateConflict && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Quarto já possui reserva nestas datas
        </div>
      )}

      {/* Botão Reservar */}
      <motion.button
        onClick={handleBook}
        disabled={!canBook}
        whileHover={canBook ? { scale: 1.02 } : {}}
        whileTap={canBook ? { scale: 0.98 } : {}}
        className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-full font-bold text-sm
          transition-all shadow-lg ${
            canBook
              ? 'bg-forest-500 hover:bg-forest-400 text-white shadow-forest-900/60 border border-forest-400/30'
              : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
          }`}
      >
        {checkingAvailability ? (
          <Loader2 className="w-4.5 h-4.5 animate-spin" />
        ) : (
          <Calendar className="w-4.5 h-4.5" />
        )}
        <span>
          {!checkIn || !checkOut
            ? 'Selecione as datas'
            : checkingAvailability
              ? 'Verificando…'
              : dateConflict
                ? 'Indisponível nestas datas'
                : 'Reservar Agora'
          }
        </span>
        {canBook && <ArrowRight className="w-4 h-4" />}
      </motion.button>

      {/* Nota */}
      <p className="text-white/25 text-[10px] text-center">
        Pagamento seguro · Cancelamento flexível
      </p>
    </div>
  );
}
