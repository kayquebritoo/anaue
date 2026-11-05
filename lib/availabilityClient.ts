// ============================================================
// lib/availabilityClient.ts
// Helper para componentes client: consulta disponibilidade via Server
// Action. Em falha retorna conjunto vazio — a decisão final de
// disponibilidade é sempre revalidada no servidor e no banco ao reservar.
// ============================================================

import { getUnavailableRoomIdsAction } from '@/app/actions/availability';

export async function fetchUnavailableRoomIds(checkIn: string, checkOut: string): Promise<Set<string>> {
  try {
    const result = await getUnavailableRoomIdsAction(checkIn, checkOut);
    return new Set(result.success ? result.roomIds : []);
  } catch {
    return new Set();
  }
}
