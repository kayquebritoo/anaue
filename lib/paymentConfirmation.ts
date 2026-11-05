// ============================================================
// lib/paymentConfirmation.ts
// Confirmação de reserva a partir de um pagamento do Mercado Pago.
//
// Só confirma se TUDO conferir:
//   - pagamento aprovado (status 'approved');
//   - moeda BRL (quando informada);
//   - external_reference é um ID de reserva válido e existente;
//   - valor pago == total_price gravado (calculado no servidor), em centavos;
//   - reserva ainda está 'pending' (UPDATE condicional, idempotente).
// Valor divergente NUNCA confirma: a reserva fica pendente e o caso é
// registrado para a equipe tratar (estorno/complemento).
// ============================================================

import { normalizeBookingId } from '@/lib/queryInput';
import { amountsMatch } from '@/lib/pricing';

export interface PaymentSnapshot {
  id: number | string;
  /** Gateway de origem (opcional; padrão mercadopago). */
  provider?: 'mercadopago' | 'pagbank';
  status: string;
  /** Ex.: 'expired' (PIX vencido), 'accredited'. */
  status_detail?: string | null;
  transaction_amount: number;
  external_reference: string | null;
  currency_id?: string | null;
}

export interface ConfirmationBooking {
  id: string;
  status: string;
  totalPrice: number;
}

export interface ConfirmationRepository {
  /** Lança em erro de banco. */
  getBooking(id: string): Promise<ConfirmationBooking | null>;
  /** UPDATE ... SET status='confirmed' WHERE id=? AND status='pending'. Retorna linhas afetadas. Lança em erro. */
  markConfirmed(id: string): Promise<number>;
  /**
   * UPDATE ... SET status='cancelled' WHERE id=? AND status='pending'.
   * Usado quando o PIX expira/é recusado: libera o quarto. Opcional.
   */
  markCancelledIfPending?(id: string): Promise<number>;
}

export type ConfirmationOutcome =
  | 'confirmed'
  | 'already_confirmed'
  | 'not_approved'
  | 'invalid_reference'
  | 'booking_not_found'
  | 'currency_mismatch'
  | 'amount_mismatch'
  | 'not_pending'
  | 'payment_reversed'
  | 'payment_failed_cancelled'
  | 'payment_failed';

export interface ConfirmationResult {
  outcome: ConfirmationOutcome;
  bookingId?: string;
  paid?: number;
  due?: number;
}

export async function confirmBookingFromPayment(
  payment: PaymentSnapshot,
  repo: ConfirmationRepository,
  logger: Pick<Console, 'error' | 'warn'> = console
): Promise<ConfirmationResult> {
  // Estorno/chargeback: não confirma nem cancela sozinho (hóspede pode estar
  // hospedado); registra alerta para a equipe decidir.
  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    const reversedId = normalizeBookingId(payment.external_reference);
    if (!reversedId) return { outcome: 'invalid_reference' };
    const reversed = await repo.getBooking(reversedId);
    if (!reversed) return { outcome: 'booking_not_found', bookingId: reversedId };
    if (reversed.status !== 'cancelled') {
      logger.error(
        `[Pagamento] ESTORNO/CHARGEBACK — pagamento ${payment.id} (${payment.status}) da reserva ${reversedId}, que está ${reversed.status}. Avaliar cancelamento.`
      );
    }
    return { outcome: 'payment_reversed', bookingId: reversedId, paid: Number(payment.transaction_amount), due: reversed.totalPrice };
  }

  // PIX expirado (status 'cancelled', detalhe 'expired'), cancelado ou recusado:
  // reserva ainda pendente é cancelada para liberar o quarto.
  if (payment.status === 'cancelled' || payment.status === 'rejected') {
    const failedId = normalizeBookingId(payment.external_reference);
    if (!failedId) return { outcome: 'invalid_reference' };
    const failed = await repo.getBooking(failedId);
    if (!failed) return { outcome: 'booking_not_found', bookingId: failedId };
    if (failed.status === 'pending' && repo.markCancelledIfPending) {
      const n = await repo.markCancelledIfPending(failedId);
      if (n > 0) {
        logger.warn(
          `[Pagamento] Pagamento ${payment.id} ${payment.status}${payment.status_detail ? ` (${payment.status_detail})` : ''} — reserva ${failedId} cancelada e quarto liberado.`
        );
        return { outcome: 'payment_failed_cancelled', bookingId: failedId };
      }
    }
    return { outcome: 'payment_failed', bookingId: failedId };
  }

  if (payment.status !== 'approved') return { outcome: 'not_approved' };

  const bookingId = normalizeBookingId(payment.external_reference);
  if (!bookingId) return { outcome: 'invalid_reference' };

  if (payment.currency_id && payment.currency_id !== 'BRL') {
    logger.error(`[Pagamento] Moeda inesperada (${payment.currency_id}) no pagamento ${payment.id} da reserva ${bookingId}.`);
    return { outcome: 'currency_mismatch', bookingId };
  }

  const booking = await repo.getBooking(bookingId);
  if (!booking) return { outcome: 'booking_not_found', bookingId };

  const paid = Number(payment.transaction_amount);
  const due = Number(booking.totalPrice);
  if (!Number.isFinite(due) || due <= 0) {
    throw new Error(`Reserva ${bookingId} sem total válido para conferência de pagamento.`);
  }
  if (!amountsMatch(paid, due)) {
    logger.error(
      `[Pagamento] VALOR DIVERGENTE — pagamento ${payment.id}, reserva ${bookingId}: pago R$ ${paid}, devido R$ ${due}. Reserva NÃO confirmada; tratar manualmente.`
    );
    return { outcome: 'amount_mismatch', bookingId, paid, due };
  }

  if (booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'checked_out') {
    return { outcome: 'already_confirmed', bookingId, paid, due };
  }
  if (booking.status !== 'pending') {
    logger.warn(`[Pagamento] Pagamento ${payment.id} aprovado para reserva ${bookingId} com status ${booking.status}. Avaliar estorno.`);
    return { outcome: 'not_pending', bookingId, paid, due };
  }

  const updated = await repo.markConfirmed(bookingId);
  // 0 linhas = outra requisição confirmou/cancelou no meio do caminho
  return { outcome: updated > 0 ? 'confirmed' : 'not_pending', bookingId, paid, due };
}
