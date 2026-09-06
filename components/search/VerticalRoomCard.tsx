'use client';

// ============================================================
// components/search/VerticalRoomCard.tsx
// Card empilhado / horizontal para listagem vertical de busca
// ============================================================

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, BedDouble, ArrowRight, Sparkles, CalendarX } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { AmenityIcon } from '@/components/ui/AmenityIcon';
import { formatPrice } from '@/lib/mockData';
import type { Room } from '@/types';

const TYPE_LABEL: Record<Room['type'], string> = {
  bangalo: 'Bangalô',
  suite: 'Suíte',
  chale: 'Chalé',
  'casa-arvore': 'Casa na Árvore',
};

const CATEGORY_VARIANT: Record<Room['category'], 'forest' | 'gold' | 'agua' | 'ghost'> = {
  standard: 'ghost',
  superior: 'forest',
  deluxe: 'agua',
  premium: 'gold',
};

interface VerticalRoomCardProps {
  room: Room;
  index: number;
  /** Query string de datas/hóspedes carregada adiante (ex: "?checkIn=...&checkOut=...&guests=2") */
  queryString?: string;
  /** Disponibilidade calculada para o intervalo buscado (null = sem datas na busca) */
  availableForDates?: boolean | null;
}

export function VerticalRoomCard({
  room,
  index,
  queryString = '',
  availableForDates = null,
}: VerticalRoomCardProps) {
  const primaryImage = room.images.find((img) => img.isPrimary) ?? room.images[0];
  const isAvailable = availableForDates ?? room.isAvailable;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="w-full"
    >
      <Link href={`/acomodacoes/${room.slug}${queryString}`} className="block group">
        <motion.div
          layoutId={`room-card-${room.id}`}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
          className="glass-dark rounded-3xl overflow-hidden shadow-xl shadow-black/40 border border-white/10 flex flex-col md:flex-row hover:border-forest-500/30 transition-colors"
        >
          {/* ── Imagem ── */}
          <div className="relative h-56 sm:h-64 md:h-auto md:w-80 lg:w-96 shrink-0 overflow-hidden">
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt || room.name}
              fill
              sizes="(max-width: 768px) 100vw, 384px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent md:hidden" />

            {/* Badges superiores na imagem */}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge variant={CATEGORY_VARIANT[room.category]} size="sm">
                {TYPE_LABEL[room.type]}
              </Badge>
              {room.isFeatured && (
                <Badge variant="gold" size="sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Destaque
                </Badge>
              )}
            </div>

            {/* Indicador de Disponibilidade (dinâmico conforme o intervalo buscado) */}
            <div className="absolute top-3 right-3">
              {isAvailable ? (
                <div className="flex items-center gap-1.5 bg-forest-950/80 backdrop-blur-md rounded-full px-2.5 py-1 border border-forest-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-400 pulse-available" />
                  <span className="text-forest-300 text-xs font-medium">Disponível</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-forest-950/80 backdrop-blur-md rounded-full px-2.5 py-1 border border-red-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-red-300 text-xs font-medium">Indisponível</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Conteúdo Detalhado ── */}
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
            <div>
              {/* Rating & Local */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-gold-400 text-gold-400" />
                  <span className="text-gold-400 text-sm font-semibold">{room.rating}</span>
                  <span className="text-white/40 text-xs">({room.reviewCount} avaliações)</span>
                </div>
                <span className="text-xs text-white/40">{room.areaM2} m²</span>
              </div>

              {/* Título & Descrição */}
              <h3 className="font-serif text-white text-xl sm:text-2xl font-bold leading-tight group-hover:text-forest-300 transition-colors mb-2">
                {room.name}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed line-clamp-2 mb-4 font-light">
                {room.shortDescription}
              </p>

              {/* Capacidade & Amenidades Preview */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-forest-400" />
                  <span>Até {room.maxGuests} hóspedes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-forest-400" />
                  <span>{room.bedrooms} {room.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
                </div>
              </div>

              {/* Chips de Amenidades principais */}
              <div className="flex flex-wrap gap-2 mt-3">
                {room.amenities.slice(0, 3).map((amenity) => (
                  <div
                    key={amenity.id}
                    className="glass px-2.5 py-1 rounded-xl text-xs text-white/70 flex items-center gap-1.5 border border-white/5"
                  >
                    <AmenityIcon name={amenity.icon} className="w-3 h-3 text-gold-400" />
                    <span>{amenity.name}</span>
                  </div>
                ))}
                {room.amenities.length > 3 && (
                  <span className="text-xs text-white/40 self-center">
                    +{room.amenities.length - 3} mais
                  </span>
                )}
              </div>
            </div>

            {/* ── Preço e Botão ── */}
            <div className="pt-4 border-t border-white/10 flex items-end justify-between gap-4">
              <div>
                <p className="text-white/40 text-xs leading-none mb-1">A partir de</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-gradient-gold font-bold text-2xl sm:text-3xl font-serif">
                    {formatPrice(room.pricePerNight)}
                  </span>
                  <span className="text-white/40 text-xs">/noite</span>
                </div>
              </div>

              {isAvailable ? (
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-forest-500/20 group-hover:bg-forest-500 text-forest-300 group-hover:text-white font-semibold text-xs sm:text-sm border border-forest-500/30 transition-all">
                  <span>Ver Detalhes</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              ) : (
                <div
                  aria-disabled
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full glass text-white/40 font-medium text-xs sm:text-sm border border-white/10 cursor-not-allowed"
                >
                  <CalendarX className="w-4 h-4 text-red-400/70" />
                  <span>Indisponível no período</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
