// ============================================================
// lib/dataMode.ts
// Define quando o uso de dados mock é legítimo.
//
// Regra: mocks só são usados quando o Supabase NÃO está configurado e
// o ambiente não é produção (ou quando explicitamente liberado via
// ANAUE_ALLOW_MOCK_DATA=true, ex.: demo offline). Com Supabase
// configurado, falhas do banco NUNCA caem silenciosamente em mock —
// isso geraria reservas "fantasmas" que não existem no banco.
// ============================================================

import { isSupabaseConfigured } from '@/lib/supabase';

export function isMockDataAllowed(): boolean {
  if (isSupabaseConfigured()) return false;
  if (process.env.ANAUE_ALLOW_MOCK_DATA === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}
