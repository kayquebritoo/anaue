// ============================================================
// lib/pricingCatalog.ts
// Catálogo de preços confiável usado pelo servidor (lib/pricing.ts).
//  - Quartos, experiências e cupons: Supabase (mock só em dev/teste).
//  - Adicionais: catálogo estático versionado (mocks/addons.json) — não há
//    tabela de adicionais no banco; o arquivo é lido no servidor, então o
//    navegador não consegue alterar os preços.
// ============================================================

import { getRoomByIdAsync, getExperienceByIdAsync, getCouponByCodeAsync } from '@/lib/supabaseData';
import { getAddonById } from '@/lib/mockData';
import type { PricingCatalog } from '@/lib/pricing';

export const serverPricingCatalog: PricingCatalog = {
  async getRoom(id) {
    const room = await getRoomByIdAsync(id);
    return room
      ? { id: room.id, name: room.name, pricePerNight: room.pricePerNight, maxGuests: room.maxGuests, isAvailable: room.isAvailable }
      : undefined;
  },
  async getExperience(id) {
    const exp = await getExperienceByIdAsync(id);
    return exp ? { id: exp.id, name: exp.name, price: exp.price, priceType: exp.priceType } : undefined;
  },
  async getAddon(id) {
    const addon = getAddonById(id);
    return addon ? { id: addon.id, name: addon.name, price: addon.price, priceType: addon.priceType } : undefined;
  },
  async getCoupon(code) {
    return getCouponByCodeAsync(code);
  },
};
