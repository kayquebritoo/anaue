// ============================================================
// lib/whatsapp.ts
// Utilitários para geração de links WhatsApp com mensagens
// pré-formatadas para o Anauê Amazônia
// ============================================================

import type { Reservation } from '@/types';

const WHATSAPP_NUMBER = '5592998000000';

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Gera o link universal do WhatsApp (`wa.me`) com uma mensagem
 * pré-formatada contendo os dados da reserva.
 */
export function buildWhatsAppConfirmationLink(
  reservation: Reservation,
  roomName?: string,
): string {
  const lines = [
    `Olá! Acabei de realizar uma reserva no Anauê Amazônia. 🌿`,
    ``,
    `*Código:* ${reservation.bookingCode}`,
    `*Hóspede:* ${reservation.guestName}`,
    `*Acomodação:* ${roomName || 'A definir'}`,
    `*Período:* ${formatDateBR(reservation.checkIn)} até ${formatDateBR(reservation.checkOut)}`,
    `*Hóspedes:* ${reservation.guests}`,
    `*Total:* ${formatCurrencyBRL(reservation.totalPrice)}`,
    `*Pagamento:* ${reservation.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}`,
    ``,
    `Gostaria de confirmar os detalhes e orientações de chegada!`,
  ];

  const message = lines.join('\n');
  const encoded = encodeURIComponent(message);

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}
