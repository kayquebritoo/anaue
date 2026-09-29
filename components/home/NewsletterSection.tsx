'use client';

// ============================================================
// components/home/NewsletterSection.tsx
// Seção de Newsletter + WhatsApp — antes do rodapé
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Mail, Check, Loader2, MessageCircle, Leaf, Bell } from 'lucide-react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Informe um e-mail válido.');
      return;
    }
    setError('');
    setStatus('loading');
    // Simula requisição
    await new Promise((r) => setTimeout(r, 1200));
    setStatus('success');
  };

  return (
    <section
      aria-label="Newsletter e WhatsApp"
      className="relative overflow-hidden mx-5 md:mx-8 xl:mx-auto max-w-7xl mb-16 md:mb-24 rounded-4xl"
    >
      {/* ── Imagem de Fundo ── */}
      <div className="absolute inset-0">
        <Image
          src="/images/area-externa/_DSC7477.webp"
          alt="Área externa do Anauê Amazônia"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Overlay escuro para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950/92 via-forest-950/80 to-forest-900/85" />
      </div>

      {/* ── Conteúdo ── */}
      <div className="relative z-10 px-6 py-14 md:px-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          {/* Ícone decorativo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-3xl glass-gold flex items-center justify-center shadow-lg shadow-gold-400/10">
              <Leaf className="w-8 h-8 text-gold-400" />
            </div>
          </div>

          {/* Títulos */}
          <div className="text-center mb-10">
            <p className="text-gold-400/80 text-xs uppercase tracking-widest font-semibold mb-3">
              Fique por dentro
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Receba novidades &amp; promoções exclusivas
            </h2>
            <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-md mx-auto">
              Seja o primeiro a saber sobre novas experiências, pacotes de temporada
              e ofertas especiais do Anauê Amazônia.
            </p>
          </div>

          {/* ── Grid: Newsletter + WhatsApp ── */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Card Newsletter */}
            <div className="glass rounded-3xl p-6 border border-white/10">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-forest-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Newsletter</h3>
                  <p className="text-white/40 text-xs">Promoções no seu e-mail</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-4 gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-forest-500/20 border border-forest-500/30 flex items-center justify-center">
                      <Check className="w-6 h-6 text-forest-400" />
                    </div>
                    <p className="text-white/80 text-sm font-medium text-center">
                      Inscrição confirmada!<br />
                      <span className="text-white/40 font-normal">Fique de olho no seu e-mail.</span>
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3"
                  >
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        id="newsletter-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="seu@email.com.br"
                        className="w-full bg-white/8 border border-white/12 rounded-xl pl-10 pr-4 py-3
                          text-white text-sm placeholder-white/30 focus:outline-none
                          focus:border-forest-500/50 focus:bg-white/10 transition-colors"
                        aria-describedby={error ? 'newsletter-error' : undefined}
                      />
                    </div>
                    {error && (
                      <p id="newsletter-error" className="text-red-400 text-xs">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="flex items-center justify-center gap-2 bg-forest-500 hover:bg-forest-400
                        disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl
                        transition-colors text-sm"
                    >
                      {status === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      {status === 'loading' ? 'Aguarde...' : 'Assinar Newsletter'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Card WhatsApp */}
            <div className="glass rounded-3xl p-6 border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Canal do WhatsApp</h3>
                  <p className="text-white/40 text-xs">Promoções em primeira mão</p>
                </div>
              </div>

              <p className="text-white/55 text-xs leading-relaxed mb-5">
                Entre para nosso canal exclusivo e receba ofertas relâmpago, disponibilidades de última hora e conteúdo da vida na floresta amazônica.
              </p>

              <div className="flex flex-col gap-2">
                <a
                  id="btn-whatsapp-canal"
                  href="https://wa.me/559200000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400
                    text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm shadow-lg
                    shadow-emerald-900/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  Entrar no Canal
                </a>
                <p className="text-white/25 text-[10px] text-center">
                  Somente promoções. Sem spam.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
