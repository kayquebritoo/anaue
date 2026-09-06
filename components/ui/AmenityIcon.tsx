'use client';

// ============================================================
// components/ui/AmenityIcon.tsx
// Mapeador dinâmico e seguro de ícones Lucide para comodidades
// ============================================================

import React from 'react';
import {
  Waves,
  Moon,
  Wind,
  Coffee,
  Wifi,
  Eye,
  Bath,
  Flame,
  MapPin,
  ChefHat,
  Anchor,
  Star,
  Heart,
  Droplets,
  TreePine,
  Sparkles,
  Tv,
  Utensils,
  Sun,
  ShieldCheck,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Waves,
  Moon,
  Wind,
  Coffee,
  Wifi,
  Eye,
  Bath,
  Flame,
  MapPin,
  ChefHat,
  Anchor,
  Star,
  Heart,
  Droplets,
  TreePine,
  Sparkles,
  Tv,
  Utensils,
  Sun,
  ShieldCheck,
};

interface AmenityIconProps {
  name: string;
  className?: string;
}

export function AmenityIcon({ name, className = 'w-4 h-4' }: AmenityIconProps) {
  const IconComponent = iconMap[name] || HelpCircle;
  return <IconComponent className={className} />;
}
