-- ============================================================
-- Migration: 20261106000000_payment_events
-- Histórico de eventos de pagamento exibido em
-- Painel → Configurações → Pagamentos.
--
-- Depende de 20261105000100_rls_hardening (função public.anaue_is_staff).
-- Sem dados pessoais nem credenciais: IDs, status, resultado e valor.
-- Leitura: somente equipe. Escrita: somente o servidor (service_role).
-- ============================================================

SET lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS public.payment_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  environment TEXT CHECK (environment IN ('test', 'production', 'unknown')),
  event_type TEXT NOT NULL CHECK (event_type IN ('webhook', 'webhook_rejected', 'pix_created', 'manual_confirmation', 'connection_test')),
  payment_id TEXT,
  booking_id TEXT,
  payment_status TEXT,
  outcome TEXT,
  amount NUMERIC(10, 2),
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_booking ON public.payment_events (booking_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe lê eventos de pagamento" ON public.payment_events;
CREATE POLICY "Equipe lê eventos de pagamento" ON public.payment_events
  FOR SELECT TO authenticated USING (public.anaue_is_staff());

-- Sem políticas de INSERT/UPDATE/DELETE para anon/authenticated:
-- somente o servidor (service_role, ignora RLS) grava eventos.
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON public.payment_events FROM %I', r);
    END IF;
  END LOOP;
END $$;

RESET lock_timeout;
