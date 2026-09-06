// ============================================================
// app/page.tsx
// Home Page — Server Component
// Sprint 4: ExperiencesCarousel + FaqSection + NewsletterSection
// ============================================================

import { HeroSection } from '@/components/home/HeroSection';
import { SearchBar } from '@/components/home/SearchBar';
import { RoomCarousel } from '@/components/home/RoomCarousel';
import { ExperiencesCarousel } from '@/components/home/ExperiencesCarousel';
import { FaqSection } from '@/components/home/FaqSection';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { BottomNav } from '@/components/layout/BottomNav';
import { getFeaturedRoomsAsync, getExperiencesAsync } from '@/lib/supabaseData';
import { Leaf, TreePine, Waves, ShieldCheck } from 'lucide-react';

const FEATURES = [
  {
    icon: Leaf,
    title: 'Ecoturismo Certificado',
    description: 'Operação 100% sustentável com selo de turismo responsável.',
  },
  {
    icon: TreePine,
    title: 'Floresta Primária',
    description: 'Localizado no coração de 200 hectares de floresta intocada.',
  },
  {
    icon: Waves,
    title: 'Rio Negro',
    description: 'Acesso direto ao Rio Negro para banho e expedições de barco.',
  },
  {
    icon: ShieldCheck,
    title: 'Reserva Segura',
    description: 'Cancelamento gratuito até 48h antes. Pagamento protegido.',
  },
];

export default async function HomePage() {
  // Dados buscados no servidor via Supabase
  const [featuredRooms, experiences] = await Promise.all([
    getFeaturedRoomsAsync(),
    getExperiencesAsync(),
  ]);

  return (
    <main className="min-h-screen gradient-amazon">
      {/* ── Hero Section com SearchBar embutida ── */}
      {/* pt-16 compensa a Navbar fixa */}
      <div className="pt-16 relative z-20">
        <HeroSection searchBar={<SearchBar />} />
      </div>

      {/* ── Features / Diferenciais ── */}
      <section className="px-5 md:px-8 max-w-7xl mx-auto py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="glass rounded-3xl p-5 md:p-6 flex flex-col gap-3
                  hover:border-forest-500/25 transition-colors group"
              >
                <div className="w-10 h-10 rounded-2xl glass-gold flex items-center justify-center
                  group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1 leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-white/40 text-xs leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Carrossel de Quartos em Destaque ── */}
      <RoomCarousel
        rooms={featuredRooms}
        title="Acomodações em Destaque"
        subtitle="Bangalôs, chalés e suítes no coração da floresta"
      />

      {/* ── Carrossel de Experiências ── */}
      <ExperiencesCarousel experiences={experiences} />

      {/* ── Banner imersivo ── */}
      <section className="relative overflow-hidden mx-5 md:mx-8 max-w-7xl md:mx-auto mb-16 md:mb-24 rounded-4xl">
        <div className="glass rounded-4xl p-8 md:p-16 text-center relative overflow-hidden">
          {/* Decoração de fundo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full
              bg-forest-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full
              bg-gold-400/8 blur-3xl" />
          </div>

          <div className="relative z-10">
            <p className="text-gold-400/80 text-sm uppercase tracking-widest font-semibold mb-4">
              Uma experiência única
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              A Amazônia espera por você
            </h2>
            <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Desperte para o canto dos pássaros, mergulhe no rio de águas negras
              e viva dias que você jamais esquecerá.
            </p>
            <a
              href="/acomodacoes"
              className="inline-flex items-center gap-2.5 bg-forest-500 hover:bg-forest-400
                text-white font-semibold px-8 py-4 rounded-full
                shadow-lg shadow-forest-900/50 transition-colors
                text-base group"
            >
              <span>Explorar acomodações</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── Newsletter + WhatsApp ── */}
      <NewsletterSection />

      {/* ── Floating Bottom Nav (mobile) ── */}
      <BottomNav />

      {/* Espaço para bottom nav no mobile */}
      <div className="h-24 md:h-0" />
    </main>
  );
}
