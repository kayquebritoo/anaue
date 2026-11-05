// ============================================================
// lib/publicReservation.ts
// Visão pública de uma reserva (consulta do hóspede / tela de sucesso).
// Remove documento, dados fiscais, pedidos especiais e IDs internos;
// mascara e-mail e telefone. Quem precisa dos dados completos é a
// equipe, autenticada no painel.
// ============================================================

import type { Reservation } from '@/types';

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '';
  return `•••• ${digits.slice(-4)}`;
}

export function toPublicReservation(r: Reservation): Reservation {
  return {
    id: r.id,
    bookingCode: r.bookingCode,
    userId: '',
    roomId: r.roomId,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    guests: r.guests,
    totalPrice: r.totalPrice,
    roomPrice: r.roomPrice,
    addonsPrice: r.addonsPrice,
    discountPrice: r.discountPrice,
    status: r.status,
    specialRequests: null,
    guestName: r.guestName,
    guestEmail: maskEmail(r.guestEmail),
    guestPhone: maskPhone(r.guestPhone),
    guestDocument: null,
    taxId: null,
    companyName: null,
    billingAddress: null,
    invoiceStatus: r.invoiceStatus,
    invoiceNumber: null,
    invoiceIssuedAt: null,
    paymentMethod: r.paymentMethod,
    selectedAddons: r.selectedAddons,
    createdAt: r.createdAt,
  };
}
