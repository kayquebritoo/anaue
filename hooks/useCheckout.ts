'use client';

// ============================================================
// hooks/useCheckout.ts
// Custom Hook — Gerencia estado e cálculos do Checkout
// Sprint 4: Suporte a compra avulsa de Experiências (sem quarto)
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import type {
  Room,
  Experience,
  AddonExperience,
  GuestFormData,
  PaymentMethodType,
  CreditCardData,
  Reservation,
  Coupon,
} from '@/types';
import { createBookingAction } from '@/app/actions/booking';
import type { SelectedExperience } from '@/components/checkout/ExperiencesSelector';

interface UseCheckoutProps {
  room: Room | null;
  experience?: Experience | null;  // Sprint 4: compra avulsa de experiência
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  initialGuests?: number;
}

const DEFAULT_GUEST_DATA: GuestFormData = {
  fullName: '',
  email: '',
  phone: '',
  document: '',
  specialRequests: '',
  requestInvoice: false,
  taxId: '',
  companyName: '',
  billingAddress: '',
};

const DEFAULT_CARD_DATA: CreditCardData = {
  cardNumber: '',
  cardHolder: '',
  expiryDate: '',
  cvv: '',
  installments: 1,
};

export function useCheckout({
  room,
  experience = null,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
}: UseCheckoutProps) {
  // Modo: acomodação ou experiência avulsa
  const isExperienceMode = !room && experience !== null;

  // Datas padrão se não fornecidas (amanhã + 3 dias)
  const defaultDates = useMemo(() => {
    const today = new Date();
    const checkin = new Date(today);
    checkin.setDate(today.getDate() + 1);

    const checkout = new Date(today);
    checkout.setDate(today.getDate() + 4);

    return {
      in: checkin.toISOString().split('T')[0],
      out: checkout.toISOString().split('T')[0],
    };
  }, []);

  const [checkIn, setCheckIn] = useState<string>(initialCheckIn || defaultDates.in);
  const [checkOut, setCheckOut] = useState<string>(initialCheckOut || defaultDates.out);
  const [guests, setGuests] = useState<number>(initialGuests);

  // Sprint 4: Data/Hora para serviço avulso de experiência
  const [serviceDate, setServiceDate] = useState<string>('');
  const [serviceTime, setServiceTime] = useState<string>('');

  const [selectedAddons, setSelectedAddons] = useState<AddonExperience[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<SelectedExperience[]>([]);
  const [guestData, setGuestData] = useState<GuestFormData>(DEFAULT_GUEST_DATA);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('pix');
  const [cardData, setCardData] = useState<CreditCardData>(DEFAULT_CARD_DATA);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Record<keyof GuestFormData | 'card' | 'serviceDate' | 'serviceTime', string>>>({});

  // Cupom de desconto
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  // Cálculo de Noites
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const calculated = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return calculated > 0 ? calculated : 1;
  }, [checkIn, checkOut]);

  // Subtotal da Acomodação
  const roomSubtotal = useMemo(() => {
    if (!room) return 0;
    return room.pricePerNight * nights;
  }, [room, nights]);

  // Subtotal da Experiência avulsa
  const experienceSubtotal = useMemo(() => {
    if (!experience) return 0;
    const multiplier = experience.priceType === 'per_person' ? guests : 1;
    return experience.price * multiplier;
  }, [experience, guests]);

  // Subtotal dos Adicionais
  const addonsSubtotal = useMemo(() => {
    return selectedAddons.reduce((acc, addon) => {
      const multiplier = addon.priceType === 'per_person' ? guests : 1;
      return acc + addon.price * multiplier;
    }, 0);
  }, [selectedAddons, guests]);

  // Subtotal das Experiências selecionadas (up-sell)
  const selectedExperiencesSubtotal = useMemo(() => {
    return selectedExperiences.reduce((acc, se) => {
      const multiplier = se.experience.priceType === 'per_person' ? guests : 1;
      return acc + se.experience.price * multiplier;
    }, 0);
  }, [selectedExperiences, guests]);

  // Base para cálculo do desconto PIX
  const baseSubtotal = useMemo(() => {
    return roomSubtotal + experienceSubtotal + addonsSubtotal + selectedExperiencesSubtotal;
  }, [roomSubtotal, experienceSubtotal, addonsSubtotal, selectedExperiencesSubtotal]);

  // Desconto PIX (5%)
  const pixDiscount = useMemo(() => {
    if (paymentMethod !== 'pix') return 0;
    return Math.round(baseSubtotal * 0.05);
  }, [paymentMethod, baseSubtotal]);

  // Total Geral
  const totalPrice = useMemo(() => {
    return Math.max(0, baseSubtotal - pixDiscount - couponDiscount);
  }, [baseSubtotal, pixDiscount, couponDiscount]);

  // Toggle de Addon
  const toggleAddon = useCallback((addon: AddonExperience) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((item) => item.id === addon.id);
      if (exists) {
        return prev.filter((item) => item.id !== addon.id);
      }
      return [...prev, addon];
    });
  }, []);

  // Toggle de Experiência (up-sell)
  const toggleExperience = useCallback((exp: Experience) => {
    setSelectedExperiences((prev) => {
      const exists = prev.some((se) => se.experience.id === exp.id);
      if (exists) {
        return prev.filter((se) => se.experience.id !== exp.id);
      }
      return [...prev, { experience: exp, date: '', time: '' }];
    });
  }, []);

  // Atualizar data/horário de uma experiência selecionada
  const updateExperienceSchedule = useCallback((experienceId: string, date: string, time: string) => {
    setSelectedExperiences((prev) =>
      prev.map((se) =>
        se.experience.id === experienceId ? { ...se, date, time } : se
      )
    );
  }, []);

  // Atualização dos dados do hóspede
  const updateGuestField = useCallback((field: keyof GuestFormData, value: any) => {
    setGuestData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  // Atualização dos dados do cartão
  const updateCardField = useCallback((field: keyof CreditCardData, value: string | number) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, card: undefined }));
  }, []);

  // Cupom de desconto
  const applyCoupon = useCallback((coupon: Coupon, discount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discount);
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  }, []);

  // Validação
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof GuestFormData | 'card' | 'serviceDate' | 'serviceTime', string>> = {};

    if (!guestData.fullName.trim() || guestData.fullName.trim().length < 3) {
      newErrors.fullName = 'Informe seu nome completo';
    }
    if (!guestData.email.trim() || !guestData.email.includes('@')) {
      newErrors.email = 'Informe um e-mail válido';
    }
    if (!guestData.phone.trim() || guestData.phone.trim().length < 8) {
      newErrors.phone = 'Informe seu WhatsApp / telefone com DDD';
    }
    if (!guestData.document.trim() || guestData.document.trim().length < 5) {
      newErrors.document = 'Informe o CPF ou Passaporte';
    }

    // Validação extra para modo de experiência avulsa
    if (isExperienceMode) {
      if (!serviceDate) {
        newErrors.serviceDate = 'Selecione uma data para o serviço';
      }
      if (!serviceTime) {
        newErrors.serviceTime = 'Selecione um horário para o serviço';
      }
    }

    if (paymentMethod === 'credit_card') {
      if (!cardData.cardNumber.trim() || cardData.cardNumber.replace(/\s/g, '').length < 13) {
        newErrors.card = 'Número de cartão inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [guestData, paymentMethod, cardData, isExperienceMode, serviceDate, serviceTime]);

  // Processar e Confirmar Reserva via Server Action
  const submitBooking = useCallback(async (): Promise<{ success: boolean; reservation?: Reservation; error?: string }> => {
    if (!room && !experience) {
      return { success: false, error: 'Selecione uma acomodação ou experiência para continuar.' };
    }
    if (!validate()) {
      return { success: false, error: 'Por favor, preencha todos os campos obrigatórios corretamente.' };
    }

    setIsSubmitting(true);

    try {
      const effectiveCheckIn = isExperienceMode ? serviceDate : checkIn;
      const effectiveCheckOut = isExperienceMode ? serviceDate : checkOut;

      const result = await createBookingAction({
        roomId: room?.id || null,
        experienceId: experience?.id || null,
        checkIn: effectiveCheckIn,
        checkOut: effectiveCheckOut,
        guests,
        totalPrice,
        roomPrice: isExperienceMode ? experienceSubtotal : roomSubtotal,
        addonsPrice: addonsSubtotal + selectedExperiencesSubtotal,
        discountPrice: pixDiscount,
        specialRequests: guestData.specialRequests || null,
        guestName: guestData.fullName,
        guestEmail: guestData.email,
        guestPhone: guestData.phone,
        guestDocument: guestData.document,
        taxId: guestData.requestInvoice ? guestData.taxId || guestData.document : null,
        companyName: guestData.requestInvoice ? guestData.companyName || guestData.fullName : null,
        billingAddress: guestData.requestInvoice ? guestData.billingAddress : null,
        invoiceStatus: guestData.requestInvoice ? 'pending' : 'exempt',
        paymentMethod,
        selectedAddons: [
          ...selectedAddons.map((a) => ({
            id: a.id,
            name: a.name,
            price: a.price * (a.priceType === 'per_person' ? guests : 1),
          })),
          ...selectedExperiences.map((se) => ({
            id: se.experience.id,
            name: `${se.experience.name} (${se.date || 'a definir'} ${se.time || ''})`.trim(),
            price: se.experience.price * (se.experience.priceType === 'per_person' ? guests : 1),
          })),
        ],
        isExperienceMode,
      });

      setIsSubmitting(false);

      if (!result.success || !result.reservation) {
        return {
          success: false,
          error: result.error || 'Não foi possível confirmar sua reserva. Tente novamente.',
        };
      }

      // Salva no sessionStorage para hidratação imediata na tela de confirmação
      if (typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem('anaue_reservations_store') || '[]';
          const list = JSON.parse(raw);
          sessionStorage.setItem('anaue_reservations_store', JSON.stringify([result.reservation, ...list]));
        } catch {
          // Ignorar quota
        }
      }

      return {
        success: true,
        reservation: result.reservation,
      };
    } catch (err) {
      setIsSubmitting(false);
      return {
        success: false,
        error: 'Erro inesperado ao processar a reserva. Verifique sua conexão.',
      };
    }
  }, [
    room,
    experience,
    validate,
    checkIn,
    checkOut,
    serviceDate,
    guests,
    totalPrice,
    roomSubtotal,
    experienceSubtotal,
    addonsSubtotal,
    selectedExperiencesSubtotal,
    pixDiscount,
    guestData,
    paymentMethod,
    selectedAddons,
    selectedExperiences,
    isExperienceMode,
  ]);

  return {
    // Modo
    isExperienceMode,

    // Datas de acomodação
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,

    // Data/Hora de serviço (experiência avulsa)
    serviceDate,
    setServiceDate,
    serviceTime,
    setServiceTime,

    // Hóspedes
    guests,
    setGuests,
    nights,

    // Adicionais
    selectedAddons,
    toggleAddon,

    // Experiências (up-sell)
    selectedExperiences,
    selectedExperiencesSubtotal,
    toggleExperience,
    updateExperienceSchedule,

    // Dados do hóspede
    guestData,
    updateGuestField,

    // Pagamento
    paymentMethod,
    setPaymentMethod,
    cardData,
    updateCardField,

    // Cálculos financeiros
    roomSubtotal,
    experienceSubtotal,
    addonsSubtotal,
    pixDiscount,
    couponDiscount,
    appliedCoupon,
    totalPrice,

    // Cupom
    applyCoupon,
    removeCoupon,

    // Controle de estado
    isSubmitting,
    errors,
    submitBooking,
  };
}
