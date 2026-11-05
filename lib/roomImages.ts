// ============================================================
// lib/roomImages.ts
// Foto principal de uma acomodação com fallback seguro.
// Um quarto cadastrado sem fotos não pode derrubar páginas públicas
// (antes: "Cannot read properties of undefined (reading 'url')").
// ============================================================

import type { Room } from '@/types';

export const ROOM_IMAGE_FALLBACK = '/images/og-image.jpg';

export function getRoomPrimaryImage(room: Pick<Room, 'name' | 'images'> & { gallery_images?: string[] }): { url: string; alt: string } {
  const images = Array.isArray(room.images) ? room.images.filter((img) => img && img.url) : [];
  const chosen = images.find((img) => img.isPrimary) ?? images[0];
  if (chosen) return { url: chosen.url, alt: chosen.alt || room.name };
  const fromGallery = room.gallery_images?.find(Boolean);
  return { url: fromGallery || ROOM_IMAGE_FALLBACK, alt: room.name };
}
