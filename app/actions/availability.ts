'use server';

// ============================================================
// app/actions/availability.ts
// Disponibilidade pública de quartos, calculada no servidor.
// O browser não lê mais a tabela `bookings` diretamente — pré-requisito
// para restringir o RLS (dados pessoais dos hóspedes). Retorna apenas IDs
// de quartos indisponíveis, nunca dados de reservas.
// ============================================================

import { getUnavailableRoomIdsAsync } from '@/lib/supabaseData';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

export async function getUnavailableRoomIdsAction(
  checkIn: string,
  checkOut: string
): Promise<{ success: boolean; roomIds: string[]; error?: string }> {
  if (!DATE_RE.test(checkIn || '') || !DATE_RE.test(checkOut || '')) {
    return { success: false, roomIds: [], error: 'Datas inválidas.' };
  }
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (isNaN(start) || isNaN(end) || end <= start || (end - start) / 86_400_000 > MAX_RANGE_DAYS) {
    return { success: false, roomIds: [], error: 'Período inválido.' };
  }

  try {
    const ids = await getUnavailableRoomIdsAsync(checkIn, checkOut);
    return { success: true, roomIds: Array.from(ids) };
  } catch (err) {
    console.error('[getUnavailableRoomIdsAction] Falha ao consultar disponibilidade:', err);
    return { success: false, roomIds: [], error: 'Não foi possível verificar a disponibilidade agora.' };
  }
}
