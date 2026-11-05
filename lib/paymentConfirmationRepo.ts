// ============================================================
// lib/paymentConfirmationRepo.ts
// Repositórios para lib/paymentConfirmation.ts (Supabase e mock de dev).
// ============================================================

import { supabase } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import { BookingDbError } from '@/lib/bookingErrors';
import type { ConfirmationRepository } from '@/lib/paymentConfirmation';

export const supabaseConfirmationRepository: ConfirmationRepository = {
  async getBooking(id) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, total_price')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BookingDbError(error.message, error.code);
    return data ? { id: data.id, status: data.status, totalPrice: Number(data.total_price) } : null;
  },
  async markConfirmed(id) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .eq('status', 'pending') // idempotente: só confirma se ainda pendente
      .select('id');
    if (error) throw new BookingDbError(error.message, error.code);
    return data?.length ?? 0;
  },
};

/** Somente desenvolvimento/testes (ver lib/dataMode.ts). */
export const mockConfirmationRepository: ConfirmationRepository = {
  async getBooking(id) {
    const r = mockData.getReservationById(id);
    return r ? { id: r.id, status: r.status, totalPrice: r.totalPrice } : null;
  },
  async markConfirmed(id) {
    const r = mockData.getReservationById(id);
    if (!r || r.status !== 'pending') return 0;
    mockData.updateReservationStatus(id, 'confirmed');
    return 1;
  },
};
