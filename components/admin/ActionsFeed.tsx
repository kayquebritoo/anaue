'use client';

// ============================================================
// components/admin/ActionsFeed.tsx
// Feed Vertical de Ações Operacionais do Dia com Ações Rápidas
// Integrado com BookingDetailsSlideOver e updateBookingStatusAction (Sprint 8A)
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn,
  LogOut,
  BedDouble,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { updateBookingStatusAction } from '@/app/actions/booking';
import { formatPrice } from '@/lib/mockData';
import { BookingDetailsSlideOver } from '@/components/admin/BookingDetailsSlideOver';
import type { Reservation, ReservationStatus } from '@/types';

interface ActionItem extends Reservation {
  actionType: 'check_in' | 'check_out' | 'in_house';
  roomName: string;
}

interface ActionsFeedProps {
  actions: ActionItem[];
  onActionCompleted?: () => void;
}

export function ActionsFeed({ actions, onActionCompleted }: ActionsFeedProps) {
  const [filter, setFilter] = useState<'all' | 'check_in' | 'check_out'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRes, setSelectedRes] = useState<{ res: Reservation; roomName: string } | null>(null);

  const filteredActions = actions.filter((item) => {
    if (filter === 'all') return true;
    return item.actionType === filter;
  });

  const handleStatusChange = async (resId: string, newStatus: ReservationStatus) => {
    setProcessingId(resId);
    try {
      const result = await updateBookingStatusAction(resId, newStatus);
      if (result.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('anaue_reservation_updated'));
        }
        if (onActionCompleted) onActionCompleted();
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <div className="glass-dark rounded-3xl p-5 sm:p-6 md:p-7 border border-white/10 shadow-2xl">
        {/* Cabeçalho do Feed & Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/8">
          <div>
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold-400" />
              Ações e Movimentação de Hoje
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Check-ins, check-outs e estadias em andamento
            </p>
          </div>

          {/* Abas de Filtro */}
          <div className="flex items-center gap-1 glass p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-forest-500 text-white font-semibold shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Todos ({actions.length})
            </button>
            <button
              onClick={() => setFilter('check_in')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                filter === 'check_in'
                  ? 'bg-forest-500 text-white font-semibold shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Check-ins ({actions.filter((a) => a.actionType === 'check_in').length})
            </button>
            <button
              onClick={() => setFilter('check_out')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                filter === 'check_out'
                  ? 'bg-forest-500 text-white font-semibold shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Check-outs ({actions.filter((a) => a.actionType === 'check_out').length})
            </button>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="mt-5 space-y-3.5">
          <AnimatePresence mode="popLayout">
            {filteredActions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center text-white/40 space-y-2"
              >
                <CheckCircle2 className="w-10 h-10 mx-auto text-forest-400/50" />
                <p className="text-sm font-medium">Nenhuma movimentação pendente nesta categoria para hoje.</p>
              </motion.div>
            ) : (
              filteredActions.map((item) => {
                const isCheckIn = item.actionType === 'check_in';
                const isCheckOut = item.actionType === 'check_out';
                const isConfirmed = item.status === 'confirmed';
                const isCheckedIn = item.status === 'checked_in';
                const isCheckedOut = item.status === 'checked_out';

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                  >
                    {/* Informações Principais */}
                    <div
                      onClick={() => setSelectedRes({ res: item, roomName: item.roomName })}
                      className="flex items-start gap-3.5 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isCheckIn
                            ? 'bg-forest-500/20 text-forest-300 border-forest-500/30'
                            : 'bg-gold-500/20 text-gold-300 border-gold-500/30'
                        }`}
                      >
                        {isCheckIn ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white text-base truncate group-hover:text-forest-300 transition-colors">
                            {item.guestName}
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-white/80 border border-white/10">
                            {item.bookingCode}
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isCheckedIn
                                ? 'bg-forest-500/25 text-forest-300 border border-forest-500/40'
                                : isCheckedOut
                                ? 'bg-white/10 text-white/50 border border-white/10'
                                : 'bg-gold-500/25 text-gold-300 border border-gold-500/40'
                            }`}
                          >
                            {isCheckedIn ? 'Hospedado' : isCheckedOut ? 'Finalizado' : 'Aguardando'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                          <span className="flex items-center gap-1 text-forest-300 font-medium">
                            <BedDouble className="w-3.5 h-3.5" />
                            Quarto {item.roomName}
                          </span>
                          <span>•</span>
                          <span>{item.guests} {item.guests === 1 ? 'hóspede' : 'hóspedes'}</span>
                          <span>•</span>
                          <span>Total: {formatPrice(item.totalPrice)}</span>
                        </div>

                        {item.specialRequests && (
                          <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1 mt-1.5 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.specialRequests}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação Rápida */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      {/* Botão Ver Detalhes */}
                      <button
                        onClick={() => setSelectedRes({ res: item, roomName: item.roomName })}
                        className="p-2.5 rounded-xl glass hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Ver detalhes da reserva"
                      >
                        <span>Detalhes</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {isCheckIn && isConfirmed && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'checked_in')}
                          disabled={processingId === item.id}
                          className="flex items-center gap-1.5 bg-forest-500 hover:bg-forest-400 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-forest-950/50 transition-all cursor-pointer"
                        >
                          {processingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogIn className="w-3.5 h-3.5" />
                          )}
                          <span>Confirmar Check-in</span>
                        </button>
                      )}

                      {isCheckOut && isCheckedIn && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'checked_out')}
                          disabled={processingId === item.id}
                          className="flex items-center gap-1.5 bg-gold-600 hover:bg-gold-500 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-gold-950/50 transition-all cursor-pointer"
                        >
                          {processingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          <span>Realizar Check-out</span>
                        </button>
                      )}

                      {isCheckedIn && isCheckIn && (
                        <div className="flex items-center gap-1 text-xs text-forest-400 font-semibold px-3 py-1.5 bg-forest-500/10 rounded-xl border border-forest-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Check-in Realizado</span>
                        </div>
                      )}

                      {isCheckedOut && (
                        <div className="flex items-center gap-1 text-xs text-white/40 font-medium px-3 py-1.5 glass rounded-xl">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Check-out Concluído</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Slide-over de Detalhes */}
      <BookingDetailsSlideOver
        reservation={selectedRes?.res || null}
        roomName={selectedRes?.roomName || ''}
        isOpen={!!selectedRes}
        onClose={() => setSelectedRes(null)}
        onStatusUpdated={() => {
          if (onActionCompleted) onActionCompleted();
        }}
      />
    </>
  );
}
