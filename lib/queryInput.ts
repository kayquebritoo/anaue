// ============================================================
// lib/queryInput.ts
// Validação de entradas do usuário usadas em consultas ao Supabase.
//
// Nunca interpolar entrada do usuário em filtros PostgREST como
// .or(`id.eq.${x}`) — vírgulas, parênteses e pontos permitem injetar
// condições extras (ex.: `x,status.neq.zzz` casaria TODAS as reservas).
// Use .eq() com valores validados por estes helpers.
// ============================================================

/**
 * Códigos de reserva aceitos:
 *  - legado:  AN-1234                     (4 dígitos)
 *  - atual:   AN-XXXX123                  (4 base36 do timestamp + 3 dígitos)
 */
const BOOKING_CODE_RE = /^AN-(?:\d{4}|[A-Z0-9]{4}\d{3})$/;

/** IDs de reserva: res-<hex> (banco) ou res-<base36> (mock). */
const BOOKING_ID_RE = /^res-[a-z0-9]{3,32}$/;

export function normalizeBookingCode(input: string | null | undefined): string | null {
  const code = (input || '').trim().toUpperCase();
  return BOOKING_CODE_RE.test(code) ? code : null;
}

export function normalizeBookingId(input: string | null | undefined): string | null {
  const id = (input || '').trim().toLowerCase();
  return BOOKING_ID_RE.test(id) ? id : null;
}

export type BookingRef = { column: 'id' | 'booking_code'; value: string };

/** Resolve um identificador (ID ou localizador) para uma coluna + valor seguro. */
export function parseBookingRef(input: string | null | undefined): BookingRef | null {
  const id = normalizeBookingId(input);
  if (id) return { column: 'id', value: id };
  const code = normalizeBookingCode(input);
  if (code) return { column: 'booking_code', value: code };
  return null;
}

const EMAIL_RE = /^[^\s@,()"'\\]+@[^\s@,()"'\\]+\.[^\s@,()"'\\]+$/;

export function normalizeEmail(input: string | null | undefined): string | null {
  const email = (input || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

/** Escapa curingas de LIKE/ILIKE (% _ \) para busca literal. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
