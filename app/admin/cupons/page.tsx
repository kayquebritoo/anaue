'use client';

// ============================================================
// app/admin/cupons/page.tsx
// Gestão de Cupons de Desconto — Painel Admin Anauê PMS
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Tag,
  Plus,
  ToggleLeft,
  ToggleRight,
  Percent,
  DollarSign,
  CalendarDays,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  getAllCouponsAction,
  createCouponAction,
  toggleCouponStatusAction,
} from '@/app/actions/coupon';
import type { Coupon, DiscountType } from '@/types';

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: 'Percentual',
  fixed: 'Valor Fixo',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Sem prazo';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formMinSpend, setFormMinSpend] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCouponsAction();
      setCoupons(data);
    } catch {
      showToast('error', 'Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const filtered = coupons.filter((c) => {
    if (filter === 'active') return c.isActive;
    if (filter === 'inactive') return !c.isActive;
    return true;
  });

  const handleCreate = async () => {
    if (!formCode.trim() || !formDiscountValue) {
      showToast('error', 'Preencha código e valor do desconto.');
      return;
    }

    setCreating(true);
    try {
      await createCouponAction({
        code: formCode.trim().toUpperCase(),
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue),
        minSpend: Number(formMinSpend) || 0,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        isActive: true,
      });

      showToast('success', 'Cupom criado com sucesso!');
      setShowForm(false);
      setFormCode('');
      setFormDiscountValue('');
      setFormMinSpend('');
      setFormExpiresAt('');
      loadCoupons();
    } catch {
      showToast('error', 'Erro ao criar cupom. Verifique se o código já existe.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await toggleCouponStatusAction(coupon.id, coupon.isActive);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
      );
      showToast('success', `Cupom ${coupon.isActive ? 'desativado' : 'ativado'}!`);
    } catch {
      showToast('error', 'Erro ao alterar status do cupom.');
    }
  };

  const activeCount = coupons.filter((c) => c.isActive).length;
  const inactiveCount = coupons.filter((c) => !c.isActive).length;

  return (
    <div className="min-h-screen gradient-admin pb-32 md:pb-8">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 glass-dark border-b border-white/8 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>

          <h1 className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-gold-400" />
            Cupons de Desconto
          </h1>

          <motion.button
            onClick={() => setShowForm(!showForm)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-forest-600 hover:bg-forest-500 text-white text-xs font-semibold transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showForm ? 'Fechar' : 'Criar Cupom'}</span>
          </motion.button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-dark rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{coupons.length}</p>
            <p className="text-xs text-white/50 mt-1">Total</p>
          </div>
          <div className="glass-dark rounded-2xl p-4 border border-forest-500/30 text-center">
            <p className="text-2xl font-bold text-forest-400">{activeCount}</p>
            <p className="text-xs text-white/50 mt-1">Ativos</p>
          </div>
          <div className="glass-dark rounded-2xl p-4 border border-red-500/20 text-center">
            <p className="text-2xl font-bold text-red-400/70">{inactiveCount}</p>
            <p className="text-xs text-white/50 mt-1">Inativos</p>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-forest-600 text-white border border-forest-400/40'
                  : 'glass text-white/50 hover:text-white/80 border border-white/10'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>

        {/* ── Formulário de Criação ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-dark rounded-3xl p-6 border border-white/10 space-y-5">
                <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-forest-400" />
                  Criar Novo Cupom
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Código */}
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/50 mb-1.5 block">Código do Cupom</label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="Ex: ANAUENATUREZA"
                      className="w-full px-4 py-2.5 rounded-xl glass border border-white/10 text-white text-sm
                        placeholder:text-white/25 focus:outline-none focus:border-forest-400/50
                        uppercase tracking-wider font-mono"
                    />
                  </div>

                  {/* Tipo de Desconto */}
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Tipo de Desconto</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormDiscountType('percentage')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          formDiscountType === 'percentage'
                            ? 'bg-forest-600 text-white border border-forest-400/40'
                            : 'glass text-white/50 border border-white/10 hover:text-white/80'
                        }`}
                      >
                        <Percent className="w-3.5 h-3.5" />
                        Percentual
                      </button>
                      <button
                        onClick={() => setFormDiscountType('fixed')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          formDiscountType === 'fixed'
                            ? 'bg-forest-600 text-white border border-forest-400/40'
                            : 'glass text-white/50 border border-white/10 hover:text-white/80'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Fixo (R$)
                      </button>
                    </div>
                  </div>

                  {/* Valor do Desconto */}
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">
                      Valor do Desconto {formDiscountType === 'percentage' ? '(%)' : '(R$)'}
                    </label>
                    <input
                      type="number"
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(e.target.value)}
                      placeholder={formDiscountType === 'percentage' ? '10' : '100'}
                      min="0"
                      max={formDiscountType === 'percentage' ? '100' : undefined}
                      className="w-full px-4 py-2.5 rounded-xl glass border border-white/10 text-white text-sm
                        placeholder:text-white/25 focus:outline-none focus:border-forest-400/50"
                    />
                  </div>

                  {/* Gasto Mínimo */}
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Gasto Mínimo (R$)</label>
                    <input
                      type="number"
                      value={formMinSpend}
                      onChange={(e) => setFormMinSpend(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-4 py-2.5 rounded-xl glass border border-white/10 text-white text-sm
                        placeholder:text-white/25 focus:outline-none focus:border-forest-400/50"
                    />
                  </div>

                  {/* Data de Expiração */}
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Data de Expiração</label>
                    <input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass border border-white/10 text-white text-sm
                        focus:outline-none focus:border-forest-400/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 rounded-xl glass text-white/60 text-sm font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    onClick={handleCreate}
                    disabled={creating || !formCode.trim() || !formDiscountValue}
                    whileHover={creating ? {} : { scale: 1.03 }}
                    whileTap={creating ? {} : { scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500
                      disabled:bg-forest-800 disabled:text-white/30 text-white text-sm font-semibold transition-colors"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Criar Cupom
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Lista de Cupons ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-forest-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 glass-dark rounded-3xl border border-white/10">
            <Tag className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">Nenhum cupom encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((coupon) => {
              const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();

              return (
                <motion.div
                  key={coupon.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-dark rounded-2xl p-4 sm:p-5 border transition-all ${
                    coupon.isActive
                      ? 'border-forest-500/25 hover:border-forest-500/40'
                      : 'border-white/8 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        coupon.isActive ? 'bg-forest-600/30' : 'bg-white/5'
                      }`}>
                        <Tag className={`w-5 h-5 ${coupon.isActive ? 'text-forest-400' : 'text-white/30'}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-white tracking-wider">
                            {coupon.code}
                          </span>
                          {!coupon.isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold border border-red-500/30">
                              INATIVO
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
                              EXPIRADO
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-white/60">
                            {coupon.discountType === 'percentage' ? (
                              <Percent className="w-3 h-3" />
                            ) : (
                              <DollarSign className="w-3 h-3" />
                            )}
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}% OFF`
                              : `${coupon.discountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} OFF`}
                          </span>

                          {coupon.minSpend > 0 && (
                            <span className="text-xs text-white/40">
                              Mínimo: {coupon.minSpend.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-xs text-white/40">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(coupon.expiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(coupon)}
                      className={`shrink-0 p-1 rounded-lg transition-colors ${
                        coupon.isActive
                          ? 'hover:bg-forest-500/20 text-forest-400'
                          : 'hover:bg-white/10 text-white/40'
                      }`}
                      aria-label={coupon.isActive ? 'Desativar cupom' : 'Ativar cupom'}
                    >
                      {coupon.isActive ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100]
              flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium ${
                toast.type === 'success'
                  ? 'bg-forest-900/90 border-forest-500/40 text-forest-300'
                  : 'bg-red-900/90 border-red-500/40 text-red-300'
              }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
