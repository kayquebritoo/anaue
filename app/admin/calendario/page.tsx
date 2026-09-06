'use client';

// ============================================================
// app/admin/calendario/page.tsx
// Mapa de Reservas / Calendário Timeline — Anauê PMS Manager
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { CalendarTimeline } from '@/components/admin/CalendarTimeline';
import { getRoomsAsync, getBookingsAsync } from '@/lib/supabaseData';
import type { Room, Reservation } from '@/types';

export default function AdminCalendarPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [loadedRooms, loadedBookings] = await Promise.all([
      getRoomsAsync(),
      getBookingsAsync(),
    ]);
    setRooms(loadedRooms);
    setReservations(loadedBookings);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('anaue_reservation_updated', handleUpdate);
    return () => window.removeEventListener('anaue_reservation_updated', handleUpdate);
  }, [loadData]);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Mapa de Reservas & Disponibilidade
          </h1>
          <p className="text-xs sm:text-sm text-white/50">
            Timeline interativa — visualize a ocupação de cada acomodação por dia
          </p>
        </div>
      </div>

      {/* Grid de Timeline Interativo */}
      {isLoading ? (
        <div className="glass-dark rounded-3xl p-8 border border-white/10 shadow-2xl flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-forest-400/40 border-t-forest-400 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/50">Carregando mapa de reservas…</p>
          </div>
        </div>
      ) : (
        <CalendarTimeline
          rooms={rooms}
          reservations={reservations}
          onReservationUpdated={loadData}
        />
      )}
    </div>
  );
}
