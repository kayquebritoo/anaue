'use client';

// ============================================================
// components/admin/MetricCard.tsx
// Card de Métrica com Contador Animado & Glassmorphism
// ============================================================

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'forest' | 'gold' | 'agua' | 'amber';
  progress?: number; // 0-100 para barra de progresso opcional
}

export function MetricCard({
  title,
  value,
  prefix = '',
  suffix = '',
  subtitle,
  icon: Icon,
  color = 'forest',
  progress,
}: MetricCardProps) {
  // Animação de contagem com spring
  const springValue = useSpring(0, { stiffness: 60, damping: 20 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
  }, [springValue]);

  // Variações de cor
  const colorMap = {
    forest: {
      bgIcon: 'bg-forest-500/20 text-forest-400 border-forest-500/30',
      progress: 'from-forest-500 to-forest-400',
      border: 'hover:border-forest-500/40',
      glow: 'group-hover:shadow-forest-900/20',
    },
    gold: {
      bgIcon: 'bg-gold-500/20 text-gold-400 border-gold-500/30',
      progress: 'from-gold-500 to-gold-400',
      border: 'hover:border-gold-500/40',
      glow: 'group-hover:shadow-gold-900/20',
    },
    agua: {
      bgIcon: 'bg-agua-500/20 text-agua-400 border-agua-500/30',
      progress: 'from-agua-500 to-agua-400',
      border: 'hover:border-agua-500/40',
      glow: 'group-hover:shadow-agua-900/20',
    },
    amber: {
      bgIcon: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      progress: 'from-amber-500 to-amber-400',
      border: 'hover:border-amber-500/40',
      glow: 'group-hover:shadow-amber-900/20',
    },
  };

  const currentTheme = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
      className={`relative glass-dark rounded-3xl p-5 md:p-6 border border-white/10 ${currentTheme.border} transition-all duration-300 shadow-xl group overflow-hidden`}
    >
      {/* Luz ambiente suave de fundo */}
      <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-white/3 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {title}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            {prefix && (
              <span className="text-lg sm:text-xl font-medium text-white/60">{prefix}</span>
            )}
            <span className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
              {displayValue.toLocaleString('pt-BR')}
            </span>
            {suffix && (
              <span className="text-sm sm:text-base font-semibold text-white/70">{suffix}</span>
            )}
          </div>
        </div>

        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${currentTheme.bgIcon} transition-transform group-hover:scale-110 shadow-md`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Barra de Progresso Opcional */}
      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="h-2 w-full bg-white/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${currentTheme.progress} rounded-full`}
            />
          </div>
        </div>
      )}

      {subtitle && (
        <p className="text-[11px] sm:text-xs text-white/45 mt-2.5 leading-tight flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-400/80" />
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
