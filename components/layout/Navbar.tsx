'use client';

// ============================================================
// components/layout/Navbar.tsx
// Barra de Navegação Superior — Logo real + links desktop
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Sparkles } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Início' },
  { href: '/acomodacoes', label: 'Acomodações' },
  { href: '/busca', label: 'Buscar Datas' },
];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fecha menu ao mudar de rota
  useEffect(() => { setIsOpen(false); }, [pathname]);

  // Não renderizar a Navbar pública no painel administrativo (/admin)
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-dark shadow-xl shadow-black/30 border-b border-white/8'
            : 'bg-transparent'
        }`}
        aria-label="Navegação principal"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 md:h-18 flex items-center justify-between gap-4">
          {/* ── Logo ── */}
          <Link href="/" aria-label="Anauê Amazônia — Início" className="flex items-center shrink-0">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="relative h-9 w-40 md:h-10 md:w-48"
            >
              <Image
                src="/images/logo/logo-branca.svg"
                alt="Anauê Amazônia"
                fill
                sizes="(max-width: 768px) 160px, 192px"
                className="object-contain object-left"
                priority
              />
            </motion.div>
          </Link>

          {/* ── Links Desktop ── */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Links principais">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-forest-400'
                      : 'text-white/65 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="navbar-active"
                      className="absolute inset-0 rounded-full bg-forest-500/15 border border-forest-500/25"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── CTA Desktop ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/busca"
              className="flex items-center gap-2 bg-forest-500 hover:bg-forest-400 text-white
                text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-forest-900/40
                transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Reservar
            </Link>
          </div>

          {/* ── Botão Menu Mobile ── */}
          <motion.button
            className="md:hidden w-10 h-10 rounded-full glass flex items-center justify-center
              text-white/80 hover:text-white transition-colors"
            onClick={() => setIsOpen((prev) => !prev)}
            whileTap={{ scale: 0.92 }}
            aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </motion.header>

      {/* ── Menu Mobile Dropdown ── */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed top-16 inset-x-0 z-40 px-4 pb-4 md:hidden"
        >
          <div className="glass-dark rounded-3xl p-4 shadow-2xl shadow-black/50 border border-white/10">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-forest-500/20 text-forest-400 border border-forest-500/25'
                        : 'text-white/70 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/busca"
                className="mt-2 flex items-center justify-center gap-2 bg-forest-500
                  hover:bg-forest-400 text-white text-sm font-semibold px-5 py-3 rounded-2xl
                  transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Fazer uma Reserva
              </Link>
            </nav>
          </div>
        </motion.div>
      )}
    </>
  );
}
