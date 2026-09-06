'use client';

// ============================================================
// app/reserva/checkout/page.tsx
// Página de Checkout — Client Component
// Sprint 4: Suporte a ?experienceId= para compra avulsa de experiências
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ArrowLeft, ShieldCheck, Lock, Sparkles, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { useCheckout } from '@/hooks/useCheckout';
import { getRoomById, getAddons, getExperienceById, getExperiences } from '@/lib/mockData';
import { createPixPaymentAction } from '@/app/actions/payment';
import { BookingSummaryCard } from '@/components/checkout/BookingSummaryCard';
import { AddonsSelector } from '@/components/checkout/AddonsSelector';
import { ExperiencesSelector } from '@/components/checkout/ExperiencesSelector';
import { GuestForm } from '@/components/checkout/GuestForm';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { CouponInput } from '@/components/checkout/CouponInput';
import { AnimatedTotal } from '@/components/checkout/AnimatedTotal';
import { StayEditor } from '@/components/checkout/StayEditor';
import type { Room, AddonExperience, Experience } from '@/types';

// Esta página usa searchParams (runtime), então não é SSG
export const dynamic = 'force-dynamic';

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomId       = searchParams.get('roomId') ?? '';
  const experienceId = searchParams.get('experienceId') ?? '';
  const checkInParam  = searchParams.get('checkIn');
  const checkOutParam = searchParams.get('checkOut');
  const guestsParam   = searchParams.get('guests');

  const [room, setRoom] = useState<Room | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [addons, setAddons] = useState<AddonExperience[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolver dados no cliente (mockData é síncrono)
  useEffect(() => {
    if (roomId) {
      const found = getRoomById(roomId);
      setRoom(found ?? null);
    }
    if (experienceId) {
      const foundExp = getExperienceById(experienceId);
      setExperience(foundExp ?? null);
    }
    setAddons(getAddons());
    setExperiences(getExperiences());
    setLoading(false);
  }, [roomId, experienceId]);

  const checkout = useCheckout({
    room,
    experience,
    initialCheckIn: checkInParam,
    initialCheckOut: checkOutParam,
    initialGuests: guestsParam ? Number(guestsParam) : undefined,
  });

  const handleSubmit = async () => {
    setSubmitError(null);
    const result = await checkout.submitBooking();
    if (result.success && result.reservation) {
      // Se pagamento é PIX, criar pagamento e redirecionar com dados do QR Code
      if (checkout.paymentMethod === 'pix') {
        const pixResult = await createPixPaymentAction(
          result.reservation.id,
          result.reservation.totalPrice,
          checkout.guestData.email,
          `Reserva Anauê — ${result.reservation.bookingCode}`
        );

        if (pixResult.success && pixResult.qrCodeBase64) {
          const pixParams = new URLSearchParams({
            show_pix: 'true',
            pix_paymentId: String(pixResult.paymentId),
            pix_qrCode: pixResult.qrCodeBase64,
            pix_copiaECola: pixResult.copiaECola || '',
            pix_ticketUrl: pixResult.ticketUrl || '',
            pix_expiresAt: pixResult.expiresAt || '',
          });
          router.push(`/reserva/sucesso/${result.reservation.id}?${pixParams.toString()}`);
          return;
        }
      }

      // Pagamento normal (cartão) — redirecionar direto
      router.push(`/reserva/sucesso/${result.reservation.id}`);
    } else {
      setSubmitError(
        result.error || 'Não foi possível confirmar a reserva. Verifique os dados e tente novamente.'
      );
    }
  };

  // ── Tela de carregamento ──
  if (loading) {
    return (
      <div className="min-h-screen gradient-amazon flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-forest-400 animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Carregando sua reserva…</p>
        </div>
      </div>
    );
  }

  // ── Nenhum item para compra ──
  const hasItem = room || experience;
  if (!hasItem) {
    return (
      <div className="min-h-screen gradient-amazon flex items-center justify-center">
        <div className="glass-dark rounded-3xl p-8 max-w-sm mx-4 border border-white/10 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-white">Nenhum item selecionado</h2>
          <p className="text-white/60 text-sm">
            Selecione uma acomodação ou experiência para continuar.
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Link
              href="/acomodacoes"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full
                bg-forest-500 text-white text-sm font-semibold hover:bg-forest-400 transition-colors"
            >
              <Home className="w-4 h-4" />
              Ver Acomodações
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full
                glass text-white/70 text-sm font-semibold hover:text-white transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Ver Experiências
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const backHref = room
    ? `/acomodacoes/${room.slug}`
    : '/';

  return (
    <div className="min-h-screen gradient-amazon pb-36 pt-16">
      {/* ── Header Compacto ── */}
      <header className="sticky top-16 z-30 glass-dark border-b border-white/8 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>

          <h1 className="font-serif text-base sm:text-lg font-bold text-white">
            {checkout.isExperienceMode ? 'Reservar Experiência' : 'Finalizar Reserva'}
          </h1>

          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Lock className="w-3.5 h-3.5 text-forest-400" />
            <span className="hidden sm:inline">Pagamento Seguro</span>
          </div>
        </div>
      </header>

      {/* ── Banner da Experiência (somente no modo avulso) ── */}
      {checkout.isExperienceMode && experience && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <div className="relative overflow-hidden rounded-3xl h-40 sm:h-52">
            <Image
              src={experience.imageUrl}
              alt={experience.name}
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-forest-950/90 to-transparent" />
            <div className="absolute inset-0 flex items-center px-6">
              <div>
                <span className="text-gold-400/80 text-xs uppercase tracking-widest font-semibold">
                  Experiência Selecionada
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mt-1">
                  {experience.name}
                </h2>
                <p className="text-white/60 text-sm mt-1 max-w-xs">{experience.shortDescription}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Layout Principal ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 xl:gap-8 items-start">

          {/* ── Coluna Esquerda: Formulários ── */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Editor de Estadia/Agendamento (edição inline) */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <StayEditor
                mode={checkout.isExperienceMode ? 'experience' : 'room'}
                roomName={room?.name}
                experienceName={experience?.name}
                checkIn={checkout.checkIn}
                checkOut={checkout.checkOut}
                onCheckInChange={checkout.setCheckIn}
                onCheckOutChange={checkout.setCheckOut}
                guests={checkout.guests}
                onGuestsChange={checkout.setGuests}
                maxGuests={checkout.isExperienceMode ? 10 : room?.maxGuests || 10}
                nights={checkout.nights}
                pricePerNight={checkout.isExperienceMode ? (experience?.price || 0) : (room?.pricePerNight || 0)}
                roomSubtotal={checkout.isExperienceMode ? checkout.experienceSubtotal : checkout.roomSubtotal}
                onBackToRoom={room ? () => router.push(`/acomodacoes/${room.slug}`) : undefined}
                onBackToExperience={experience ? () => router.push(`/experiencias/${experience.slug}`) : undefined}
              />
            </motion.section>

            {/* Add-ons (somente para reserva de quarto) */}
            {!checkout.isExperienceMode && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <AddonsSelector
                  addons={addons}
                  selectedAddons={checkout.selectedAddons}
                  onToggleAddon={checkout.toggleAddon}
                  guests={checkout.guests}
                />
              </motion.section>
            )}

            {/* Cupom de Desconto */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: checkout.isExperienceMode ? 0.1 : 0.15 }}
            >
              <CouponInput
                orderTotal={checkout.roomSubtotal + checkout.addonsSubtotal + checkout.experienceSubtotal + checkout.selectedExperiencesSubtotal}
                onApply={checkout.applyCoupon}
                onRemove={checkout.removeCoupon}
                appliedCoupon={checkout.appliedCoupon}
                appliedDiscount={checkout.couponDiscount}
                disabled={checkout.isSubmitting}
              />
            </motion.section>

            {/* Experiências (up-sell — somente no modo acomodação) */}
            {!checkout.isExperienceMode && experiences.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
              >
                <ExperiencesSelector
                  experiences={experiences}
                  selected={checkout.selectedExperiences}
                  onToggle={checkout.toggleExperience}
                  onUpdateSchedule={checkout.updateExperienceSchedule}
                  guests={checkout.guests}
                />
              </motion.section>
            )}

            {/* Dados do Hóspede + Data/Hora (experiência) */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: checkout.isExperienceMode ? 0.1 : 0.2 }}
            >
              <GuestForm
                guestData={checkout.guestData}
                onChangeField={checkout.updateGuestField}
                errors={checkout.errors}
                isExperienceMode={checkout.isExperienceMode}
                serviceDate={checkout.serviceDate}
                serviceTime={checkout.serviceTime}
                onServiceDateChange={checkout.setServiceDate}
                onServiceTimeChange={checkout.setServiceTime}
              />
            </motion.section>

            {/* Pagamento */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: checkout.isExperienceMode ? 0.2 : 0.3 }}
            >
              <PaymentMethodSelector
                paymentMethod={checkout.paymentMethod}
                onSelectMethod={checkout.setPaymentMethod}
                cardData={checkout.cardData}
                onChangeCard={checkout.updateCardField}
                totalPrice={checkout.totalPrice}
                pixDiscount={checkout.pixDiscount}
                error={checkout.errors.card}
              />
            </motion.section>

            {/* Erro de submit */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-red-900/30 border border-red-400/30 text-red-300 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Coluna Direita: Resumo (sticky no desktop) ── */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-[130px]">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* Resumo para acomodação (padrão) */}
              {room && (
                <BookingSummaryCard
                  room={room}
                  checkIn={checkout.checkIn}
                  checkOut={checkout.checkOut}
                  guests={checkout.guests}
                  nights={checkout.nights}
                  selectedAddons={checkout.selectedAddons}
                  selectedExperiences={checkout.selectedExperiences}
                  roomSubtotal={checkout.roomSubtotal}
                  addonsSubtotal={checkout.addonsSubtotal}
                  selectedExperiencesSubtotal={checkout.selectedExperiencesSubtotal}
                  pixDiscount={checkout.pixDiscount}
                  couponDiscount={checkout.couponDiscount}
                  appliedCoupon={checkout.appliedCoupon}
                  totalPrice={checkout.totalPrice}
                  paymentMethod={checkout.paymentMethod}
                />
              )}

              {/* Resumo simples para experiência avulsa */}
              {checkout.isExperienceMode && experience && (
                <div className="glass-dark rounded-3xl p-5 border border-white/10 space-y-4">
                  <h3 className="font-serif text-lg font-bold text-white">Resumo</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-white/70">
                      <span>{experience.name}</span>
                      <span>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(experience.price)}
                        {experience.priceType === 'per_person' ? ' × ' + checkout.guests + ' pessoa(s)' : ''}
                      </span>
                    </div>
                    {checkout.pixDiscount > 0 && (
                      <div className="flex justify-between text-forest-400 text-xs">
                        <span>Desconto PIX (5%)</span>
                        <span>− {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(checkout.pixDiscount)}</span>
                      </div>
                    )}
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between font-bold text-white text-base">
                      <span>Total</span>
                      <span className="text-gradient-gold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(checkout.totalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Quantidade de pessoas */}
                  <div>
                    <label className="text-xs text-white/50 mb-2 block">Número de Pessoas</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => checkout.setGuests(Math.max(1, checkout.guests - 1))}
                        className="w-9 h-9 rounded-full glass flex items-center justify-center text-white/70 hover:text-white transition-colors text-lg font-bold"
                      >−</button>
                      <span className="text-white font-bold text-lg w-8 text-center">{checkout.guests}</span>
                      <button
                        onClick={() => checkout.setGuests(Math.min(10, checkout.guests + 1))}
                        className="w-9 h-9 rounded-full glass flex items-center justify-center text-white/70 hover:text-white transition-colors text-lg font-bold"
                      >+</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicador de segurança */}
              <div className="flex items-center justify-center gap-2 text-xs text-white/35">
                <ShieldCheck className="w-3.5 h-3.5 text-forest-400" />
                SSL · Cancelamento Flexível · Sem Taxas Ocultas
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Barra de Confirmação Fixa (Bottom) ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-4 pb-safe bg-forest-950/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Total animado */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider">
              {checkout.isExperienceMode ? 'Total do Serviço' : 'Total da Reserva'}
            </p>
            <AnimatedTotal
              value={checkout.totalPrice}
              className="text-gradient-gold text-2xl sm:text-3xl font-bold font-serif"
            />
          </div>

          {/* Botão Confirmar */}
          <motion.button
            id="btn-confirm-booking"
            onClick={handleSubmit}
            disabled={checkout.isSubmitting}
            whileHover={checkout.isSubmitting ? {} : { scale: 1.03 }}
            whileTap={checkout.isSubmitting ? {} : { scale: 0.97 }}
            className="flex items-center gap-2.5 px-7 sm:px-10 py-3.5 sm:py-4 rounded-full
              bg-forest-500 hover:bg-forest-400 disabled:bg-forest-700 disabled:cursor-not-allowed
              text-white font-bold text-sm sm:text-base shadow-lg shadow-forest-900/60
              border border-forest-400/30 transition-colors"
          >
            {checkout.isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Confirmando…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>
                  {checkout.isExperienceMode ? 'Confirmar Experiência' : 'Confirmar Reserva'}
                </span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
