'use client';

// ============================================================
// components/home/ExperiencesCarousel.tsx
// Carrossel de Experiências — Cards verticais com foto de fundo
// ============================================================

import { useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Users, Sparkles } from 'lucide-react';
import type { Experience } from '@/types';

interface ExperiencesCarouselProps {
  experiences: Experience[];
  title?: string;
  subtitle?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  'bem-estar': 'Bem-estar',
  aventura: 'Aventura',
  gastronomia: 'Gastronomia',
  logistica: 'Logística',
};

const CATEGORY_COLOR: Record<string, string> = {
  'bem-estar': 'text-gold-400 bg-gold-400/15 border-gold-400/30',
  aventura: 'text-forest-400 bg-forest-400/15 border-forest-400/30',
  gastronomia: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
  logistica: 'text-blue-400 bg-blue-400/15 border-blue-400/30',
};

function ExperienceCard({ experience }: { experience: Experience }) {
  const formatPrice = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="relative flex-none w-[270px] md:w-[300px] h-[400px] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl shadow-black/40"
    >
      {/* ── Imagem de Fundo ── */}
      <Image
        src={experience.imageUrl}
        alt={experience.name}
        fill
        sizes="300px"
        className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
      />

      {/* ── Gradiente sobre a foto ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* ── Badge de Categoria ── */}
      <div className="absolute top-4 left-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm ${CATEGORY_COLOR[experience.category] || CATEGORY_COLOR['bem-estar']}`}>
          {CATEGORY_LABEL[experience.category] || experience.category}
        </span>
      </div>

      {/* ── Badge Popular ── */}
      {experience.isPopular && (
        <div className="absolute top-4 right-4">
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gold-400/20 border border-gold-400/40 text-gold-300 backdrop-blur-sm">
            <Sparkles className="w-3 h-3" />
            Popular
          </span>
        </div>
      )}

      {/* ── Conteúdo Inferior ── */}
      <div className="absolute bottom-0 inset-x-0 p-5 flex flex-col gap-3">
        <div>
          <h3 className="font-serif text-xl font-bold text-white leading-tight mb-1">
            {experience.name}
          </h3>
          <p className="text-white/60 text-xs leading-relaxed line-clamp-2">
            {experience.shortDescription}
          </p>
        </div>

        {/* Metadados */}
        <div className="flex items-center gap-3 text-white/50 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {experience.duration}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {experience.priceType === 'per_person' ? 'por pessoa' : 'por grupo'}
          </span>
        </div>

        {/* Preço + Botão */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-white/40 text-[10px] uppercase tracking-wide">A partir de</span>
            <p className="font-bold text-xl text-white">
              {formatPrice(experience.price)}
            </p>
          </div>
          <Link
            href={`/reserva/checkout?experienceId=${experience.id}`}
            id={`btn-reservar-experiencia-${experience.id}`}
            className="flex items-center gap-1.5 bg-forest-500 hover:bg-forest-400 text-white
              text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-forest-900/40
              transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Reservar
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export function ExperiencesCarousel({
  experiences,
  title = 'Experiências & Rituais',
  subtitle = 'Bem-estar, aventura e saberes ancestrais da Amazônia',
}: ExperiencesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  if (!experiences.length) return null;

  return (
    <section className="py-12 md:py-20" aria-label="Carrossel de Experiências">
      {/* ── Cabeçalho ── */}
      <div className="px-5 md:px-8 max-w-7xl mx-auto mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-gold-400/80 text-xs uppercase tracking-widest font-semibold mb-2">
            O Sítio Anauê
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-white">
            {title}
          </h2>
          <p className="text-white/40 text-sm mt-1.5 leading-relaxed max-w-md">
            {subtitle}
          </p>
        </div>

        {/* Controles desktop */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            onClick={() => scroll('left')}
            className="w-10 h-10 rounded-full glass hover:bg-white/10 flex items-center justify-center
              text-white/60 hover:text-white transition-colors"
            aria-label="Rolagem para esquerda"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-10 h-10 rounded-full glass hover:bg-white/10 flex items-center justify-center
              text-white/60 hover:text-white transition-colors"
            aria-label="Rolagem para direita"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Track do Carrossel ── */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-5 md:px-8 pb-4 snap-x snap-mandatory"
      >
        {experiences.map((exp, i) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="snap-start"
          >
            <ExperienceCard experience={exp} />
          </motion.div>
        ))}

        {/* Spacer final */}
        <div className="flex-none w-1 md:w-4" aria-hidden="true" />
      </div>
    </section>
  );
}
