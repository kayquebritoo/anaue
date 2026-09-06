'use client';

// ============================================================
// components/admin/BookingDetailsSlideOver.tsx
// Painel Slide-over & Modal de Detalhes da Reserva (Sprint 8A)
// Gestão completa do Ciclo de Vida: Pendente -> Confirmada -> Check-in -> Check-out
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  BedDouble,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogIn,
  LogOut,
  Ban,
  Loader2,
  Sparkles,
  DollarSign,
  FileText,
} from 'lucide-react';
import { updateBookingStatusAction } from '@/app/actions/booking';
import { formatPrice } from '@/lib/mockData';
import type { Reservation, ReservationStatus } from '@/types';

interface BookingDetailsSlideOverProps {
  reservation: Reservation | null;
  roomName?: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updatedRes: Reservation) => void;
}

export function BookingDetailsSlideOver({
  reservation,
  roomName,
  isOpen,
  onClose,
  onStatusUpdated,
}: BookingDetailsSlideOverProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingAction, setUpdatingAction] = useState<ReservationStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !reservation) return null;

  // Cálculo da quantidade de noites
  const start = new Date(reservation.checkIn);
  const end = new Date(reservation.checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Mapeamento visual dos status
  const statusConfig: Record<
    ReservationStatus,
    { label: string; bg: string; text: string; border: string; icon: typeof Clock; description: string }
  > = {
    pending: {
      label: 'Pendente de Pagamento',
      bg: 'bg-amber-500/20',
      text: 'text-amber-300',
      border: 'border-amber-500/35',
      icon: Clock,
      description: 'Aguardando confirmação do pagamento via Pix ou Cartão de Crédito.',
    },
    confirmed: {
      label: 'Confirmada',
      bg: 'bg-forest-500/20',
      text: 'text-forest-300',
      border: 'border-forest-500/35',
      icon: CheckCircle2,
      description: 'Pagamento aprovado. Hóspede aguardando a data de check-in.',
    },
    checked_in: {
      label: 'Hóspede na Casa (Checked-in)',
      bg: 'bg-gold-500/20',
      text: 'text-gold-300',
      border: 'border-gold-500/35',
      icon: LogIn,
      description: 'Hóspede já realizou check-in e está usufruindo da estadia.',
    },
    checked_out: {
      label: 'Finalizada (Checked-out)',
      bg: 'bg-white/10',
      text: 'text-white/60',
      border: 'border-white/20',
      icon: LogOut,
      description: 'Estadia concluída e quarto liberado para governança.',
    },
    cancelled: {
      label: 'Cancelada',
      bg: 'bg-red-500/20',
      text: 'text-red-300',
      border: 'border-red-500/35',
      icon: Ban,
      description: 'Reserva cancelada no sistema.',
    },
  };

  const currentStatus = statusConfig[reservation.status] || statusConfig.confirmed;
  const StatusIcon = currentStatus.icon;

  // Disparo da Server Action de atualização de status
  const handleUpdateStatus = async (newStatus: ReservationStatus) => {
    setIsUpdating(true);
    setUpdatingAction(newStatus);
    setToastMessage(null);

    try {
      const result = await updateBookingStatusAction(reservation.id, newStatus);

      if (result.success && result.reservation) {
        let msg = 'Status da reserva atualizado com sucesso!';
        if (newStatus === 'confirmed') msg = 'Pagamento confirmado! Reserva agora está Confirmada.';
        if (newStatus === 'checked_in') msg = 'Check-in realizado! Hóspede registrado na casa.';
        if (newStatus === 'checked_out') msg = 'Check-out realizado com sucesso! Quarto liberado.';
        if (newStatus === 'cancelled') msg = 'Reserva cancelada com sucesso.';

        setToastMessage({ type: 'success', text: msg });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('anaue_reservation_updated'));
        }

        if (onStatusUpdated) {
          onStatusUpdated(result.reservation);
        }

        setTimeout(() => {
          setIsUpdating(false);
          setUpdatingAction(null);
        }, 600);
      } else {
        setIsUpdating(false);
        setUpdatingAction(null);
        setToastMessage({
          type: 'error',
          text: result.error || 'Não foi possível atualizar o status da reserva.',
        });
      }
    } catch {
      setIsUpdating(false);
      setUpdatingAction(null);
      setToastMessage({
        type: 'error',
        text: 'Erro ao comunicar com o servidor. Tente novamente.',
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop escurecido com Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Painel Slide-over Lateral */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-xl h-full bg-[#0a160f]/95 glass-dark border-l border-white/12 shadow-2xl flex flex-col z-10 text-white"
        >
          {/* ── Toast Flutuante de Feedback ── */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`absolute top-4 left-4 right-4 z-30 p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold shadow-xl backdrop-blur-xl ${
                  toastMessage.type === 'success'
                    ? 'bg-forest-900/90 border-forest-400/50 text-forest-200'
                    : 'bg-red-950/90 border-red-500/50 text-red-200'
                }`}
              >
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-forest-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="flex-1">{toastMessage.text}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Cabeçalho do Slide-over ── */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0 bg-black/20">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  {reservation.bookingCode}
                </span>
                <div
                  className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  <span>{currentStatus.label}</span>
                </div>
              </div>

              <h2 className="font-serif text-2xl font-bold text-white mt-2 tracking-tight">
                {reservation.guestName}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">{currentStatus.description}</p>
            </div>

            <button
              onClick={onClose}
              aria-label="Fechar painel"
              className="p-2 rounded-2xl glass hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Corpo com Rolagem ── */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">
            {/* Bloco 1: Acomodação & Estadia */}
            <div className="glass rounded-3xl p-4 sm:p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-300">
                    <BedDouble className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">
                      Acomodação
                    </span>
                    <p className="font-serif text-base font-bold text-white">
                      {roomName || 'Acomodação Anauê'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">
                    Ocupantes
                  </span>
                  <div className="flex items-center justify-end gap-1 font-bold text-white text-sm">
                    <User className="w-3.5 h-3.5 text-forest-400" />
                    <span>{reservation.guests} {reservation.guests === 1 ? 'hóspede' : 'hóspedes'}</span>
                  </div>
                </div>
              </div>

              {/* Datas de Entrada e Saída */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <LogIn className="w-3.5 h-3.5 text-forest-400" />
                    <span>Check-in</span>
                  </div>
                  <p className="font-bold text-sm text-white">{reservation.checkIn}</p>
                  <p className="text-[10px] text-white/40">A partir das 14:00h</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <LogOut className="w-3.5 h-3.5 text-gold-400" />
                    <span>Check-out</span>
                  </div>
                  <p className="font-bold text-sm text-white">{reservation.checkOut}</p>
                  <p className="text-[10px] text-white/40">Até as 11:00h ({nightsCount} noites)</p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Contato do Hóspede */}
            <div className="glass rounded-3xl p-4 sm:p-5 border border-white/10 space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">
                Dados de Contato
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-black/20 border border-white/5">
                  <Mail className="w-4 h-4 text-forest-400 shrink-0" />
                  <span className="text-white/80 select-all">{reservation.guestEmail}</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-black/20 border border-white/5">
                  <Phone className="w-4 h-4 text-forest-400 shrink-0" />
                  <span className="text-white/80 select-all">{reservation.guestPhone || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* Bloco 3: Add-ons e Observações */}
            {(reservation.selectedAddons?.length > 0 || reservation.specialRequests) && (
              <div className="glass rounded-3xl p-4 sm:p-5 border border-white/10 space-y-3">
                <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">
                  Extras & Solicitações
                </span>

                {reservation.selectedAddons?.length > 0 && (
                  <div className="space-y-1.5">
                    {reservation.selectedAddons.map((addon) => (
                      <div
                        key={addon.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-forest-950/40 border border-forest-500/20 text-xs"
                      >
                        <span className="flex items-center gap-1.5 text-forest-200">
                          <Sparkles className="w-3.5 h-3.5 text-forest-400" />
                          {addon.name}
                        </span>
                        <span className="font-semibold text-white">{formatPrice(addon.price)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {reservation.specialRequests && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-relaxed">
                    <span className="font-bold block mb-1 flex items-center gap-1 text-amber-300">
                      <FileText className="w-3.5 h-3.5" />
                      Observações do Hóspede:
                    </span>
                    {reservation.specialRequests}
                  </div>
                )}
              </div>
            )}

            {/* Bloco 4: Financeiro e Pagamento */}
            <div className="glass rounded-3xl p-4 sm:p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">
                  Resumo Financeiro
                </span>
                <div className="flex items-center gap-1 text-xs text-white/60">
                  {reservation.paymentMethod === 'pix' ? (
                    <>
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pix Instantâneo</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5 text-gold-400" />
                      <span>Cartão de Crédito</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs pt-1 border-t border-white/8">
                <div className="flex justify-between text-white/60">
                  <span>Valor das Diárias ({nightsCount} noites)</span>
                  <span>{formatPrice(reservation.roomPrice || reservation.totalPrice)}</span>
                </div>

                {reservation.addonsPrice > 0 && (
                  <div className="flex justify-between text-white/60">
                    <span>Experiências / Extras</span>
                    <span>+{formatPrice(reservation.addonsPrice)}</span>
                  </div>
                )}

                {reservation.discountPrice > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto Aplicado</span>
                    <span>-{formatPrice(reservation.discountPrice)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-white/10 font-bold">
                  <span className="text-white text-sm">Valor Total</span>
                  <span className="text-xl font-serif text-gold-400">
                    {formatPrice(reservation.totalPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Rodapé com Ações Dinâmicas de Status ── */}
          <div className="p-5 sm:p-6 border-t border-white/10 shrink-0 bg-black/30 space-y-2.5">
            {/* Status: Pendente */}
            {reservation.status === 'pending' && (
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={() => handleUpdateStatus('confirmed')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-lg shadow-forest-950/60 border border-forest-400/30 transition-all cursor-pointer"
                >
                  {isUpdating && updatingAction === 'confirmed' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirmar Pagamento (Pix/Cartão)</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={isUpdating}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl glass hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isUpdating && updatingAction === 'cancelled' ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <span>Cancelar</span>
                  )}
                </button>
              </div>
            )}

            {/* Status: Confirmada */}
            {reservation.status === 'confirmed' && (
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={() => handleUpdateStatus('checked_in')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-lg shadow-forest-950/60 border border-forest-400/30 transition-all cursor-pointer"
                >
                  {isUpdating && updatingAction === 'checked_in' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Realizar Check-in (Hóspede Chegou)</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={isUpdating}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl glass hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isUpdating && updatingAction === 'cancelled' ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <span>Cancelar Reserva</span>
                  )}
                </button>
              </div>
            )}

            {/* Status: Em Estadia / Checked-in */}
            {reservation.status === 'checked_in' && (
              <button
                onClick={() => handleUpdateStatus('checked_out')}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-lg shadow-gold-950/60 border border-gold-400/30 transition-all cursor-pointer"
              >
                {isUpdating && updatingAction === 'checked_out' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>Realizar Check-out (Liberar Quarto)</span>
              </button>
            )}

            {/* Status: Finalizada ou Cancelada (Somente Leitura) */}
            {(reservation.status === 'checked_out' || reservation.status === 'cancelled') && (
              <div className="text-center py-2 text-xs text-white/40">
                Esta reserva está arquivada no ciclo de vida ({currentStatus.label}).
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
