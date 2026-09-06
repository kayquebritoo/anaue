'use server';

// ============================================================
// app/actions/invoice.ts
// Server Actions para Gestão de Faturamento, NFS-e e Recibos Fiscais
// ============================================================

import {
  updateBookingBillingDataAsync,
  markInvoiceIssuedAsync,
  getBillingBookingsAsync,
  getRoomByIdAsync,
} from '@/lib/supabaseData';
import type { Reservation, InvoiceStatus, Room } from '@/types';

async function safeRevalidatePaths(paths: string[]) {
  try {
    const { revalidatePath } = await import('next/cache');
    for (const path of paths) {
      revalidatePath(path);
    }
  } catch {
    // Contextos CLI / testes
  }
}

export interface BillingDataInput {
  taxId?: string | null;
  companyName?: string | null;
  billingAddress?: string | null;
  invoiceStatus?: InvoiceStatus;
  invoiceNumber?: string | null;
}

export interface InvoiceActionResult {
  success: boolean;
  reservation?: Reservation;
  reservations?: Reservation[];
  error?: string;
}

export interface InvoiceDocumentData {
  booking: Reservation;
  room: Room | null;
  pousada: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoMunicipal: string;
    cadastur: string;
    endereco: string;
    cidadeUf: string;
    telefone: string;
    email: string;
  };
}

/**
 * Atualiza os dados fiscais de uma reserva específica
 */
export async function updateBookingBillingDataAction(
  bookingId: string,
  billingData: BillingDataInput
): Promise<InvoiceActionResult> {
  try {
    if (!bookingId) {
      return { success: false, error: 'Identificador da reserva não fornecido.' };
    }

    const updated = await updateBookingBillingDataAsync(bookingId, billingData);
    if (!updated) {
      return { success: false, error: 'Reserva não encontrada para atualização de faturamento.' };
    }

    await safeRevalidatePaths(['/admin/faturamento', '/admin/financeiro', '/admin/reservas']);

    return {
      success: true,
      reservation: updated,
    };
  } catch (err: any) {
    console.error('[updateBookingBillingDataAction] Erro:', err);
    return {
      success: false,
      error: 'Não foi possível atualizar os dados de faturamento.',
    };
  }
}

/**
 * Marca uma reserva como nota emitida (com geração ou atribuição de número de NFS-e)
 */
export async function markInvoiceAsIssuedAction(
  bookingId: string,
  invoiceNumber?: string
): Promise<InvoiceActionResult> {
  try {
    if (!bookingId) {
      return { success: false, error: 'Identificador da reserva não fornecido.' };
    }

    const updated = await markInvoiceIssuedAsync(bookingId, invoiceNumber);
    if (!updated) {
      return { success: false, error: 'Falha ao registrar emissão de nota fiscal.' };
    }

    await safeRevalidatePaths(['/admin/faturamento', '/admin/financeiro', '/admin/reservas']);

    return {
      success: true,
      reservation: updated,
    };
  } catch (err: any) {
    console.error('[markInvoiceAsIssuedAction] Erro:', err);
    return {
      success: false,
      error: 'Erro ao marcar nota fiscal como emitida.',
    };
  }
}

/**
 * Lista todas as reservas pagas / faturáveis
 */
export async function getAllInvoicesAction(): Promise<InvoiceActionResult> {
  try {
    const allBookings = await getBillingBookingsAsync();
    // Ordena as mais recentes primeiro
    const sorted = [...allBookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      success: true,
      reservations: sorted,
    };
  } catch (err: any) {
    console.error('[getAllInvoicesAction] Erro:', err);
    return {
      success: false,
      error: 'Erro ao listar faturamento.',
    };
  }
}

/**
 * Busca todos os dados consolidados para exibição / impressão do Recibo / NFS-e
 */
export async function getInvoiceDataAction(
  bookingId: string
): Promise<{ success: boolean; data?: InvoiceDocumentData; error?: string }> {
  try {
    const allBookings = await getBillingBookingsAsync();
    const booking = allBookings.find((b) => b.id === bookingId || b.bookingCode === bookingId);

    if (!booking) {
      return { success: false, error: 'Reserva não localizada.' };
    }

    let room: Room | null = null;
    if (booking.roomId) {
      room = (await getRoomByIdAsync(booking.roomId)) || null;
    }

    const documentData: InvoiceDocumentData = {
      booking,
      room,
      pousada: {
        razaoSocial: 'Anauê Amazônia Turismo e Hotelaria Ecológica Ltda.',
        nomeFantasia: 'Anauê Amazônia Ecolodge & PMS',
        cnpj: '45.123.789/0001-90',
        inscricaoMunicipal: '987.654-3',
        cadastur: '03.098.112/0001-44',
        endereco: 'Estrada do Rio Negro, Km 38 — Ramal do Miriti',
        cidadeUf: 'Presidente Figueiredo / AM — CEP 69735-000',
        telefone: '+55 (92) 99123-4567',
        email: 'financeiro@anaueamazonia.com.br',
      },
    };

    return {
      success: true,
      data: documentData,
    };
  } catch (err: any) {
    console.error('[getInvoiceDataAction] Erro:', err);
    return {
      success: false,
      error: 'Falha ao compilar dados do recibo fiscal.',
    };
  }
}
