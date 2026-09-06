'use client';

// ============================================================
// components/checkout/BookingSummaryCard.tsx
// Resumo translúcido da reserva com cálculo transparente
// ============================================================

import Image from 'next/image';
import { Calendar, Users, Moon, Sparkles, Tag, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/mockData';
import type { Room, AddonExperience, PaymentMethodType, Coupon } from '@/types';
import type { SelectedExperience } from '@/components/checkout/ExperiencesSelector';

interface BookingSummaryCardProps {
  room: Room;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  selectedAddons: AddonExperience[];
  selectedExperiences: SelectedExperience[];
  roomSubtotal: number;
  addonsSubtotal: number;
  selectedExperiencesSubtotal: number;
  pixDiscount: number;
  couponDiscount: number;
  appliedCoupon: Coupon | null;
  totalPrice: number;
  paymentMethod: PaymentMethodType;
}

export function BookingSummaryCard({
  room,
  checkIn,
  checkOut,
  guests,
  nights,
  selectedAddons,
  selectedExperiences,
  roomSubtotal,
  addonsSubtotal,
  selectedExperiencesSubtotal,
  pixDiscount,
  couponDiscount,
  appliedCoupon,
  totalPrice,
  paymentMethod,
}: BookingSummaryCardProps) {
  const primaryImage = room.images.find((img) => img.isPrimary) ?? room.images[0];

  return (
    <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-6">
      {/* ── Topo: Acomodação ── */}
      <div className="flex gap-4 items-center">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10">
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt || room.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="forest" size="sm">
              {room.type}
            </Badge>
            {room.isFeatured && (
              <Badge variant="gold" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Destaque
              </Badge>
            )}
          </div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-white truncate">
            {room.name}
          </h2>
          <p className="text-xs text-white/50 truncate">
            Anauê Amazônia · Sítio Ecológico
          </p>
        </div>
      </div>

      {/* ── Período e Hóspedes ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="glass rounded-xl p-3 flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-forest-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-white/40 block text-[10px] uppercase">Período</span>
            <span className="text-white/90 font-medium truncate block">
              {checkIn} → {checkOut}
            </span>
          </div>
        </div>

        <div className="glass rounded-xl p-3 flex items-center gap-2.5">
          <Moon className="w-4 h-4 text-gold-400 shrink-0" />
          <div>
            <span className="text-white/40 block text-[10px] uppercase">Estadia</span>
            <span className="text-white/90 font-medium">
              {nights} {nights === 1 ? 'noite' : 'noites'} · {guests} {guests === 1 ? 'hóspede' : 'hóspedes'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Discriminação de Valores ── */}
      <div className="space-y-2.5 pt-3 border-t border-white/10 text-sm">
        <div className="flex justify-between items-center text-white/70">
          <span>Diárias ({nights}x {formatPrice(room.pricePerNight)})</span>
          <span className="font-medium text-white">{formatPrice(roomSubtotal)}</span>
        </div>

        {selectedAddons.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-white/70">
              <span className="flex items-center gap-1.5 text-forest-300">
                <Sparkles className="w-3.5 h-3.5" />
                Experiências ({selectedAddons.length})
              </span>
              <span className="font-medium text-forest-300">+{formatPrice(addonsSubtotal)}</span>
            </div>
            <ul className="space-y-1 pl-4 text-xs text-white/40">
              {selectedAddons.map((addon) => (
                <li key={addon.id} className="flex justify-between">
                  <span className="truncate pr-2">• {addon.name}</span>
                  <span className="shrink-0">
                    {formatPrice(addon.price * (addon.priceType === 'per_person' ? guests : 1))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedExperiences.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-white/70">
              <span className="flex items-center gap-1.5 text-gold-300">
                <Clock className="w-3.5 h-3.5" />
                Experiências Agendadas ({selectedExperiences.length})
              </span>
              <span className="font-medium text-gold-300">+{formatPrice(selectedExperiencesSubtotal)}</span>
            </div>
            <ul className="space-y-1 pl-4 text-xs text-white/40">
              {selectedExperiences.map((se) => (
                <li key={se.experience.id} className="flex justify-between">
                  <span className="truncate pr-2">
                    • {se.experience.name}
                    {se.date && (
                      <span className="text-white/30 ml-1">
                        ({se.date}{se.time ? ` ${se.time}` : ''})
                      </span>
                    )}
                  </span>
                  <span className="shrink-0">
                    {formatPrice(se.experience.price * (se.experience.priceType === 'per_person' ? guests : 1))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {paymentMethod === 'pix' && pixDiscount > 0 && (
          <div className="flex justify-between items-center text-gold-400 text-xs font-semibold pt-1">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Desconto PIX (5% OFF)
            </span>
            <span>-{formatPrice(pixDiscount)}</span>
          </div>
        )}

        {couponDiscount > 0 && appliedCoupon && (
          <div className="flex justify-between items-center text-forest-400 text-xs font-semibold pt-1">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Cupom ({appliedCoupon.code})
            </span>
            <span>-{formatPrice(couponDiscount)}</span>
          </div>
        )}

        {/* Total Final */}
        <div className="flex justify-between items-baseline pt-4 border-t border-white/15">
          <div>
            <span className="text-white/50 text-xs uppercase tracking-wider block">
              Valor Total
            </span>
            <span className="text-[11px] text-forest-300/80">Taxas e serviços inclusos</span>
          </div>
          <span className="text-gradient-gold text-2xl sm:text-3xl font-bold font-serif">
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
