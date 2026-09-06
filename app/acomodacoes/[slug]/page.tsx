// ============================================================
// app/acomodacoes/[slug]/page.tsx
// Página de Detalhes da Acomodação — Server Component
// Sprint 4: RoomGallery (lightbox) + VideoSection condicionais
// ============================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRoomBySlugAsync, getRoomsAsync } from '@/lib/supabaseData';
import { RoomHeroGallery } from '@/components/room/RoomHeroGallery';
import { RoomGallery } from '@/components/room/RoomGallery';
import { VideoSection } from '@/components/room/VideoSection';
import { RoomAmenities } from '@/components/room/RoomAmenities';
import { RoomBookingWidget } from '@/components/room/RoomBookingWidget';
import { StickyBookingBar } from '@/components/room/StickyBookingBar';
import { Badge } from '@/components/ui/Badge';
import { Star, Users, BedDouble, Bath, Maximize2, Shield, Trees, MapPin } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
}

export async function generateStaticParams() {
  const rooms = await getRoomsAsync();
  return rooms.map((room) => ({
    slug: room.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlugAsync(slug);

  if (!room) {
    return {
      title: 'Acomodação Não Encontrada — Anauê Amazônia',
    };
  }

  return {
    title: `${room.name} — Anauê Amazônia`,
    description: room.shortDescription,
    openGraph: {
      title: `${room.name} — Anauê Amazônia`,
      description: room.shortDescription,
      images: room.images.map((img) => img.url),
    },
  };
}

const TYPE_LABEL: Record<string, string> = {
  bangalo: 'Bangalô Ecológico',
  suite: 'Suíte Panorâmica',
  chale: 'Chalé na Floresta',
  'casa-arvore': 'Casa na Árvore de Luxo',
};

export default async function RoomDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const room = await getRoomBySlugAsync(slug);

  if (!room) {
    notFound();
  }

  // Datas/hóspedes selecionados na Home/Busca (propagados via query params)
  const { checkIn, checkOut, guests: guestsParam } = await searchParams;
  const guests = guestsParam ? parseInt(guestsParam, 10) : null;

  const hasGallery = room.gallery_images && room.gallery_images.length > 0;
  const hasVideo = Boolean(room.video_url);

  return (
    <div className="min-h-screen bg-forest-950 text-white pb-32 pt-16">
      {/* ── Galeria Edge-to-Edge com Transição Framer Motion ── */}
      <RoomHeroGallery room={room} />

      {/* ── Galeria de Imagens Adicional (condicional) ── */}
      {hasGallery && (
        <div className="mt-4">
          <RoomGallery
            images={room.gallery_images!}
            roomName={room.name}
          />
        </div>
      )}

      {/* ── Seção de Vídeo (condicional) ── */}
      {hasVideo && (
        <div className="mt-8">
          <VideoSection videoUrl={room.video_url!} roomName={room.name} />
        </div>
      )}

      {/* ── Conteúdo Principal ── */}
      <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-8 space-y-8">
        {/* Cabeçalho e Classificação */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="forest" size="md">
              {TYPE_LABEL[room.type] || room.type}
            </Badge>
            <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
              <span className="font-semibold text-gold-400">{room.rating}</span>
              <span className="text-white/40">({room.reviewCount} avaliações)</span>
            </div>
            <div className="flex items-center gap-1 glass rounded-full px-3 py-1 text-xs text-white/60">
              <MapPin className="w-3 h-3 text-forest-400" />
              <span>Setor Rio Negro</span>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            {room.name}
          </h1>

          <p className="text-forest-200/80 text-base sm:text-lg leading-relaxed font-light">
            {room.shortDescription}
          </p>
        </div>

        {/* ── Especificações Rápidas (Grid) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <Users className="w-5 h-5 text-forest-400" />
            <span className="text-xs text-white/50">Capacidade</span>
            <span className="text-sm font-semibold text-white">Até {room.maxGuests} pessoas</span>
          </div>

          <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <BedDouble className="w-5 h-5 text-forest-400" />
            <span className="text-xs text-white/50">Quartos</span>
            <span className="text-sm font-semibold text-white">{room.bedrooms} {room.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
          </div>

          <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <Bath className="w-5 h-5 text-forest-400" />
            <span className="text-xs text-white/50">Banheiros</span>
            <span className="text-sm font-semibold text-white">{room.bathrooms} privativo(s)</span>
          </div>

          <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <Maximize2 className="w-5 h-5 text-forest-400" />
            <span className="text-xs text-white/50">Área Total</span>
            <span className="text-sm font-semibold text-white">{room.areaM2} m²</span>
          </div>
        </div>

        {/* ── Sobre a Experiência (Descrição Longa) ── */}
        <div className="glass-dark rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
            <Trees className="w-5 h-5 text-forest-400" />
            Sobre esta Acomodação
          </h2>
          <p className="text-white/70 text-base leading-relaxed whitespace-pre-line">
            {room.longDescription}
          </p>
        </div>

        {/* ── Comodidades (Amenities) ── */}
        <RoomAmenities amenities={room.amenities} />

        {/* ── Widget de Reserva (Desktop) ── */}
        <div className="hidden lg:block">
          <h2 className="font-serif text-2xl font-bold text-white mb-4">
            Faça sua Reserva
          </h2>
          <RoomBookingWidget
            room={room}
            initialCheckIn={checkIn}
            initialCheckOut={checkOut}
            initialGuests={guests}
          />
        </div>

        {/* ── Experiência Sustentável & Políticas ── */}
        <div className="glass rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold-400" />
            Compromisso Anauê de Sustentabilidade
          </h3>
          <ul className="space-y-2.5 text-sm text-white/65">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-400 mt-2 shrink-0" />
              <span>Energia 100% solar com gerador silencioso de emergência.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-400 mt-2 shrink-0" />
              <span>Tratamento ecológico de efluentes sem impacto aos rios e igarapés.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-400 mt-2 shrink-0" />
              <span>Check-in a partir das 14h | Check-out até às 11h.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Sticky Booking Bar ── */}
      <StickyBookingBar
        room={room}
        checkIn={checkIn ?? null}
        checkOut={checkOut ?? null}
        guests={guests}
      />
    </div>
  );
}
