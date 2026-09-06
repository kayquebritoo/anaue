'use client';

// ============================================================
// components/checkout/AnimatedTotal.tsx
// Animação numérica do valor total ao adicionar/remover add-ons
// ============================================================

import { useEffect, useRef, useState } from 'react';

interface AnimatedTotalProps {
  value: number;
  duration?: number; // ms
  className?: string;
  prefix?: string;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function AnimatedTotal({
  value,
  duration = 500,
  className = '',
  prefix = '',
}: AnimatedTotalProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;

    if (from === to) return;

    // Cancela animação anterior se existir
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    startTimeRef.current = null;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      setDisplayValue(from + (to - from) * easedProgress);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
        setDisplayValue(to);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {formatBRL(displayValue)}
    </span>
  );
}
