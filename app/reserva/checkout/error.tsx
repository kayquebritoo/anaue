'use client';

// ============================================================
// app/reserva/checkout/error.tsx
// Error Boundary da página de Checkout
// ============================================================

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CheckoutError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[CheckoutError]', error);
  }, [error]);

  return (
    <div className="min-h-screen gradient-amazon flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass-dark rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-400/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-white">
            Algo deu errado
          </h2>
          <p className="text-white/55 text-sm leading-relaxed">
            Não conseguimos carregar a página de checkout. Por favor, tente novamente.
          </p>
          {error.digest && (
            <p className="text-white/25 text-xs font-mono">
              Ref: {error.digest}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-forest-500 hover:bg-forest-400 text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl glass border border-white/10 hover:border-white/25 text-white text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Início
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
