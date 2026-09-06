'use client';

// ============================================================
// components/experience/ExperienceBookingWidget.tsx
// Widget de agendamento na página de detalhe da experiência
// Permite escolher data, horário, quantidade de pessoas
// ============================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Minus, Plus, ArrowRight, Check } from 'lucide-react';
import { formatPrice } from '@/lib/mockData';
import type { Experience } from '@/types';

interface ExperienceBookingWidgetProps {
  experience: Experience;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00',
];

export function ExperienceBookingWidget({ experience }: ExperienceBookingWidgetProps) {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [guests, setGuests] = useState<number>(2);

  const isPerPerson = experience.priceType === 'per_person';

  // Preço total calculado
  const totalPrice = useMemo(() => {
    const multiplier = isPerPerson ? guests : 1;
    return experience.price * multiplier;
  }, [experience.price, isPerPerson, guests]);

  const canBook = selectedDate && selectedTime;

  const handleBook = () => {
    if (!canBook) return;
    const params = new URLSearchParams({
      experienceId: experience.id,
      checkIn: selectedDate,
      checkOut: selectedDate,
      guests: String(guests),
    });
    router.push(`/reserva/checkout?${params.toString()}`);
  };

  return (
    <div className="glass-dark rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
      {/* Preço */}
      <div>
        <span className="text-white/40 text-[10px] uppercase tracking-wider block">
          {isPerPerson ? 'Valor por pessoa' : 'Valor total'}
        </span>
        <span className="text-gradient-gold text-3xl font-bold font-serif">
          {formatPrice(experience.price)}
        </span>
        {isPerPerson && (
          <span className="text-white/50 text-sm font-light ml-1">/ pessoa</span>
        )}
      </div>

      {/* Data */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-forest-400" />
          Data
        </label>
        <input
          type="date"
          min={today}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
            [color-scheme:dark] focus:outline-none focus:border-forest-400/50 transition-colors"
        />
      </div>

      {/* Horários */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
          <Clock className="w-3 h-3 text-forest-400" />
          Horário
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {TIME_SLOTS.map((slot) => {
            const isActive = selectedTime === slot;
            return (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`py-2 rounded-xl text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-forest-500 text-white border border-forest-400/40 shadow-lg shadow-forest-900/40'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20'
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pessoas (somente para per_person) */}
      {isPerPerson && (
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Users className="w-3 h-3 text-forest-400" />
            Pessoas
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
              onClick={() => setGuests((g) => Math.min(10, g + 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white
                hover:bg-white/10 transition-all active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Resumo de preço */}
      {canBook && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 pt-2 border-t border-white/10"
        >
          <div className="flex justify-between text-xs text-white/60">
            <span>{selectedDate} às {selectedTime}</span>
            {isPerPerson && <span>{formatPrice(experience.price)} × {guests}</span>}
          </div>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-white/50 text-xs">Total</span>
            <span className="text-gradient-gold text-xl font-bold font-serif">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Seleção status */}
      {selectedDate && selectedTime && (
        <div className="flex items-center gap-1.5 text-[11px] text-forest-400">
          <Check className="w-3 h-3" />
          Agendado para {selectedDate} às {selectedTime}
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
        <Calendar className="w-4.5 h-4.5" />
        <span>
          {!selectedDate
            ? 'Escolha uma data'
            : !selectedTime
              ? 'Selecione o horário'
              : 'Reservar Experiência'
          }
        </span>
        {canBook && <ArrowRight className="w-4 h-4" />}
      </motion.button>

      <p className="text-white/25 text-[10px] text-center">
        Cancelamento flexível · Até 24h antes
      </p>
    </div>
  );
}
