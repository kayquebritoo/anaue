// ============================================================
// scripts/test-room-blocks.ts
// Testes Automatizados para o Módulo de Bloqueios Manuais de Quartos
// Integração Anti-Overbooking, Server Actions e Ciclo de Vida
// ============================================================

import {
  createRoomBlockAction,
  deleteRoomBlockAction,
  getAllRoomBlocksAction,
} from '../app/actions/roomBlock';
import { getUnavailableRoomIdsAsync } from '../lib/supabaseData';
import { createBookingAction } from '../app/actions/booking';

async function runTests() {
  console.log('🌲 [TEST] Iniciando validação do Módulo de Bloqueios Manuais de Quartos...\n');

  const testRoomId = 'room-002'; // Cupuaçu
  const blockStart = '2026-12-10';
  const blockEnd = '2026-12-15';

  // 1. Teste de Validação de Datas Inválidas
  console.log('1. Testando validação de datas inconsistentes...');
  const invalidDateRes = await createRoomBlockAction({
    roomId: testRoomId,
    startDate: '2026-12-20',
    endDate: '2026-12-10', // Término antes do início
    reason: 'maintenance',
  });
  if (invalidDateRes.success) {
    throw new Error('❌ Deveria ter rejeitado data de término anterior à data de início.');
  }
  console.log('✅ Rejeição correta para datas inconsistentes.');

  // 2. Criação de Bloqueio Válido
  console.log('\n2. Testando criação de bloqueio manual...');
  const createRes = await createRoomBlockAction({
    roomId: testRoomId,
    startDate: blockStart,
    endDate: blockEnd,
    reason: 'maintenance',
    notes: 'Reforma do piso e instalação de novo deck panorâmico.',
  });

  if (!createRes.success || !createRes.block?.id) {
    throw new Error(`❌ Falha ao criar bloqueio: ${createRes.error}`);
  }
  const createdBlockId = createRes.block.id;
  console.log(`✅ Bloqueio criado com sucesso! (ID: ${createdBlockId}, Quarto: ${testRoomId}, Período: ${blockStart} a ${blockEnd})`);

  // 3. Verificação no Motor Anti-Overbooking (getUnavailableRoomIdsAsync)
  console.log('\n3. Verificando se o motor anti-overbooking detecta o quarto bloqueado...');
  const unavailableRooms = await getUnavailableRoomIdsAsync('2026-12-11', '2026-12-14');
  if (!unavailableRooms.has(testRoomId)) {
    throw new Error(`❌ Motor anti-overbooking NÃO detectou o quarto ${testRoomId} como indisponível.`);
  }
  console.log(`✅ Motor anti-overbooking bloqueou com sucesso o quarto ${testRoomId} para o período!`);

  // 4. Teste de Trava no Motor de Reservas (createBookingAction)
  console.log('\n4. Testando trava no checkout direto (createBookingAction)...');
  const bookingAttempt = await createBookingAction({
    roomId: testRoomId,
    checkIn: '2026-12-12',
    checkOut: '2026-12-14',
    guests: 2,
    totalPrice: 1500,
    roomPrice: 1500,
    addonsPrice: 0,
    discountPrice: 0,
    guestName: 'Cliente Teste Bloqueio',
    guestEmail: 'cliente.teste@example.com',
    paymentMethod: 'pix',
  });

  if (bookingAttempt.success) {
    throw new Error('❌ Falha na trava! Reserva foi criada em quarto bloqueado.');
  }
  console.log(`✅ Trava funcionou perfeitamente! Reserva rejeitada com: "${bookingAttempt.error}"`);

  // 5. Listagem de Bloqueios
  console.log('\n5. Testando listagem de bloqueios via getAllRoomBlocksAction...');
  const listRes = await getAllRoomBlocksAction();
  if (!listRes.success || !listRes.blocks) {
    throw new Error('❌ Falha ao listar bloqueios.');
  }
  const found = listRes.blocks.find((b) => b.id === createdBlockId);
  if (!found) {
    throw new Error('❌ Bloqueio criado não foi encontrado na listagem.');
  }
  console.log(`✅ Bloqueio encontrado na listagem com nome de acomodação: "${found.roomName}"`);

  // 6. Remoção de Bloqueio (Liberação do Quarto)
  console.log('\n6. Testando exclusão / liberação do quarto...');
  const deleteRes = await deleteRoomBlockAction(createdBlockId);
  if (!deleteRes.success) {
    throw new Error(`❌ Falha ao remover bloqueio: ${deleteRes.error}`);
  }
  console.log('✅ Bloqueio removido com sucesso!');

  // 7. Confirmação de Liberação no Motor Anti-Overbooking
  console.log('\n7. Confirmando liberação do quarto no motor anti-overbooking...');
  const afterDeleteUnavailable = await getUnavailableRoomIdsAsync('2026-12-11', '2026-12-14');
  if (afterDeleteUnavailable.has(testRoomId)) {
    throw new Error(`❌ Quarto ${testRoomId} ainda consta como bloqueado após a exclusão.`);
  }
  console.log(`✅ Quarto ${testRoomId} liberado com sucesso para novas reservas!`);

  console.log('\n🎉 TODOS OS TESTES DO MÓDULO DE BLOQUEIOS PASSARAM COM 100% DE SUCESSO!\n');
}

runTests().catch((err) => {
  console.error('❌ Erro durante os testes de bloqueios:', err);
  process.exit(1);
});
