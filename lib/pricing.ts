// ============================================================
// lib/pricing.ts
// Cálculo de preço de reservas — EXCLUSIVAMENTE no servidor.
//
// O navegador nunca define o valor. Ele envia apenas o que foi escolhido
// (quarto/experiência, datas, hóspedes, IDs de adicionais, cupom, forma de
// pagamento) e, opcionalmente, o total que exibiu; o servidor recalcula a
// partir do catálogo e recusa a reserva se os valores divergirem.
//
// Regras (idênticas às exibidas no checkout — hooks/useCheckout.ts):
//   quarto        = preço/noite × noites
//   experiência   = preço × (hóspedes se per_person, senão 1)
//   adicionais    = Σ preço × (hóspedes se per_person, senão 1)
//   subtotal      = quarto + experiência + adicionais + experiências extras
//   desconto PIX  = round(subtotal × 5%)            (canal web, pagamento PIX)
//   cupom         = percentual: round(subtotal × %), fixo: min(valor, subtotal)
//                   (ativo, não expirado, subtotal ≥ gasto mínimo)
//   total         = max(0, subtotal − PIX − cupom)
//   canal manual  = reserva da equipe: preço/noite × noites, sem adicionais,
//                   sem PIX, sem cupom (como o modal de reserva manual)
// ============================================================

import type { Coupon, PaymentMethodType } from '@/types';

export const PIX_DISCOUNT_RATE = 0.05;
const MAX_NIGHTS = 60;
const MAX_EXPERIENCE_GUESTS = 10;
const MAX_ITEMS = 20;

export interface CatalogRoom {
  id: string;
  name: string;
  pricePerNight: number;
  maxGuests: number;
  isAvailable?: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  priceType: 'per_person' | 'fixed';
}

/** Fonte de preços confiável (banco / catálogo estático do servidor). */
export interface PricingCatalog {
  getRoom(id: string): Promise<CatalogRoom | undefined>;
  getExperience(id: string): Promise<CatalogItem | undefined>;
  getAddon(id: string): Promise<CatalogItem | undefined>;
  getCoupon(code: string): Promise<Coupon | undefined>;
  now?: () => Date;
}

export interface PricingRequest {
  channel: 'web' | 'manual';
  roomId?: string | null;
  experienceId?: string | null;
  isExperienceMode?: boolean;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentMethod: PaymentMethodType;
  /** IDs escolhidos (adicionais e experiências extras). Preço/nome do cliente são ignorados. */
  items?: { id: string; label?: string }[];
  couponCode?: string | null;
}

export interface PricedLineItem {
  id: string;
  name: string;
  price: number;
}

export interface PriceQuote {
  nights: number;
  roomSubtotal: number;
  experienceSubtotal: number;
  itemsSubtotal: number;
  subtotal: number;
  pixDiscount: number;
  couponDiscount: number;
  couponCode: string | null;
  total: number;
  lineItems: PricedLineItem[];
}

export type QuoteResult = { ok: true; quote: PriceQuote } | { ok: false; error: string };

export const PRICING_MESSAGES = {
  priceMismatch:
    'O valor da reserva foi atualizado. Revise o resumo e confirme novamente — nenhuma reserva foi criada.',
  invalidCoupon: 'Cupom inválido, expirado ou não aplicável a este pedido.',
  invalidItem: 'Um dos itens selecionados não está mais disponível. Revise sua seleção.',
  invalidRoom: 'Acomodação indisponível para reserva.',
  invalidExperience: 'Experiência indisponível para reserva.',
  invalidGuests: 'Número de hóspedes inválido para esta acomodação.',
  invalidDates: 'Período inválido. Verifique as datas de check-in e check-out.',
  invalidPayment: 'Forma de pagamento inválida.',
  manualExtras: 'Reservas manuais não aceitam adicionais nem cupons.',
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function countNights(checkIn: string, checkOut: string): number | null {
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) return null;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (isNaN(start) || isNaN(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

export function couponDiscountFor(coupon: Coupon, subtotal: number): number {
  if (coupon.discountType === 'percentage') {
    const pct = Math.min(Math.max(coupon.discountValue, 0), 100);
    return Math.round(subtotal * (pct / 100));
  }
  return Math.min(Math.max(coupon.discountValue, 0), subtotal);
}

function multiplier(item: CatalogItem, guests: number): number {
  return item.priceType === 'per_person' ? guests : 1;
}

function sanitizeLabel(catalogName: string, label: string | undefined): string {
  // Mantém apenas o sufixo de agendamento enviado pelo cliente, ex.: "(2027-01-10 09:00)"
  const suffix = (label || '').startsWith(catalogName) ? (label || '').slice(catalogName.length) : '';
  const cleanSuffix = suffix.replace(/[^\p{L}\p{N} :()\-/]/gu, '').trim().slice(0, 40);
  return cleanSuffix ? `${catalogName} ${cleanSuffix}` : catalogName;
}

export async function quoteBooking(req: PricingRequest, catalog: PricingCatalog): Promise<QuoteResult> {
  if (req.paymentMethod !== 'pix' && req.paymentMethod !== 'credit_card') {
    return { ok: false, error: PRICING_MESSAGES.invalidPayment };
  }
  if (!Number.isInteger(req.guests) || req.guests < 1) {
    return { ok: false, error: PRICING_MESSAGES.invalidGuests };
  }

  const nights = countNights(req.checkIn, req.checkOut);
  if (nights === null || nights < 1 || nights > MAX_NIGHTS) {
    return { ok: false, error: PRICING_MESSAGES.invalidDates };
  }

  const isRoomBooking = Boolean(
    !req.isExperienceMode && req.roomId && !req.roomId.startsWith('exp-booking-')
  );

  let roomSubtotal = 0;
  let experienceSubtotal = 0;

  if (isRoomBooking) {
    const room = await catalog.getRoom(req.roomId as string);
    if (!room || room.isAvailable === false || !(room.pricePerNight > 0)) {
      return { ok: false, error: PRICING_MESSAGES.invalidRoom };
    }
    if (req.guests > room.maxGuests) {
      return { ok: false, error: PRICING_MESSAGES.invalidGuests };
    }
    roomSubtotal = roundMoney(room.pricePerNight * nights);
  } else {
    if (req.channel === 'manual') return { ok: false, error: PRICING_MESSAGES.invalidRoom };
    const exp = req.experienceId ? await catalog.getExperience(req.experienceId) : undefined;
    if (!exp || !(exp.price > 0)) {
      return { ok: false, error: PRICING_MESSAGES.invalidExperience };
    }
    if (req.guests > MAX_EXPERIENCE_GUESTS) {
      return { ok: false, error: PRICING_MESSAGES.invalidGuests };
    }
    experienceSubtotal = roundMoney(exp.price * multiplier(exp, req.guests));
  }

  // ── Adicionais e experiências extras: preço SEMPRE do catálogo ──
  const items = req.items ?? [];
  if (req.channel === 'manual' && (items.length > 0 || req.couponCode)) {
    return { ok: false, error: PRICING_MESSAGES.manualExtras };
  }
  if (items.length > MAX_ITEMS) return { ok: false, error: PRICING_MESSAGES.invalidItem };

  const seen = new Set<string>();
  const lineItems: PricedLineItem[] = [];
  for (const item of items) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!id || seen.has(id)) return { ok: false, error: PRICING_MESSAGES.invalidItem };
    seen.add(id);

    const catalogItem = (await catalog.getAddon(id)) ?? (await catalog.getExperience(id));
    if (!catalogItem || !(catalogItem.price > 0)) {
      return { ok: false, error: PRICING_MESSAGES.invalidItem };
    }
    lineItems.push({
      id: catalogItem.id,
      name: sanitizeLabel(catalogItem.name, item.label),
      price: roundMoney(catalogItem.price * multiplier(catalogItem, req.guests)),
    });
  }
  const itemsSubtotal = roundMoney(lineItems.reduce((sum, li) => sum + li.price, 0));

  const subtotal = roundMoney(roomSubtotal + experienceSubtotal + itemsSubtotal);

  const pixDiscount =
    req.channel === 'web' && req.paymentMethod === 'pix' ? Math.round(subtotal * PIX_DISCOUNT_RATE) : 0;

  // ── Cupom: validado no servidor com as mesmas regras do validateCouponAction ──
  let couponDiscount = 0;
  let couponCode: string | null = null;
  const rawCode = (req.couponCode || '').trim().toUpperCase();
  if (rawCode) {
    const coupon = /^[A-Z0-9_-]{1,40}$/.test(rawCode) ? await catalog.getCoupon(rawCode) : undefined;
    const now = (catalog.now ?? (() => new Date()))();
    const valid =
      coupon &&
      coupon.isActive &&
      (!coupon.expiresAt || new Date(coupon.expiresAt) >= now) &&
      subtotal >= coupon.minSpend;
    if (!valid) return { ok: false, error: PRICING_MESSAGES.invalidCoupon };
    couponDiscount = couponDiscountFor(coupon, subtotal);
    couponCode = coupon.code;
  }

  const total = roundMoney(Math.max(0, subtotal - pixDiscount - couponDiscount));

  return {
    ok: true,
    quote: {
      nights,
      roomSubtotal,
      experienceSubtotal,
      itemsSubtotal,
      subtotal,
      pixDiscount,
      couponDiscount,
      couponCode,
      total,
      lineItems,
    },
  };
}

/** Converte para centavos inteiros (comparação exata, sem tolerância). */
export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

/** true se o valor exibido pelo cliente confere, centavo a centavo, com o calculado no servidor. */
export function matchesQuote(clientTotal: number | undefined | null, quote: PriceQuote): boolean {
  if (clientTotal === undefined || clientTotal === null) return true; // nada a comparar
  return Number.isFinite(clientTotal) && toCents(clientTotal) === toCents(quote.total);
}

/** Valor pago confere exatamente (em centavos) com o valor devido. */
export function amountsMatch(paid: number, due: number): boolean {
  return Number.isFinite(paid) && Number.isFinite(due) && toCents(paid) === toCents(due);
}
