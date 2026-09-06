'use client';

// ============================================================
// components/checkout/AddonsSelector.tsx
// Vitrine de Up-sell de Experiências Amazônicas Exclusivas
// ============================================================

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Sparkles, Check, Clock, Flame } from 'lucide-react';
import { formatPrice } from '@/lib/mockData';
import type { AddonExperience } from '@/types';

interface AddonsSelectorProps {
  addons: AddonExperience[];
  selectedAddons: AddonExperience[];
  onToggleAddon: (addon: AddonExperience) => void;
  guests: number;
}

export function AddonsSelector({
  addons,
  selectedAddons,
  onToggleAddon,
  guests,
}: AddonsSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-xs uppercase tracking-widest text-gold-400 font-semibold">
              Personalize sua Estadia
            </span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
            Experiências & Serviços Especiais
          </h3>
        </div>
        <span className="text-xs text-white/40 hidden sm:block">
          Opcional · Adicione ao seu pacote
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {addons.map((addon) => {
          const isSelected = selectedAddons.some((a) => a.id === addon.id);
          const computedPrice =
            addon.priceType === 'per_person' ? addon.price * guests : addon.price;

          return (
            <motion.div
              key={addon.id}
              onClick={() => onToggleAddon(addon)}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between border ${
                isSelected
                  ? 'bg-forest-900/50 border-forest-400/60 shadow-xl shadow-forest-950/60 ring-1 ring-forest-400/40'
                  : 'glass-dark border-white/10 hover:border-white/20'
              }`}
            >
              {/* Top Image + Badges */}
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={addon.imageUrl}
                  alt={addon.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 380px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/30 to-transparent" />

                {/* Popular Tag */}
                {addon.isPopular && (
                  <div className="absolute top-2.5 left-2.5 glass-gold rounded-full px-2.5 py-0.5 text-[10px] text-gold-300 font-semibold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-gold-400" />
                    <span>Mais Escolhido</span>
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute top-2.5 right-2.5 glass rounded-full px-2.5 py-0.5 text-[10px] text-white/80 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-forest-300" />
                  <span>{addon.duration}</span>
                </div>

                {/* Checkbox Selector Circle */}
                <div
                  className={`absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-forest-500 text-white shadow-lg'
                      : 'glass text-transparent border border-white/20'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </div>
              </div>

              {/* Text & Price Info */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-serif text-white font-bold text-base leading-snug">
                    {addon.name}
                  </h4>
                  <p className="text-xs text-white/60 line-clamp-2 mt-1 leading-relaxed font-light">
                    {addon.shortDescription}
                  </p>
                </div>

                <div className="pt-2 flex items-baseline justify-between border-t border-white/5">
                  <span className="text-[11px] text-white/40">
                    {addon.priceType === 'per_person'
                      ? `${formatPrice(addon.price)} / pessoa`
                      : 'Valor total do serviço'}
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      isSelected ? 'text-forest-300' : 'text-white/90'
                    }`}
                  >
                    +{formatPrice(computedPrice)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
