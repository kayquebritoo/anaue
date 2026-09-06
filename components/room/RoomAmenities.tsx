'use client';

// ============================================================
// components/room/RoomAmenities.tsx
// Grade de comodidades (amenities) em Chips com ícones
// ============================================================

import React from 'react';
import { AmenityIcon } from '@/components/ui/AmenityIcon';
import type { RoomAmenity } from '@/types';

interface RoomAmenitiesProps {
  amenities: RoomAmenity[];
}

export function RoomAmenities({ amenities }: RoomAmenitiesProps) {
  if (!amenities || amenities.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-xl font-bold text-white tracking-tight">
        Comodidades & Experiências
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {amenities.map((amenity) => (
          <div
            key={amenity.id}
            className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/10 hover:border-forest-500/30 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl glass-gold flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform shrink-0">
              <AmenityIcon name={amenity.icon} className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-white/90 truncate">
              {amenity.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
