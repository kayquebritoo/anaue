// ============================================================
// lib/bookingNotifications.ts
// E-mail de "reserva confirmada" — disparado SOMENTE depois que o
// pagamento foi validado no gateway (webhook ou confirmação da equipe).
// Nunca lança: falha de e-mail não desfaz a confirmação.
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isMockDataAllowed } from '@/lib/dataMode';
import { mapDbBookingToReservation, getRoomByIdAsync } from '@/lib/supabaseData';
import { sendBookingConfirmationEmail, type SendEmailResult } from '@/lib/email';
import * as mockData from '@/lib/mockData';
import type { Reservation } from '@/types';

async function loadReservation(bookingId: string): Promise<Reservation | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (error) throw error;
    return data ? mapDbBookingToReservation(data) : null;
  }
  return isMockDataAllowed() ? mockData.getReservationById(bookingId) ?? null : null;
}

export async function sendPaymentConfirmedEmail(bookingId: string): Promise<SendEmailResult | null> {
  try {
    const reservation = await loadReservation(bookingId);
    if (!reservation || reservation.status !== 'confirmed') return null; // só confirma o que está confirmado
    const room = reservation.roomId ? await getRoomByIdAsync(reservation.roomId).catch(() => undefined) : undefined;
    return await sendBookingConfirmationEmail(reservation, room);
  } catch (err) {
    console.error(`[Notificação] Falha ao enviar confirmação da reserva ${bookingId}:`, err);
    return null;
  }
}
