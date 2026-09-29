'use client';

// ============================================================
// components/home/HeroSection.tsx
// Hero Imersivo com Slider de Imagens de Fundo Rotativo (6s)
// Permite que o DatePicker/Dropdown transborde livremente sem ser cortado
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Star } from 'lucide-react';

const HERO_IMAGES = [
  '/images/hero/destaque1.webp',
  '/images/hero/destaque2.webp',
  '/images/hero/destaque3.webp',
  '/images/hero/destaque4.webp',
  '/images/hero/destaque5.webp',
  '/images/hero/destaque6.webp',
  '/images/hero/destaque7.webp',
  '/images/hero/destaque8.webp',
];

// Variantes de animação
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18, delayChildren: 0.3 },
  },
};

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: EASE_OUT },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1, ease: 'easeOut' },
  },
};

interface HeroSectionProps {
  searchBar?: React.ReactNode;
}

export function HeroSection({ searchBar }: HeroSectionProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Alterna o background a cada 6 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  return (
    // min-h (não h fixo): o conteúdo cresce em telas pequenas sem ser cortado.
    // 100svh: altura estável com a barra do navegador mobile.
    // justify-center: conteúdo centralizado verticalmente (mobile + desktop).
    // overflow-x-clip: o slider de fundo já se contém sozinho; aqui não
    // podemos usar overflow-hidden pois ele guilhotinaria os dropdowns
    // do SearchBar que transbordam para baixo.
    <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-x-clip">
      {/* ── Slider de Fundo com Transição Cruzada (Overflow contido apenas no fundo) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={HERO_IMAGES[currentImageIndex]}
              alt="Anauê Amazônia — Refúgio Ecológico no Rio Negro"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Overlay gradiente ── */}
      <div className="absolute inset-0 z-10 hero-overlay pointer-events-none" />

      {/* ── Partículas decorativas ── */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold-300/60"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 15}%`,
            }}
            animate={{
              y: [0, -18, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* ── Conteúdo principal centralizado (respiro p/ navbar fixa e base) ── */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-5 sm:px-8 pt-24 pb-16 md:pt-28 md:pb-20 my-auto flex flex-col items-center text-center gap-5 md:gap-6">
        {/* Localização */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2"
        >
          <div className="glass rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/10">
            <MapPin className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-white/80 text-xs tracking-widest uppercase font-medium">
              Amazônia, Brasil
            </span>
          </div>
        </motion.div>

        {/* Título principal */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-1"
        >
          <motion.p
            variants={fadeUp}
            className="font-serif text-gold-300/90 text-lg md:text-xl italic tracking-wide"
          >
            Bem-vindo ao
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight text-balance"
          >
            <span className="text-gradient-gold">Anauê</span>
            <br />
            <span className="text-white">Amazônia</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-white/65 text-base md:text-lg max-w-lg mt-2 leading-relaxed text-balance"
          >
            Um refúgio ecológico de luxo no coração da floresta.
            <br className="hidden md:block" />
            Natureza, silêncio e experiências que transformam.
          </motion.p>
        </motion.div>

        {/* Rating badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.9 }}
        >
          <div className="glass rounded-full px-5 py-2 flex items-center gap-2.5 border border-white/10">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5 fill-gold-400 text-gold-400"
                />
              ))}
            </div>
            <span className="text-white/90 text-sm font-medium">4.9</span>
            <span className="w-px h-4 bg-white/20" />
            <span className="text-white/55 text-xs">547 avaliações</span>
          </div>
        </motion.div>

        {/* SearchBar slot com Z-index elevado */}
        <motion.div
          className="w-full relative z-30"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {searchBar}
        </motion.div>
      </div>

      {/* ── Seta de scroll (só desktop: no mobile polui e colide com a busca) ── */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden md:block"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-10 rounded-full border border-white/30 flex items-start justify-center pt-2">
          <motion.div
            className="w-1 h-2.5 rounded-full bg-white/60"
            animate={{ scaleY: [1, 0.4, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </section>
  );
}
