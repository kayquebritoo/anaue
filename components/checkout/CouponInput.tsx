'use client';

// ============================================================
// components/checkout/CouponInput.tsx
// Campo interativo de cupom de desconto no checkout
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Check, X, Loader2, Sparkles } from 'lucide-react';
import { validateCouponAction, type ValidateCouponResult } from '@/app/actions/coupon';
import type { Coupon } from '@/types';
import { formatPrice } from '@/lib/mockData';

interface CouponInputProps {
  orderTotal: number;
  onApply: (coupon: Coupon, discount: number) => void;
  onRemove: () => void;
  appliedCoupon: Coupon | null;
  appliedDiscount: number;
  disabled?: boolean;
}

export function CouponInput({
  orderTotal,
  onApply,
  onRemove,
  appliedCoupon,
  appliedDiscount,
  disabled,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result: ValidateCouponResult = await validateCouponAction(code, orderTotal);

      if (result.valid && result.coupon && result.discount !== undefined) {
        onApply(result.coupon, result.discount);
        setCode('');
      } else {
        setError(result.error || 'Cupom inválido.');
      }
    } catch {
      setError('Erro ao validar cupom. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  const handleRemove = () => {
    onRemove();
    setCode('');
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Cupom aplicado */}
      <AnimatePresence mode="wait">
        {appliedCoupon ? (
          <motion.div
            key="applied"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-3 rounded-2xl bg-forest-900/40 border border-forest-500/30"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-forest-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-forest-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-forest-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {appliedCoupon.code}
                </span>
                <span className="text-xs text-forest-400/70">
                  {appliedCoupon.discountType === 'percentage'
                    ? `${appliedCoupon.discountValue}% OFF`
                    : `${formatPrice(appliedCoupon.discountValue)} OFF`}
                  {' '}· Economia de {formatPrice(appliedDiscount)}
                </span>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Remover cupom"
            >
              <X className="w-4 h-4 text-white/50 hover:text-white/80" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <label className="text-xs text-white/50 mb-1.5 block">Cupom de Desconto</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: ANAUENATUREZA"
                  disabled={disabled || loading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass border border-white/10 text-white text-sm
                    placeholder:text-white/25 focus:outline-none focus:border-forest-400/50 focus:ring-1 focus:ring-forest-400/30
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider font-mono"
                />
              </div>
              <motion.button
                onClick={handleApply}
                disabled={disabled || loading || !code.trim()}
                whileHover={disabled || loading || !code.trim() ? {} : { scale: 1.03 }}
                whileTap={disabled || loading || !code.trim() ? {} : { scale: 0.97 }}
                className="px-5 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 disabled:bg-forest-800
                  disabled:text-white/30 text-white text-sm font-semibold transition-colors
                  flex items-center gap-1.5 shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Aplicar'
                )}
              </motion.button>
            </div>

            {/* Erro */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-400 mt-1.5 pl-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
