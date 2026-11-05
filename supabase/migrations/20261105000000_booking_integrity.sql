-- ============================================================
-- Migration: 20261105000000_booking_integrity
-- Anauê Amazônia PMS — Integridade de reservas (anti-overbooking)
--
-- O QUE FAZ
--   1. Exclusion constraint em public.bookings: duas reservas ativas
--      (status <> 'cancelled') do mesmo quarto não podem ter períodos
--      sobrepostos. Intervalo meio-aberto [check_in, check_out): o dia do
--      check-out de uma reserva pode ser o check-in de outra.
--   2. CHECKs: reserva de quarto exige check_out > check_in; bloqueio exige
--      end_date > start_date. (Reservas de experiência têm room_id NULL.)
--   3. Triggers com advisory lock por quarto, impedindo atomicamente:
--      - reserva ativa sobreposta a um bloqueio (room_blocks);
--      - bloqueio sobreposto a uma reserva ativa.
--      SECURITY DEFINER: a checagem enxerga todas as linhas mesmo quando
--      quem grava não tem permissão de leitura pelo RLS.
--
-- CÓDIGOS DE ERRO (lidos pela aplicação em lib/bookingErrors.ts)
--   23P01  exclusion_violation  → conflito entre reservas
--   AN001                       → reserva conflita com bloqueio de quarto
--   AN002                       → bloqueio conflita com reserva ativa
--   23514  check_violation      → datas inválidas
--   22000  data_exception       → datas invertidas (daterange inválido)
--
-- COMO APLICAR — ver supabase/migrations/README.md
--   Este arquivo NÃO contém BEGIN/COMMIT: `supabase db push` e o SQL Editor
--   já executam o arquivo inteiro numa única transação. Via psql use
--   `psql -1 -f` (single transaction).
--
-- DIAGNÓSTICO OBRIGATÓRIO ANTES (todas devem retornar 0 linhas)
--
--   -- (a) reservas ativas sobrepostas
--   SELECT a.booking_code, b.booking_code, a.room_id,
--          a.check_in_date, a.check_out_date, b.check_in_date, b.check_out_date
--   FROM public.bookings a
--   JOIN public.bookings b
--     ON a.room_id = b.room_id AND a.id < b.id
--    AND a.status <> 'cancelled' AND b.status <> 'cancelled'
--    AND a.check_in_date < b.check_out_date AND b.check_in_date < a.check_out_date;
--
--   -- (b) reservas de quarto com datas inválidas
--   SELECT booking_code FROM public.bookings
--   WHERE room_id IS NOT NULL AND check_out_date <= check_in_date;
--
--   -- (c) bloqueios com datas inválidas
--   SELECT id FROM public.room_blocks WHERE end_date <= start_date;
--
--   -- (d) reservas ativas sobre bloqueios (não impede a migration, mas deve
--   --     ser resolvido: são overbookings que já existem)
--   SELECT bk.booking_code, rb.id AS block_id, bk.room_id
--   FROM public.bookings bk
--   JOIN public.room_blocks rb
--     ON rb.room_id = bk.room_id AND bk.status <> 'cancelled'
--    AND bk.check_in_date < rb.end_date AND rb.start_date < bk.check_out_date;
--
-- LOCKS: ADD CONSTRAINT ... EXCLUDE toma ACCESS EXCLUSIVE em bookings
-- enquanto cria o índice GiST (tabela pequena: segundos). lock_timeout
-- evita ficar na fila atrás de transações longas — se estourar, reexecute.
-- ============================================================

SET lock_timeout = '10s';

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ─── 1. Datas coerentes ──────────────────────────────────────
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_room_dates_valid;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_room_dates_valid
  CHECK (room_id IS NULL OR check_out_date > check_in_date);

ALTER TABLE public.room_blocks
  DROP CONSTRAINT IF EXISTS room_blocks_dates_valid;
ALTER TABLE public.room_blocks
  ADD CONSTRAINT room_blocks_dates_valid
  CHECK (end_date > start_date);

-- ─── 2. Reserva x Reserva: exclusion constraint ──────────────
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in_date, check_out_date, '[)') WITH &&
  )
  WHERE (room_id IS NOT NULL AND status <> 'cancelled');

-- ─── 3. Reserva x Bloqueio: triggers serializados por quarto ─
-- Ambos os triggers obtêm o MESMO advisory lock transacional do quarto
-- antes de checar a outra tabela, então uma reserva e um bloqueio
-- concorrentes para o mesmo quarto nunca passam ambos pela verificação.
-- search_path vazio + nomes qualificados: sem sequestro de search_path.

CREATE OR REPLACE FUNCTION public.anaue_room_lock_key(p_room_id TEXT)
RETURNS BIGINT
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$ SELECT pg_catalog.hashtextextended('anaue_room:' || p_room_id, 0) $$;

CREATE OR REPLACE FUNCTION public.anaue_bookings_check_room_blocks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_block_id TEXT;
BEGIN
  IF NEW.room_id IS NULL OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só revalida se algo relevante mudou
  IF TG_OP = 'UPDATE'
     AND NEW.room_id IS NOT DISTINCT FROM OLD.room_id
     AND NEW.check_in_date = OLD.check_in_date
     AND NEW.check_out_date = OLD.check_out_date
     AND OLD.status <> 'cancelled' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(public.anaue_room_lock_key(NEW.room_id));

  SELECT rb.id INTO v_block_id
  FROM public.room_blocks rb
  WHERE rb.room_id = NEW.room_id
    AND rb.start_date < NEW.check_out_date
    AND NEW.check_in_date < rb.end_date
  LIMIT 1;

  IF v_block_id IS NOT NULL THEN
    RAISE EXCEPTION 'Quarto % bloqueado no período solicitado (bloqueio %).', NEW.room_id, v_block_id
      USING ERRCODE = 'AN001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_check_room_blocks ON public.bookings;
CREATE TRIGGER trg_bookings_check_room_blocks
  BEFORE INSERT OR UPDATE OF room_id, check_in_date, check_out_date, status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.anaue_bookings_check_room_blocks();

CREATE OR REPLACE FUNCTION public.anaue_room_blocks_check_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking_code TEXT;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(public.anaue_room_lock_key(NEW.room_id));

  SELECT b.booking_code INTO v_booking_code
  FROM public.bookings b
  WHERE b.room_id = NEW.room_id
    AND b.status <> 'cancelled'
    AND b.check_in_date < NEW.end_date
    AND NEW.start_date < b.check_out_date
  LIMIT 1;

  IF v_booking_code IS NOT NULL THEN
    RAISE EXCEPTION 'Existe reserva ativa (%) para o quarto % no período.', v_booking_code, NEW.room_id
      USING ERRCODE = 'AN002';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_blocks_check_bookings ON public.room_blocks;
CREATE TRIGGER trg_room_blocks_check_bookings
  BEFORE INSERT OR UPDATE OF room_id, start_date, end_date
  ON public.room_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.anaue_room_blocks_check_bookings();

-- Funções de trigger não devem ser chamadas diretamente via API (/rpc)
REVOKE ALL ON FUNCTION public.anaue_bookings_check_room_blocks() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anaue_room_blocks_check_bookings() FROM PUBLIC;
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.anaue_bookings_check_room_blocks() FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.anaue_room_blocks_check_bookings() FROM %I', r);
    END IF;
  END LOOP;
END $$;

RESET lock_timeout;
