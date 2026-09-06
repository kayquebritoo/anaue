'use client';

// ============================================================
// components/room/VideoSection.tsx
// Seção "Tour em Vídeo" — Renderização condicional
// Só aparece se video_url existir no mock data do quarto
// ============================================================

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Video } from 'lucide-react';

interface VideoSectionProps {
  videoUrl: string;
  roomName: string;
}

export function VideoSection({ videoUrl, roomName }: VideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handlePlay = () => {
    setHasInteracted(true);
    videoRef.current?.play();
  };

  return (
    <section className="max-w-4xl mx-auto px-5 sm:px-6 py-2" aria-label="Tour em vídeo">
      {/* Cabeçalho */}
      <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2 mb-4">
        <Video className="w-5 h-5 text-forest-400" />
        Tour em Vídeo
      </h2>

      {/* Player */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-3xl overflow-hidden bg-forest-950 border border-white/10 shadow-2xl shadow-black/50"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted
          loop
          controls
          preload="metadata"
          className="w-full aspect-video object-cover"
          aria-label={`Tour em vídeo — ${roomName}`}
        />

        {/* Overlay de play customizado (antes da interação) */}
        {!hasInteracted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <motion.button
              onClick={handlePlay}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="w-16 h-16 rounded-full bg-forest-500/90 hover:bg-forest-400 flex items-center
                justify-center shadow-xl shadow-forest-900/50 transition-colors"
              aria-label="Reproduzir tour em vídeo"
            >
              <Play className="w-7 h-7 text-white ml-1" />
            </motion.button>
          </div>
        )}
      </motion.div>

      <p className="text-white/30 text-xs mt-3 text-center">
        Tour imersivo pelo ambiente — {roomName}
      </p>
    </section>
  );
}
