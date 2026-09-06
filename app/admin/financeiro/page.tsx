'use client';

// ============================================================
// app/admin/financeiro/page.tsx
// Painel Financeiro & Fluxo de Caixa — Anauê PMS Manager
// KPIs: Faturamento, ADR, Ocupação + Extrato de Transações
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  BedDouble,
  Percent,
  CalendarDays,
  Filter,
  X,
  QrCode,
  CreditCard,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { MetricCard } from '@/components/admin/MetricCard';
import { getRoomsAsync, getBookingsAsync } from '@/lib/supabaseData';
import { formatPrice } from '@/lib/mockData';
import type { Room, Reservation, ReservationStatus, PaymentMethodType } from '@/types';

type StatusFilter = 'all' | ReservationStatus;
type PaymentFilter = 'all' | PaymentMethodType;

function calcNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_badge: Record<
  ReservationStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Pendente',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/35',
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'bg-forest-500/20',
    text: 'text-forest-300',
    border: 'border-forest-500/35',
  },
  checked_in: {
    label: 'Hospedado',
    bg: 'bg-gold-500/20',
    text: 'text-gold-300',
    border: 'border-gold-500/35',
  },
  checked_out: {
    label: 'Finalizada',
    bg: 'bg-white/10',
    text: 'text-white/50',
    border: 'border-white/20',
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    border: 'border-red-500/35',
  },
};

export default function AdminFinanceiroPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  const loadData = useCallback(async () => {
    const [loadedRooms, loadedBookings] = await Promise.all([
      getRoomsAsync(),
      getBookingsAsync(),
    ]);
    setRooms(loadedRooms);
    setReservations(loadedBookings);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('anaue_reservation_updated', handleUpdate);
    return () => window.removeEventListener('anaue_reservation_updated', handleUpdate);
  }, [loadData]);

  const getRoomName = useCallback(
    (roomId: string) => rooms.find((r) => r.id === roomId)?.name || '—',
    [rooms],
  );

  // ── KPIs Computados ──
  const kpis = useMemo(() => {
    const active = reservations.filter((r) => r.status !== 'cancelled');

    const totalRevenue = active.reduce((sum, r) => sum + r.totalPrice, 0);
    const totalNights = active.reduce(
      (sum, r) => sum + calcNights(r.checkIn, r.checkOut),
      0,
    );
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

    const paidCount = reservations.filter(
      (r) => r.status === 'confirmed' || r.status === 'checked_in' || r.status === 'checked_out',
    ).length;

    const totalRooms = rooms.length || 4;
    const occupiedToday = active.filter((r) => {
      const today = new Date().toISOString().split('T')[0];
      return r.checkIn <= today && r.checkOut > today;
    }).length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0;

    return {
      totalRevenue,
      totalNights,
      adr,
      paidCount,
      occupancyRate,
      occupiedToday,
      totalReservations: reservations.length,
      totalRooms,
    };
  }, [reservations, rooms]);

  // ── Filtros ──
  const filtered = useMemo(() => {
    let list = [...reservations];

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (paymentFilter !== 'all') {
      list = list.filter((r) => r.paymentMethod === paymentFilter);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [reservations, statusFilter, paymentFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reservations.length };
    for (const r of reservations) {
      c[r.status] = (c[r.status] || 0) + 1;
    }
    c.pix = reservations.filter((r) => r.paymentMethod === 'pix').length;
    c.credit_card = reservations.filter((r) => r.paymentMethod === 'credit_card').length;
    return c;
  }, [reservations]);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="p-1.5 rounded-xl glass hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Painel Financeiro
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/50 ml-8">
            Faturamento, KPIs e extrato detalhado de transações
          </p>
        </div>
      </div>

      {/* ── Cards de KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Faturamento Total"
          value={Math.round(kpis.totalRevenue)}
          prefix="R$"
          subtitle={`${kpis.totalReservations} reservas no sistema`}
          icon={DollarSign}
          color="gold"
        />

        <MetricCard
          title="Reservas Pagas"
          value={kpis.paidCount}
          subtitle="Confirmadas + Hospedadas + Finalizadas"
          icon={TrendingUp}
          color="forest"
        />

        <MetricCard
          title="Diária Média (ADR)"
          value={Math.round(kpis.adr)}
          prefix="R$"
          suffix="/noite"
          subtitle={`Baseado em ${kpis.totalNights} noites totais`}
          icon={CalendarDays}
          color="agua"
        />

        <MetricCard
          title="Taxa de Ocupação Hoje"
          value={kpis.occupancyRate}
          suffix="%"
          subtitle={`${kpis.occupiedToday || 0} de ${kpis.totalRooms} quartos ocupados`}
          icon={Percent}
          color="amber"
          progress={kpis.occupancyRate}
        />
      </div>

      {/* ── Filtros ── */}
      <div className="glass-dark rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="font-medium">Filtros:</span>
        </div>

        {/* Filtro de Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider w-12">Status</span>
          {(['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as StatusFilter[]).map(
            (s) => {
              const isActive = statusFilter === s;
              const badge = s !== 'all' ? STATUS_badge[s] : null;

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                    isActive
                      ? s === 'all'
                        ? 'bg-white/15 border-white/30 text-white'
                        : `${badge!.bg} ${badge!.text} ${badge!.border}`
                      : 'glass border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8'
                  }`}
                >
                  {s === 'all' ? 'Todas' : badge!.label}
                  <span className="opacity-60 ml-1">
                    ({s === 'all' ? counts.all : counts[s] || 0})
                  </span>
                </button>
              );
            },
          )}
        </div>

        {/* Filtro de Pagamento */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider w-12">Pagamento</span>
          {([
            { key: 'all' as const, label: 'Todos', icon: null },
            { key: 'pix' as const, label: 'PIX', icon: QrCode },
            { key: 'credit_card' as const, label: 'Cartão', icon: CreditCard },
          ]).map(({ key, label, icon: Icon }) => {
            const isActive = paymentFilter === key;
            return (
              <button
                key={key}
                onClick={() => setPaymentFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-forest-500/20 text-forest-300 border-forest-500/35'
                    : 'glass border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{label}</span>
                <span className="opacity-60">
                  ({key === 'all' ? counts.all : counts[key] || 0})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Extrato de Transações ── */}
      {isLoading ? (
        <div className="glass-dark rounded-3xl p-8 border border-white/10 shadow-2xl flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-forest-400/40 border-t-forest-400 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/50">Carregando extrato financeiro…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-dark rounded-3xl p-12 border border-white/10 shadow-2xl text-center">
          <DollarSign className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-sm text-white/50 font-medium">
            Nenhuma transação encontrada com estes filtros.
          </p>
        </div>
      ) : (
        <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Contador */}
          <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
            <span className="text-xs text-white/40 font-medium">
              {filtered.length} transaç{filtered.length !== 1 ? 'ões' : 'ão'}
            </span>
            <span className="text-xs text-white/40 font-medium">
              Total: <span className="text-gold-400 font-bold">{formatPrice(filtered.reduce((s, r) => s + r.totalPrice, 0))}</span>
            </span>
          </div>

          {/* Cabeçalho Desktop */}
          <div className="hidden lg:grid grid-cols-[1fr_120px_140px_160px_110px_130px] gap-3 px-5 py-2.5 border-b border-white/8 bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <span>Hóspede</span>
            <span>Código</span>
            <span>Acomodação</span>
            <span>Período</span>
            <span>Pagamento</span>
            <span className="text-right">Valor Total</span>
          </div>

          {/* Linhas */}
          <div className="divide-y divide-white/6">
            <AnimatePresence mode="popLayout">
              {filtered.map((res) => {
                const badge = STATUS_badge[res.status] || STATUS_badge.pending;
                const roomName = getRoomName(res.roomId);
                const nights = calcNights(res.checkIn, res.checkOut);

                return (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="hover:bg-white/3 transition-colors"
                  >
                    {/* Desktop Row */}
                    <div className="hidden lg:grid grid-cols-[1fr_120px_140px_160px_110px_130px] gap-3 items-center px-5 py-3.5">
                      {/* Hóspede */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-forest-600/30 border border-forest-500/30 flex items-center justify-center text-forest-300 font-serif font-bold text-xs shrink-0">
                          {res.guestName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{res.guestName}</p>
                          <p className="text-[10px] text-white/40 truncate">{res.guestEmail}</p>
                        </div>
                      </div>

                      {/* Código */}
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-white/8 text-white/70 border border-white/8 w-fit">
                        {res.bookingCode}
                      </span>

                      {/* Acomodação */}
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <BedDouble className="w-3.5 h-3.5 text-forest-400/60 shrink-0" />
                        <span className="truncate">{roomName}</span>
                      </div>

                      {/* Período */}
                      <div className="text-[11px] text-white/50">
                        <span>{formatDateShort(res.checkIn)}</span>
                        <span className="mx-1">→</span>
                        <span>{formatDateShort(res.checkOut)}</span>
                        <span className="text-white/30 ml-1">({nights}n)</span>
                      </div>

                      {/* Pagamento */}
                      <div className="flex items-center gap-1.5 text-xs">
                        {res.paymentMethod === 'pix' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                            <QrCode className="w-3 h-3" />
                            PIX
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-agua-300 font-semibold">
                            <CreditCard className="w-3 h-3" />
                            Cartão
                          </span>
                        )}
                      </div>

                      {/* Valor */}
                      <div className="text-right">
                        <span className="font-serif text-sm font-bold text-gold-400">
                          {formatPrice(res.totalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="lg:hidden p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-forest-600/30 border border-forest-500/30 flex items-center justify-center text-forest-300 font-serif font-bold text-xs shrink-0">
                            {res.guestName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{res.guestName}</p>
                            <p className="text-[10px] font-mono text-white/50">{res.bookingCode}</p>
                          </div>
                        </div>
                        <span className="font-serif text-sm font-bold text-gold-400 shrink-0">
                          {formatPrice(res.totalPrice)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3 h-3 text-forest-400/60" />
                          {roomName}
                        </span>
                        <span>·</span>
                        <span>{formatDateShort(res.checkIn)} → {formatDateShort(res.checkOut)}</span>
                        <span>·</span>
                        <span>{nights} noites</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </div>

                        <span className="flex items-center gap-1 text-[11px] font-semibold">
                          {res.paymentMethod === 'pix' ? (
                            <><QrCode className="w-3 h-3 text-emerald-400" /><span className="text-emerald-300">PIX</span></>
                          ) : (
                            <><CreditCard className="w-3 h-3 text-agua-400" /><span className="text-agua-300">Cartão</span></>
                          )}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
