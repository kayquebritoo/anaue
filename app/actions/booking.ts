'use server';

// ============================================================
// app/actions/booking.ts
// Server Actions para Criação e Consulta Segura de Reservas
// Trava Anti-Overbooking com Verificação de Concorrência
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapDbBookingToReservation, updateHousekeepingAsync, getRoomByIdAsync } from '@/lib/supabaseData';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { isMockDataAllowed } from '@/lib/dataMode';
import { bookingErrorMessage, classifyDbError } from '@/lib/bookingErrors';
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
 */
export async function createBookingAction(
  payload: CreateBookingInput
): Promise<BookingActionResult> {
  try {
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

      if (error) {
        console.error('[GetBookingByIdAction] Erro no Supabase:', error);
        return { success: false, error: 'Erro ao buscar reserva.' };
      }
      if (data) {
        return {
          success: true,
          reservation: mapDbBookingToReservation(data),
        };
      }
    } else if (isMockDataAllowed()) {
      // Mock apenas em desenvolvimento/demo — nunca mascarar o banco real
      const found = mockData.getReservationById(idOrCode);
      if (found) {
        return {
          success: true,
          reservation: found,
        };
      }
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
        // Ex.: reativar reserva cancelada sobre período já ocupado/bloqueado (23P01 / AN001)
        console.error('[UpdateBookingStatusAction] Erro no update Supabase:', error);
        return { success: false, error: bookingErrorMessage(classifyDbError(error)) };
      }
      if (data) {
        updatedReservation = mapDbBookingToReservation(data);
      }
    } else if (isMockDataAllowed()) {
      // Mock apenas em desenvolvimento/demo — nunca como fallback de falha do banco
      updatedReservation = mockData.updateReservationStatus(bookingId, newStatus);
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

    // ── Fallback local (apenas desenvolvimento/demo, nunca mascarando o banco real) ──
    if (!isMockDataAllowed()) {
      return {
        success: false,
        error: 'Nenhuma reserva encontrada. Verifique o código (AN-XXXX) ou o e-mail informado.',
      };
    }

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

