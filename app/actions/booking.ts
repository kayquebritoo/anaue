'use server';

// ============================================================
// app/actions/booking.ts
// Server Actions para Criação e Consulta Segura de Reservas
// Trava Anti-Overbooking com Verificação de Concorrência
//
// Segurança:
//  - Server Actions são endpoints públicos. Ações administrativas checam
//    a sessão da equipe (lib/authz.ts).
//  - Nenhum filtro PostgREST é montado com entrada do usuário: IDs e
//    localizadores são validados (lib/queryInput.ts) e usados em .eq().
//  - Consultas públicas retornam visão reduzida, com contato mascarado.
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapDbBookingToReservation, updateHousekeepingAsync, getRoomByIdAsync } from '@/lib/supabaseData';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { isMockDataAllowed } from '@/lib/dataMode';
import { bookingErrorMessage, classifyDbError } from '@/lib/bookingErrors';
import { isStaff, UNAUTHORIZED_MESSAGE } from '@/lib/authz';
import { escapeLikePattern, normalizeBookingCode, normalizeEmail, parseBookingRef } from '@/lib/queryInput';
import { toPublicReservation } from '@/lib/publicReservation';
import {
  createBooking,
  supabaseBookingRepository,
  mockBookingRepository,
  type BookingActionResult,
  type CreateBookingInput,
} from '@/lib/bookingService';
import * as mockData from '@/lib/mockData';
import type { Reservation, ReservationStatus } from '@/types';

export type { BookingActionResult, CreateBookingInput } from '@/lib/bookingService';

const VALID_STATUSES: ReservationStatus[] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
const NOT_FOUND_LOOKUP = 'Nenhuma reserva encontrada. Verifique o código (AN-XXXX) ou o e-mail informado.';

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
 * Criação segura de reserva com verificação anti-overbooking.
 * A garantia contra concorrência fica no banco (constraint + triggers);
 * ver supabase/migrations/20261105000000_booking_integrity.sql.
 *
 * Público (checkout). Apenas a equipe pode criar reservas com status
 * diferente de 'pending' (ex.: reserva manual já confirmada).
 */
export async function createBookingAction(
  payload: CreateBookingInput
): Promise<BookingActionResult> {
  try {
    if (payload.status !== undefined && payload.status !== 'pending') {
      if (!VALID_STATUSES.includes(payload.status) || !(await isStaff())) {
        return { success: false, error: UNAUTHORIZED_MESSAGE };
      }
    }

    const repo = isSupabaseConfigured()
      ? supabaseBookingRepository
      : isMockDataAllowed()
        ? mockBookingRepository
        : null;

    return await createBooking(payload, {
      repo,
      sendConfirmation: async (reservation) =>
        sendBookingConfirmationEmail(reservation, await getRoomByIdAsync(reservation.roomId)),
      revalidate: safeRevalidatePaths,
    });
  } catch (err) {
    console.error('[CreateBookingAction] Exceção inesperada:', err);
    return {
      success: false,
      error: 'Não foi possível processar a reserva no momento. Nenhuma reserva foi criada. Tente novamente.',
    };
  }
}

/**
 * Consulta de reserva por ID ou localizador (tela de sucesso do checkout).
 * Equipe recebe a reserva completa; público recebe visão reduzida.
 */
export async function getBookingByIdAction(idOrCode: string): Promise<{
  success: boolean;
  reservation?: Reservation;
  error?: string;
}> {
  const ref = parseBookingRef(idOrCode);
  if (!ref) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  try {
    let found: Reservation | undefined;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq(ref.column, ref.value)
        .maybeSingle();

      if (error) {
        console.error('[GetBookingByIdAction] Erro no Supabase:', error);
        return { success: false, error: 'Erro ao buscar reserva.' };
      }
      if (data) found = mapDbBookingToReservation(data);
    } else if (isMockDataAllowed()) {
      // Mock apenas em desenvolvimento/demo — nunca mascarar o banco real
      found = mockData.getReservationById(ref.value);
    }

    if (!found) {
      return { success: false, error: 'Reserva não encontrada.' };
    }

    return {
      success: true,
      reservation: (await isStaff()) ? found : toPublicReservation(found),
    };
  } catch {
    return { success: false, error: 'Erro ao buscar reserva.' };
  }
}

/**
 * Atualização do ciclo de vida/status da reserva. Somente equipe.
 */
export async function updateBookingStatusAction(
  bookingId: string,
  newStatus: ReservationStatus
): Promise<BookingActionResult> {
  if (!(await isStaff())) {
    return { success: false, error: UNAUTHORIZED_MESSAGE };
  }

  const ref = parseBookingRef(bookingId);
  if (!ref) {
    return { success: false, error: 'ID da reserva inválido.' };
  }
  if (!VALID_STATUSES.includes(newStatus)) {
    return { success: false, error: 'Status de reserva inválido.' };
  }

  try {
    let updatedReservation: Reservation | undefined;

    if (isSupabaseConfigured()) {
      // .eq() com valor validado: atualiza no máximo uma reserva
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq(ref.column, ref.value)
        .select()
        .maybeSingle();

      if (error) {
        // Ex.: reativar reserva cancelada sobre período já ocupado/bloqueado (23P01 / AN001)
        console.error('[UpdateBookingStatusAction] Erro no update Supabase:', error);
        return { success: false, error: bookingErrorMessage(classifyDbError(error)) };
      }
      if (data) {
        updatedReservation = mapDbBookingToReservation(data);
      }
    } else if (isMockDataAllowed()) {
      // Mock apenas em desenvolvimento/demo — nunca como fallback de falha do banco
      updatedReservation = mockData.updateReservationStatus(ref.value, newStatus);
    }

    if (!updatedReservation) {
      return {
        success: false,
        error: 'Não foi possível localizar a reserva para atualização.',
      };
    }

    // Revalidação dos caminhos Next.js para atualização instantânea em tela
    await safeRevalidatePaths(['/admin', '/admin/calendario', '/admin/governanca']);

    // ── Automação: marcar quarto como "sujo" ao realizar check-out ──
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
 * Busca pública de reserva por localizador (AN-1234 ou AN-XXXX123) ou e-mail.
 * Retorna visão reduzida (sem documento/dados fiscais; contato mascarado).
 */
export async function lookupBookingAction(
  query: string
): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Informe um código de reserva ou e-mail.' };
  }

  const code = normalizeBookingCode(trimmed);
  const email = code ? null : normalizeEmail(trimmed);

  if (!code && !email) {
    return { success: false, error: NOT_FOUND_LOOKUP };
  }

  try {
    let found: Reservation | undefined;

    if (isSupabaseConfigured()) {
      const base = supabase.from('bookings').select('*');
      const { data, error } = code
        ? await base.eq('booking_code', code).maybeSingle()
        : await base
            // ILIKE sem curingas: comparação exata, ignorando maiúsculas/minúsculas
            .ilike('guest_email', escapeLikePattern(email!))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

      if (error) {
        console.error('[LookupBookingAction] Erro no Supabase:', error);
        return { success: false, error: 'Erro ao buscar reserva. Tente novamente.' };
      }
      if (data) found = mapDbBookingToReservation(data);
    } else if (isMockDataAllowed()) {
      // Mock apenas em desenvolvimento/demo
      found = code ? mockData.getReservationById(code) : mockData.getReservationsByEmail(email!)[0];
    }

    if (!found) {
      return { success: false, error: NOT_FOUND_LOOKUP };
    }

    return { success: true, reservation: toPublicReservation(found) };
  } catch {
    return { success: false, error: 'Erro ao buscar reserva. Tente novamente.' };
  }
}
