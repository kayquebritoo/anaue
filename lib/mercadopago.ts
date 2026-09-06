// ============================================================
// lib/mercadopago.ts
// Helper para integração com a API do Mercado Pago (REST API)
// Suporte a pagamentos PIX dinâmicos
// ============================================================

const MP_BASE_URL = 'https://api.mercadopago.com/v1';

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN não configurado nas variáveis de ambiente.');
  }
  return token;
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAccessToken()}`,
  };
}

// ─── Tipos de Resposta ──────────────────────────────────────

export interface PixPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  qr_code: string;           // Copia e cola
  qr_code_base64: string;    // Imagem QR Code em base64
  ticket_url: string;        // URL para pagamento
  external_reference: string;
  transaction_amount: number;
  date_of_expiration: string;
  point_of_interaction?: {
    type: string;
    transaction_data?: {
      qr_code_base64: string;
      qr_code: string;
      redirect_url: string;
    };
  };
}

export interface PaymentStatusResponse {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  payment_method_id: string;
  date_approved: string | null;
}

// ─── Criar Pagamento PIX ────────────────────────────────────

export interface CreatePixPaymentParams {
  amount: number;
  description: string;
  email: string;
  externalReference: string;
}

export async function createPixPayment(
  params: CreatePixPaymentParams
): Promise<PixPaymentResponse> {
  const body = {
    transaction_amount: params.amount,
    description: params.description,
    payment_method_id: 'pix',
    payer: {
      email: params.email,
    },
    external_reference: params.externalReference,
    // Expiração: 30 minutos a partir de agora
    date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };

  const response = await fetch(`${MP_BASE_URL}/payments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Erro ao criar pagamento PIX: ${response.status} - ${error.message || response.statusText}`
    );
  }

  return response.json();
}

// ─── Consultar Status do Pagamento ──────────────────────────

export async function getPaymentStatus(
  paymentId: number
): Promise<PaymentStatusResponse> {
  const response = await fetch(`${MP_BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: headers(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Erro ao consultar pagamento: ${response.status} - ${error.message || response.statusText}`
    );
  }

  return response.json();
}

// ─── Consultar Pagamento por External Reference ──────────────

export async function getPaymentByExternalReference(
  externalReference: string
): Promise<PaymentStatusResponse | null> {
  const response = await fetch(
    `${MP_BASE_URL}/payments/search?external_reference=${encodeURIComponent(externalReference)}`,
    {
      method: 'GET',
      headers: headers(),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const results = data.results;

  if (!results || results.length === 0) {
    return null;
  }

  // Retorna o pagamento mais recente
  return results[0];
}

// ─── Verificar se pagamento está aprovado ────────────────────

export function isPaymentApproved(status: string): boolean {
  return status === 'approved';
}

export function isPaymentPending(status: string): boolean {
  return ['pending', 'in_process', 'in_trial'].includes(status);
}

export function isPaymentRejected(status: string): boolean {
  return ['cancelled', 'refunded', 'charged_back'].includes(status);
}
