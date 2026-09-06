import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus, isPaymentApproved } from '@/lib/mercadopago';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';

/**
 * POST /api/webhooks/mercadopago
 * Webhook de notificações do Mercado Pago.
 *
 * O Mercado Pago envia notificações quando o status de um pagamento muda.
 * Formatos de notificação:
 *   - Query param: ?topic=payment&id=123456
 *   - Body JSON: { "type": "payment", "data": { "id": 123456 } }
 *
 * Fluxo:
 * 1. Recebe notificação com ID do pagamento
 * 2. Consulta API do Mercado Pago para verificar status real
 * 3. Se aprovado, atualiza booking para 'confirmed'
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // ── Verificação de Assinatura HMAC-SHA256 do Mercado Pago ──────────────
    // Protege contra replay attacks e notificações forjadas.
    // Configurar MP_WEBHOOK_SECRET no painel do Mercado Pago → Webhooks.
    const mpSecret = process.env.MP_WEBHOOK_SECRET;
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');

    if (mpSecret && xSignature) {
      const dataId = url.searchParams.get('data.id') || '';
      const manifest = `id:${dataId};request-id:${xRequestId};`;
      const { createHmac } = await import('crypto');
      const expectedHash = createHmac('sha256', mpSecret).update(manifest).digest('hex');
      // Header formato: "ts=1234567890,v1=HASH_HEX"
      const v1 = xSignature.split(',').find((p) => p.startsWith('v1='))?.slice(3);
      if (!v1 || v1 !== expectedHash) {
        console.warn('[Webhook MP] Assinatura inválida — possível replay attack.');
        return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
      }
    }
    // ── Fim verificação HMAC ───────────────────────────────────────────────

    // Extrair ID do pagamento de query params ou body
    let paymentId: number | null = null;

    const topicId = url.searchParams.get('id');
    const topic = url.searchParams.get('topic');

    if (topicId && (topic === 'payment' || topic === null)) {
      paymentId = parseInt(topicId, 10);
    }

    if (!paymentId) {
      try {
        const body = await request.json();
        if (body.type === 'payment' && body.data?.id) {
          paymentId = parseInt(body.data.id, 10);
        }
      } catch {
        // Body não é JSON válido
      }
    }

    if (!paymentId || isNaN(paymentId)) {
      return NextResponse.json(
        { error: 'ID de pagamento inválido ou ausente.' },
        { status: 400 }
      );
    }

    // Se não tem MP_ACCESS_TOKEN configurado, retorna OK (mock mode)
    if (!process.env.MP_ACCESS_TOKEN) {
      return NextResponse.json({ received: true, mode: 'mock' });
    }

    // Consultar status real do pagamento no Mercado Pago
    const payment = await getPaymentStatus(paymentId);

    if (!payment || !payment.external_reference) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado ou sem external_reference.' },
        { status: 404 }
      );
    }

    const bookingId = payment.external_reference;

    // Se pagamento aprovado, confirmar reserva
    if (isPaymentApproved(payment.status)) {
      if (isSupabaseConfigured()) {
        // Atualizar status do booking para 'confirmed'
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)
          .eq('status', 'pending');

        if (error) {
          return NextResponse.json(
            { error: `Erro ao atualizar reserva: ${error.message}` },
            { status: 500 }
          );
        }
      } else {
        // Mock: atualizar localmente
        mockData.updateReservationStatus(bookingId, 'confirmed');
      }
    }

    return NextResponse.json({
      received: true,
      paymentId,
      status: payment.status,
      bookingId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar webhook.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/mercadopago
 * Endpoint de verificação (health check) para o Mercado Pago.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook Mercado Pago ativo.',
    configured: !!process.env.MP_ACCESS_TOKEN,
  });
}
