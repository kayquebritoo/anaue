'use client';

// ============================================================
// components/admin/ManualBookingModal.tsx
// Modal de Inserção de Nova Reserva Manual no PMS Anauê Amazônia (Sprint 8B)
// Integrado à Server Action createBookingAction com Trava Anti-Overbooking
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Calendar,
  User,
  Phone,
  Mail,
  BedDouble,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  CreditCard,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { createBookingAction } from '@/app/actions/booking';
import { getRooms } from '@/lib/mockData';
import { getRoomsAsync } from '@/lib/supabaseData';
import { formatPrice } from '@/lib/mockData';
import type { Room, ReservationStatus, PaymentMethodType } from '@/types';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function ManualBookingModal({ isOpen, onClose, onCreated }: ManualBookingModalProps) {
  const [rooms, setRooms] = useState<Room[]>(() => getRooms());

  // Carregar quartos do banco se disponível
  useEffect(() => {
    if (isOpen) {
      getRoomsAsync().then((loaded) => {
        if (loaded && loaded.length > 0) {
          setRooms(loaded);
        }
      });
    }
  }, [isOpen]);

  // Datas padrão (hoje + 2 noites)
  const defaultDates = useMemo(() => {
    const today = new Date();
    const inDate = today.toISOString().split('T')[0];
    const out = new Date(today);
    out.setDate(out.getDate() + 2);
    const outDate = out.toISOString().split('T')[0];
    return { inDate, outDate };
  }, []);

  const [roomId, setRoomId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [checkIn, setCheckIn] = useState(defaultDates.inDate);
  const [checkOut, setCheckOut] = useState(defaultDates.outDate);
  const [guests, setGuests] = useState(2);
  const [initialStatus, setInitialStatus] = useState<ReservationStatus>('confirmed');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('pix');
  const [specialRequests, setSpecialRequests] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);

  // Inicializa o primeiro quarto quando a lista estiver pronta
  useEffect(() => {
    if (rooms.length > 0 && !roomId) {
      setRoomId(rooms[0].id);
    }
  }, [rooms, roomId]);

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === roomId) || rooms[0];
  }, [rooms, roomId]);

  // Cálculo das noites e valor total
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkIn, checkOut]);

  const calculatedTotal = (selectedRoom?.pricePerNight || 650) * nights;

  // Limpar formulário ao reabrir
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessBookingCode(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!guestName.trim()) {
      setErrorMessage('Por favor, informe o nome completo do hóspede.');
      return;
    }

    if (!checkIn || !checkOut) {
      setErrorMessage('Por favor, selecione as datas de entrada e saída.');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setErrorMessage('A data de check-out deve ser posterior à data de check-in.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createBookingAction({
        roomId: selectedRoom?.id || roomId,
        checkIn,
        checkOut,
        guests,
        totalPrice: calculatedTotal,
        roomPrice: calculatedTotal,
        addonsPrice: 0,
        discountPrice: 0,
        specialRequests: specialRequests.trim() || null,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        paymentMethod,
        selectedAddons: [],
        status: initialStatus,
      });

      if (result.success && result.bookingCode) {
        setSuccessBookingCode(result.bookingCode);

        // Notificar outros componentes e fechar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('anaue_reservation_updated'));
        }

        if (onCreated) onCreated();

        setTimeout(() => {
          setIsSubmitting(false);
          onClose();
        }, 1300);
      } else {
        setIsSubmitting(false);
        setErrorMessage(
          result.error ||
            'Não foi possível criar a reserva. Verifique a disponibilidade e tente novamente.'
        );
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Erro de comunicação com o servidor. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop escurecido com Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-xl glass-dark border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 max-h-[92vh] overflow-y-auto z-10 text-white scrollbar-thin"
        >
          {/* Cabeçalho */}
          <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-300">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-white tracking-tight">
                  Nova Reserva Manual
                </h3>
                <p className="text-xs text-white/50">
                  Lançamento de venda direta (Telefone / WhatsApp / Balcão)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-2xl glass hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback de Sucesso Instantâneo */}
          {successBookingCode ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-forest-500/20 border border-forest-400/40 text-forest-400 mx-auto flex items-center justify-center shadow-lg shadow-forest-950/80">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="font-serif text-2xl font-bold text-white">Reserva Bloqueada com Sucesso!</h4>
              <p className="text-sm text-white/70">
                Código gerado:{' '}
                <span className="font-mono text-gold-400 font-bold text-base px-2 py-0.5 rounded-lg bg-black/40 border border-gold-500/30">
                  {successBookingCode}
                </span>
              </p>
              <p className="text-xs text-forest-300 font-medium">
                O calendário e a governança foram atualizados instantaneamente.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ── 1. Seleção da Acomodação ── */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                  1. Acomodação Selecionada
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {rooms.slice(0, 4).map((room) => {
                    const isSelected = (selectedRoom?.id || roomId) === room.id;
                    return (
                      <button
                        type="button"
                        key={room.id}
                        onClick={() => {
                          setRoomId(room.id);
                          if (guests > room.maxGuests) {
                            setGuests(room.maxGuests);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-forest-600/40 border-forest-400 text-white shadow-lg shadow-forest-950/60 scale-[1.02]'
                            : 'glass border-white/8 text-white/70 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif font-bold text-sm truncate">{room.name}</span>
                          <BedDouble
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-forest-300' : 'text-white/40'
                            }`}
                          />
                        </div>
                        <span className="text-[11px] text-white/50 block">
                          {formatPrice(room.pricePerNight)}/noite
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 2. Período da Estadia (Datas) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-forest-400" />
                    Data de Check-in
                  </label>
                  <input
                    type="date"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm focus:outline-none focus:border-forest-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gold-400" />
                    Data de Check-out
                  </label>
                  <input
                    type="date"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm focus:outline-none focus:border-forest-400 transition-colors"
                  />
                </div>
              </div>

              {/* ── 3. Dados do Hóspede (Nome & Telefone/WhatsApp) ── */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-forest-400" />
                  Nome Completo do Hóspede *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Souza"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-forest-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    placeholder="+55 (92) 99999-9999"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-forest-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-white/40" />
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="hospede@email.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-forest-400 transition-colors"
                  />
                </div>
              </div>

              {/* ── 4. Status Inicial & Quantidade de Hóspedes ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                    Hóspedes
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm focus:outline-none focus:border-forest-400 bg-[#0c1810]"
                  >
                    {Array.from({ length: selectedRoom?.maxGuests || 4 }, (_, i) => i + 1).map(
                      (num) => (
                        <option key={num} value={num} className="bg-[#0c1810] text-white">
                          {num} {num === 1 ? 'pessoa' : 'pessoas'}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                    Status Inicial
                  </label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as ReservationStatus)}
                    className="w-full px-3 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm focus:outline-none focus:border-forest-400 bg-[#0c1810]"
                  >
                    <option value="confirmed" className="bg-[#0c1810] text-forest-300">
                      Confirmada (Pago)
                    </option>
                    <option value="pending" className="bg-[#0c1810] text-amber-300">
                      Pendente (Aguardando)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                    Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-full px-3 py-2.5 rounded-2xl glass border border-white/10 text-white text-sm focus:outline-none focus:border-forest-400 bg-[#0c1810]"
                  >
                    <option value="pix" className="bg-[#0c1810] text-white">
                      Pix Direto
                    </option>
                    <option value="credit_card" className="bg-[#0c1810] text-white">
                      Cartão de Crédito
                    </option>
                  </select>
                </div>
              </div>

              {/* ── 5. Notas & Solicitações ── */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-white/40" />
                  Observações Internas / Transfer
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Venda feita via WhatsApp. Solicitou transfer fluvial de Manaus às 13h."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full p-3 rounded-2xl glass border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-forest-400 resize-none transition-colors"
                />
              </div>

              {/* ── Alerta de Erro / Anti-Overbooking ── */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-300 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Rodapé: Total & Botão de Inserção ── */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-white/40 block">
                    Total ({nights} {nights === 1 ? 'noite' : 'noites'})
                  </span>
                  <span className="text-xl sm:text-2xl font-bold font-serif text-gold-400">
                    {formatPrice(calculatedTotal)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-3 rounded-2xl glass hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !guestName.trim()}
                    className="flex items-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-xl shadow-forest-950/80 border border-forest-400/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando & Bloqueando…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Criar Reserva Manual</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
