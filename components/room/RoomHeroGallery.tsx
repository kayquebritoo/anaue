'use client';

// ============================================================
// components/room/RoomHeroGallery.tsx
// Hero Edge-to-Edge com layoutId, botões flutuantes e galeria
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Share2, Check, Sparkles, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Room } from '@/types';

interface RoomHeroGalleryProps {
  room: Room;
}

export function RoomHeroGallery({ room }: RoomHeroGalleryProps) {
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const images = room.images && room.images.length > 0 ? room.images : [
    { url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80', alt: room.name, isPrimary: true }
  ];

  const currentImage = images[activeImageIndex] || images[0];

  const handleShare = async () => {
    if (typeof window === 'undefined') return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${room.name} — Anauê Amazônia`,
          text: room.shortDescription,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard if cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore fallback error
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full h-[52vh] sm:h-[60vh] md:h-[68vh] overflow-hidden">
      {/* ── Imagem Principal com layoutId ── */}
      <motion.div
        layoutId={`room-card-${room.id}`}
        className="relative w-full h-full"
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage.url}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.7 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
          >
            <Image
              src={currentImage.url}
              alt={currentImage.alt || room.name}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradiente sutil para garantir legibilidade dos botões e do conteúdo inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/20 to-black/40 pointer-events-none" />
      </motion.div>

      {/* ── Botões Flutuantes Superiores (Edge-to-Edge Top Bar) ── */}
      <div className="absolute top-0 inset-x-0 z-30 pt-4 px-4 sm:px-6 flex items-center justify-between pointer-events-auto">
        {/* Botão Voltar */}
        <motion.button
          onClick={() => router.back()}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="w-11 h-11 rounded-full glass-dark flex items-center justify-center text-white shadow-xl shadow-black/30 hover:bg-white/15 transition-colors"
          aria-label="Voltar para a página anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>

        {/* Botão Compartilhar */}
        <div className="relative">
          <motion.button
            onClick={handleShare}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="w-11 h-11 rounded-full glass-dark flex items-center justify-center text-white shadow-xl shadow-black/30 hover:bg-white/15 transition-colors"
            aria-label="Compartilhar esta acomodação"
          >
            {copied ? <Check className="w-5 h-5 text-forest-400" /> : <Share2 className="w-5 h-5" />}
          </motion.button>

          {/* Toast de link copiado */}
          <AnimatePresence>
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.9 }}
                className="absolute right-0 top-full mt-2 glass-dark rounded-xl px-3 py-1.5 text-xs text-forest-300 font-medium whitespace-nowrap shadow-lg border border-forest-500/30"
              >
                Link copiado!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Controles de Imagem (se houver mais de 1) ── */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full glass flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-colors"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full glass flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-colors"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* ── Badges Inferiores da Foto ── */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          {room.isFeatured && (
            <Badge variant="gold" size="md" className="shadow-lg pointer-events-auto">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Destaque Anauê
            </Badge>
          )}
        </div>

        {images.length > 1 && (
          <div className="glass px-3 py-1 rounded-full text-xs text-white/80 font-medium tracking-wider shadow-lg">
            {activeImageIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
