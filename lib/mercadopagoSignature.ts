// ============================================================
// lib/mercadopagoSignature.ts
// Verificação da assinatura x-signature dos webhooks do Mercado Pago.
// Manifesto oficial: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// (data.id em minúsculas quando alfanumérico). Comparação em tempo
// constante. Se o segredo estiver configurado, assinatura é OBRIGATÓRIA.
// ============================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SignatureInput {
  secret: string | undefined;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}

export type SignatureCheck = 'valid' | 'invalid' | 'not_configured';

export function verifyMercadoPagoSignature({ secret, xSignature, xRequestId, dataId }: SignatureInput): SignatureCheck {
  if (!secret) return 'not_configured';
  if (!xSignature) return 'invalid';

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return 'invalid';

  const id = (dataId || '').trim();
  const normalizedId = /^[a-z0-9]+$/i.test(id) ? id.toLowerCase() : id;

  let manifest = '';
  if (normalizedId) manifest += `id:${normalizedId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(v1, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected) ? 'valid' : 'invalid';
}
