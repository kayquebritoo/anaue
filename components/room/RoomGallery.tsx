'use client';

// ============================================================
// components/room/RoomGallery.tsx
// Galeria de Thumbnails + Modal Lightbox com Framer Motion
// Renderização condicional: só aparece se gallery_images existir
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Grid3X3, ZoomIn } from 'lucide-react';

interface RoomGalleryProps {
  images: string[];
  roomName: string;
}

export function RoomGallery({ images, roomName }: RoomGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isOpen = lightboxIndex !== null;

  // Fecha com Esc, navega com setas
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : 0));
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : 0));
    },
    [isOpen, images.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Bloqueia scroll do body quando lightbox aberto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : 0));
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : 0));

  // Mostra até 6 thumbnails + botão "Ver todas"
  const PREVIEW_COUNT = 6;
  const previewImages = images.slice(0, PREVIEW_COUNT);
  const remaining = images.length - PREVIEW_COUNT;

  return (
    <>
      {/* ── Seção da Galeria ── */}
      <section aria-label="Galeria de fotos" className="max-w-4xl mx-auto px-5 sm:px-6 py-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-forest-400" />
            Galeria de Fotos
            <span className="text-white/30 text-sm font-normal font-sans">({images.length} fotos)</span>
          </h2>
        </div>

        {/* ── Grid de Thumbnails ── */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden">
          {previewImages.map((src, i) => {
            const isLast = i === PREVIEW_COUNT - 1 && remaining > 0;
            return (
              <motion.button
                key={src}
                onClick={() => setLightboxIndex(i)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`relative overflow-hidden group ${
                  i === 0 ? 'col-span-3 sm:col-span-2 row-span-2 h-52 sm:h-64' : 'h-24 sm:h-32'
                }`}
                aria-label={`Ver foto ${i + 1} de ${roomName}`}
              >
                <Image
                  src={src}
                  alt={`${roomName} — foto ${i + 1}`}
                  fill
                  sizes={i === 0 ? '(max-width: 640px) 100vw, 66vw' : '33vw'}
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                {/* Overlay hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
                {/* Badge "Ver todas" na última thumb */}
                {isLast && (
                  <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1">
                    <Grid3X3 className="w-5 h-5 text-white" />
                    <span className="text-white text-xs font-semibold">+{remaining + 1} fotos</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Lightbox Modal ── */}
      <AnimatePresence>
        {isOpen && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Foto ${lightboxIndex + 1} de ${images.length} — ${roomName}`}
          >
            {/* Botão fechar */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full glass-dark flex items-center
                justify-center text-white hover:bg-white/15 transition-colors"
              onClick={() => setLightboxIndex(null)}
              aria-label="Fechar galeria"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* Contador */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-dark rounded-full px-4 py-1.5 text-white/70 text-xs font-medium">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Botão anterior */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 w-11 h-11 rounded-full glass-dark flex items-center justify-center
                text-white hover:bg-white/15 transition-colors z-10"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>

            {/* Imagem principal */}
            <AnimatePresence mode="wait">
              <motion.div
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full h-full max-w-5xl max-h-[85vh] mx-16"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={images[lightboxIndex]}
                  alt={`${roomName} — foto ${lightboxIndex + 1}`}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {/* Botão próximo */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 w-11 h-11 rounded-full glass-dark flex items-center justify-center
                text-white hover:bg-white/15 transition-colors z-10"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>

            {/* Thumbnails na base */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 overflow-x-auto max-w-xs sm:max-w-lg px-4">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`relative flex-none w-10 h-10 rounded-lg overflow-hidden transition-all ${
                    i === lightboxIndex ? 'ring-2 ring-forest-400 scale-110' : 'opacity-40 hover:opacity-70'
                  }`}
                  aria-label={`Ir para foto ${i + 1}`}
                  aria-current={i === lightboxIndex}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
