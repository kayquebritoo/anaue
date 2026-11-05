// ============================================================
// lib/bookingService.ts
// Núcleo da criação de reservas, desacoplado do Next.js para ser
// testável com repositórios isolados (mock / banco de testes).
//
// Garantias:
//  - Sucesso só é retornado após o INSERT ser confirmado pelo banco.
//  - Falha na consulta de disponibilidade bloqueia a reserva (fail-closed).
//  - Falha de persistência nunca cai em mock e nunca dispara e-mail.
//  - A proteção definitiva contra concorrência é a constraint/trigger do
//    banco; a pré-checagem aqui serve apenas para mensagens amigáveis.
// ============================================================

import { supabase } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import { mapDbBookingToReservation } from '@/lib/supabaseData';
import { BOOKING_MESSAGES, BookingDbError, bookingErrorMessage, classifyDbError } from '@/lib/bookingErrors';
import { quoteBooking, matchesQuote, PRICING_MESSAGES, type PricingCatalog } from '@/lib/pricing';

export { BookingDbError };
import type { Reservation, ReservationStatus, PaymentMethodType, InvoiceStatus } from '@/types';
import type { Database, DbBooking, Json } from '@/types/database';

export type BookingInsertRow = Database['public']['Tables']['bookings']['Insert'];

export interface CreateBookingInput {
  roomId?: string | null;
  experienceId?: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  /**
   * Total EXIBIDO ao hóspede. Não define o preço: o servidor recalcula e
   * recusa a reserva se divergir (lib/pricing.ts).
   */
  totalPrice?: number;
  /** Ignorados — mantidos por compatibilidade; o servidor recalcula. */
  roomPrice?: number;
  addonsPrice?: number;
  discountPrice?: number;
  /** Cupom aplicado no checkout; revalidado no servidor. */
  couponCode?: string | null;
  /** 'manual' = reserva pela equipe (sem desconto PIX, adicionais ou cupom). */
  channel?: 'web' | 'manual';
  specialRequests?: string | null;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestDocument?: string | null;
  taxId?: string | null;
  companyName?: string | null;
  billingAddress?: string | null;
  invoiceStatus?: InvoiceStatus;
  paymentMethod: PaymentMethodType;
  selectedAddons?: { id: string; name: string; price: number }[];
  isExperienceMode?: boolean;
  status?: ReservationStatus;
}

export interface BookingActionResult {
  success: boolean;
  bookingId?: string;
  bookingCode?: string;
  reservation?: Reservation;
  error?: string;
}

/**
 * Acesso a dados de reservas. Métodos DEVEM lançar em caso de erro —
 * nunca retornar lista vazia ou objeto falso quando o banco falha.
 */
export interface BookingRepository {
  findActiveBookingOverlaps(roomId: string, checkIn: string, checkOut: string): Promise<{ id: string }[]>;
  findRoomBlockOverlaps(roomId: string, checkIn: string, checkOut: string): Promise<{ id: string }[]>;
  insertBooking(row: BookingInsertRow): Promise<Reservation>;
}

export interface BookingServiceDeps {
  /** null = nenhum repositório disponível (Supabase não configurado e mock proibido). */
  repo: BookingRepository | null;
  /** Fonte de preços confiável do servidor. */
  catalog: PricingCatalog;
  sendConfirmation: (reservation: Reservation) => Promise<unknown>;
  revalidate?: (paths: string[]) => Promise<void>;
  logger?: Pick<Console, 'error' | 'warn'>;
}

const MAX_CODE_ATTEMPTS = 3;

function generateBookingCode(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.floor(100 + Math.random() * 900);
  return `AN-${ts}${rand}`;
}

function sanitizeEmail(payload: CreateBookingInput): string {
  const email = payload.guestEmail?.trim() || '';
  if (email && email.includes('@')) return email;
  // Reserva rápida (ex.: WhatsApp) sem e-mail: gera endereço de referência
  const phone = (payload.guestPhone || '').replace(/\D/g, '');
  const name = payload.guestName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
  return phone ? `wpp.${phone}@guest.anaue.com.br` : `${name || 'hospede'}@manual.anaue.com.br`;
}

export async function createBooking(
  payload: CreateBookingInput,
  deps: BookingServiceDeps
): Promise<BookingActionResult> {
  const log = deps.logger ?? console;

  // ── 1. Validação básica ──
  if (!payload.guestName?.trim()) {
    return { success: false, error: 'Nome completo é obrigatório.' };
  }
  if (!payload.checkIn || !payload.checkOut) {
    return { success: false, error: 'Período de check-in e check-out é obrigatório.' };
  }

  const checkInDate = new Date(payload.checkIn);
  const checkOutDate = new Date(payload.checkOut);
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { success: false, error: 'Formato de datas inválido.' };
  }

  const isRoomBooking = Boolean(
    !payload.isExperienceMode && payload.roomId && !payload.roomId.startsWith('exp-booking-')
  );

  // Regra preexistente mantida: check-out estritamente posterior ao check-in.
  if (checkOutDate <= checkInDate) {
    return { success: false, error: BOOKING_MESSAGES.invalidDates };
  }

  if (!deps.repo) {
    log.error('[createBooking] Nenhum repositório disponível (Supabase não configurado em produção).');
    return { success: false, error: BOOKING_MESSAGES.systemUnavailable };
  }
  const repo = deps.repo;
  const roomId = isRoomBooking ? (payload.roomId as string) : null;

  // ── 1b. Preço calculado no servidor (nunca o valor do navegador) ──
  let quoteResult;
  try {
    quoteResult = await quoteBooking(
      {
        channel: payload.channel ?? 'web',
        roomId: payload.roomId,
        experienceId: payload.experienceId,
        isExperienceMode: payload.isExperienceMode,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        guests: payload.guests,
        paymentMethod: payload.paymentMethod,
        items: (payload.selectedAddons ?? []).map((a) => ({ id: a?.id, label: a?.name })),
        couponCode: payload.couponCode,
      },
      deps.catalog
    );
  } catch (err) {
    log.error('[createBooking] Falha ao calcular preço:', err);
    return { success: false, error: BOOKING_MESSAGES.availabilityUnavailable };
  }
  if (!quoteResult.ok) {
    return { success: false, error: quoteResult.error };
  }
  const quote = quoteResult.quote;
  if (!matchesQuote(payload.totalPrice, quote)) {
    log.warn(
      `[createBooking] Total enviado pelo cliente (${payload.totalPrice}) difere do calculado (${quote.total}). Reserva recusada.`
    );
    return { success: false, error: PRICING_MESSAGES.priceMismatch };
  }

  // ── 2. Pré-checagem de disponibilidade (fail-closed) ──
  if (roomId) {
    let bookingOverlaps: { id: string }[];
    let blockOverlaps: { id: string }[];
    try {
      [bookingOverlaps, blockOverlaps] = await Promise.all([
        repo.findActiveBookingOverlaps(roomId, payload.checkIn, payload.checkOut),
        repo.findRoomBlockOverlaps(roomId, payload.checkIn, payload.checkOut),
      ]);
    } catch (err) {
      log.error('[createBooking] Falha ao consultar disponibilidade:', err);
      return { success: false, error: BOOKING_MESSAGES.availabilityUnavailable };
    }
    if (bookingOverlaps.length > 0) {
      return { success: false, error: BOOKING_MESSAGES.roomConflict };
    }
    if (blockOverlaps.length > 0) {
      return { success: false, error: BOOKING_MESSAGES.roomBlocked };
    }
  }

  // ── 3. Persistência — a constraint do banco é a garantia final ──
  const guestEmail = sanitizeEmail(payload);
  const baseRow: Omit<BookingInsertRow, 'booking_code'> = {
    room_id: roomId,
    user_id: `guest-${Date.now().toString(36)}`,
    guest_name: payload.guestName.trim(),
    guest_email: guestEmail,
    guest_phone: payload.guestPhone?.trim() || '',
    check_in_date: payload.checkIn,
    check_out_date: payload.checkOut,
    guests: payload.guests,
    // Valores calculados no servidor (lib/pricing.ts)
    room_price: quote.roomSubtotal + quote.experienceSubtotal,
    addons_price: quote.itemsSubtotal,
    discount_price: quote.pixDiscount + quote.couponDiscount,
    total_price: quote.total,
    coupon_code: quote.couponCode,
    status: payload.status || 'pending',
    special_requests: payload.specialRequests?.trim() || null,
    payment_method: payload.paymentMethod,
    selected_addons: quote.lineItems as unknown as Json,
    guest_document: payload.guestDocument?.trim() || null,
    tax_id: payload.taxId?.trim() || null,
    company_name: payload.companyName?.trim() || null,
    billing_address: payload.billingAddress?.trim() || null,
    invoice_status: payload.invoiceStatus || (payload.taxId ? 'pending' : 'exempt'),
  };

  let reservation: Reservation | null = null;
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS && !reservation; attempt++) {
    try {
      reservation = await repo.insertBooking({ ...baseRow, booking_code: generateBookingCode() });
    } catch (err) {
      const kind = classifyDbError(err);
      if (kind === 'unique_violation' && attempt < MAX_CODE_ATTEMPTS) {
        continue; // colisão de código/ID: tenta de novo com novo código
      }
      if (kind === 'unknown' || kind === 'unique_violation') {
        log.error('[createBooking] Falha ao persistir reserva:', err);
      }
      return { success: false, error: bookingErrorMessage(kind) };
    }
  }

  if (!reservation || !reservation.id) {
    log.error('[createBooking] Banco não retornou a reserva criada.');
    return { success: false, error: BOOKING_MESSAGES.persistenceFailed };
  }

  // ── 4. Somente após persistência confirmada: e-mail e revalidação ──
  const persisted = reservation;
  void Promise.resolve()
    .then(() => deps.sendConfirmation(persisted))
    .catch((err) => log.error('[createBooking] Erro no envio de e-mail de confirmação:', err));

  if (deps.revalidate) {
    await deps.revalidate(['/admin', '/admin/calendario', '/admin/governanca', '/admin/faturamento']);
  }

  return {
    success: true,
    bookingId: persisted.id,
    bookingCode: persisted.bookingCode,
    reservation: persisted,
  };
}

// ─── Repositórios ─────────────────────────────────────────────

function toDbError(error: { message?: string; code?: string } | null, fallback: string): BookingDbError {
  return new BookingDbError(error?.message || fallback, error?.code);
}

/** Repositório de produção (Supabase / PostgREST). */
export const supabaseBookingRepository: BookingRepository = {
  async findActiveBookingOverlaps(roomId, checkIn, checkOut) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .neq('status', 'cancelled')
      .lt('check_in_date', checkOut)
      .gt('check_out_date', checkIn);
    if (error || !data) throw toDbError(error, 'Consulta de reservas sem resposta');
    return data;
  },

  async findRoomBlockOverlaps(roomId, checkIn, checkOut) {
    const { data, error } = await supabase
      .from('room_blocks')
      .select('id')
      .eq('room_id', roomId)
      .lt('start_date', checkOut)
      .gt('end_date', checkIn);
    if (error || !data) throw toDbError(error, 'Consulta de bloqueios sem resposta');
    return data;
  },

  async insertBooking(row) {
    const { data, error } = await supabase.from('bookings').insert(row).select().single();
    if (error || !data) throw toDbError(error, 'Insert de reserva sem retorno');
    return mapDbBookingToReservation(data as DbBooking);
  },
};

/** Repositório em memória — apenas desenvolvimento/demo (ver lib/dataMode.ts). */
export const mockBookingRepository: BookingRepository = {
  async findActiveBookingOverlaps(roomId, checkIn, checkOut) {
    return mockData
      .getAllReservations()
      .filter((r) => r.roomId === roomId && r.status !== 'cancelled' && r.checkIn < checkOut && r.checkOut > checkIn)
      .map((r) => ({ id: r.id }));
  },

  async findRoomBlockOverlaps(roomId, checkIn, checkOut) {
    return mockData
      .getAllRoomBlocks()
      .filter((b) => b.roomId === roomId && b.startDate < checkOut && b.endDate > checkIn)
      .map((b) => ({ id: b.id }));
  },

  async insertBooking(row) {
    const roomId = row.room_id ?? null;
    // Revalida de forma síncrona (sem await entre checagem e escrita),
    // reproduzindo em memória a garantia da constraint do banco.
    if (roomId && row.status !== 'cancelled') {
      const conflict = mockData
        .getAllReservations()
        .some((r) => r.roomId === roomId && r.status !== 'cancelled' && r.checkIn < row.check_out_date && r.checkOut > row.check_in_date);
      if (conflict) throw new BookingDbError('Conflito de reserva (mock)', '23P01');
      const blocked = mockData
        .getAllRoomBlocks()
        .some((b) => b.roomId === roomId && b.startDate < row.check_out_date && b.endDate > row.check_in_date);
      if (blocked) throw new BookingDbError('Quarto bloqueado (mock)', 'AN001');
    }

    return mockData.createReservation({
      bookingCode: row.booking_code,
      userId: row.user_id || 'anon',
      roomId: roomId || 'exp-booking-general',
      checkIn: row.check_in_date,
      checkOut: row.check_out_date,
      guests: row.guests ?? 2,
      totalPrice: row.total_price,
      roomPrice: row.room_price ?? 0,
      addonsPrice: row.addons_price ?? 0,
      discountPrice: row.discount_price ?? 0,
      specialRequests: row.special_requests ?? null,
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      guestPhone: row.guest_phone ?? '',
      guestDocument: row.guest_document ?? null,
      taxId: row.tax_id ?? null,
      companyName: row.company_name ?? null,
      billingAddress: row.billing_address ?? null,
      invoiceStatus: (row.invoice_status as InvoiceStatus) ?? 'exempt',
      paymentMethod: row.payment_method as PaymentMethodType,
      selectedAddons: (row.selected_addons as Reservation['selectedAddons']) ?? [],
      status: (row.status as ReservationStatus) ?? 'pending',
    });
  },
};
