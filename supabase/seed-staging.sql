-- ============================================================
-- supabase/seed-staging.sql
-- Dados FICTÍCIOS para o projeto de STAGING (nunca produção).
-- Ordem: schema.sql → migrations (integridade, RLS) → este arquivo.
--
-- TRAVA: aborta se encontrar qualquer reserva que não seja fictícia
-- (e-mail fora de @exemplo.test) — impede rodar num banco com hóspedes reais.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings WHERE guest_email NOT LIKE '%@exemplo.test') THEN
    RAISE EXCEPTION 'ABORTADO: este banco contém reservas que não são fictícias. seed-staging.sql só pode rodar no STAGING.';
  END IF;
END $$;

-- Reservas fictícias cobrindo os status do ciclo (datas futuras distantes)
INSERT INTO public.bookings
  (id, booking_code, room_id, user_id, guest_name, guest_email, guest_phone,
   check_in_date, check_out_date, guests, room_price, addons_price, discount_price,
   total_price, status, payment_method, invoice_status)
VALUES
  ('res-stg00001', 'AN-STG1001', 'room-001', 'guest-stg', 'Ana Fictícia',     'ana@exemplo.test',     '92900000001', '2030-01-10', '2030-01-13', 2, 1950, 0, 98,  1852, 'confirmed',   'pix',         'exempt'),
  ('res-stg00002', 'AN-STG2002', 'room-002', 'guest-stg', 'Bruno Teste',      'bruno@exemplo.test',   '92900000002', '2030-01-10', '2030-01-12', 2, 1780, 0, 89,  1691, 'pending',     'pix',         'exempt'),
  ('res-stg00003', 'AN-STG3003', 'room-003', 'guest-stg', 'Carla Exemplo',    'carla@exemplo.test',   '92900000003', '2030-02-01', '2030-02-04', 2, 3540, 0, 0,   3540, 'checked_in',  'credit_card', 'pending'),
  ('res-stg00004', 'AN-STG4004', 'room-004', 'guest-stg', 'Diego Simulado',   'diego@exemplo.test',   '92900000004', '2030-02-01', '2030-02-03', 3, 3180, 0, 0,   3180, 'checked_out', 'credit_card', 'exempt'),
  ('res-stg00005', 'AN-STG5005', 'room-001', 'guest-stg', 'Elisa Cancelada',  'elisa@exemplo.test',   '92900000005', '2030-01-11', '2030-01-12', 1, 650,  0, 33,  617,  'cancelled',   'pix',         'exempt')
ON CONFLICT (id) DO NOTHING;

-- Bloqueio fictício de manutenção
INSERT INTO public.room_blocks (id, room_id, start_date, end_date, reason, notes)
VALUES ('blk-stg00001', 'room-002', '2030-03-01', '2030-03-05', 'maintenance', 'Bloqueio fictício de staging')
ON CONFLICT (id) DO NOTHING;

-- Quarto barato SÓ para o teste de PIX real simbólico (docs/pix-real-test.md, fase C)
INSERT INTO public.rooms (id, name, slug, short_description, long_description, price_per_night, max_guests, is_featured)
VALUES ('room-teste-pix', 'Teste PIX (staging)', 'teste-pix', 'Somente testes', 'Somente testes de pagamento no staging', 2.00, 1, false)
ON CONFLICT (id) DO NOTHING;

SELECT 'seed de staging aplicado' AS resultado,
       (SELECT count(*) FROM public.bookings) AS reservas,
       (SELECT count(*) FROM public.room_blocks) AS bloqueios;
