'use client';

// ============================================================
// components/checkout/ExperiencesSelector.tsx
// Seletor de Experiências independentes no checkout (up-sell)
// Permite adicionar experiências com data e horário ao pacote
// ============================================================

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Clock, CalendarDays, X, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/mockData';
import type { Experience } from '@/types';

export interface SelectedExperience {
  experience: Experience;
  date: string;
  time: string;
}

interface ExperiencesSelectorProps {
  experiences: Experience[];
  selected: SelectedExperience[];
  onToggle: (experience: Experience) => void;
  onUpdateSchedule: (experienceId: string, date: string, time: string) => void;
  guests: number;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00',
];

const CATEGORY_LABEL: Record<string, string> = {
  'bem-estar': 'Bem-estar',
  aventura: 'Aventura',
  gastronomia: 'Gastronomia',
  logistica: 'Logística',
};

export function ExperiencesSelector({
  experiences,
  selected,
  onToggle,
  onUpdateSchedule,
  guests,
}: ExperiencesSelectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isSelected = (id: string) => selected.some((s) => s.experience.id === id);
  const getSelection = (id: string) => selected.find((s) => s.experience.id === id);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-xs uppercase tracking-widest text-gold-400 font-semibold">
              Up-sell Exclusivo
            </span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
            Experiências Amazônicas
          </h3>
        </div>
        <span className="text-xs text-white/40 hidden sm:block">
          Opcional · Agende data e horário
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {experiences.map((exp) => {
          const active = isSelected(exp.id);
          const selection = getSelection(exp.id);
          const isExpanded = expandedId === exp.id;
          const computedPrice =
            exp.priceType === 'per_person' ? exp.price * guests : exp.price;

          return (
            <motion.div
              key={exp.id}
              layout
              className={`relative rounded-2xl overflow-hidden transition-all duration-300 border ${
                active
                  ? 'bg-forest-900/50 border-forest-400/60 shadow-xl shadow-forest-950/60 ring-1 ring-forest-400/40'
                  : 'glass-dark border-white/10 hover:border-white/20'
              }`}
            >
              {/* Main card (clickable) */}
              <div
                onClick={() => {
                  onToggle(exp);
                  if (!active) {
                    setExpandedId(isExpanded ? null : exp.id);
                  } else {
                    setExpandedId(null);
                  }
                }}
                className="cursor-pointer"
              >
                {/* Image + badges */}
                <div className="relative h-32 w-full overflow-hidden">
                  <Image
                    src={exp.imageUrl}
                    alt={exp.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 380px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/30 to-transparent" />

                  {/* Category */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm ${
                      exp.category === 'aventura'
                        ? 'text-forest-300 bg-forest-400/15 border-forest-400/30'
                        : 'text-gold-300 bg-gold-400/15 border-gold-400/30'
                    }`}>
                      {CATEGORY_LABEL[exp.category] || exp.category}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="absolute top-2.5 right-2.5 glass rounded-full px-2 py-0.5 text-[10px] text-white/80 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {exp.duration}
                  </div>

                  {/* Checkbox */}
                  <div
                    className={`absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      active
                        ? 'bg-forest-500 text-white shadow-lg'
                        : 'glass text-transparent border border-white/20'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                </div>

                {/* Text + price */}
                <div className="p-4 space-y-2">
                  <div>
                    <h4 className="font-serif text-white font-bold text-base leading-snug">
                      {exp.name}
                    </h4>
                    <p className="text-xs text-white/60 line-clamp-2 mt-1 leading-relaxed font-light">
                      {exp.shortDescription}
                    </p>
                  </div>

                  <div className="pt-2 flex items-baseline justify-between border-t border-white/5">
                    <span className="text-[11px] text-white/40">
                      {exp.priceType === 'per_person'
                        ? `${formatPrice(exp.price)} / pessoa`
                        : 'Valor total'}
                    </span>
                    <span
                      className={`font-semibold text-sm ${
                        active ? 'text-forest-300' : 'text-white/90'
                      }`}
                    >
                      +{formatPrice(computedPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded: Date + Time pickers */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-forest-400 font-semibold">
                        Agende sua experiência
                      </p>

                      {/* Date */}
                      <div>
                        <label className="text-[10px] text-white/40 mb-1 block flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          Data
                        </label>
                        <input
                          type="date"
                          min={today}
                          value={selection?.date || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateSchedule(exp.id, e.target.value, selection?.time || '');
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs
                            focus:outline-none focus:border-forest-400/50"
                        />
                      </div>

                      {/* Time slots */}
                      <div>
                        <label className="text-[10px] text-white/40 mb-1.5 block">
                          Horário
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {TIME_SLOTS.map((slot) => {
                            const isActive = selection?.time === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateSchedule(exp.id, selection?.date || today, slot);
                                }}
                                className={`py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                  isActive
                                    ? 'bg-forest-500 text-white border border-forest-400/40'
                                    : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20'
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selection status */}
                      {selection?.date && selection?.time && (
                        <div className="flex items-center gap-1.5 text-[10px] text-forest-400">
                          <Check className="w-3 h-3" />
                          Agendado para {selection.date} às {selection.time}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
