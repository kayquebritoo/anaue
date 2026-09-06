-- ============================================================
-- Anauê Amazônia PMS — Schema Relacional PostgreSQL (Supabase)
-- Sprint 6: Tabelas rooms, experiences, bookings, housekeeping
-- ============================================================

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABELA: rooms (Acomodações) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'bangalo',
  category TEXT NOT NULL DEFAULT 'standard',
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  price_per_night NUMERIC(10, 2) NOT NULL,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  area_m2 INTEGER NOT NULL DEFAULT 35,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  video_url TEXT DEFAULT NULL,
  ical_import_url TEXT DEFAULT NULL,
  ical_export_url TEXT DEFAULT NULL,
  ical_synced_at TIMESTAMPTZ DEFAULT NULL,
  rating NUMERIC(3, 1) NOT NULL DEFAULT 5.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── TABELA: experiences (Experiências) ─────────────────────
CREATE TABLE IF NOT EXISTS public.experiences (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'bem-estar',
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'per_person',
  duration TEXT NOT NULL DEFAULT '60 min',
  image_url TEXT NOT NULL,
  gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── TABELA: bookings (Reservas) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY DEFAULT ('res-' || substr(md5(random()::text), 1, 8)),
  booking_code TEXT UNIQUE NOT NULL DEFAULT ('AN-' || floor(1000 + random() * 9000)::text),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE SET NULL,
  user_id TEXT DEFAULT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL DEFAULT '',
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 2,
  room_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  addons_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  special_requests TEXT DEFAULT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  selected_addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  coupon_code TEXT DEFAULT NULL,
  guest_document TEXT DEFAULT NULL,
  tax_id TEXT DEFAULT NULL,
  company_name TEXT DEFAULT NULL,
  billing_address TEXT DEFAULT NULL,
  invoice_status TEXT NOT NULL DEFAULT 'pending' CHECK (invoice_status IN ('pending', 'issued', 'exempt')),
  invoice_number TEXT DEFAULT NULL,
  invoice_issued_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migrations idempotentes para instâncias existentes do banco
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_document TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tax_id TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS billing_address TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS invoice_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS invoice_number TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMPTZ DEFAULT NULL;

-- ─── TABELA: housekeeping (Governança & Limpeza) ───────────
CREATE TABLE IF NOT EXISTS public.housekeeping (
  room_id TEXT PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'clean' CHECK (status IN ('dirty', 'cleaning', 'clean', 'inspected')),
  last_cleaned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  housekeeper_name TEXT NOT NULL DEFAULT 'Equipe Anauê',
  notes TEXT DEFAULT 'Higienizado.',
  maintenance_alert TEXT DEFAULT NULL
);

-- ─── TABELA: coupons (Cupons de Desconto) ───────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY DEFAULT ('cpn-' || substr(md5(random()::text), 1, 8)),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL,
  min_spend NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── TABELA: room_blocks (Bloqueios Manuais de Quarto) ───────
CREATE TABLE IF NOT EXISTS public.room_blocks (
  id TEXT PRIMARY KEY DEFAULT ('blk-' || substr(md5(random()::text), 1, 8)),
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'maintenance' CHECK (reason IN ('maintenance', 'owner_use', 'other')),
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── ÍNDICES PARA PERFORMANCE ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON public.rooms(slug);
CREATE INDEX IF NOT EXISTS idx_experiences_slug ON public.experiences(slug);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_room_blocks_dates ON public.room_blocks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_room_blocks_room_id ON public.room_blocks(room_id);

-- ─── ROW LEVEL SECURITY (RLS) ───────────────────────────────
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública
CREATE POLICY "Permitir leitura pública de acomodações" 
  ON public.rooms FOR SELECT USING (true);

CREATE POLICY "Permitir leitura pública de experiências" 
  ON public.experiences FOR SELECT USING (true);

CREATE POLICY "Permitir leitura pública de reservas" 
  ON public.bookings FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de reservas" 
  ON public.bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de reservas" 
  ON public.bookings FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura pública de governança" 
  ON public.housekeeping FOR SELECT USING (true);

CREATE POLICY "Permitir atualização de governança" 
  ON public.housekeeping FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura pública de cupons" 
  ON public.coupons FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de cupons" 
  ON public.coupons FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de cupons" 
  ON public.coupons FOR UPDATE USING (true);

-- Políticas de Bloqueios Manuais de Quartos
CREATE POLICY "Permitir leitura pública de bloqueios" 
  ON public.room_blocks FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de bloqueios" 
  ON public.room_blocks FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de bloqueios" 
  ON public.room_blocks FOR UPDATE USING (true);

CREATE POLICY "Permitir remoção de bloqueios" 
  ON public.room_blocks FOR DELETE USING (true);

-- ─── SEED DATA: 4 Acomodações Reais ─────────────────────────
INSERT INTO public.rooms (
  id, name, slug, type, category, short_description, long_description,
  price_per_night, max_guests, bedrooms, bathrooms, area_m2, amenities, images, gallery_images, rating, review_count, is_featured, is_available, tags
) VALUES
(
  'room-001',
  'Bacurí',
  'bacuri',
  'bangalo',
  'standard',
  'Inspirado no fruto amazônico de casca grossa e polpa doce, o Bacurí oferece aconchego e conexão autêntica com a copa das árvores.',
  'O quarto Bacurí foi desenhado para quem busca silêncio, frescor e imersão na natureza. Com acabamento em madeira nobre e varanda privativa voltada para a mata primária, cada amanhecer é acompanhado pela sinfonia das aves amazônicas.',
  650.00,
  2,
  1,
  1,
  38,
  '[{"id":"a1","name":"Varanda com Rede","icon":"Waves"},{"id":"a2","name":"Ar-condicionado","icon":"Wind"},{"id":"a3","name":"Café da manhã incluso","icon":"Coffee"},{"id":"a4","name":"Wi-Fi","icon":"Wifi"},{"id":"a5","name":"Vista para a Floresta","icon":"TreePine"}]'::jsonb,
  '[{"url":"/images/quartos/bacuri/_DSC7398.webp","alt":"Quarto Bacurí — Anauê Amazônia","isPrimary":true},{"url":"/images/quartos/bacuri/_DSC7399.webp","alt":"Detalhe do quarto Bacurí","isPrimary":false},{"url":"/images/quartos/bacuri/_DSC7406.webp","alt":"Varanda do Bacurí","isPrimary":false}]'::jsonb,
  ARRAY[
    '/images/quartos/bacuri/_DSC7398.webp',
    '/images/quartos/bacuri/_DSC7399.webp',
    '/images/quartos/bacuri/_DSC7406.webp',
    '/images/quartos/bacuri/_DSC7408.webp',
    '/images/quartos/bacuri/_DSC7410.webp',
    '/images/quartos/bacuri/_DSC7412.webp'
  ],
  4.8,
  94,
  true,
  true,
  ARRAY['natureza', 'floresta', 'romantico', 'standard']
),
(
  'room-002',
  'Cupuaçu',
  'cupuacu',
  'chale',
  'superior',
  'Inspirado no fruto símbolo da Amazônia, o Cupuaçu une o charme rústico da madeira com os confortos modernos de uma estadia premium.',
  'O quarto Cupuaçu carrega a essência dos frutos amazônicos: intenso, marcante e cheio de personalidade. Construído com madeiras certificadas da região, o espaço oferece uma experiência sensorial completa.',
  890.00,
  2,
  1,
  1,
  48,
  '[{"id":"a1","name":"Banheiro de Pedra","icon":"Bath"},{"id":"a2","name":"Ar-condicionado","icon":"Wind"},{"id":"a3","name":"Café da manhã incluso","icon":"Coffee"},{"id":"a4","name":"Wi-Fi","icon":"Wifi"},{"id":"a5","name":"Deck Privativo","icon":"Sunset"}]'::jsonb,
  '[{"url":"/images/quartos/cupuacu/_DSC7393.webp","alt":"Quarto Cupuaçu — Anauê Amazônia","isPrimary":true},{"url":"/images/quartos/cupuacu/_DSC7394.webp","alt":"Interior do quarto Cupuaçu","isPrimary":false}]'::jsonb,
  ARRAY[
    '/images/quartos/cupuacu/_DSC7393.webp',
    '/images/quartos/cupuacu/_DSC7394.webp'
  ],
  4.9,
  61,
  true,
  true,
  ARRAY['rustico', 'premium', 'romantico', 'superior']
),
(
  'room-003',
  'Miri',
  'miri',
  'suite',
  'deluxe',
  'O Miri — pequeno, mas poderoso como o peixe que leva seu nome — surpreende pela sofisticação discreta e pela conexão íntima com a Amazônia.',
  'Miri significa pequeno no idioma Nheengatu, mas este quarto é grande em experiência. Pensado para casais que valorizam privacidade e sofisticação, o Miri conta com banheira de imersão e vista privilegiada.',
  1180.00,
  2,
  1,
  1,
  55,
  '[{"id":"a1","name":"Banheira de Imersão","icon":"Bath"},{"id":"a2","name":"Ar-condicionado","icon":"Wind"},{"id":"a3","name":"Café da manhã incluso","icon":"Coffee"},{"id":"a4","name":"Wi-Fi","icon":"Wifi"},{"id":"a5","name":"Mordomo sob demanda","icon":"Star"}]'::jsonb,
  '[{"url":"/images/quartos/miri/_DSC7492.webp","alt":"Quarto Miri — Anauê Amazônia","isPrimary":true},{"url":"/images/quartos/miri/_DSC7493.webp","alt":"Interior do quarto Miri","isPrimary":false},{"url":"/images/quartos/miri/_DSC7529.webp","alt":"Banheiro do quarto Miri","isPrimary":false}]'::jsonb,
  ARRAY[
    '/images/quartos/miri/_DSC7492.webp',
    '/images/quartos/miri/_DSC7493.webp',
    '/images/quartos/miri/_DSC7529.webp',
    '/images/quartos/miri/_DSC7538.webp'
  ],
  4.9,
  48,
  true,
  true,
  ARRAY['deluxe', 'romantico', 'privacidade', 'suite']
),
(
  'room-004',
  'Tucumã',
  'tucuma',
  'chale',
  'premium',
  'O Tucumã é a experiência mais completa do Anauê, com espaço generoso, imersão total na floresta e todos os confortos de uma acomodação premium.',
  'Nomeado em homenagem ao fruto dourado da Amazônia, o quarto Tucumã é nossa acomodação mais espaçosa e sofisticada. Com ampla área de estar e banheiro completo com detalhes naturais.',
  1590.00,
  3,
  1,
  1,
  72,
  '[{"id":"a1","name":"Varanda Premium","icon":"Waves"},{"id":"a2","name":"Banheiro Espaçoso","icon":"Bath"},{"id":"a3","name":"Ar-condicionado","icon":"Wind"},{"id":"a4","name":"Café da manhã incluso","icon":"Coffee"},{"id":"a5","name":"Wi-Fi de alta velocidade","icon":"Wifi"}]'::jsonb,
  '[{"url":"/images/quartos/tucuma/_DSC7324.webp","alt":"Quarto Tucumã — Anauê Amazônia","isPrimary":true},{"url":"/images/quartos/tucuma/_DSC7326.webp","alt":"Interior do quarto Tucumã","isPrimary":false}]'::jsonb,
  ARRAY[
    '/images/quartos/tucuma/_DSC7324.webp',
    '/images/quartos/tucuma/_DSC7326.webp',
    '/images/quartos/tucuma/_DSC7327.webp'
  ],
  5.0,
  37,
  true,
  true,
  ARRAY['premium', 'espacoso', 'familia', 'luxo']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_per_night = EXCLUDED.price_per_night,
  short_description = EXCLUDED.short_description;

-- ─── SEED DATA: 5 Experiências Reais ────────────────────────
INSERT INTO public.experiences (
  id, slug, name, category, short_description, long_description, price, price_type, duration, image_url, gallery_images, is_popular
) VALUES
(
  'exp-001',
  'banho-de-argila',
  'Banho de Argila',
  'bem-estar',
  'Rituais ancestrais de limpeza e revitalização com argila branca da Amazônia, direto na beira do rio.',
  'O Banho de Argila é uma das experiências mais autênticas do Anauê. A argila branca extraída das margens do rio purifica a pele e reduz inflamações.',
  180.00,
  'per_person',
  '60 min',
  '/images/experiencias/argila/_DSC7082.webp',
  ARRAY['/images/experiencias/argila/_DSC7082.webp', '/images/experiencias/argila/_DSC7084.webp'],
  true
),
(
  'exp-002',
  'banhos-de-ervas',
  'Banhos de Ervas',
  'bem-estar',
  'Imersão terapêutica com ervas aromáticas amazônicas colhidas no próprio sítio para relaxamento e cura.',
  'Os Banhos de Ervas combinam o conhecimento ancestral da fitoterapia amazônica com uma experiência de spa contemporânea.',
  220.00,
  'per_person',
  '75 min',
  '/images/experiencias/banhos-de-ervas/_DSC7003.webp',
  ARRAY['/images/experiencias/banhos-de-ervas/_DSC7003.webp', '/images/experiencias/banhos-de-ervas/_DSC7005.webp'],
  false
),
(
  'exp-003',
  'esfoliacao',
  'Esfoliação',
  'bem-estar',
  'Esfoliação corporal com castanha-do-pará e mel silvestre para pele renovada e radiante.',
  'Nossa Esfoliação Amazônica utiliza uma mistura exclusiva de cascas de castanha-do-pará moídas, mel silvestre e óleos essenciais de copaíba.',
  160.00,
  'per_person',
  '50 min',
  '/images/experiencias/esfoliacao/_DSC7097.webp',
  ARRAY['/images/experiencias/esfoliacao/_DSC7097.webp', '/images/experiencias/esfoliacao/_DSC7099.webp'],
  false
),
(
  'exp-004',
  'massagens',
  'Massagens',
  'bem-estar',
  'Massagens terapêuticas com óleos vegetais amazônicos para relaxamento profundo do corpo e mente.',
  'Nossas Massagens Amazônicas são realizadas com óleos vegetais de andiroba, murumuru e buriti.',
  280.00,
  'per_person',
  '90 min',
  '/images/experiencias/massagem/_DSC7105.webp',
  ARRAY['/images/experiencias/massagem/_DSC7105.webp', '/images/experiencias/massagem/_DSC7107.webp'],
  true
),
(
  'exp-005',
  'passeios',
  'Passeios',
  'aventura',
  'Trilhas guiadas, canoas no igarapé e observação de fauna silvestre com guias especializados da região.',
  'Os Passeios do Anauê revelam a Amazônia de dentro para fora, com trilhas na selva e passeios de canoa no igarapé ao amanhecer.',
  350.00,
  'per_person',
  '120 min',
  '/images/experiencias/passeios/_DSC7045.webp',
  ARRAY['/images/experiencias/passeios/_DSC7045.webp', '/images/experiencias/passeios/_DSC7046.webp'],
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price;

-- ─── SEED DATA: Governança Inicial ──────────────────────────
INSERT INTO public.housekeeping (room_id, status, housekeeper_name, notes) VALUES
('room-001', 'clean', 'Dona Maria', 'Toalhas e amenidades repostas'),
('room-002', 'cleaning', 'Raimundo', 'Higienização e troca de roupa de cama'),
('room-003', 'dirty', 'Dona Maria', 'Check-out realizado. Limpeza pendente'),
('room-004', 'inspected', 'Cleide', 'Revisado pela governanta. Pronto para check-in')
ON CONFLICT (room_id) DO UPDATE SET status = EXCLUDED.status;

-- ─── SEED DATA: Cupons de Desconto ──────────────────────────
INSERT INTO public.coupons (id, code, discount_type, discount_value, min_spend, expires_at, is_active) VALUES
('cpn-001', 'ANAUENATUREZA', 'percentage', 10.00, 500.00, '2026-12-31T23:59:59Z', true),
('cpn-002', 'AMAZONIA100', 'fixed', 100.00, 800.00, '2026-09-30T23:59:59Z', true),
('cpn-003', 'BEMVINDO15', 'percentage', 15.00, 0.00, '2026-12-31T23:59:59Z', true),
('cpn-004', 'PROMO2025', 'fixed', 50.00, 300.00, '2025-12-31T23:59:59Z', false)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  is_active = EXCLUDED.is_active;
