'use client';

// ============================================================
// components/admin/QuickReservationModal.tsx
// Wrapper de compatibilidade que renderiza o ManualBookingModal (Sprint 8B)
// ============================================================

import { ManualBookingModal } from '@/components/admin/ManualBookingModal';

interface QuickReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function QuickReservationModal({
  isOpen,
  onClose,
  onCreated,
}: QuickReservationModalProps) {
  return (
    <ManualBookingModal
      isOpen={isOpen}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}
