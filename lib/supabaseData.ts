// ============================================================
// lib/supabaseData.ts
// Camada Assíncrona de Data Fetching via Supabase (PostgreSQL)
// Com fallback automático para Mock Data se Supabase estiver offline
// ============================================================

import { supabase } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import { hasIcalDateConflict, parseIcalEvents, type IcalEvent } from '@/lib/icalParser';
import { shouldUseMockData, DataUnavailableError } from '@/lib/dataMode';
import { parseBookingRef } from '@/lib/queryInput';
import { isSafeExternalUrl } from '@/lib/urlSafety';
import { BookingDbError } from '@/lib/bookingErrors';
import type { Room, Experience, Reservation, RoomHousekeeping, ReservationStatus, HousekeepingStatus, Coupon, RoomBlock, RoomBlockReason, InvoiceStatus } from '@/types';
import type { Database, Json, DbRoom, DbExperience, DbBooking, DbCoupon, DbRoomBlock } from '@/types/database';

// ─── MAPPERS DE BANCO PARA MODELOS DE UI ─────────────────────

export function mapDbRoomToRoom(dbRoom: DbRoom): Room {
  return {
    id: dbRoom.id,
    slug: dbRoom.slug,
    name: dbRoom.name,
    type: (dbRoom.type as Room['type']) || 'bangalo',
    category: (dbRoom.category as Room['category']) || 'standard',
    shortDescription: dbRoom.short_description,
    longDescription: dbRoom.long_description,
    pricePerNight: Number(dbRoom.price_per_night),
    maxGuests: dbRoom.max_guests,
    bedrooms: dbRoom.bedrooms || 1,
    bathrooms: dbRoom.bathrooms || 1,
    areaM2: dbRoom.area_m2 || 35,
    amenities: (dbRoom.amenities as unknown as Room['amenities']) || [],
    images: (dbRoom.images as unknown as Room['images']) || [],
    gallery_images: dbRoom.gallery_images || undefined,
    video_url: dbRoom.video_url || null,
    icalImportUrl: dbRoom.ical_import_url || null,
    icalExportUrl: dbRoom.ical_export_url || null,
    icalSyncedAt: dbRoom.ical_synced_at || null,
    rating: Number(dbRoom.rating) || 5.0,
    reviewCount: dbRoom.review_count || 0,
    isFeatured: dbRoom.is_featured,
    isAvailable: dbRoom.is_available,
    tags: dbRoom.tags || [],
  };
}

export function mapDbExperienceToExperience(dbExp: DbExperience): Experience {
  return {
    id: dbExp.id,
    slug: dbExp.slug,
    name: dbExp.name,
    category: (dbExp.category as Experience['category']) || 'bem-estar',
    shortDescription: dbExp.short_description,
    longDescription: dbExp.long_description,
    price: Number(dbExp.price),
    priceType: (dbExp.price_type as Experience['priceType']) || 'per_person',
    duration: dbExp.duration,
    imageUrl: dbExp.image_url,
    gallery_images: dbExp.gallery_images || undefined,
    isPopular: dbExp.is_popular,
  };
}

export function mapDbBookingToReservation(dbBooking: DbBooking): Reservation {
  return {
    id: dbBooking.id,
    bookingCode: dbBooking.booking_code,
    userId: dbBooking.user_id || 'anon',
    roomId: dbBooking.room_id || '',
    checkIn: dbBooking.check_in_date,
    checkOut: dbBooking.check_out_date,
    guests: dbBooking.guests,
    totalPrice: Number(dbBooking.total_price),
    roomPrice: Number(dbBooking.room_price),
    addonsPrice: Number(dbBooking.addons_price),
    discountPrice: Number(dbBooking.discount_price),
    status: (dbBooking.status as ReservationStatus) || 'confirmed',
    specialRequests: dbBooking.special_requests,
    guestName: dbBooking.guest_name,
    guestEmail: dbBooking.guest_email,
    guestPhone: dbBooking.guest_phone,
    guestDocument: dbBooking.guest_document || null,
    taxId: dbBooking.tax_id || null,
    companyName: dbBooking.company_name || null,
    billingAddress: dbBooking.billing_address || null,
    invoiceStatus: (dbBooking.invoice_status as InvoiceStatus) || 'pending',
    invoiceNumber: dbBooking.invoice_number || null,
    invoiceIssuedAt: dbBooking.invoice_issued_at || null,
    paymentMethod: (dbBooking.payment_method as Reservation['paymentMethod']) || 'pix',
    selectedAddons: (dbBooking.selected_addons as unknown as Reservation['selectedAddons']) || [],
    createdAt: dbBooking.created_at,
  };
}

export function mapDbRoomBlockToRoomBlock(dbBlock: DbRoomBlock, roomName?: string): RoomBlock {
  return {
    id: dbBlock.id,
    roomId: dbBlock.room_id,
    roomName: roomName,
    startDate: dbBlock.start_date,
    endDate: dbBlock.end_date,
    reason: (dbBlock.reason as RoomBlockReason) || 'maintenance',
    notes: dbBlock.notes,
    createdAt: dbBlock.created_at,
  };
}

// ─── POLÍTICA DE FALHAS ───────────────────────────────────────
// Com Supabase configurado, erros do banco NUNCA são mascarados com mock:
// a função lança DataUnavailableError (leituras) ou BookingDbError (escritas).
// Mock só é usado quando shouldUseMockData() permite (dev/teste/demo).

function readFailure(context: string, error: unknown): never {
  console.error(`[${context}] Falha ao ler do Supabase:`, error);
  throw new DataUnavailableError(`Não foi possível carregar dados (${context}).`);
}

function writeFailure(context: string, error: { message?: string; code?: string } | null): never {
  console.error(`[${context}] Falha ao gravar no Supabase:`, error);
  throw new BookingDbError(error?.message || `Falha ao gravar (${context})`, error?.code);
}

// ─── ACOMODAÇÕES (ROOMS) ──────────────────────────────────────

export async function getRoomsAsync(): Promise<Room[]> {
  if (shouldUseMockData()) return mockData.getRooms();

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('price_per_night', { ascending: true });

  if (error || !data) readFailure('getRoomsAsync', error);
  return data.map(mapDbRoomToRoom);
}

export async function getFeaturedRoomsAsync(): Promise<Room[]> {
  if (shouldUseMockData()) return mockData.getFeaturedRooms();

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('is_featured', true);

  if (error || !data) readFailure('getFeaturedRoomsAsync', error);
  return data.map(mapDbRoomToRoom);
}

export async function getRoomBySlugAsync(slug: string): Promise<Room | undefined> {
  if (shouldUseMockData()) return mockData.getRoomBySlug(slug);

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) readFailure('getRoomBySlugAsync', error);
  return data ? mapDbRoomToRoom(data) : undefined;
}

export async function getRoomByIdAsync(id: string): Promise<Room | undefined> {
  if (!id) return undefined;
  if (shouldUseMockData()) return mockData.getRoomById(id);

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) readFailure('getRoomByIdAsync', error);
  return data ? mapDbRoomToRoom(data) : undefined;
}

// ─── EXPERIÊNCIAS ─────────────────────────────────────────────

export async function getExperiencesAsync(): Promise<Experience[]> {
  if (shouldUseMockData()) return mockData.getExperiences();

  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .order('price', { ascending: true });

  if (error || !data) readFailure('getExperiencesAsync', error);
  return data.map(mapDbExperienceToExperience);
}

export async function getExperienceBySlugAsync(slug: string): Promise<Experience | undefined> {
  if (shouldUseMockData()) return mockData.getExperienceBySlug(slug);

  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) readFailure('getExperienceBySlugAsync', error);
  return data ? mapDbExperienceToExperience(data) : undefined;
}

export async function getExperienceByIdAsync(id: string): Promise<Experience | undefined> {
  if (!id) return undefined;
  if (shouldUseMockData()) return mockData.getExperienceById(id);

  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) readFailure('getExperienceByIdAsync', error);
  return data ? mapDbExperienceToExperience(data) : undefined;
}

// ─── RESERVAS (BOOKINGS) ──────────────────────────────────────

export async function getBookingsAsync(): Promise<Reservation[]> {
  if (shouldUseMockData()) return mockData.getAllReservations();

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('check_in_date', { ascending: true });

  // Lista vazia é um resultado válido — não substituir por hóspedes fictícios.
  if (error || !data) readFailure('getBookingsAsync', error);
  return data.map(mapDbBookingToReservation);
}

/**
 * Retorna os IDs dos quartos com reserva conflitante para o intervalo solicitado.
 * Fórmula de sobreposição: (check_in < requestedCheckOut) AND (check_out > requestedCheckIn)
 * Reservas canceladas são ignoradas. Considera bloqueios manuais e iCal externo.
 * Em falha do banco, lança (a tela não deve exibir disponibilidade inventada).
 */
export async function getUnavailableRoomIdsAsync(
  checkIn: string,
  checkOut: string
): Promise<Set<string>> {
  if (shouldUseMockData()) {
    const blocked = new Set<string>();
    mockData
      .getAllReservations()
      .filter((res) => res.status !== 'cancelled' && res.roomId && res.checkIn < checkOut && res.checkOut > checkIn)
      .forEach((res) => blocked.add(res.roomId));
    mockData
      .getAllRoomBlocks()
      .filter((b) => b.roomId && b.startDate < checkOut && b.endDate > checkIn)
      .forEach((b) => blocked.add(b.roomId));
    // Em modo mock não há fetch real de iCal externo
    return blocked;
  }

  // 1. Reservas ativas
  const { data, error } = await supabase
    .from('bookings')
    .select('room_id')
    .neq('status', 'cancelled')
    .not('room_id', 'is', null)
    .lt('check_in_date', checkOut)
    .gt('check_out_date', checkIn);

  if (error || !data) readFailure('getUnavailableRoomIdsAsync:bookings', error);
  const blockedRoomIds = new Set<string>(data.map((row) => row.room_id as string).filter(Boolean));

  // 2. Bloqueios manuais (room_blocks)
  const { data: blocksData, error: blocksError } = await supabase
    .from('room_blocks')
    .select('room_id')
    .lt('start_date', checkOut)
    .gt('end_date', checkIn);

  if (blocksError || !blocksData) readFailure('getUnavailableRoomIdsAsync:room_blocks', blocksError);
  for (const row of blocksData) {
    if (row.room_id) blockedRoomIds.add(row.room_id as string);
  }

  // 3. Bloqueios iCal externos (melhor esforço: falha de fetch não bloqueia o quarto)
  const { data: roomsData } = await supabase.from('rooms').select('id, ical_import_url');
  if (roomsData) {
    for (const room of roomsData) {
      if (room.ical_import_url && room.id) {
        try {
          const events = await fetchIcalEventsAsync(room.ical_import_url);
          if (hasIcalDateConflict(checkIn, checkOut, events)) {
            blockedRoomIds.add(room.id);
          }
        } catch {
          // ignora
        }
      }
    }
  }

  return blockedRoomIds;
}

/**
 * Busca e faz o parse de uma URL iCal, retornando os eventos extraídos.
 */
export async function fetchIcalEventsAsync(url: string): Promise<IcalEvent[]> {
  if (!isSafeExternalUrl(url)) {
    console.warn('[fetchIcalEventsAsync] URL iCal recusada (não é https público).');
    return [];
  }
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/calendar, text/plain, */*' },
      next: { revalidate: 300 }, // cache por 5 minutos
    });

    if (!response.ok) {
      throw new Error(`iCal fetch failed: ${response.status}`);
    }

    const text = await response.text();
    return parseIcalEvents(text);
  } catch {
    return [];
  }
}

/**
 * @deprecated Use createBookingAction (app/actions/booking.ts), que faz a
 * pré-checagem de disponibilidade e trata conflitos do banco.
 * Lança erro em falha de persistência — nunca retorna reserva mock com o
 * Supabase configurado.
 */
export async function createBookingAsync(
  payload: Omit<Reservation, 'id' | 'bookingCode' | 'createdAt' | 'status'> & { status?: ReservationStatus }
): Promise<Reservation> {
  if (shouldUseMockData()) return mockData.createReservation(payload);

  const bookingCode = `AN-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      booking_code: bookingCode,
      room_id: payload.roomId || null,
      user_id: payload.userId || null,
      guest_name: payload.guestName,
      guest_email: payload.guestEmail,
      guest_phone: payload.guestPhone,
      check_in_date: payload.checkIn,
      check_out_date: payload.checkOut,
      guests: payload.guests,
      room_price: payload.roomPrice,
      addons_price: payload.addonsPrice,
      discount_price: payload.discountPrice,
      total_price: payload.totalPrice,
      status: payload.status || 'confirmed',
      special_requests: payload.specialRequests,
      payment_method: payload.paymentMethod,
      selected_addons: payload.selectedAddons as unknown as Json,
    })
    .select()
    .single();

  if (error || !data) writeFailure('createBookingAsync', error);
  return mapDbBookingToReservation(data);
}

/** Atualiza status por ID ou localizador validados (sem filtros montados com entrada do usuário). */
export async function updateBookingStatusAsync(
  idOrCode: string,
  newStatus: ReservationStatus
): Promise<Reservation | undefined> {
  if (shouldUseMockData()) return mockData.updateReservationStatus(idOrCode, newStatus);

  const ref = parseBookingRef(idOrCode);
  if (!ref) return undefined;

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq(ref.column, ref.value)
    .select()
    .maybeSingle();

  if (error) writeFailure('updateBookingStatusAsync', error);
  return data ? mapDbBookingToReservation(data) : undefined;
}

// ─── GOVERNANÇA (HOUSEKEEPING) ────────────────────────────────

export async function getHousekeepingAsync(): Promise<RoomHousekeeping[]> {
  if (shouldUseMockData()) return mockData.getHousekeepingList();

  const { data, error } = await supabase.from('housekeeping').select('*');
  if (error || !data) readFailure('getHousekeepingAsync', error);

  const rooms = await getRoomsAsync();
  // Quartos sem registro aparecem com status padrão — nunca com dados fictícios.
  return rooms.map((room) => {
    const hk = data.find((item) => item.room_id === room.id);
    return {
      roomId: room.id,
      roomName: room.name,
      status: (hk?.status as HousekeepingStatus) || 'clean',
      lastCleanedAt: hk?.last_cleaned_at || new Date().toISOString(),
      housekeeperName: hk?.housekeeper_name || 'Equipe Anauê',
      notes: hk?.notes || undefined,
      maintenanceAlert: hk?.maintenance_alert || null,
    };
  });
}

export async function updateHousekeepingAsync(
  roomId: string,
  newStatus: HousekeepingStatus,
  notes?: string
): Promise<RoomHousekeeping> {
  if (shouldUseMockData()) return mockData.updateRoomHousekeeping(roomId, newStatus, notes);

  const { data, error } = await supabase
    .from('housekeeping')
    .upsert({
      room_id: roomId,
      status: newStatus,
      last_cleaned_at: new Date().toISOString(),
      notes: notes || null,
    })
    .select()
    .single();

  if (error || !data) writeFailure('updateHousekeepingAsync', error);

  return {
    roomId: data.room_id,
    roomName: (await getRoomByIdAsync(roomId))?.name || 'Quarto',
    status: data.status as HousekeepingStatus,
    lastCleanedAt: data.last_cleaned_at,
    housekeeperName: data.housekeeper_name,
    notes: data.notes || undefined,
    maintenanceAlert: data.maintenance_alert,
  };
}

// ─── COUPONS (Cupons de Desconto) ───────────────────────────

export function mapDbCouponToCoupon(dbCoupon: DbCoupon): Coupon {
  return {
    id: dbCoupon.id,
    code: dbCoupon.code,
    discountType: dbCoupon.discount_type as Coupon['discountType'],
    discountValue: Number(dbCoupon.discount_value),
    minSpend: Number(dbCoupon.min_spend),
    expiresAt: dbCoupon.expires_at,
    isActive: dbCoupon.is_active,
    createdAt: dbCoupon.created_at,
  };
}

/**
 * Cupom inexistente no banco retorna undefined. Antes, "não encontrado"
 * caía nos cupons mock — cupons fictícios eram aceitos em produção.
 */
export async function getCouponByCodeAsync(code: string): Promise<Coupon | undefined> {
  if (shouldUseMockData()) return mockData.getCouponByCode(code);

  const normalized = code.toUpperCase().trim();
  if (!/^[A-Z0-9_-]{1,40}$/.test(normalized)) return undefined;

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error) readFailure('getCouponByCodeAsync', error);
  return data ? mapDbCouponToCoupon(data) : undefined;
}

export async function getAllCouponsAsync(): Promise<Coupon[]> {
  if (shouldUseMockData()) return mockData.getAllCoupons();

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) readFailure('getAllCouponsAsync', error);
  return data.map(mapDbCouponToCoupon);
}

export async function createCouponAsync(coupon: Omit<Coupon, 'id' | 'createdAt'>): Promise<Coupon> {
  if (shouldUseMockData()) {
    return {
      ...coupon,
      id: `cpn-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: coupon.code.toUpperCase().trim(),
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      min_spend: coupon.minSpend,
      expires_at: coupon.expiresAt,
      is_active: coupon.isActive,
    })
    .select()
    .single();

  if (error || !data) writeFailure('createCouponAsync', error);
  return mapDbCouponToCoupon(data);
}

export async function updateCouponAsync(id: string, updates: Partial<Coupon>): Promise<Coupon> {
  if (shouldUseMockData()) {
    throw new Error('Atualização de cupons indisponível em modo mock.');
  }

  const dbUpdates: {
    code?: string;
    discount_type?: string;
    discount_value?: number;
    min_spend?: number;
    expires_at?: string | null;
    is_active?: boolean;
  } = {};
  if (updates.code !== undefined) dbUpdates.code = updates.code.toUpperCase().trim();
  if (updates.discountType !== undefined) dbUpdates.discount_type = updates.discountType;
  if (updates.discountValue !== undefined) dbUpdates.discount_value = updates.discountValue;
  if (updates.minSpend !== undefined) dbUpdates.min_spend = updates.minSpend;
  if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('coupons')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) writeFailure('updateCouponAsync', error);
  return mapDbCouponToCoupon(data);
}

// ─── BLOQUEIOS MANUAIS DE QUARTOS ────────────────────────────

type DbRoomBlockWithRoom = DbRoomBlock & { rooms?: { name?: string } | null };

export async function getRoomBlocksAsync(): Promise<RoomBlock[]> {
  if (shouldUseMockData()) {
    return mockData.getAllRoomBlocks().map((b) => ({
      ...b,
      roomName: mockData.getRoomById(b.roomId)?.name || 'Quarto',
    }));
  }

  const { data, error } = await supabase
    .from('room_blocks')
    .select(`
      *,
      rooms:room_id (name)
    `)
    .order('start_date', { ascending: false });

  if (error || !data) readFailure('getRoomBlocksAsync', error);
  return (data as unknown as DbRoomBlockWithRoom[]).map((row) =>
    mapDbRoomBlockToRoomBlock(row, row.rooms?.name)
  );
}

export async function createRoomBlockAsync(data: {
  roomId: string;
  startDate: string;
  endDate: string;
  reason: RoomBlockReason;
  notes?: string | null;
}): Promise<RoomBlock> {
  if (shouldUseMockData()) return mockData.createRoomBlock(data);

  const { data: newBlock, error } = await supabase
    .from('room_blocks')
    .insert({
      room_id: data.roomId,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason,
      notes: data.notes || null,
    })
    .select(`
      *,
      rooms:room_id (name)
    `)
    .single();

  // Sem fallback mock: um bloqueio "fantasma" deixaria o quarto vendável.
  if (error || !newBlock) writeFailure('createRoomBlockAsync', error);

  const row = newBlock as unknown as DbRoomBlockWithRoom;
  return mapDbRoomBlockToRoomBlock(row, row.rooms?.name);
}

export async function deleteRoomBlockAsync(id: string): Promise<boolean> {
  if (shouldUseMockData()) return mockData.deleteRoomBlock(id);

  const { error } = await supabase
    .from('room_blocks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteRoomBlockAsync] Erro no Supabase:', error);
    return false;
  }
  return true;
}

// ─── FATURAMENTO E NOTAS FISCAIS ─────────────────────────────

export async function updateBookingBillingDataAsync(
  bookingId: string,
  billingData: {
    taxId?: string | null;
    companyName?: string | null;
    billingAddress?: string | null;
    invoiceStatus?: InvoiceStatus;
    invoiceNumber?: string | null;
  }
): Promise<Reservation | null> {
  if (shouldUseMockData()) {
    return mockData.updateReservationBillingData(bookingId, billingData) || null;
  }

  const updatePayload: Database['public']['Tables']['bookings']['Update'] = {};
  if (billingData.taxId !== undefined) updatePayload.tax_id = billingData.taxId;
  if (billingData.companyName !== undefined) updatePayload.company_name = billingData.companyName;
  if (billingData.billingAddress !== undefined) updatePayload.billing_address = billingData.billingAddress;
  if (billingData.invoiceStatus !== undefined) updatePayload.invoice_status = billingData.invoiceStatus;
  if (billingData.invoiceNumber !== undefined) updatePayload.invoice_number = billingData.invoiceNumber;
  if (billingData.invoiceStatus === 'issued') {
    updatePayload.invoice_issued_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select()
    .maybeSingle();

  if (error) writeFailure('updateBookingBillingDataAsync', error);
  return data ? mapDbBookingToReservation(data) : null;
}

export async function markInvoiceIssuedAsync(
  bookingId: string,
  invoiceNumber?: string
): Promise<Reservation | null> {
  const generatedNumber = invoiceNumber || `NFS-${Math.floor(100000 + Math.random() * 900000)}`;
  return updateBookingBillingDataAsync(bookingId, {
    invoiceStatus: 'issued',
    invoiceNumber: generatedNumber,
  });
}

export async function getBillingBookingsAsync(): Promise<Reservation[]> {
  if (shouldUseMockData()) return mockData.getAllReservations();

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) readFailure('getBillingBookingsAsync', error);
  return data.map(mapDbBookingToReservation);
}
