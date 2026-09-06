'use client';

// ============================================================
// components/admin/ReservationDetailModal.tsx
// Adaptador de compatibilidade que renderiza o BookingDetailsSlideOver (Sprint 8A)
// ============================================================

import { BookingDetailsSlideOver } from '@/components/admin/BookingDetailsSlideOver';
import type { Reservation } from '@/types';

interface ReservationDetailModalProps {
  reservation: Reservation | null;
  roomName: string;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export function ReservationDetailModal({
  reservation,
  roomName,
  onClose,
  onStatusUpdated,
}: ReservationDetailModalProps) {
  return (
    <BookingDetailsSlideOver
      reservation={reservation}
      roomName={roomName}
      isOpen={!!reservation}
      onClose={onClose}
      onStatusUpdated={() => {
        if (onStatusUpdated) onStatusUpdated();
      }}
    />
  );
}
