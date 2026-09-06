// ============================================================
// scripts/test-email.ts
// Testes Automatizados para o Módulo de E-mail de Confirmação
// ============================================================

import {
  generateBookingEmailHtml,
  generateBookingEmailText,
  sendBookingConfirmationEmail,
} from '../lib/email';
import type { Reservation, Room } from '../types';

async function runTests() {
  console.log('🌲 [TEST] Iniciando validação do Módulo de E-mails Anauê Amazônia...');

  const mockRoom: Room = {
    id: 'room-001',
    slug: 'bacuri',
    name: 'Bangalô Bacurí Master',
    type: 'bangalo',
    category: 'deluxe',
    shortDescription: 'Vista panorâmica da copa das árvores.',
    longDescription: 'Experiência única em bangalô de luxo.',
    pricePerNight: 850,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 45,
    amenities: [],
    images: [
      {
        url: '/images/quartos/bacuri/_DSC7398.webp',
        alt: 'Bangalô Bacurí',
        isPrimary: true,
      },
    ],
    rating: 5.0,
    reviewCount: 24,
    isFeatured: true,
    isAvailable: true,
    tags: ['luxo', 'floresta'],
  };

  const mockBooking: Reservation = {
    id: 'res-test-999',
    bookingCode: 'AN-K89X',
    userId: 'guest-123',
    roomId: 'room-001',
    checkIn: '2026-10-15',
    checkOut: '2026-10-18',
    guests: 2,
    roomPrice: 2550,
    addonsPrice: 380,
    discountPrice: 200,
    totalPrice: 2730,
    status: 'confirmed',
    paymentMethod: 'pix',
    guestName: 'Carlos Eduardo Silveira',
    guestEmail: 'carlos.silveira@example.com',
    guestPhone: '+55 (11) 98888-7777',
    selectedAddons: [
      {
        id: 'addon-1',
        name: 'Trilha Noturna na Selva com Guia Nativo',
        price: 260,
      },
      {
        id: 'addon-2',
        name: 'Cesta de Frutas Amazônicas e Cupuaçu',
        price: 120,
      },
    ],
    specialRequests: 'Preferência por travesseiros antialérgicos.',
    createdAt: new Date().toISOString(),
  };

  // 1. Validar Geração do Template HTML
  console.log('\n1. Testando geração do Template HTML...');
  const html = generateBookingEmailHtml(mockBooking, mockRoom);

  if (!html.includes('AN-K89X')) {
    throw new Error('❌ Código da reserva não encontrado no HTML.');
  }
  if (!html.includes('Bangalô Bacurí Master')) {
    throw new Error('❌ Nome do quarto não encontrado no HTML.');
  }
  if (!html.includes('Carlos Eduardo Silveira')) {
    throw new Error('❌ Nome do hóspede não encontrado no HTML.');
  }
  if (!html.includes('Trilha Noturna na Selva')) {
    throw new Error('❌ Adicional contratado não encontrado no HTML.');
  }
  if (!html.includes('R$&nbsp;2.730,00') && !html.includes('2.730,00')) {
    throw new Error('❌ Valor total não formatado corretamente no HTML.');
  }
  if (!html.includes('CONFIRMADA')) {
    throw new Error('❌ Badge de status não encontrada no HTML.');
  }
  console.log('✅ Template HTML gerado e validado com sucesso! (Tamanho:', html.length, 'bytes)');

  // 2. Validar Template de Texto Plano
  console.log('\n2. Testando template de texto plano...');
  const text = generateBookingEmailText(mockBooking, mockRoom);
  if (!text.includes('AN-K89X') || !text.includes('Bangalô Bacurí Master')) {
    throw new Error('❌ Texto plano incompleto.');
  }
  console.log('✅ Template de texto plano validado com sucesso!');

  // 3. Testar disparo do sendBookingConfirmationEmail (Fallback/Mock resiliente)
  console.log('\n3. Testando disparo resiliente da função sendBookingConfirmationEmail...');
  const result = await sendBookingConfirmationEmail(mockBooking, mockRoom);

  if (!result.success) {
    throw new Error(`❌ Envio falhou inesperadamente: ${result.error}`);
  }
  console.log(`✅ Disparo executado com sucesso (Provedor ativo: ${result.provider})!`);

  // 4. Testar validação com e-mail inválido
  console.log('\n4. Testando segurança com e-mail inválido...');
  const invalidResult = await sendBookingConfirmationEmail({
    ...mockBooking,
    guestEmail: 'invalid-email',
  });
  if (invalidResult.success) {
    throw new Error('❌ Deveria ter rejeitado e-mail inválido.');
  }
  console.log('✅ Rejeição graciosa de e-mail inválido validada com sucesso.');

  console.log('\n🎉 TODOS OS TESTES DO MÓDULO DE E-MAIL PASSARAM COM SUCESSO!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes de e-mail:', err);
  process.exit(1);
});
