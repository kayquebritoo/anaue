// ============================================================
// lib/dataMode.ts
// Define quando o uso de dados mock é legítimo.
//
// Regras (avaliadas nesta ordem):
//  1. Supabase configurado → mock NUNCA é usado. Falhas do banco viram
//     erro, não dados falsos (evita reservas/cupons/KPIs "fantasmas").
//  2. Deploy de produção da Vercel (VERCEL_ENV=production) → mock proibido,
//     mesmo com a flag de escape. Sem Supabase, o sistema fica indisponível.
//  3. Build/servidor de produção fora da Vercel (NODE_ENV=production) →
//     mock só com ANAUE_ALLOW_MOCK_DATA=true (demo offline explícita).
//     No browser a flag equivalente é NEXT_PUBLIC_ANAUE_ALLOW_MOCK_DATA.
//  4. Desenvolvimento e testes → mock liberado.
// ============================================================

import { isSupabaseConfigured } from '@/lib/supabase';

export class DataUnavailableError extends Error {
  constructor(message = 'Fonte de dados indisponível.') {
    super(message);
    this.name = 'DataUnavailableError';
  }
}

function isVercelProduction(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
  );
}

function mockEscapeHatchEnabled(): boolean {
  return (
    process.env.ANAUE_ALLOW_MOCK_DATA === 'true' ||
    process.env.NEXT_PUBLIC_ANAUE_ALLOW_MOCK_DATA === 'true'
  );
}

export function isMockDataAllowed(): boolean {
  if (isSupabaseConfigured()) return false;
  if (isVercelProduction()) return false;
  if (process.env.NODE_ENV === 'production') return mockEscapeHatchEnabled();
  return true;
}

/**
 * Simulações de integrações externas (ex.: PIX mock sem Mercado Pago)
 * só fora de produção — ou com a flag explícita fora da Vercel produção.
 */
export function isIntegrationMockAllowed(): boolean {
  if (isVercelProduction()) return false;
  if (process.env.NODE_ENV === 'production') return mockEscapeHatchEnabled();
  return true;
}

/**
 * Para funções de leitura/escrita: retorna true se deve usar mock,
 * false se deve usar o Supabase, e lança se nenhum dos dois é permitido
 * (produção sem Supabase configurado).
 */
export function shouldUseMockData(): boolean {
  if (isSupabaseConfigured()) return false;
  if (isMockDataAllowed()) return true;
  throw new DataUnavailableError('Supabase não configurado e dados mock proibidos neste ambiente.');
}
