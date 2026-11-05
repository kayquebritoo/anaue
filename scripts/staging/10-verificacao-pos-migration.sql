-- ============================================================
-- 10-verificacao-pos-migration.sql
-- SOMENTE LEITURA. Confirma que as migrations do PR #1 estão ativas.
-- Rodar no SQL Editor depois de aplicar cada migration (staging primeiro).
-- Todas as colunas "ok_*" devem ser true.
-- ============================================================
SELECT
  -- 20261105000000_booking_integrity
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap')          AS ok_exclusion_constraint,
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_room_dates_valid')    AS ok_check_datas_reserva,
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_blocks_dates_valid')      AS ok_check_datas_bloqueio,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_check_room_blocks')   AS ok_trigger_reserva_bloqueio,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_room_blocks_check_bookings')   AS ok_trigger_bloqueio_reserva,
  (SELECT bool_and(prosecdef) FROM pg_proc
    WHERE proname IN ('anaue_bookings_check_room_blocks','anaue_room_blocks_check_bookings')) AS ok_triggers_security_definer,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist')                    AS ok_btree_gist,

  -- 20261105000100_rls_hardening (só depois do passo 4.5)
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
               AND tablename IN ('bookings','coupons','room_blocks','housekeeping')
               AND 'public' = ANY (roles) )                                           AS ok_sem_politica_publica,
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
               AND tablename IN ('bookings','coupons','room_blocks','housekeeping')
               AND (qual = 'true' OR with_check = 'true'))                            AS ok_sem_using_true,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_members') AS ok_staff_members,
  (SELECT count(*) FROM public.staff_members) > 0                                     AS ok_equipe_cadastrada,
  NOT has_function_privilege('anon', 'public.anaue_is_staff()', 'EXECUTE')            AS ok_anon_sem_is_staff,
  (SELECT bool_and(relrowsecurity) FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ('bookings','coupons','room_blocks','housekeeping','staff_members')) AS ok_rls_habilitado;
