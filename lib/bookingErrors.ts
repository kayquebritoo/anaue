// ============================================================
// lib/bookingErrors.ts
// Tradução de erros do banco (PostgreSQL/PostgREST) para mensagens
// seguras ao usuário. Nunca expõe detalhes internos do banco.
// Códigos definidos em supabase/migrations/20261105000000_booking_integrity.sql
// ============================================================

/** Erro de banco com SQLSTATE preservado (ex.: '23P01', 'AN001'). */
export class BookingDbError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'BookingDbError';
  }
}

export const BOOKING_MESSAGES = {
  roomConflict:
    'Infelizmente, estas datas já estão ocupadas ou foram reservadas agora há pouco. Por favor, escolha outro período ou quarto.',
  roomBlocked:
    'Este quarto está bloqueado para manutenção ou uso interno nas datas selecionadas. Por favor, escolha outro período ou quarto.',
  invalidDates: 'A data de check-out deve ser posterior à data de check-in.',
  availabilityUnavailable:
    'Não foi possível verificar a disponibilidade agora. Nenhuma reserva foi criada. Tente novamente em instantes.',
  persistenceFailed:
    'Não foi possível registrar a reserva no momento. Nenhuma cobrança ou confirmação foi gerada. Tente novamente.',
  systemUnavailable:
    'O sistema de reservas está temporariamente indisponível. Nenhuma reserva foi criada. Tente novamente mais tarde.',
  blockConflictsWithBooking:
    'Não é possível bloquear este quarto no período. Existem reservas ativas confirmadas.',
} as const;

export type BookingErrorKind =
  | 'room_conflict'
  | 'room_blocked'
  | 'block_conflicts_with_booking'
  | 'invalid_dates'
  | 'unique_violation'
  | 'unknown';

/** Classifica um erro do PostgREST/PostgreSQL pelo SQLSTATE. */
export function classifyDbError(error: unknown): BookingErrorKind {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  switch (code) {
    case '23P01': // exclusion_violation — bookings_no_overlap
      return 'room_conflict';
    case 'AN001': // trigger: reserva sobre bloqueio
      return 'room_blocked';
    case 'AN002': // trigger: bloqueio sobre reserva
      return 'block_conflicts_with_booking';
    case '23514': // check_violation — datas
      return 'invalid_dates';
    case '23505': // unique_violation — ex.: colisão de booking_code
      return 'unique_violation';
    default:
      return 'unknown';
  }
}

export function bookingErrorMessage(kind: BookingErrorKind): string {
  switch (kind) {
    case 'room_conflict':
      return BOOKING_MESSAGES.roomConflict;
    case 'room_blocked':
      return BOOKING_MESSAGES.roomBlocked;
    case 'block_conflicts_with_booking':
      return BOOKING_MESSAGES.blockConflictsWithBooking;
    case 'invalid_dates':
      return BOOKING_MESSAGES.invalidDates;
    default:
      return BOOKING_MESSAGES.persistenceFailed;
  }
}
