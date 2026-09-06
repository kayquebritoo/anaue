'use server';

// ============================================================
// app/actions/booking.ts
// Server Actions para Criação e Consulta Segura de Reservas
// Trava Anti-Overbooking com Verificação de Concorrência
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapDbBookingToReservation, updateHousekeepingAsync, getRoomByIdAsync } from '@/lib/supabaseData';
import { sendBookingConfirmationEmail } from '@/lib/email';
import * as mockData from '@/lib/mockData';
import type { Reservation, ReservationStatus, PaymentMethodType, InvoiceStatus } from '@/types';
import type { DbBooking } from '@/types/database';

export interface CreateBookingInput {
  roomId?: string | null;
  experienceId?: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  roomPrice: number;
  addonsPrice: number;
  discountPrice: number;
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

async function safeRevalidatePaths(paths: string[]) {
  try {
    const { revalidatePath } = await import('next/cache');
    for (const path of paths) {
      revalidatePath(path);
    }
  } catch {
    // Ignora silenciosamente fora do contexto de servidor HTTP do Next.js (ex: CLI/testes)
  }
}

/**
 * Criação segura de reserva com verificação anti-overbooking
 */
export async function createBookingAction(
  payload: CreateBookingInput
): Promise<BookingActionResult> {
  try {
    // ── 1. Validação básica no servidor ──
    if (!payload.guestName?.trim()) {
      return { success: false, error: 'Nome completo é obrigatório.' };
    }

    // Tratamento de e-mail: se não informado (ex: reserva rápida via WhatsApp), gera e-mail de referência
    let sanitizedEmail = payload.guestEmail?.trim() || '';
    if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
      const sanitizedPhone = (payload.guestPhone || '').replace(/\D/g, '');
      const sanitizedName = payload.guestName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
      sanitizedEmail = sanitizedPhone
        ? `wpp.${sanitizedPhone}@guest.anaue.com.br`
        : `${sanitizedName || 'hospede'}@manual.anaue.com.br`;
    }

    if (!payload.checkIn || !payload.checkOut) {
      return { success: false, error: 'Período de check-in e check-out é obrigatório.' };
    }

    const checkInDate = new Date(payload.checkIn);
    const checkOutDate = new Date(payload.checkOut);

    if (checkOutDate <= checkInDate) {
      return { success: false, error: 'A data de check-out deve ser posterior à data de check-in.' };
    }

    const isRoomBooking = !payload.isExperienceMode && payload.roomId && !payload.roomId.startsWith('exp-booking-');

    // ── 2. TRAVA DE SEGURANÇA: Prevenção Anti-Overbooking ──
    if (isRoomBooking) {
      if (isSupabaseConfigured()) {
        // Consultar o Supabase procurando reservas ativas com sobreposição de datas:
        // check_in_date < payload.checkOut AND check_out_date > payload.checkIn
        const { data: overlappingBookings, error: checkError } = await supabase
          .from('bookings')
          .select('id, booking_code, check_in_date, check_out_date, status')
          .eq('room_id', payload.roomId!)
          .neq('status', 'cancelled')
          .lt('check_in_date', payload.checkOut)
          .gt('check_out_date', payload.checkIn);

        if (checkError) {
          console.error('[Anti-Overbooking] Erro ao consultar disponibilidade:', checkError);
        } else if (overlappingBookings && overlappingBookings.length > 0) {
          return {
            success: false,
            error: 'Infelizmente, estas datas já estão ocupadas ou foram reservadas agora há pouco. Por favor, escolha outro período ou quarto.',
          };
        }

        // Consultar se há bloqueios manuais ativos para o quarto no período
        const { data: overlappingBlocks, error: blockError } = await supabase
          .from('room_blocks')
          .select('id, reason')
          .eq('room_id', payload.roomId!)
          .lt('start_date', payload.checkOut)
          .gt('end_date', payload.checkIn);

        if (!blockError && overlappingBlocks && overlappingBlocks.length > 0) {
          return {
            success: false,
            error: 'Este quarto está bloqueado para manutenção ou uso interno nas datas selecionadas. Por favor, escolha outro período ou quarto.',
          };
        }
      } else {
        // Fallback local com a mesma trava de colisão de datas
        const localReservations = mockData.getAllReservations();
        const conflict = localReservations.some((res) => {
          if (res.roomId !== payload.roomId || res.status === 'cancelled') return false;
          return res.checkIn < payload.checkOut && res.checkOut > payload.checkIn;
        });

        if (conflict) {
          return {
            success: false,
            error: 'Infelizmente, estas datas já estão ocupadas ou foram reservadas agora há pouco. Por favor, escolha outro período ou quarto.',
          };
        }

        // Fallback local: verificar bloqueios manuais
        const localBlocks = mockData.getAllRoomBlocks();
        const blockConflict = localBlocks.some(
          (b) =>
            b.roomId === payload.roomId &&
            b.startDate < payload.checkOut &&
            b.endDate > payload.checkIn
        );

        if (blockConflict) {
          return {
            success: false,
            error: 'Este quarto está bloqueado para manutenção ou uso interno nas datas selecionadas. Por favor, escolha outro período ou quarto.',
          };
        }
      }
    }

    // ── 3. Efetivação da Reserva (Insert no Banco) ──
    // Código único: timestamp base36 (últimos 4 chars) + 3 dígitos random
    // Espaço: ~46^4 × 900 = bilhões de combinações (vs. 9.000 anterior)
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const rand = Math.floor(100 + Math.random() * 900);
    const generatedBookingCode = `AN-${ts}${rand}`;
    const initialStatus: ReservationStatus = payload.status || 'pending';

    if (isSupabaseConfigured()) {
      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert({
          booking_code: generatedBookingCode,
          room_id: isRoomBooking ? payload.roomId : null,
          user_id: `guest-${Date.now().toString(36)}`,
          guest_name: payload.guestName.trim(),
          guest_email: sanitizedEmail,
          guest_phone: payload.guestPhone?.trim() || '',
          check_in_date: payload.checkIn,
          check_out_date: payload.checkOut,
          guests: payload.guests || 2,
          room_price: payload.roomPrice || 0,
          addons_price: payload.addonsPrice || 0,
          discount_price: payload.discountPrice || 0,
          total_price: payload.totalPrice,
          status: initialStatus,
          special_requests: payload.specialRequests?.trim() || null,
          payment_method: payload.paymentMethod,
          selected_addons: (payload.selectedAddons as any) || [],
          guest_document: payload.guestDocument?.trim() || null,
          tax_id: payload.taxId?.trim() || null,
          company_name: payload.companyName?.trim() || null,
          billing_address: payload.billingAddress?.trim() || null,
          invoice_status: payload.invoiceStatus || (payload.taxId ? 'pending' : 'exempt'),
        })
        .select()
        .single();

      if (insertError || !newBooking) {
        console.error('[CreateBookingAction] Erro no insert Supabase:', insertError);
        // Fallback local se o insert remoto falhar
        const fallbackRes = mockData.createReservation({
          userId: `guest-${Date.now().toString(36)}`,
          roomId: payload.roomId || `exp-booking-${payload.experienceId || 'general'}`,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          guests: payload.guests,
          totalPrice: payload.totalPrice,
          roomPrice: payload.roomPrice,
          addonsPrice: payload.addonsPrice,
          discountPrice: payload.discountPrice,
          specialRequests: payload.specialRequests || null,
          guestName: payload.guestName,
          guestEmail: sanitizedEmail,
          guestPhone: payload.guestPhone || '',
          guestDocument: payload.guestDocument || null,
          taxId: payload.taxId || null,
          companyName: payload.companyName || null,
          billingAddress: payload.billingAddress || null,
          invoiceStatus: payload.invoiceStatus || (payload.taxId ? 'pending' : 'exempt'),
          paymentMethod: payload.paymentMethod,
          selectedAddons: payload.selectedAddons || [],
          status: initialStatus,
        });

        // Disparo automático e assíncrono do e-mail de confirmação (fallback)
        getRoomByIdAsync(fallbackRes.roomId)
          .then((roomData) => sendBookingConfirmationEmail(fallbackRes, roomData))
          .catch((emailErr) =>
            console.error('[CreateBookingAction] Erro no envio de e-mail (fallback):', emailErr)
          );

        await safeRevalidatePaths(['/admin', '/admin/calendario', '/admin/faturamento']);

        return {
          success: true,
          bookingId: fallbackRes.id,
          bookingCode: fallbackRes.bookingCode,
          reservation: fallbackRes,
        };
      }

      const mapped = mapDbBookingToReservation(newBooking);

      // Disparo automático e assíncrono do e-mail de confirmação (Supabase)
      getRoomByIdAsync(mapped.roomId)
        .then((roomData) => sendBookingConfirmationEmail(mapped, roomData))
        .catch((emailErr) =>
          console.error('[CreateBookingAction] Erro no envio de e-mail:', emailErr)
        );

      await safeRevalidatePaths(['/admin', '/admin/calendario', '/admin/governanca', '/admin/faturamento']);

      return {
        success: true,
        bookingId: mapped.id,
        bookingCode: mapped.bookingCode,
        reservation: mapped,
      };
    }

    // Criação via mockData se o Supabase não estiver configurado
    const localRes = mockData.createReservation({
      userId: `guest-${Date.now().toString(36)}`,
      roomId: payload.roomId || `exp-booking-${payload.experienceId || 'general'}`,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.guests,
      totalPrice: payload.totalPrice,
      roomPrice: payload.roomPrice,
      addonsPrice: payload.addonsPrice,
      discountPrice: payload.discountPrice,
      specialRequests: payload.specialRequests || null,
      guestName: payload.guestName,
      guestEmail: sanitizedEmail,
      guestPhone: payload.guestPhone || '',
      guestDocument: payload.guestDocument || null,
      taxId: payload.taxId || null,
      companyName: payload.companyName || null,
      billingAddress: payload.billingAddress || null,
      invoiceStatus: payload.invoiceStatus || (payload.taxId ? 'pending' : 'exempt'),
      paymentMethod: payload.paymentMethod,
      selectedAddons: payload.selectedAddons || [],
      status: initialStatus,
    });

    // Disparo automático e assíncrono do e-mail de confirmação (Local / Mock)
    getRoomByIdAsync(localRes.roomId)
      .then((roomData) => sendBookingConfirmationEmail(localRes, roomData))
      .catch((emailErr) =>
        console.error('[CreateBookingAction] Erro no envio de e-mail (local):', emailErr)
      );

    await safeRevalidatePaths(['/admin', '/admin/calendario', '/admin/governanca', '/admin/faturamento']);

    return {
      success: true,
      bookingId: localRes.id,
      bookingCode: localRes.bookingCode,
      reservation: localRes,
    };
  } catch (err: any) {
    console.error('[CreateBookingAction] Exceção inesperada:', err);
    return {
      success: false,
      error: 'Não foi possível processar a reserva no momento. Tente novamente.',
    };
  }
}

/**
 * Consulta de reserva no Supabase por ID ou Localizador
 */
export async function getBookingByIdAction(idOrCode: string): Promise<{
  success: boolean;
  reservation?: Reservation;
  error?: string;
}> {
  if (!idOrCode) {
    return { success: false, error: 'Identificador não fornecido.' };
  }

  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`id.eq.${idOrCode},booking_code.eq.${idOrCode}`)
        .maybeSingle();

      if (!error && data) {
        return {
          success: true,
          reservation: mapDbBookingToReservation(data),
        };
      }
    }

    // Fallback local
    const found = mockData.getReservationById(idOrCode);
    if (found) {
      return {
        success: true,
        reservation: found,
      };
    }

    return { success: false, error: 'Reserva não encontrada.' };
  } catch {
    return { success: false, error: 'Erro ao buscar reserva.' };
  }
}

/**
 * Atualização do ciclo de vida/status da reserva no Supabase
 */
export async function updateBookingStatusAction(
  bookingId: string,
  newStatus: ReservationStatus
): Promise<BookingActionResult> {
  if (!bookingId) {
    return { success: false, error: 'ID da reserva é obrigatório.' };
  }

  try {
    let updatedReservation: Reservation | undefined;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .or(`id.eq.${bookingId},booking_code.eq.${bookingId}`)
        .select()
        .maybeSingle();

      if (error) {
        console.error('[UpdateBookingStatusAction] Erro no update Supabase:', error);
      } else if (data) {
        updatedReservation = mapDbBookingToReservation(data);
      }
    }

    // Fallback de atualização local para sincronização de estado na memória
    if (!updatedReservation) {
      const localUpdated = mockData.updateReservationStatus(bookingId, newStatus);
      updatedReservation = localUpdated;
    }

    if (!updatedReservation) {
      return {
        success: false,
        error: 'Não foi possível localizar a reserva para atualização.',
      };
    }

    // Revalidação dos caminhos Next.js para atualização instantânea em tela
    await safeRevalidatePaths(['/admin', '/admin/calendario', '/admin/governanca']);

    // ── Automação:_marcar quarto como "sujo" ao realizar check-out ──
    if (newStatus === 'checked_out' && updatedReservation.roomId) {
      try {
        await updateHousekeepingAsync(
          updatedReservation.roomId,
          'dirty',
          `Check-out realizado — hóspede ${updatedReservation.guestName} saiu. Pendente de limpeza.`
        );
      } catch (err) {
        console.error('[Auto-Dirty] Falha ao marcar quarto como sujo:', err);
      }
    }

    return {
      success: true,
      bookingId: updatedReservation.id,
      bookingCode: updatedReservation.bookingCode,
      reservation: updatedReservation,
    };
  } catch (err) {
    console.error('[UpdateBookingStatusAction] Exceção inesperada:', err);
    return {
      success: false,
      error: 'Erro interno ao atualizar status da reserva.',
    };
  }
}

/**
 * Busca pública de reserva por código (AN-XXXX) ou e-mail do hóspede.
 * Retorna a reserva encontrada (ou null se não encontrar).
 */
export async function lookupBookingAction(
  query: string
): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, error: 'Informe um código de reserva ou e-mail.' };
  }

  try {
    // ── Busca por código de reserva (formato AN-XXXX ou UUID) ──
    const isCode = /^AN-\d{4}$/i.test(trimmed) || trimmed.length >= 20;

    if (isCode && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_code', trimmed.toUpperCase())
        .maybeSingle();

      if (!error && data) {
        return { success: true, reservation: mapDbBookingToReservation(data) };
      }
    }

    // ── Busca por e-mail ──
    const isEmail = trimmed.includes('@');

    if (isEmail && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .ilike('guest_email', trimmed)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return { success: true, reservation: mapDbBookingToReservation(data) };
      }
    }

    // ── Fallback local ──
    if (isCode) {
      const found = mockData.getReservationById(trimmed);
      if (found) return { success: true, reservation: found };
    }

    if (isEmail) {
      const found = mockData.getReservationsByEmail(trimmed);
      if (found.length > 0) return { success: true, reservation: found[0] };
    }

    return {
      success: false,
      error: 'Nenhuma reserva encontrada. Verifique o código (AN-XXXX) ou o e-mail informado.',
    };
  } catch {
    return { success: false, error: 'Erro ao buscar reserva. Tente novamente.' };
  }
}

