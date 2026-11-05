import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isMockDataAllowed } from '@/lib/dataMode';
import { mercadoPagoGateway } from '@/lib/payments/mercadopago';
import { confirmBookingFromPayment } from '@/lib/paymentConfirmation';
import { sendPaymentConfirmedEmail } from '@/lib/bookingNotifications';
import { supabaseConfirmationRepository, mockConfirmationRepository } from '@/lib/paymentConfirmationRepo';

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
    // Com MP_WEBHOOK_SECRET configurado, a assinatura é obrigatória (antes,
    // omitir o header x-signature pulava a verificação).
    const signature = mercadoPagoGateway.verifyWebhook({ headers: request.headers, url });
    if (signature === 'invalid') {
      console.warn('[Webhook MP] Assinatura ausente ou inválida.');
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }
    if (signature === 'not_configured' && process.env.MP_ACCESS_TOKEN) {
      console.warn('[Webhook MP] MP_WEBHOOK_SECRET não configurado — notificações não são autenticadas.');
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
    const payment = await mercadoPagoGateway.getPayment(String(paymentId));

    if (!payment || !payment.external_reference) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado ou sem external_reference.' },
        { status: 404 }
      );
    }

    // Confirma somente se aprovado E valor pago == total calculado no servidor
    const repo = isSupabaseConfigured()
      ? supabaseConfirmationRepository
      : isMockDataAllowed()
        ? mockConfirmationRepository
        : null;
    if (!repo) {
      return NextResponse.json({ error: 'Banco indisponível.' }, { status: 503 });
    }
    const result = await confirmBookingFromPayment(payment, repo);
    const bookingId = result.bookingId ?? null;

    // E-mail de confirmação só após validação do pagamento no gateway
    if (result.outcome === 'confirmed' && result.bookingId) {
      await sendPaymentConfirmedEmail(result.bookingId);
    }

    // Divergências respondem 200 (não adianta o MP reenviar) e ficam no log
    // para a equipe; erros de banco lançam e respondem 500 (MP reenvia).
    return NextResponse.json({
      received: true,
      paymentId,
      status: payment.status,
      outcome: result.outcome,
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
