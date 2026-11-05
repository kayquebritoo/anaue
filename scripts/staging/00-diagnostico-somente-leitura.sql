-- ============================================================
-- 00-diagnostico-somente-leitura.sql
-- SOMENTE LEITURA. Não altera nada. Retorna apenas contagens e tarifas
-- (nenhum nome, e-mail, documento ou telefone de hóspede).
--
-- Onde rodar: Supabase → projeto → SQL Editor → New query → colar → Run.
-- Rodar em PRODUÇÃO (antes das migrations) e depois em STAGING (após restaurar).
--
-- Critério para aplicar 20261105000000_booking_integrity.sql:
--   diag_a, diag_b e diag_c devem ser 0. diag_d deve ser revisado com a Dilma.
-- ============================================================
SELECT
  (SELECT count(*) FROM public.bookings)                                   AS bookings_total,
  (SELECT count(*) FROM public.bookings WHERE status <> 'cancelled')       AS bookings_ativas,
  (SELECT count(*) FROM public.room_blocks)                                AS room_blocks_total,
  (SELECT count(*) FROM public.coupons)                                    AS coupons_total,
  -- (a) reservas ativas sobrepostas → impede a migration
  (SELECT count(*) FROM public.bookings a JOIN public.bookings b
     ON a.room_id = b.room_id AND a.id < b.id
    AND a.status <> 'cancelled' AND b.status <> 'cancelled'
    AND a.check_in_date < b.check_out_date AND b.check_in_date < a.check_out_date) AS diag_a_sobrepostas,
  -- (b) reservas de quarto com check-out <= check-in → impede a migration
  (SELECT count(*) FROM public.bookings
    WHERE room_id IS NOT NULL AND check_out_date <= check_in_date)         AS diag_b_datas_reserva,
  -- (c) bloqueios com fim <= início → impede a migration
  (SELECT count(*) FROM public.room_blocks WHERE end_date <= start_date)   AS diag_c_datas_bloqueio,
  -- (d) reservas ativas sobre bloqueios → não impede, mas é overbooking existente
  (SELECT count(*) FROM public.bookings bk JOIN public.room_blocks rb
     ON rb.room_id = bk.room_id AND bk.status <> 'cancelled'
    AND bk.check_in_date < rb.end_date AND rb.start_date < bk.check_out_date) AS diag_d_reserva_sobre_bloqueio,
  -- localizadores/IDs que a busca nova não reconheceria
  (SELECT count(*) FROM public.bookings
    WHERE booking_code !~ '^AN-(\d{4}|[A-Z0-9]{4}\d{3})$')                 AS codigos_fora_do_padrao,
  (SELECT count(*) FROM public.bookings WHERE id !~ '^res-[a-z0-9]{3,32}$') AS ids_fora_do_padrao,
  -- status em uso
  (SELECT json_agg(DISTINCT status) FROM public.bookings)                  AS status_existentes,
  -- tarifas reais (o servidor passa a cobrar ESTES valores)
  (SELECT json_agg(json_build_object('id', id, 'nome', name, 'preco', price_per_night,
            'max', max_guests, 'disponivel', is_available) ORDER BY id) FROM public.rooms) AS tarifas_quartos,
  (SELECT json_agg(json_build_object('id', id, 'preco', price, 'tipo', price_type) ORDER BY id)
     FROM public.experiences)                                               AS tarifas_experiencias,
  -- políticas RLS atualmente ativas nas tabelas sensíveis
  (SELECT json_agg(json_build_object('tabela', tablename, 'politica', policyname, 'cmd', cmd, 'roles', roles))
     FROM pg_policies WHERE schemaname = 'public'
      AND tablename IN ('bookings','coupons','room_blocks','housekeeping'))   AS politicas_rls,
  -- usuários de autenticação (quantos existem; quem será equipe)
  (SELECT count(*) FROM auth.users)                                         AS auth_users_total,
  (SELECT current_setting('server_version'))                                AS postgres_versao;
