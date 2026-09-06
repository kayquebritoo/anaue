'use client';

// ============================================================
// components/home/RoomCarousel.tsx
// Carrossel horizontal com scroll snap e header animado
// ============================================================

import { motion, type Variants } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { RoomCard } from './RoomCard';
import type { Room } from '@/types';

interface RoomCarouselProps {
  rooms: Room[];
  title?: string;
  subtitle?: string;
}

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const headerFade: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

export function RoomCarousel({
  rooms,
  title = 'Acomodações em Destaque',
  subtitle = 'Experiências únicas no coração da Amazônia',
}: RoomCarouselProps) {
  if (!rooms.length) return null;

  return (
    <section className="w-full py-16 md:py-24">
      {/* ── Header ── */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="px-5 md:px-8 max-w-7xl mx-auto mb-8 md:mb-12"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <motion.div variants={headerFade} className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className="text-gold-400/80 text-xs uppercase tracking-widest font-semibold">
                Destaque
              </span>
            </motion.div>

            <motion.h2
              variants={headerFade}
              className="font-serif text-3xl md:text-4xl font-bold text-white leading-tight"
            >
              {title}
            </motion.h2>

            <motion.p
              variants={headerFade}
              className="text-white/45 text-base mt-2"
            >
              {subtitle}
            </motion.p>
          </div>

          <motion.div variants={headerFade} className="shrink-0 hidden md:block">
            <Link
              href="/acomodacoes"
              className="flex items-center gap-2 text-forest-400 hover:text-forest-300
                font-semibold text-sm transition-colors group"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Carrossel ── */}
      <div
        className="flex gap-4 overflow-x-auto scrollbar-hide
          px-5 md:px-8 pb-4
          snap-x snap-mandatory"
      >
        {rooms.map((room, index) => (
          <div key={room.id} className="snap-start">
            <RoomCard room={room} index={index} />
          </div>
        ))}

        {/* Card CTA final */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: rooms.length * 0.08 }}
          className="shrink-0 w-72 md:w-80 snap-start"
        >
          <Link href="/acomodacoes">
            <motion.div
              whileHover={{ scale: 1.025 }}
              className="glass rounded-3xl h-full min-h-[380px] flex flex-col items-center
                justify-center gap-5 p-8 text-center border-dashed
                hover:border-forest-500/40 transition-colors"
            >
              <div className="w-16 h-16 rounded-full glass-gold flex items-center justify-center">
                <ArrowRight className="w-7 h-7 text-gold-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg font-serif mb-1">
                  Ver todas as acomodações
                </p>
                <p className="text-white/40 text-sm">
                  {rooms.length}+ opções disponíveis
                </p>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </div>

      {/* Link mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex justify-center mt-6 md:hidden px-5"
      >
        <Link
          href="/acomodacoes"
          className="flex items-center gap-2 glass rounded-full px-6 py-3
            text-forest-400 font-semibold text-sm"
        >
          <span>Ver todas as acomodações</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </section>
  );
}
