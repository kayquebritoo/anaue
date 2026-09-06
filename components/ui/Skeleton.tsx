'use client';

// ============================================================
// components/ui/Skeleton.tsx
// Componente de Skeleton com shimmer animado
// ============================================================

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white/5 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent ${className}`}
      {...props}
    />
  );
}
