'use server';

// ============================================================
// app/actions/ical.ts
// Server Actions — Gestão de sincronização iCal
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchIcalEventsAsync } from '@/lib/supabaseData';
import { parseIcalToBlockedDates, type IcalBlockedDate } from '@/lib/icalParser';
import * as mockData from '@/lib/mockData';

export interface IcalSyncResult {
  success: boolean;
  roomName: string;
  eventsCount: number;
  blockedDates: IcalBlockedDate[];
  lastSyncedAt: string;
  error?: string;
}

/**
 * Sincroniza o iCal de importação de um quarto.
 * Busca a URL, faz o parse e retorna as datas bloqueadas.
 */
export async function syncRoomIcalAction(
  roomId: string
): Promise<IcalSyncResult> {
  let room: { id: string; name: string; icalImportUrl: string | null } | undefined;

  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from('rooms')
      .select('id, name, ical_import_url')
      .eq('id', roomId)
      .single();

    if (data) {
      room = {
        id: data.id,
        name: data.name,
        icalImportUrl: data.ical_import_url,
      };
    }
  } else {
    const found = mockData.getRoomById(roomId);
    if (found) {
      room = {
        id: found.id,
        name: found.name,
        icalImportUrl: found.icalImportUrl || null,
      };
    }
  }

  if (!room) {
    return {
      success: false,
      roomName: '',
      eventsCount: 0,
      blockedDates: [],
      lastSyncedAt: '',
      error: 'Quarto não encontrado.',
    };
  }

  if (!room.icalImportUrl) {
    return {
      success: false,
      roomName: room.name,
      eventsCount: 0,
      blockedDates: [],
      lastSyncedAt: '',
      error: 'Nenhum link iCal de importação configurado para este quarto.',
    };
  }

  try {
    const events = await fetchIcalEventsAsync(room.icalImportUrl);
    const blockedDates = parseIcalToBlockedDates(
      // Reconstrói o .ics a partir dos eventos (já temos os eventos parseados)
      // Na verdade, podemos usar getBlockedDatesFromEvents diretamente
      ''
    );

    // Usar a função correta
    const { getBlockedDatesFromEvents } = await import('@/lib/icalParser');
    const blocked = getBlockedDatesFromEvents(events);

    const now = new Date().toISOString();

    // Atualizar timestamp de sincronização
    if (isSupabaseConfigured()) {
      await supabase
        .from('rooms')
        .update({ ical_synced_at: now })
        .eq('id', roomId);
    }

    return {
      success: true,
      roomName: room.name,
      eventsCount: events.length,
      blockedDates: blocked,
      lastSyncedAt: now,
    };
  } catch {
    return {
      success: false,
      roomName: room.name,
      eventsCount: 0,
      blockedDates: [],
      lastSyncedAt: '',
      error: 'Erro ao buscar ou processar o arquivo iCal. Verifique a URL.',
    };
  }
}

/**
 * Salva a URL de iCal de importação para um quarto.
 */
export async function saveIcalImportUrlAction(
  roomId: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedUrl = url.trim();

  if (normalizedUrl && !normalizedUrl.startsWith('http')) {
    return { success: false, error: 'URL inválida. Deve começar com http:// ou https://' };
  }

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('rooms')
      .update({ ical_import_url: normalizedUrl || null })
      .eq('id', roomId);

    if (error) {
      return { success: false, error: 'Erro ao salvar no banco de dados.' };
    }
  }

  return { success: true };
}

/**
 * Retorna a configuração iCal de todos os quartos.
 */
export async function getAllRoomsIcalConfigAsync(): Promise<
  { id: string; name: string; slug: string; icalImportUrl: string | null; icalExportUrl: string | null; icalSyncedAt: string | null }[]
> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, slug, ical_import_url, ical_export_url, ical_synced_at')
      .order('name');

    if (error || !data) {
      return mockData.getRooms().map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        icalImportUrl: r.icalImportUrl || null,
        icalExportUrl: r.icalExportUrl || null,
        icalSyncedAt: r.icalSyncedAt || null,
      }));
    }

    return data.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      icalImportUrl: r.ical_import_url,
      icalExportUrl: r.ical_export_url,
      icalSyncedAt: r.ical_synced_at,
    }));
  }

  return mockData.getRooms().map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    icalImportUrl: r.icalImportUrl || null,
    icalExportUrl: r.icalExportUrl || null,
    icalSyncedAt: r.icalSyncedAt || null,
  }));
}
