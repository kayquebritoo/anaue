'use client';

// ============================================================
// components/ui/Badge.tsx
// Chip/badge de categoria, status e tags
// ============================================================

import { type ReactNode } from 'react';

type BadgeVariant = 'forest' | 'gold' | 'agua' | 'ghost';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  forest: 'bg-forest-500/20 text-forest-300 border border-forest-500/30',
  gold: 'bg-gold-400/15 text-gold-300 border border-gold-400/30',
  agua: 'bg-agua-600/20 text-agua-300 border border-agua-500/30',
  ghost: 'bg-white/10 text-white/80 border border-white/15',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3.5 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'ghost',
  size = 'sm',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        backdrop-blur-sm tracking-wide
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
