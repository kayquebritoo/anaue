'use client';

// ============================================================
// app/admin/relatorios/page.tsx
// Relatórios Analíticos & Gráficos de Sazonalidade — Anauê PMS
// Métricas: Faturamento/Mês, Ocupação, Pagamento, Up-sell
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  BedDouble,
  DollarSign,
  Percent,
  QrCode,
  CreditCard,
  Sparkles,
  Loader2,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { MetricCard } from '@/components/admin/MetricCard';
import { getRoomsAsync, getBookingsAsync } from '@/lib/supabaseData';
import { formatPrice } from '@/lib/mockData';
import type { Room, Reservation } from '@/types';

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function calcNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function AdminRelatoriosPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [loadedRooms, loadedBookings] = await Promise.all([
      getRoomsAsync(),
      getBookingsAsync(),
    ]);
    setRooms(loadedRooms);
    setReservations(loadedBookings);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Métricas consolidadas ──
  const metrics = useMemo(() => {
    const active = reservations.filter((r) => r.status !== 'cancelled');
    const totalRooms = rooms.length || 4;

    // 1. Faturamento por Mês
    const revenueByMonth = new Map<string, number>();
    const countByMonth = new Map<string, number>();
    active.forEach((r) => {
      const key = getMonthKey(r.createdAt);
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + r.totalPrice);
      countByMonth.set(key, (countByMonth.get(key) || 0) + 1);
    });

    // Ordenar por mês
    const sortedMonths = Array.from(revenueByMonth.keys()).sort();
    const monthData = sortedMonths.map((key) => {
      const [y, m] = key.split('-');
      return {
        key,
        label: MONTH_NAMES[parseInt(m, 10) - 1],
        fullLabel: `${MONTH_FULL[parseInt(m, 10) - 1]} ${y}`,
        revenue: revenueByMonth.get(key) || 0,
        count: countByMonth.get(key) || 0,
      };
    });

    const maxRevenue = Math.max(...monthData.map((m) => m.revenue), 1);

    // 2. Ocupação média
    const totalNightsBooked = active.reduce(
      (sum, r) => sum + calcNights(r.checkIn, r.checkOut),
      0,
    );
    // Calcular meses cobertos
    const firstBooking = active.length > 0
      ? new Date(Math.min(...active.map((r) => new Date(r.checkIn).getTime())))
      : new Date();
    const lastBooking = active.length > 0
      ? new Date(Math.max(...active.map((r) => new Date(r.checkOut).getTime())))
      : new Date();
    const monthsDiff = Math.max(1,
      (lastBooking.getFullYear() - firstBooking.getFullYear()) * 12 +
      (lastBooking.getMonth() - firstBooking.getMonth()) + 1,
    );
    const totalAvailableNights = totalRooms * monthsDiff * 30;
    const occupancyRate = totalAvailableNights > 0
      ? Math.min(100, Math.round((totalNightsBooked / totalAvailableNights) * 100))
      : 0;

    // 3. Distribuição de pagamento
    const pixCount = active.filter((r) => r.paymentMethod === 'pix').length;
    const cardCount = active.filter((r) => r.paymentMethod === 'credit_card').length;
    const pixRevenue = active
      .filter((r) => r.paymentMethod === 'pix')
      .reduce((sum, r) => sum + r.totalPrice, 0);
    const cardRevenue = active
      .filter((r) => r.paymentMethod === 'credit_card')
      .reduce((sum, r) => sum + r.totalPrice, 0);
    const totalPaymentCount = pixCount + cardCount || 1;

    // 4. Up-sell: receita de addons e experiências
    const totalAddonsRevenue = active.reduce((sum, r) => sum + (r.addonsPrice || 0), 0);
    const totalDiscountGiven = active.reduce((sum, r) => sum + (r.discountPrice || 0), 0);
    const avgAddonPerBooking = active.length > 0
      ? totalAddonsRevenue / active.length
      : 0;

    // Experiências vs Addons (estimativa: metade do addonsPrice são experiências)
    const experiencesRevenue = Math.round(totalAddonsRevenue * 0.6);
    const addonsRevenue = totalAddonsRevenue - experiencesRevenue;

    // 5. KPIs gerais
    const totalRevenue = active.reduce((sum, r) => sum + r.totalPrice, 0);
    const adr = totalNightsBooked > 0 ? totalRevenue / totalNightsBooked : 0;
    const avgStayLength = active.length > 0
      ? totalNightsBooked / active.length
      : 0;

    return {
      monthData,
      maxRevenue,
      occupancyRate,
      totalNightsBooked,
      pixCount,
      cardCount,
      pixRevenue,
      cardRevenue,
      totalPaymentCount,
      totalAddonsRevenue,
      experiencesRevenue,
      addonsRevenue,
      avgAddonPerBooking,
      totalDiscountGiven,
      totalRevenue,
      adr,
      avgStayLength,
      totalBookings: active.length,
      totalRooms,
      monthsDiff,
    };
  }, [reservations, rooms]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-admin flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-agua-400 animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Carregando relatórios…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-admin pb-32 md:pb-8">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 glass-dark border-b border-white/8 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>

          <h1 className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-agua-400" />
            Relatórios & Sazonalidade
          </h1>

          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* ── KPIs Gerais ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="Faturamento Total"
            value={Math.round(metrics.totalRevenue)}
            prefix="R$"
            icon={DollarSign}
            color="gold"
            subtitle={`${metrics.totalBookings} reservas ativas`}
          />
          <MetricCard
            title="ADR (Diária Média)"
            value={Math.round(metrics.adr)}
            prefix="R$"
            icon={TrendingUp}
            color="agua"
            subtitle={`${metrics.totalNightsBooked} noites vendidas`}
          />
          <MetricCard
            title="Ocupação Média"
            value={metrics.occupancyRate}
            suffix="%"
            icon={BedDouble}
            color="forest"
            progress={metrics.occupancyRate}
            subtitle={`${metrics.monthsDiff} mês(es) analisado(s)`}
          />
          <MetricCard
            title="Estadia Média"
            value={Math.round(metrics.avgStayLength * 10) / 10}
            suffix=" noites"
            icon={CalendarDays}
            color="amber"
            subtitle="por reserva"
          />
        </div>

        {/* ── Faturamento por Mês (Gráfico de Barras) ── */}
        <section className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-agua-400" />
                Faturamento por Mês
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Receita total de cada mês · {metrics.monthData.length} mês(es) com dados
              </p>
            </div>
          </div>

          {metrics.monthData.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
              Nenhum dado de faturamento disponível.
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.monthData.map((month, i) => {
                const width = (month.revenue / metrics.maxRevenue) * 100;
                return (
                  <motion.div
                    key={month.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xs text-white/50 w-8 text-right shrink-0 font-mono">
                      {month.label}
                    </span>
                    <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-agua-600 to-agua-400 rounded-lg relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-lg" />
                      </motion.div>
                      <div className="absolute inset-0 flex items-center px-3 justify-between">
                        <span className="text-[11px] font-semibold text-white/90 drop-shadow-lg">
                          {formatPrice(month.revenue)}
                        </span>
                        <span className="text-[10px] text-white/50">
                          {month.count} reserva(s)
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Distribuição de Pagamento ── */}
          <section className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10">
            <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2 mb-5">
              <CreditCard className="w-5 h-5 text-forest-400" />
              Formas de Pagamento
            </h2>

            <div className="space-y-5">
              {/* Barras horizontais */}
              <div className="space-y-3">
                {/* PIX */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-2 text-sm text-white/80">
                      <QrCode className="w-4 h-4 text-forest-400" />
                      PIX
                    </span>
                    <span className="text-xs text-white/50">
                      {metrics.pixCount} reserva(s) · {formatPrice(metrics.pixRevenue)}
                    </span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(metrics.pixCount / metrics.totalPaymentCount) * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full"
                    />
                  </div>
                  <span className="text-[11px] text-forest-400/70 mt-1 block">
                    {Math.round((metrics.pixCount / metrics.totalPaymentCount) * 100)}% do total
                  </span>
                </div>

                {/* Cartão */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-2 text-sm text-white/80">
                      <CreditCard className="w-4 h-4 text-agua-400" />
                      Cartão de Crédito
                    </span>
                    <span className="text-xs text-white/50">
                      {metrics.cardCount} reserva(s) · {formatPrice(metrics.cardRevenue)}
                    </span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(metrics.cardCount / metrics.totalPaymentCount) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-agua-600 to-agua-400 rounded-full"
                    />
                  </div>
                  <span className="text-[11px] text-agua-400/70 mt-1 block">
                    {Math.round((metrics.cardCount / metrics.totalPaymentCount) * 100)}% do total
                  </span>
                </div>
              </div>

              {/* Resumo visual */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-forest-500"
                    style={{ width: `${(metrics.pixCount / metrics.totalPaymentCount) * 100}%` }}
                  />
                  <div
                    className="h-full bg-agua-500"
                    style={{ width: `${(metrics.cardCount / metrics.totalPaymentCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-white/40 shrink-0">
                  {metrics.totalPaymentCount} total
                </span>
              </div>
            </div>
          </section>

          {/* ── Desempenho de Up-sell ── */}
          <section className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10">
            <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-gold-400" />
              Desempenho de Up-sell
            </h2>

            <div className="space-y-4">
              {/* Receita total de up-sell */}
              <div className="glass rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block">
                      Receita Total Up-sell
                    </span>
                    <span className="text-gradient-gold text-2xl font-bold font-serif">
                      {formatPrice(metrics.totalAddonsRevenue)}
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gold-500/20 flex items-center justify-center border border-gold-500/30">
                    <TrendingUp className="w-5 h-5 text-gold-400" />
                  </div>
                </div>
                <p className="text-[11px] text-white/40 mt-2">
                  Média de {formatPrice(metrics.avgAddonPerBooking)} por reserva
                </p>
              </div>

              {/* Experiências vs Adicionais */}
              <div className="space-y-3">
                {/* Experiências */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-2 text-sm text-white/80">
                      <Sparkles className="w-4 h-4 text-gold-400" />
                      Experiências Amazônicas
                    </span>
                    <span className="text-xs text-gold-400 font-semibold">
                      {formatPrice(metrics.experiencesRevenue)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${metrics.totalAddonsRevenue > 0
                          ? (metrics.experiencesRevenue / metrics.totalAddonsRevenue) * 100
                          : 0}%`,
                      }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                    />
                  </div>
                </div>

                {/* Adicionais */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-2 text-sm text-white/80">
                      <DollarSign className="w-4 h-4 text-forest-400" />
                      Adicionais (Transfer, Refeições)
                    </span>
                    <span className="text-xs text-forest-400 font-semibold">
                      {formatPrice(metrics.addonsRevenue)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${metrics.totalAddonsRevenue > 0
                          ? (metrics.addonsRevenue / metrics.totalAddonsRevenue) * 100
                          : 0}%`,
                      }}
                      transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Impacto no ticket médio */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <ArrowUpRight className="w-3.5 h-3.5 text-forest-400" />
                  Up-sell representa{' '}
                  <span className="text-forest-400 font-semibold">
                    {metrics.totalRevenue > 0
                      ? Math.round((metrics.totalAddonsRevenue / metrics.totalRevenue) * 100)
                      : 0}%
                  </span>{' '}
                  da receita total
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Descontos Concedidos ── */}
        <section className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" />
                Descontos Concedidos
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Total de descontos PIX e cupons aplicados
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold font-serif text-amber-400">
                -{formatPrice(metrics.totalDiscountGiven)}
              </span>
              <p className="text-[10px] text-white/40 mt-0.5">
                {metrics.totalRevenue + metrics.totalDiscountGiven > 0
                  ? `-${Math.round(
                      (metrics.totalDiscountGiven /
                        (metrics.totalRevenue + metrics.totalDiscountGiven)) *
                        100,
                    )}% sobre bruto`
                  : '0%'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
