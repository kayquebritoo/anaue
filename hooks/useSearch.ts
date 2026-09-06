'use client';

// ============================================================
// hooks/useSearch.ts
// Custom Hook — Gerencia estado e lógica de busca
// Componentes visuais devem usar APENAS este hook.
// ============================================================

import { useState, useCallback } from 'react';
import type { SearchParams } from '@/types';

interface UseSearchReturn {
  searchParams: SearchParams;
  setCheckIn: (date: string | null) => void;
  setCheckOut: (date: string | null) => void;
  setGuests: (count: number) => void;
  resetSearch: () => void;
  isSearchReady: boolean;
  nightsCount: number;
}

const DEFAULT_PARAMS: SearchParams = {
  checkIn: null,
  checkOut: null,
  guests: 2,
};

export function useSearch(): UseSearchReturn {
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_PARAMS);

  const setCheckIn = useCallback((date: string | null) => {
    setSearchParams((prev) => {
      // Resetar checkout apenas se a nova data de check-in for >= checkout atual
      // (garantindo pelo menos 1 noite de diferença)
      const newCheckOut =
        prev.checkOut && date && date >= prev.checkOut ? null : prev.checkOut;
      return { ...prev, checkIn: date, checkOut: newCheckOut };
    });
  }, []);

  const setCheckOut = useCallback((date: string | null) => {
    setSearchParams((prev) => ({ ...prev, checkOut: date }));
  }, []);

  const setGuests = useCallback((count: number) => {
    const clamped = Math.max(1, Math.min(count, 20));
    setSearchParams((prev) => ({ ...prev, guests: clamped }));
  }, []);

  const resetSearch = useCallback(() => {
    setSearchParams(DEFAULT_PARAMS);
  }, []);

  const isSearchReady =
    searchParams.checkIn !== null && searchParams.checkOut !== null;

  const nightsCount = (() => {
    if (!searchParams.checkIn || !searchParams.checkOut) return 0;
    const diffMs =
      new Date(searchParams.checkOut).getTime() -
      new Date(searchParams.checkIn).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  })();

  return {
    searchParams,
    setCheckIn,
    setCheckOut,
    setGuests,
    resetSearch,
    isSearchReady,
    nightsCount,
  };
}
