'use client';

// ============================================================
// components/checkout/StayEditor.tsx
// Editor de datas e hóspedes inline no checkout
// Permite modificar período e hóspedes com recálculo instantâneo
// ============================================================

import { useMemo } from 'react';
import { Calendar, Users, Minus, Plus, Moon, ArrowLeft, Pencil } from 'lucide-react';
import { formatPrice } from '@/lib/mockData';

interface StayEditorProps {
  mode: 'room' | 'experience';
  roomName?: string;
  experienceName?: string;
  // Datas
  checkIn: string;
  checkOut: string;
  onCheckInChange: (v: string) => void;
  onCheckOutChange: (v: string) => void;
  // Hóspedes
  guests: number;
  onGuestsChange: (v: number) => void;
  maxGuests?: number;
  // Cálculos
  nights: number;
  pricePerNight: number;
  roomSubtotal: number;
  // Navegação
  onBackToRoom?: () => void;
  onBackToExperience?: () => void;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

export function StayEditor({
  mode,
  roomName,
  experienceName,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  guests,
  onGuestsChange,
  maxGuests = 10,
  nights,
  pricePerNight,
  roomSubtotal,
  onBackToRoom,
  onBackToExperience,
}: StayEditorProps) {
  const today = new Date().toISOString().split('T')[0];

  const minCheckOut = useMemo(() => {
    if (!checkIn) return today;
    const d = new Date(checkIn);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [checkIn, today]);

  const hasDates = checkIn && checkOut && nights > 0;

  return (
    <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-forest-400" />
          <h3 className="font-serif text-base sm:text-lg font-bold text-white">
            {mode === 'room' ? 'Editar Estadia' : 'Editar Agendamento'}
          </h3>
        </div>
        {/* Botão voltar para escolher outro item */}
        {mode === 'room' && onBackToRoom && (
          <button
            onClick={onBackToRoom}
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Trocar quarto
          </button>
        )}
        {mode === 'experience' && onBackToExperience && (
          <button
            onClick={onBackToExperience}
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Trocar experiência
          </button>
        )}
      </div>

      {/* Item selecionado */}
      <div className="text-xs text-white/50">
        {mode === 'room' && roomName && (
          <span>Acomodação: <strong className="text-white/70">{roomName}</strong></span>
        )}
        {mode === 'experience' && experienceName && (
          <span>Experiência: <strong className="text-white/70">{experienceName}</strong></span>
        )}
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-forest-400" />
            {mode === 'room' ? 'Check-in' : 'Data'}
          </label>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => {
              onCheckInChange(e.target.value);
              if (checkOut && e.target.value && checkOut <= e.target.value) {
                const d = new Date(e.target.value);
                d.setDate(d.getDate() + 1);
                onCheckOutChange(d.toISOString().split('T')[0]);
              }
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
              [color-scheme:dark] focus:outline-none focus:border-forest-400/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gold-400" />
            {mode === 'room' ? 'Check-out' : 'Data Final'}
          </label>
          <input
            type="date"
            min={minCheckOut}
            value={checkOut}
            onChange={(e) => onCheckOutChange(e.target.value)}
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
          {mode === 'room' ? 'Hóspedes' : 'Pessoas'}
        </label>
        <div className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
          <button
            onClick={() => onGuestsChange(Math.max(1, guests - 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white
              hover:bg-white/10 transition-all active:scale-90"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-white font-bold text-lg">{guests}</span>
          <button
            onClick={() => onGuestsChange(Math.min(maxGuests, guests + 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white
              hover:bg-white/10 transition-all active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-white/30 text-[10px] text-center">
          Máximo {maxGuests} {maxGuests === 1 ? 'hóspede' : 'hóspedes'}
        </p>
      </div>

      {/* Resumo de preço */}
      {mode === 'room' && hasDates && (
        <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs">
          <span className="text-white/50 flex items-center gap-1.5">
            <Moon className="w-3 h-3 text-forest-400" />
            {nights} {nights === 1 ? 'noite' : 'noites'} · {formatPrice(pricePerNight)} × {nights}
          </span>
          <span className="text-gradient-gold font-bold text-base font-serif">
            {formatPrice(roomSubtotal)}
          </span>
        </div>
      )}
    </div>
  );
}
