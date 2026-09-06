'use client';

// ============================================================
// app/minhas-reservas/page.tsx
// Consulta Pública de Reserva — Hóspede Anauê Amazônia
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  CalendarDays,
  BedDouble,
  Users,
  Mail,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  Ban,
  ArrowLeft,
  MapPin,
  Phone,
  Info,
  Loader2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { lookupBookingAction } from '@/app/actions/booking';
import { getRoomsAsync } from '@/lib/supabaseData';
import type { Reservation, ReservationStatus, Room } from '@/types';

const STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; bg: string; text: string; border: string; icon: typeof Clock; description: string }
> = {
  pending: {
    label: 'Pendente',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/35',
    icon: Clock,
    description: 'Aguardando confirmação do pagamento.',
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'bg-forest-500/20',
    text: 'text-forest-300',
    border: 'border-forest-500/35',
    icon: CheckCircle2,
    description: 'Pagamento aprovado. Sua estadia está garantida!',
  },
  checked_in: {
    label: 'Hospedado',
    bg: 'bg-gold-500/20',
    text: 'text-gold-300',
    border: 'border-gold-500/35',
    icon: LogIn,
    description: 'Bem-vindo à floresta! Aproveite sua estadia.',
  },
  checked_out: {
    label: 'Finalizada',
    bg: 'bg-white/10',
    text: 'text-white/50',
    border: 'border-white/20',
    icon: LogOut,
    description: 'Sua estadia foi concluída. Esperamos vê-lo novamente!',
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    border: 'border-red-500/35',
    icon: Ban,
    description: 'Esta reserva foi cancelada.',
  },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function getNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function MinhasReservasPage() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setReservation(null);
    setRoom(null);
    setHasSearched(true);

    try {
      const result = await lookupBookingAction(query.trim());

      if (result.success && result.reservation) {
        setReservation(result.reservation);

        // Buscar dados do quarto
        const rooms = await getRoomsAsync();
        const foundRoom = rooms.find((r) => r.id === result.reservation!.roomId);
        if (foundRoom) setRoom(foundRoom);
      } else {
        setError(result.error || 'Reserva não encontrada.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const statusCfg = reservation ? STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending : null;
  const StatusIcon = statusCfg?.icon ?? Clock;

  return (
    <main className="min-h-screen bg-forest-950 text-white pt-24 sm:pt-28 pb-32">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* ── Hero / Cabeçalho ── */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-forest-500/30 text-forest-300 text-xs font-semibold uppercase tracking-wider">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Minhas Reservas</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            Consultar Reserva
          </h1>

          <p className="text-white/50 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Informe o código da sua reserva (ex: <span className="font-mono text-forest-300">AN-XXXX</span>) ou o e-mail utilizado na compra.
          </p>
        </div>

        {/* ── Formulário de Busca ── */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="glass-dark rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="AN-XXXX ou e-mail@example.com"
                className="w-full pl-12 pr-4 py-4 rounded-2xl glass border border-white/10 text-white text-base placeholder:text-white/30 focus:outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/20 transition-all font-medium"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-forest-950/60 border border-forest-400/30 transition-all cursor-pointer"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{isSearching ? 'Buscando…' : 'Buscar Reserva'}</span>
            </button>
          </div>
        </form>

        {/* ── Estado de Erro ── */}
        <AnimatePresence mode="wait">
          {error && hasSearched && !isSearching && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-dark rounded-3xl p-6 sm:p-8 border border-red-500/20 shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Reserva não encontrada</p>
                <p className="text-xs text-white/50 max-w-xs mx-auto">{error}</p>
              </div>
              <p className="text-[11px] text-white/30">
                Dica: o código começa com <span className="font-mono text-white/50">AN-</span> seguido de 4 dígitos.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Card de Resultado ── */}
        <AnimatePresence mode="wait">
          {reservation && statusCfg && !isSearching && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="space-y-5"
            >
              {/* Header do Status */}
              <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold px-3 py-1 rounded-xl bg-gold-500/20 text-gold-300 border border-gold-500/30">
                      {reservation.bookingCode}
                    </span>
                    <div
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusCfg.label}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-white/60 leading-relaxed">{statusCfg.description}</p>
              </div>

              {/* Dados do Hóspede */}
              <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Dados do Hóspede
                </h3>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-300 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{reservation.guestName}</p>
                      <p className="text-[11px] text-white/40">{reservation.guests} {reservation.guests === 1 ? 'hóspede' : 'hóspedes'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-300 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-white/80 truncate select-all">{reservation.guestEmail}</p>
                  </div>

                  {reservation.guestPhone && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                      <div className="w-9 h-9 rounded-xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-300 shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <p className="text-sm text-white/80 select-all">{reservation.guestPhone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acomodação e Datas */}
              <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Acomodação & Estadia
                </h3>

                {/* Foto e nome do quarto */}
                {room && (
                  <div className="relative rounded-2xl overflow-hidden h-44 sm:h-56 border border-white/10">
                    {room.images?.[0]?.url ? (
                      <Image
                        src={room.images[0].url}
                        alt={room.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 512px"
                      />
                    ) : (
                      <div className="w-full h-full bg-forest-900/50 flex items-center justify-center">
                        <BedDouble className="w-12 h-12 text-white/15" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-500/30 text-forest-300 border border-forest-500/40">
                          {room.category}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">
                          {room.type}
                        </span>
                      </div>
                      <p className="font-serif text-xl font-bold text-white">{room.name}</p>
                      <p className="text-xs text-white/60 mt-0.5">
                        Até {room.maxGuests} hóspedes · {room.bedrooms} {room.bedrooms === 1 ? 'quarto' : 'quartos'} · {room.areaM2}m²
                      </p>
                    </div>
                  </div>
                )}

                {!room && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                    <BedDouble className="w-5 h-5 text-forest-400/60 shrink-0" />
                    <p className="text-sm text-white/60">Carregando detalhes da acomodação…</p>
                  </div>
                )}

                {/* Datas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-white/50">
                      <LogIn className="w-3.5 h-3.5 text-forest-400" />
                      <span>Check-in</span>
                    </div>
                    <p className="font-bold text-lg text-white font-mono">{formatDate(reservation.checkIn)}</p>
                    <p className="text-[10px] text-white/40">A partir das 14:00h</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-white/50">
                      <LogOut className="w-3.5 h-3.5 text-gold-400" />
                      <span>Check-out</span>
                    </div>
                    <p className="font-bold text-lg text-white font-mono">{formatDate(reservation.checkOut)}</p>
                    <p className="text-[10px] text-white/40">Até as 11:00h</p>
                  </div>
                </div>

                <div className="text-center text-xs text-white/50 font-medium">
                  {getNights(reservation.checkIn, reservation.checkOut)} {getNights(reservation.checkIn, reservation.checkOut) === 1 ? 'noite' : 'noites'}
                </div>
              </div>

              {/* Instruções de Chegada */}
              <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold-400" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Como Chegar ao Anauê Amazônia
                  </h3>
                </div>

                <div className="space-y-3 text-sm text-white/60 leading-relaxed">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-gold-500/8 border border-gold-500/15">
                    <Info className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-gold-300 text-xs">Localização</p>
                      <p className="text-xs">
                        O Anauê Amazônia fica às margens do Rio Negro, no coração da floresta amazônica.
                        As coordenadas exatas e instruções detalhadas serão enviadas por e-mail após a confirmação da reserva.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-forest-500/8 border border-forest-500/15">
                    <Sparkles className="w-4 h-4 text-forest-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-forest-300 text-xs">Dica Importante</p>
                      <p className="text-xs">
                        Recomendamos chegar preferencialmente de barco a motor (lancha), que pode ser embarcado no Porto de Manaus.
                        Nossa equipe de recepção está disponível para auxiliar com o transporte.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/8">
                    <Phone className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-white/70 text-xs">Suporte & Contato</p>
                      <p className="text-xs">
                        Em caso de dúvidas sobre sua reserva ou necessidade de assistência, entre em contato conosco pelo WhatsApp ou e-mail.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Valor Total */}
              {reservation.totalPrice > 0 && (
                <div className="glass-dark rounded-3xl p-5 border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Valor Total</span>
                    <span className="font-serif text-2xl font-bold text-gold-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.totalPrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* Botão Nova Busca */}
              <button
                onClick={() => {
                  setReservation(null);
                  setRoom(null);
                  setError(null);
                  setHasSearched(false);
                  setQuery('');
                }}
                className="w-full flex items-center justify-center gap-2 glass hover:bg-white/10 text-white/60 hover:text-white border border-white/10 font-semibold text-sm py-3 px-6 rounded-2xl transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Consultar Outra Reserva</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Estado Inicial (antes de buscar) ── */}
        {!hasSearched && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-3xl glass-gold flex items-center justify-center mx-auto">
              <CalendarDays className="w-8 h-8 text-gold-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white/60">Você já tem uma reserva?</p>
              <p className="text-xs text-white/40">
                Insira o código ou e-mail acima para ver todos os detalhes.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
