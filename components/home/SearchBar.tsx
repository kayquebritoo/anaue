'use client';

// ============================================================
// components/home/SearchBar.tsx
// Barra de Busca Inteligente com DatePicker Robusto & Responsivo
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Search, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useRouter } from 'next/navigation';

interface FieldState {
  checkin: boolean;
  checkout: boolean;
  guests: boolean;
}

// Data mínima = hoje (YYYY-MM-DD)
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Retorna a data mínima para o check-out: check-in + 1 dia.
 * Garante pelo menos 1 noite de estadia.
 */
function minCheckOutISO(checkIn: string | null): string {
  if (!checkIn) return todayISO();
  const d = new Date(checkIn + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
}

export function SearchBar() {
  const router = useRouter();
  const {
    searchParams,
    setCheckIn,
    setCheckOut,
    setGuests,
    isSearchReady,
    nightsCount,
  } = useSearch();

  const [open, setOpen] = useState<FieldState>({
    checkin: false,
    checkout: false,
    guests: false,
  });

  const isAnyOpen = open.checkin || open.checkout || open.guests;

  function closeAll() {
    setOpen({ checkin: false, checkout: false, guests: false });
  }

  function toggleField(field: keyof FieldState) {
    setOpen((prev) => ({
      checkin: false,
      checkout: false,
      guests: false,
      [field]: !prev[field],
    }));
  }

  function handleSearch() {
    if (!searchParams.checkIn) {
      toggleField('checkin');
      return;
    }
    if (!searchParams.checkOut) {
      toggleField('checkout');
      return;
    }
    // Bug #3: garantir pelo menos 1 noite antes de disparar a busca
    if (nightsCount <= 0) {
      toggleField('checkout');
      return;
    }

    const params = new URLSearchParams({
      checkIn: searchParams.checkIn,
      checkOut: searchParams.checkOut,
      guests: String(searchParams.guests),
    });
    closeAll();
    router.push(`/busca?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-3xl mx-auto relative z-40">
      {/* Backdrop transparente para fechar dropdowns ao clicar fora */}
      {isAnyOpen && (
        <div
          onClick={closeAll}
          className="fixed inset-0 z-[45] bg-black/20 md:bg-transparent"
        />
      )}

      <motion.div
        className="glass-dark rounded-3xl p-2 shadow-2xl shadow-black/60 relative z-50 border border-white/12"
        layout
      >
        <div className="flex flex-col md:flex-row gap-1 relative">
          {/* ── Check-in ── */}
          <div className={`relative flex-1 ${open.checkin ? 'z-[100]' : 'z-10'}`}>
            <button
              type="button"
              id="search-checkin"
              onClick={(e) => {
                e.stopPropagation();
                toggleField('checkin');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left cursor-pointer ${
                open.checkin
                  ? 'bg-forest-600/35 border border-forest-500/40 text-white shadow-md'
                  : 'hover:bg-white/5 text-white/90 border border-transparent'
              }`}
            >
              <Calendar className="w-5 h-5 text-forest-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold">
                  Check-in
                </p>
                <p
                  className={`text-sm font-medium mt-0.5 truncate ${
                    searchParams.checkIn ? 'text-white font-semibold' : 'text-white/40'
                  }`}
                >
                  {searchParams.checkIn
                    ? formatDate(searchParams.checkIn)
                    : 'Selecionar data'}
                </p>
              </div>
            </button>

            {/* Dropdown de Check-in */}
            <AnimatePresence>
              {open.checkin && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-3 z-[60] glass-dark rounded-3xl p-5 shadow-2xl min-w-[300px] w-full sm:w-auto border border-white/15 backdrop-blur-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-forest-400" />
                      Data de Check-in
                    </p>
                    <button
                      type="button"
                      onClick={closeAll}
                      className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="date"
                      min={todayISO()}
                      value={searchParams.checkIn ?? ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          (e.target as HTMLInputElement).showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        setCheckIn(val);
                        if (val) {
                          toggleField('checkout');
                        }
                      }}
                      className="w-full bg-[#0c1810] border border-forest-500/40 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-forest-400 transition-colors cursor-pointer"
                    />
                    <p className="text-[11px] text-white/40">
                      Entrada a partir das 14:00h
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => toggleField('checkout')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-500 hover:bg-forest-400 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Avançar para Check-out</span>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divisor */}
          <div className="hidden md:flex items-center">
            <div className="w-px h-10 bg-white/10" />
          </div>

          {/* ── Check-out ── */}
          <div className={`relative flex-1 ${open.checkout ? 'z-[100]' : 'z-10'}`}>
            <button
              type="button"
              id="search-checkout"
              onClick={(e) => {
                e.stopPropagation();
                toggleField('checkout');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left cursor-pointer ${
                open.checkout
                  ? 'bg-forest-600/35 border border-forest-500/40 text-white shadow-md'
                  : 'hover:bg-white/5 text-white/90 border border-transparent'
              }`}
            >
              <Calendar className="w-5 h-5 text-gold-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold">
                  Check-out
                </p>
                <p
                  className={`text-sm font-medium mt-0.5 truncate ${
                    searchParams.checkOut ? 'text-white font-semibold' : 'text-white/40'
                  }`}
                >
                  {searchParams.checkOut
                    ? formatDate(searchParams.checkOut)
                    : 'Selecionar data'}
                </p>
              </div>
            </button>

            {/* Dropdown de Check-out */}
            <AnimatePresence>
              {open.checkout && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-3 z-[60] glass-dark rounded-3xl p-5 shadow-2xl min-w-[300px] w-full sm:w-auto border border-white/15 backdrop-blur-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-400" />
                      Data de Check-out
                    </p>
                    <button
                      type="button"
                      onClick={closeAll}
                      className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="date"
                      min={minCheckOutISO(searchParams.checkIn)}
                      value={searchParams.checkOut ?? ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          (e.target as HTMLInputElement).showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        setCheckOut(val);
                        if (val) {
                          toggleField('guests');
                        }
                      }}
                      className="w-full bg-[#0c1810] border border-gold-500/40 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-400 transition-colors cursor-pointer"
                    />
                    {nightsCount > 0 && (
                      <p className="text-forest-300 text-xs font-semibold">
                        {nightsCount} {nightsCount === 1 ? 'diária' : 'diárias selecionadas'}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => toggleField('guests')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-500 hover:bg-forest-400 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Avançar para Hóspedes</span>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divisor */}
          <div className="hidden md:flex items-center">
            <div className="w-px h-10 bg-white/10" />
          </div>

          {/* ── Hóspedes ── */}
          <div className={`relative ${open.guests ? 'z-[100]' : 'z-10'}`}>
            <button
              type="button"
              id="search-guests"
              onClick={(e) => {
                e.stopPropagation();
                toggleField('guests');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left cursor-pointer ${
                open.guests
                  ? 'bg-forest-600/35 border border-forest-500/40 text-white shadow-md'
                  : 'hover:bg-white/5 text-white/90 border border-transparent'
              }`}
            >
              <Users className="w-5 h-5 text-forest-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold">
                  Hóspedes
                </p>
                <p className="text-white text-sm font-semibold mt-0.5">
                  {searchParams.guests}{' '}
                  {searchParams.guests === 1 ? 'hóspede' : 'hóspedes'}
                </p>
              </div>
              {open.guests ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>

            {/* Dropdown de Hóspedes */}
            <AnimatePresence>
              {open.guests && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-3 z-[60] glass-dark rounded-3xl p-5 shadow-2xl w-68 border border-white/15 backdrop-blur-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                      Número de Hóspedes
                    </p>
                    <button
                      type="button"
                      onClick={closeAll}
                      className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, searchParams.guests - 1))}
                      disabled={searchParams.guests <= 1}
                      className="w-11 h-11 rounded-2xl glass flex items-center justify-center text-white text-xl font-light disabled:opacity-30 hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <div className="text-center">
                      <span className="text-white text-2xl font-bold font-serif tabular-nums">
                        {searchParams.guests}
                      </span>
                      <span className="text-[10px] text-white/40 block">
                        {searchParams.guests === 1 ? 'adulto' : 'adultos'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(10, searchParams.guests + 1))}
                      disabled={searchParams.guests >= 10}
                      className="w-11 h-11 rounded-2xl glass flex items-center justify-center text-white text-xl font-light disabled:opacity-30 hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={closeAll}
                    className="w-full py-2.5 rounded-xl bg-forest-500 hover:bg-forest-400 text-white text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Confirmar Hóspedes
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Botão Buscar ── */}
          <motion.button
            type="button"
            id="search-submit"
            onClick={handleSearch}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 text-white font-semibold shadow-lg shadow-forest-950/60 transition-all shrink-0 cursor-pointer border border-forest-400/30"
          >
            <Search className="w-4.5 h-4.5" />
            <span className="font-semibold text-sm">Buscar</span>
          </motion.button>
        </div>

        {/* Linha informativa quando datas estão preenchidas */}
        {isSearchReady && nightsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 pb-2 pt-1 border-t border-white/8 mt-1 flex items-center justify-between"
          >
            <p className="text-white/60 text-xs">
              <span className="text-forest-400 font-bold">{nightsCount} {nightsCount === 1 ? 'noite' : 'noites'}</span>
              {' · '}
              {searchParams.guests} {searchParams.guests === 1 ? 'hóspede' : 'hóspedes'}
            </p>
            <span className="text-[10px] text-white/40">Melhor tarifa garantida</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
