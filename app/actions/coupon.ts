'use server';

// ============================================================
// app/actions/coupon.ts
// Server Actions — Validação e CRUD de Cupons de Desconto
// ============================================================

import { getCouponByCodeAsync, getAllCouponsAsync, createCouponAsync, updateCouponAsync } from '@/lib/supabaseData';
import { calculateCouponDiscount } from '@/lib/mockData';
import type { Coupon } from '@/types';

export interface ValidateCouponResult {
  valid: boolean;
  coupon?: Coupon;
  discount?: number;
  error?: string;
}

export async function validateCouponAction(
  code: string,
  orderTotal: number
): Promise<ValidateCouponResult> {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Informe um código de cupom.' };
  }

  if (orderTotal <= 0) {
    return { valid: false, error: 'Adicione itens à reserva antes de aplicar um cupom.' };
  }

  // Busca o cupom real no Supabase (getCouponByCodeAsync já tem fallback para mockData)
  const coupon = await getCouponByCodeAsync(code);

  if (!coupon) {
    return { valid: false, error: 'Cupom não encontrado.' };
  }

  if (!coupon.isActive) {
    return { valid: false, error: 'Este cupom está inativo.' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: 'Este cupom expirou.' };
  }

  if (orderTotal < coupon.minSpend) {
    return {
      valid: false,
      error: `Pedido mínimo de R$ ${coupon.minSpend.toFixed(0)} para este cupom.`,
    };
  }

  const discount = calculateCouponDiscount(coupon, orderTotal);

  return {
    valid: true,
    coupon,
    discount,
  };
}

export async function getAllCouponsAction(): Promise<Coupon[]> {
  return getAllCouponsAsync();
}

export async function createCouponAction(
  coupon: Omit<Coupon, 'id' | 'createdAt'>
): Promise<Coupon> {
  if (!coupon.code || !coupon.code.trim()) {
    throw new Error('Código do cupom é obrigatório.');
  }
  if (coupon.discountValue <= 0) {
    throw new Error('Valor do desconto deve ser maior que zero.');
  }
  if (coupon.discountType === 'percentage' && coupon.discountValue > 100) {
    throw new Error('Desconto percentual não pode exceder 100%.');
  }

  return createCouponAsync(coupon);
}

export async function toggleCouponStatusAction(
  id: string,
  currentActive: boolean
): Promise<Coupon> {
  return updateCouponAsync(id, { isActive: !currentActive });
}
