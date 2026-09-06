'use server';

// ============================================================
// app/actions/roomBlock.ts
// Server Actions para Gestão de Bloqueios Manuais de Quartos
// Manutenção, Uso Próprio e Integração Anti-Overbooking
// ============================================================

import {
  getRoomBlocksAsync,
  createRoomBlockAsync,
  deleteRoomBlockAsync,
  getRoomByIdAsync,
} from '@/lib/supabaseData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import type { RoomBlock, RoomBlockReason } from '@/types';

async function safeRevalidatePaths(paths: string[]) {
  try {
    const { revalidatePath } = await import('next/cache');
    for (const path of paths) {
      revalidatePath(path);
    }
  } catch {
    // Silencia em contextos sem Next.js static store (CLI/testes)
  }
}

export interface CreateRoomBlockInput {
  roomId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: RoomBlockReason;
  notes?: string;
}

export interface RoomBlockActionResult {
  success: boolean;
  block?: RoomBlock;
  blocks?: RoomBlock[];
  error?: string;
}

/**
 * Cria um bloqueio manual de quarto com validação contra reservas existentes.
 */
export async function createRoomBlockAction(
  input: CreateRoomBlockInput
): Promise<RoomBlockActionResult> {
  try {
    const { roomId, startDate, endDate, reason, notes } = input;

    // 1. Validações básicas de formato
    if (!roomId) {
      return { success: false, error: 'Selecione o quarto a ser bloqueado.' };
    }
    if (!startDate || !endDate) {
      return { success: false, error: 'As datas de início e término são obrigatórias.' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Formato de datas inválido.' };
    }
    if (end <= start) {
      return {
        success: false,
        error: 'A data de término do bloqueio deve ser posterior à data de início.',
      };
    }

    // 2. Verificar se o quarto existe
    const room = await getRoomByIdAsync(roomId);
    if (!room) {
      return { success: false, error: 'Quarto selecionado não encontrado.' };
    }

    // 3. Verificação de conflito com reservas ativas já existentes
    if (isSupabaseConfigured()) {
      const { data: overlappingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id, booking_code, check_in_date, check_out_date, status')
        .eq('room_id', roomId)
        .neq('status', 'cancelled')
        .lt('check_in_date', endDate)
        .gt('check_out_date', startDate);

      if (!checkError && overlappingBookings && overlappingBookings.length > 0) {
        const codes = overlappingBookings.map((b) => b.booking_code).join(', ');
        return {
          success: false,
          error: `Não é possível bloquear este quarto no período. Existem reservas ativas confirmadas (${codes}).`,
        };
      }
    } else {
      const localReservations = mockData.getAllReservations();
      const conflict = localReservations.some(
        (r) =>
          r.roomId === roomId &&
          r.status !== 'cancelled' &&
          r.checkIn < endDate &&
          r.checkOut > startDate
      );
      if (conflict) {
        return {
          success: false,
          error: 'Não é possível bloquear este quarto no período. Existem reservas ativas confirmadas.',
        };
      }
    }

    // 4. Criação do Bloqueio
    const newBlock = await createRoomBlockAsync({
      roomId,
      startDate,
      endDate,
      reason: reason || 'maintenance',
      notes: notes?.trim() || null,
    });

    // 5. Revalidação das rotas do painel e catálogo
    await safeRevalidatePaths([
      '/admin',
      '/admin/bloqueios',
      '/admin/calendario',
      '/admin/reservas',
      '/busca',
      '/acomodacoes',
    ]);

    return {
      success: true,
      block: newBlock,
    };
  } catch (err: any) {
    console.error('[createRoomBlockAction] Erro inesperado:', err);
    return {
      success: false,
      error: 'Não foi possível salvar o bloqueio do quarto. Tente novamente.',
    };
  }
}

/**
 * Remove um bloqueio de quarto existente por ID.
 */
export async function deleteRoomBlockAction(
  blockId: string
): Promise<RoomBlockActionResult> {
  try {
    if (!blockId) {
      return { success: false, error: 'Identificador do bloqueio não fornecido.' };
    }

    const ok = await deleteRoomBlockAsync(blockId);
    if (!ok) {
      return { success: false, error: 'Falha ao remover o bloqueio no banco de dados.' };
    }

    await safeRevalidatePaths([
      '/admin',
      '/admin/bloqueios',
      '/admin/calendario',
      '/admin/reservas',
      '/busca',
      '/acomodacoes',
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('[deleteRoomBlockAction] Erro inesperado:', err);
    return {
      success: false,
      error: 'Não foi possível remover o bloqueio do quarto.',
    };
  }
}

/**
 * Retorna todos os bloqueios cadastrados com os dados do quarto relacionados.
 */
export async function getAllRoomBlocksAction(): Promise<RoomBlockActionResult> {
  try {
    const blocks = await getRoomBlocksAsync();
    return {
      success: true,
      blocks,
    };
  } catch (err: any) {
    console.error('[getAllRoomBlocksAction] Erro ao buscar bloqueios:', err);
    return {
      success: false,
      error: 'Falha ao listar bloqueios de quartos.',
    };
  }
}

/**
 * Lista simplificada de quartos para seleção no formulário de bloqueio
 */
export async function getRoomsListAction(): Promise<Array<{ id: string; name: string; type: string }>> {
  try {
    const { getRoomsAsync } = await import('@/lib/supabaseData');
    const rooms = await getRoomsAsync();
    return rooms.map((r) => ({ id: r.id, name: r.name, type: r.type }));
  } catch (err) {
    console.error('[getRoomsListAction] Erro:', err);
    return [];
  }
}
