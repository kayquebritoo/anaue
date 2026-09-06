'use client';

// ============================================================
// components/ui/GlassCard.tsx
// Componente base de glassmorphism — 100% reutilizável
// ============================================================

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

type GlassVariant = 'default' | 'dark' | 'gold';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  variant?: GlassVariant;
  className?: string;
  hoverEffect?: boolean;
}

const variantClasses: Record<GlassVariant, string> = {
  default: 'glass',
  dark: 'glass-dark',
  gold: 'glass-gold',
};

export function GlassCard({
  children,
  variant = 'default',
  className = '',
  hoverEffect = true,
  ...motionProps
}: GlassCardProps) {
  return (
    <motion.div
      className={`
        rounded-3xl overflow-hidden
        ${variantClasses[variant]}
        ${hoverEffect ? 'cursor-pointer' : ''}
        ${className}
      `}
      whileHover={
        hoverEffect
          ? { scale: 1.02, transition: { duration: 0.25, ease: 'easeOut' } }
          : undefined
      }
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
