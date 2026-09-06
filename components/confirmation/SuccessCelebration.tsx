'use client';

// ============================================================
// components/confirmation/SuccessCelebration.tsx
// Animação de entrada com ícone de sucesso e partículas decorativas
// ============================================================

import { motion } from 'framer-motion';
import { CheckCircle2, Leaf, Star, Sparkles } from 'lucide-react';

const PARTICLES = [
  { x: -80, y: -60, rotate: 15, delay: 0.3, scale: 0.8 },
  { x: 80,  y: -70, rotate: -20, delay: 0.4, scale: 0.7 },
  { x: -100, y: 20, rotate: 30, delay: 0.5, scale: 0.6 },
  { x: 100,  y: 30, rotate: -10, delay: 0.35, scale: 0.9 },
  { x: -60,  y: 80, rotate: -25, delay: 0.45, scale: 0.7 },
  { x: 70,   y: 75, rotate: 20, delay: 0.55, scale: 0.6 },
];

const PARTICLE_ICONS = [Leaf, Star, Sparkles, Leaf, Star, Sparkles];

export function SuccessCelebration() {
  return (
    <div className="flex flex-col items-center text-center space-y-5 py-4">
      {/* Ícone central com partículas orbitais */}
      <div className="relative flex items-center justify-center w-32 h-32">
        {/* Partículas */}
        {PARTICLES.map((p, i) => {
          const Icon = PARTICLE_ICONS[i];
          return (
            <motion.div
              key={i}
              className="absolute text-forest-400/70"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 0.7],
                x: p.x,
                y: p.y,
                scale: p.scale,
                rotate: p.rotate,
              }}
              transition={{
                duration: 0.7,
                delay: p.delay,
                ease: 'easeOut',
              }}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
          );
        })}

        {/* Anel externo pulsante */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-forest-400/30"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />

        {/* Anel interno */}
        <motion.div
          className="absolute inset-3 rounded-full bg-forest-500/10 border border-forest-400/20"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: 'backOut' }}
        />

        {/* Ícone Check */}
        <motion.div
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'backOut' }}
        >
          <CheckCircle2 className="w-16 h-16 text-forest-400" strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* Título principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="space-y-2"
      >
        <div className="inline-flex items-center gap-2 glass-gold rounded-full px-4 py-1 text-xs text-gold-300 font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Reserva Confirmada com Sucesso
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
          Sua jornada na Amazônia
          <br />
          <span className="text-gradient-forest">começa aqui!</span>
        </h1>

        <p className="text-white/60 text-sm sm:text-base max-w-sm mx-auto leading-relaxed font-light">
          Prepare-se para uma experiência única. Você receberá todas as instruções de chegada no seu e-mail em instantes.
        </p>
      </motion.div>
    </div>
  );
}
