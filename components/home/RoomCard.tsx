'use client';

// ============================================================
// components/home/RoomCard.tsx
// Card individual do carrossel — glassmorphism + Framer Motion
// ============================================================

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, BedDouble } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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

interface RoomCardProps {
  room: Room;
  index: number;
}

export function RoomCard({ room, index }: RoomCardProps) {
  const primaryImage = room.images.find((img) => img.isPrimary) ?? room.images[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="shrink-0 w-72 md:w-80"
    >
      <Link href={`/acomodacoes/${room.slug}`} className="block group">
        <motion.div
          className="relative glass-dark rounded-3xl overflow-hidden shadow-xl shadow-black/40"
          whileHover={{
            scale: 1.025,
            transition: { duration: 0.3, ease: 'easeOut' },
          }}
          layoutId={`room-card-${room.id}`}
        >
          {/* ── Imagem ── */}
          <div className="relative h-52 overflow-hidden">
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt}
              fill
              sizes="(max-width: 768px) 288px, 320px"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />

            {/* Overlay gradiente na imagem */}
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-transparent to-transparent" />

            {/* Badge categoria */}
            <div className="absolute top-3 left-3">
              <Badge variant={CATEGORY_VARIANT[room.category]} size="sm">
                {TYPE_LABEL[room.type]}
              </Badge>
            </div>

            {/* Indicador disponibilidade */}
            <div className="absolute top-3 right-3">
              {room.isAvailable ? (
                <div className="flex items-center gap-1.5 bg-forest-950/70 backdrop-blur-sm
                  rounded-full px-2.5 py-1 border border-forest-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-400 pulse-available" />
                  <span className="text-forest-300 text-xs font-medium">Disponível</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-forest-950/70 backdrop-blur-sm
                  rounded-full px-2.5 py-1 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  <span className="text-white/40 text-xs font-medium">Indisponível</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Conteúdo ── */}
          <div className="p-5">
            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
              <span className="text-gold-400 text-sm font-semibold">{room.rating}</span>
              <span className="text-white/30 text-xs">({room.reviewCount})</span>
            </div>

            {/* Nome */}
            <h3 className="font-serif text-white text-xl font-bold leading-tight mb-1.5">
              {room.name}
            </h3>

            {/* Descrição curta */}
            <p className="text-white/50 text-xs leading-relaxed line-clamp-2 mb-4">
              {room.shortDescription}
            </p>

            {/* Capacidade */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5 text-white/50 text-xs">
                <Users className="w-3.5 h-3.5" />
                <span>até {room.maxGuests}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/50 text-xs">
                <BedDouble className="w-3.5 h-3.5" />
                <span>
                  {room.bedrooms} {room.bedrooms === 1 ? 'quarto' : 'quartos'}
                </span>
              </div>
              <div className="text-white/50 text-xs">
                {room.areaM2}m²
              </div>
            </div>

            {/* Preço + CTA */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/40 text-xs leading-none mb-0.5">a partir de</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-gradient-gold font-bold text-2xl font-serif">
                    {formatPrice(room.pricePerNight)}
                  </span>
                  <span className="text-white/40 text-xs">/noite</span>
                </div>
              </div>

              <motion.div
                whileHover={{ x: 3 }}
                className="flex items-center gap-1.5 text-forest-400 text-sm font-semibold"
              >
                <span>Ver mais</span>
                <span>→</span>
              </motion.div>
            </div>
          </div>

          {/* Shimmer hover overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer" />
        </motion.div>
      </Link>
    </motion.div>
  );
}
