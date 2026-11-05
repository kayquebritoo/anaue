-- ============================================================
-- Migration: 20261105000100_rls_hardening
-- Anauê Amazônia PMS — RLS de reservas e dados pessoais
--
-- PROBLEMA (schema.sql atual)
--   Políticas USING (true) para anon em bookings/coupons/room_blocks/
--   housekeeping: qualquer pessoa com a chave pública (que vai no bundle
--   do site) lê nome, e-mail, telefone, CPF/CNPJ e endereço de todos os
--   hóspedes, altera status/preço de reservas e cria cupons.
--
-- DEPOIS DESTA MIGRATION
--   anon           → lê apenas rooms e experiences (catálogo).
--   authenticated  → nada, exceto quem está em public.staff_members.
--   equipe         → lê/atualiza bookings, housekeeping, coupons, room_blocks.
--   service_role   → servidor (Server Actions); ignora RLS.
--
-- ⚠️ PRÉ-REQUISITOS (senão o site para de criar reservas):
--   1. SUPABASE_SERVICE_ROLE_KEY COMPLETA configurada na Vercel (server-only),
--      após a rotação de chaves. O código deste PR usa a chave secreta no
--      servidor apenas se ela tiver formato completo.
--   2. Código deste PR em produção (browser não lê mais bookings como anon;
--      painel usa sessão em cookie → role authenticated).
--   3. Migration 20261105000000_booking_integrity aplicada.
--   4. Equipe cadastrada em public.staff_members (ver README) e cadastro
--      público desabilitado em Authentication → Providers → Email.
-- ============================================================

SET lock_timeout = '10s';

-- ─── Equipe autorizada ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_members (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
-- Sem políticas: nenhuma role da API lê/escreve esta tabela diretamente.
DO $$
DECLARE r TEXT;
BEGIN
  -- Supabase concede privilégios padrão em tabelas novas; aqui removemos.
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON public.staff_members FROM %I', r);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.anaue_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members s WHERE s.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.anaue_is_staff() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.anaue_is_staff() TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.anaue_is_staff() FROM anon;
  END IF;
END $$;

-- ─── bookings (dados pessoais) ───────────────────────────────
DROP POLICY IF EXISTS "Permitir leitura pública de reservas" ON public.bookings;
DROP POLICY IF EXISTS "Permitir inserção de reservas" ON public.bookings;
DROP POLICY IF EXISTS "Permitir atualização de reservas" ON public.bookings;
DROP POLICY IF EXISTS "Equipe lê reservas" ON public.bookings;
DROP POLICY IF EXISTS "Equipe atualiza reservas" ON public.bookings;

CREATE POLICY "Equipe lê reservas" ON public.bookings
  FOR SELECT TO authenticated USING (public.anaue_is_staff());
CREATE POLICY "Equipe atualiza reservas" ON public.bookings
  FOR UPDATE TO authenticated USING (public.anaue_is_staff()) WITH CHECK (public.anaue_is_staff());
-- INSERT público acontece via Server Action (service_role), com validação.

-- ─── housekeeping ────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir leitura pública de governança" ON public.housekeeping;
DROP POLICY IF EXISTS "Permitir atualização de governança" ON public.housekeeping;
DROP POLICY IF EXISTS "Equipe gerencia governança" ON public.housekeeping;

CREATE POLICY "Equipe gerencia governança" ON public.housekeeping
  FOR ALL TO authenticated USING (public.anaue_is_staff()) WITH CHECK (public.anaue_is_staff());

-- ─── coupons ─────────────────────────────────────────────────
-- Leitura pública expunha todos os códigos (inclusive inativos); a
-- validação agora é feita no servidor.
DROP POLICY IF EXISTS "Permitir leitura pública de cupons" ON public.coupons;
DROP POLICY IF EXISTS "Permitir inserção de cupons" ON public.coupons;
DROP POLICY IF EXISTS "Permitir atualização de cupons" ON public.coupons;
DROP POLICY IF EXISTS "Equipe gerencia cupons" ON public.coupons;

CREATE POLICY "Equipe gerencia cupons" ON public.coupons
  FOR ALL TO authenticated USING (public.anaue_is_staff()) WITH CHECK (public.anaue_is_staff());

-- ─── room_blocks ─────────────────────────────────────────────
-- Disponibilidade pública é calculada no servidor (getUnavailableRoomIdsAction).
DROP POLICY IF EXISTS "Permitir leitura pública de bloqueios" ON public.room_blocks;
DROP POLICY IF EXISTS "Permitir inserção de bloqueios" ON public.room_blocks;
DROP POLICY IF EXISTS "Permitir atualização de bloqueios" ON public.room_blocks;
DROP POLICY IF EXISTS "Permitir remoção de bloqueios" ON public.room_blocks;
DROP POLICY IF EXISTS "Equipe gerencia bloqueios" ON public.room_blocks;

CREATE POLICY "Equipe gerencia bloqueios" ON public.room_blocks
  FOR ALL TO authenticated USING (public.anaue_is_staff()) WITH CHECK (public.anaue_is_staff());

-- ─── rooms / experiences ─────────────────────────────────────
-- Leitura pública mantida (catálogo). Nenhuma política de escrita existe
-- para anon/authenticated; alterações (ex.: URL iCal) passam pelo servidor.

RESET lock_timeout;
