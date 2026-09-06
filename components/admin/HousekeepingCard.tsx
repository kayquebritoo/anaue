'use client';

// ============================================================
// components/admin/HousekeepingCard.tsx
// Card Interativo de Governança com Micro-interações Framer Motion
// ============================================================

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Edit3,
  Check,
  BedDouble,
  Brush,
} from 'lucide-react';
import { updateHousekeepingAsync } from '@/lib/supabaseData';
import type { Room, RoomHousekeeping, HousekeepingStatus } from '@/types';

interface HousekeepingCardProps {
  room: Room;
  housekeeping: RoomHousekeeping;
  onUpdated?: () => void;
}

const STATUS_CONFIG: Record<
  HousekeepingStatus,
  {
    label: string;
    description: string;
    icon: typeof CheckCircle2;
    activeClass: string;
    pillClass: string;
    borderGlow: string;
  }
> = {
  dirty: {
    label: 'Sujo',
    description: 'Necessita Limpeza Completa',
    icon: AlertTriangle,
    activeClass: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-950/50',
    pillClass: 'bg-red-500/15 text-red-300 border-red-500/30',
    borderGlow: 'hover:border-red-500/40',
  },
  cleaning: {
    label: 'Limpando',
    description: 'Em Higienização / Arrumação',
    icon: Clock,
    activeClass: 'bg-gold-500/20 text-gold-300 border-gold-500/40 shadow-gold-950/50',
    pillClass: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
    borderGlow: 'hover:border-gold-500/40',
  },
  clean: {
    label: 'Limpo',
    description: 'Higienizado & Roupa Trocada',
    icon: CheckCircle2,
    activeClass: 'bg-forest-500/20 text-forest-300 border-forest-500/40 shadow-forest-950/50',
    pillClass: 'bg-forest-500/15 text-forest-300 border-forest-500/30',
    borderGlow: 'hover:border-forest-500/40',
  },
  inspected: {
    label: 'Inspecionado',
    description: 'Revisado e Aprovado para Check-in',
    icon: Sparkles,
    activeClass: 'bg-agua-500/20 text-agua-300 border-agua-500/40 shadow-agua-950/50',
    pillClass: 'bg-agua-500/15 text-agua-300 border-agua-500/30',
    borderGlow: 'hover:border-agua-500/40',
  },
};

const ALL_STATUSES: HousekeepingStatus[] = ['dirty', 'cleaning', 'clean', 'inspected'];

export function HousekeepingCard({ room, housekeeping, onUpdated }: HousekeepingCardProps) {
  const [currentStatus, setCurrentStatus] = useState<HousekeepingStatus>(housekeeping.status);
  const [notes, setNotes] = useState(housekeeping.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const primaryImage = room.images?.[0]?.url || '/images/quartos/bacuri/_DSC7398.webp';
  const config = STATUS_CONFIG[currentStatus];
  const CurrentIcon = config.icon;

  const handleSelectStatus = async (newStatus: HousekeepingStatus) => {
    if (newStatus === currentStatus) return;
    setCurrentStatus(newStatus);
    setIsSaving(true);

    try {
      await updateHousekeepingAsync(room.id, newStatus, notes);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('anaue_reservation_updated'));
      }
      setTimeout(() => {
        setIsSaving(false);
        if (onUpdated) onUpdated();
      }, 300);
    } catch {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsEditingNotes(false);
    await updateHousekeepingAsync(room.id, currentStatus, notes);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('anaue_reservation_updated'));
    }
    if (onUpdated) onUpdated();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 ${config.borderGlow} transition-all duration-300 shadow-2xl flex flex-col justify-between space-y-5 group overflow-hidden`}
    >
      {/* ── Topo: Imagem, Título & Status Atual ── */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          {/* Imagem do Quarto */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-md">
            <Image
              src={primaryImage}
              alt={room.name}
              fill
              sizes="96px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Dados do Quarto */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white truncate">
                {room.name}
              </h3>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {room.category}
              </span>
            </div>

            <p className="text-xs text-white/60 line-clamp-1">
              {room.shortDescription}
            </p>

            {/* Badge de Status Atual */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors shadow-sm">
              <CurrentIcon className="w-3.5 h-3.5" />
              <span>{config.label}</span>
              <span className="text-white/40">•</span>
              <span className="text-white/60 text-[11px] font-normal">{config.description}</span>
            </div>
          </div>
        </div>

        {/* ── Seletor Interativo de 4 Status (Framer Motion Spring) ── */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">
            Alterar Estado de Governança:
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_STATUSES.map((statusKey) => {
              const statusCfg = STATUS_CONFIG[statusKey];
              const isSelected = currentStatus === statusKey;
              const Icon = statusCfg.icon;

              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => handleSelectStatus(statusKey)}
                  className={`relative p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
                    isSelected
                      ? `${statusCfg.activeClass} font-bold`
                      : 'glass border-white/8 text-white/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId={`active-status-${room.id}`}
                      className="absolute inset-0 rounded-2xl border-2 border-white/25 pointer-events-none"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}

                  <Icon className={`w-4 h-4 ${isSelected ? 'scale-110' : 'opacity-60'} transition-transform`} />
                  <span className="text-xs">{statusCfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Alerta de Manutenção (se houver) ── */}
        {housekeeping.maintenanceAlert && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-300" />
            <span>Alerta: {housekeeping.maintenanceAlert}</span>
          </div>
        )}

        {/* ── Notas de Limpeza e Manutenção ── */}
        <div className="glass rounded-2xl p-3.5 border border-white/8 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/60 uppercase tracking-wider text-[10px]">
              Observações da Equipe
            </span>

            <button
              onClick={() => setIsEditingNotes(!isEditingNotes)}
              className="text-forest-400 hover:text-forest-300 flex items-center gap-1 text-[11px] font-medium"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingNotes ? 'Cancelar' : 'Editar'}</span>
            </button>
          </div>

          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-xl glass border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-forest-400 resize-none"
                placeholder="Insira observações de limpeza ou reparos..."
              />
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1 bg-forest-500 hover:bg-forest-400 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Salvar Nota</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-white/70 italic">
              {notes || 'Nenhuma observação cadastrada.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Rodapé do Card: Responsável & Horário ── */}
      <div className="pt-3 border-t border-white/8 flex items-center justify-between text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3 text-white/30" />
          <span>Resp: {housekeeping.housekeeperName || 'Equipe Anauê'}</span>
        </span>

        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-white/30" />
          <span>Última revisão hoje</span>
        </span>
      </div>
    </motion.div>
  );
}
