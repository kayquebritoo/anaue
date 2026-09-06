'use client';

// ============================================================
// components/search/SearchFiltersBar.tsx
// Header de parâmetros de busca e barra de chips roláveis
// ============================================================

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, Users } from 'lucide-react';
import type { RoomType } from '@/types';

export type FilterCategory = 'todos' | RoomType | 'piscina' | 'vista-rio';

interface FilterOption {
  id: FilterCategory;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'todos', label: 'Todas as Opções' },
  { id: 'bangalo', label: 'Bangalôs' },
  { id: 'suite', label: 'Suítes' },
  { id: 'chale', label: 'Chalés' },
  { id: 'casa-arvore', label: 'Casas na Árvore' },
  { id: 'piscina', label: 'Com Piscina' },
  { id: 'vista-rio', label: 'Vista para o Rio' },
];

interface SearchFiltersBarProps {
  activeFilter: FilterCategory;
  onSelectFilter: (filter: FilterCategory) => void;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number;
}

export function SearchFiltersBar({
  activeFilter,
  onSelectFilter,
  checkIn,
  checkOut,
  guests = 2,
}: SearchFiltersBarProps) {
  const hasDates = Boolean(checkIn && checkOut);

  return (
    <div className="space-y-4">
      {/* ── Resumo dos Parâmetros Pesquisados ── */}
      <div className="glass-dark rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass-gold flex items-center justify-center text-gold-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
              Sua Pesquisa
            </p>
            <p className="text-sm font-semibold text-white">
              Anauê Amazônia · Floresta Primária
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasDates ? (
            <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-xs text-white/80">
              <Calendar className="w-3.5 h-3.5 text-forest-400" />
              <span>{checkIn} — {checkOut}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-xs text-white/60">
              <Calendar className="w-3.5 h-3.5 text-forest-400" />
              <span>Datas Flexíveis</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-xs text-white/80">
            <Users className="w-3.5 h-3.5 text-forest-400" />
            <span>{guests} {guests === 1 ? 'hóspede' : 'hóspedes'}</span>
          </div>
        </div>
      </div>

      {/* ── Barra Horizontal Rolável de Chips de Filtro ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-5 px-5 sm:mx-0 sm:px-0">
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.id;
          return (
            <motion.button
              key={option.id}
              onClick={() => onSelectFilter(option.id)}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-forest-500 text-white shadow-lg shadow-forest-900/50 border border-forest-400/40'
                  : 'glass text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{option.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
