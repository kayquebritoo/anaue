'use client';

// ============================================================
// components/admin/StatusActions.tsx
// Botões de Transição Rápida de Status da Reserva
// pending → confirmed → checked_in → checked_out (+ cancelled)
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  LogIn,
  LogOut,
  Ban,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { updateBookingStatusAction } from '@/app/actions/booking';
import type { Reservation, ReservationStatus } from '@/types';

interface StatusActionsProps {
  reservation: Reservation;
  onStatusChanged?: () => void;
}

const TRANSITIONS: Record<
  ReservationStatus,
  { next: ReservationStatus | null; label: string; icon: typeof CheckCircle2; style: string } | null
> = {
  pending: {
    next: 'confirmed',
    label: 'Confirmar',
    icon: CheckCircle2,
    style: 'bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 border-forest-400/30 shadow-forest-950/50',
  },
  confirmed: {
    next: 'checked_in',
    label: 'Check-in',
    icon: LogIn,
    style: 'bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 border-forest-400/30 shadow-forest-950/50',
  },
  checked_in: {
    next: 'checked_out',
    label: 'Check-out',
    icon: LogOut,
    style: 'bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 border-gold-400/30 shadow-gold-950/50',
  },
  checked_out: null,
  cancelled: null,
};

export function StatusActions({ reservation, onStatusChanged }: StatusActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const transition = TRANSITIONS[reservation.status];
  const canCancel = reservation.status === 'pending' || reservation.status === 'confirmed';

  const handleTransition = async (newStatus: ReservationStatus) => {
    setIsProcessing(true);
    setToast(null);

    try {
      const result = await updateBookingStatusAction(reservation.id, newStatus);
      if (result.success) {
        const msgs: Record<ReservationStatus, string> = {
          pending: 'Pendente',
          confirmed: 'Pagamento confirmado!',
          checked_in: 'Check-in realizado!',
          checked_out: 'Check-out concluído!',
          cancelled: 'Reserva cancelada.',
        };
        setToast({ type: 'success', text: msgs[newStatus] });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('anaue_reservation_updated'));
        }
        if (onStatusChanged) onStatusChanged();
      } else {
        setToast({ type: 'error', text: result.error || 'Falha ao atualizar.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setToast(null);
      }, 2200);
    }
  };

  if (!transition && !canCancel) {
    return (
      <span className="text-[11px] text-white/30 italic">
        {reservation.status === 'checked_out' ? 'Finalizada' : 'Arquivada'}
      </span>
    );
  }

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Botão de Transição Principal */}
      {transition && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleTransition(transition.next!)}
          disabled={isProcessing}
          className={`flex items-center gap-1.5 text-[11px] font-bold text-white px-3 py-1.5 rounded-xl border shadow-lg transition-all disabled:opacity-50 cursor-pointer ${transition.style}`}
        >
          {isProcessing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <transition.icon className="w-3 h-3" />
          )}
          <span>{transition.label}</span>
        </motion.button>
      )}

      {/* Botão Cancelar */}
      {canCancel && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleTransition('cancelled')}
          disabled={isProcessing}
          className="flex items-center gap-1 text-[11px] font-semibold text-red-300/80 hover:text-red-200 px-2 py-1.5 rounded-xl border border-red-500/25 hover:bg-red-500/15 transition-all disabled:opacity-50 cursor-pointer"
          title="Cancelar reserva"
        >
          <Ban className="w-3 h-3" />
        </motion.button>
      )}

      {/* Toast de Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.92 }}
            className={`absolute top-full left-0 mt-2 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-semibold border shadow-xl backdrop-blur-xl flex items-center gap-1.5 ${
              toast.type === 'success'
                ? 'bg-forest-900/90 border-forest-400/50 text-forest-200'
                : 'bg-red-950/90 border-red-500/50 text-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-3 h-3 text-forest-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            )}
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-1 text-white/40 hover:text-white cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
