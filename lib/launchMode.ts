// ============================================================
// lib/launchMode.ts
// Modo pré-lançamento: liga/desliga reservas e pagamentos online.
//
// NEXT_PUBLIC_ONLINE_BOOKING_ENABLED
//   "true"  → reservas e PIX online habilitados
//   "false" → desabilitados
//   ausente → DESABILITADO em produção (seguro por padrão);
//             habilitado em desenvolvimento/testes
//
// O bloqueio vale no SERVIDOR (Server Actions), não só na interface.
// O painel da equipe (reserva manual, status, bloqueios) continua ativo.
// Como é NEXT_PUBLIC_, o valor é fixado no build: mudar exige redeploy.
// ============================================================

export function isOnlineBookingEnabled(): boolean {
  const flag = (process.env.NEXT_PUBLIC_ONLINE_BOOKING_ENABLED || '').trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export const ONLINE_BOOKING_DISABLED_MESSAGE =
  'As reservas online estarão disponíveis em breve. Enquanto isso, fale com a nossa equipe para consultar datas e valores.';

/** Número oficial (somente dígitos, com DDI). Placeholder antigo é ignorado. */
export function getContactWhatsApp(): string | null {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  if (digits.length < 12 || /^5592998000000$/.test(digits)) return null;
  return digits;
}
