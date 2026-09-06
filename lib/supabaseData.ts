// ============================================================
// lib/supabaseData.ts
// Camada Assíncrona de Data Fetching via Supabase (PostgreSQL)
// Com fallback automático para Mock Data se Supabase estiver offline
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import { hasIcalDateConflict, parseIcalEvents, type IcalEvent } from '@/lib/icalParser';
import type { Room, Experience, Reservation, RoomHousekeeping, ReservationStatus, HousekeepingStatus, Coupon, RoomBlock, RoomBlockReason, InvoiceStatus } from '@/types';
import type { DbRoom, DbExperience, DbBooking, DbCoupon, DbHousekeeping, DbRoomBlock } from '@/types/database';

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

// ─── ACOMODAÇÕES (ROOMS) ──────────────────────────────────────

export async function getRoomsAsync(): Promise<Room[]> {
  if (!isSupabaseConfigured()) {
    return mockData.getRooms();
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('price_per_night', { ascending: true });

    if (error || !data || data.length === 0) {
      return mockData.getRooms();
    }

    return data.map(mapDbRoomToRoom);
  } catch {
    return mockData.getRooms();
  }
}

export async function getFeaturedRoomsAsync(): Promise<Room[]> {
  if (!isSupabaseConfigured()) {
    return mockData.getFeaturedRooms();
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_featured', true);

    if (error || !data || data.length === 0) {
      return mockData.getFeaturedRooms();
    }

    return data.map(mapDbRoomToRoom);
  } catch {
    return mockData.getFeaturedRooms();
  }
}

export async function getRoomBySlugAsync(slug: string): Promise<Room | undefined> {
  if (!isSupabaseConfigured()) {
    return mockData.getRoomBySlug(slug);
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return mockData.getRoomBySlug(slug);
    }

    return mapDbRoomToRoom(data);
  } catch {
    return mockData.getRoomBySlug(slug);
  }
}

export async function getRoomByIdAsync(id: string): Promise<Room | undefined> {
  if (!id) return undefined;

  if (!isSupabaseConfigured()) {
    return mockData.getRoomById(id);
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return mockData.getRoomById(id);
    }

    return mapDbRoomToRoom(data);
  } catch {
    return mockData.getRoomById(id);
  }
}

// ─── EXPERIÊNCIAS ─────────────────────────────────────────────

export async function getExperiencesAsync(): Promise<Experience[]> {
  if (!isSupabaseConfigured()) {
    return mockData.getExperiences();
  }

  try {
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .order('price', { ascending: true });

    if (error || !data || data.length === 0) {
      return mockData.getExperiences();
    }

    return data.map(mapDbExperienceToExperience);
  } catch {
    return mockData.getExperiences();
  }
}

export async function getExperienceBySlugAsync(slug: string): Promise<Experience | undefined> {
  if (!isSupabaseConfigured()) {
    return mockData.getExperienceBySlug(slug);
  }

  try {
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return mockData.getExperienceBySlug(slug);
    }

    return mapDbExperienceToExperience(data);
  } catch {
    return mockData.getExperienceBySlug(slug);
  }
}

// ─── RESERVAS (BOOKINGS) ──────────────────────────────────────

export async function getBookingsAsync(): Promise<Reservation[]> {
  if (!isSupabaseConfigured()) {
    return mockData.getAllReservations();
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('check_in_date', { ascending: true });

    if (error || !data || data.length === 0) {
      return mockData.getAllReservations();
    }

    return data.map(mapDbBookingToReservation);
  } catch {
    return mockData.getAllReservations();
  }
}

/**
 * Retorna os IDs dos quartos com reserva conflitante para o intervalo solicitado.
 * Fórmula de sobreposição: (check_in < requestedCheckOut) AND (check_out > requestedCheckIn)
 * Reservas canceladas são ignoradas.
 * Agora também verifica bloqueios vindos de links iCal externos (Airbnb/Booking).
 */
export async function getUnavailableRoomIdsAsync(
  checkIn: string,
  checkOut: string
): Promise<Set<string>> {
  // Fallback mock — mesma fórmula de sobreposição usada na trava anti-overbooking
  const fromMock = (): Set<string> => {
    const rooms = mockData.getRooms();
    const blocked = new Set<string>();

    // Reservas internas
    mockData
      .getAllReservations()
      .filter(
        (res) =>
          res.status !== 'cancelled' &&
          res.roomId &&
          res.checkIn < checkOut &&
          res.checkOut > checkIn
      )
      .forEach((res) => blocked.add(res.roomId));

    // Bloqueios manuais de quartos (mock)
    mockData
      .getAllRoomBlocks()
      .filter(
        (b) =>
          b.roomId &&
          b.startDate < checkOut &&
          b.endDate > checkIn
      )
      .forEach((b) => blocked.add(b.roomId));

    // Bloqueios iCal externos (mock — sem fetch real)
    for (const room of rooms) {
      if (room.icalImportUrl) {
        // Em modo mock, não fazemos fetch real — apenas marcamos se há URL configurada
        // O fetch real acontece no servidor via fetchIcalEventsAsync
      }
    }

    return blocked;
  };

  if (!isSupabaseConfigured()) {
    return fromMock();
  }

  try {
    // 1. Reservas do Supabase
    const { data, error } = await supabase
      .from('bookings')
      .select('room_id')
      .neq('status', 'cancelled')
      .not('room_id', 'is', null)
      .lt('check_in_date', checkOut)
      .gt('check_out_date', checkIn);

    const blockedRoomIds = new Set<string>(
      error || !data ? [] : data.map((row) => row.room_id as string).filter(Boolean)
    );

    // 2. Bloqueios iCal externos
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, ical_import_url');

    if (roomsData) {
      for (const room of roomsData) {
        if (room.ical_import_url && room.id) {
          try {
            const events = await fetchIcalEventsAsync(room.ical_import_url);
            if (hasIcalDateConflict(checkIn, checkOut, events)) {
              blockedRoomIds.add(room.id);
            }
          } catch {
            // Se o fetch falhar, ignora — não bloqueia o quarto
          }
        }
      }
    }

    // 3. Bloqueios manuais de quartos (room_blocks)
    const { data: blocksData, error: blocksError } = await supabase
      .from('room_blocks')
      .select('room_id')
      .lt('start_date', checkOut)
      .gt('end_date', checkIn);

    if (!blocksError && blocksData) {
      for (const row of blocksData) {
        if (row.room_id) blockedRoomIds.add(row.room_id as string);
      }
    }

    return blockedRoomIds;
  } catch {
    return fromMock();
  }
}

/**
 * Busca e faz o parse de uma URL iCal, retornando os eventos extraídos.
 */
export async function fetchIcalEventsAsync(url: string): Promise<IcalEvent[]> {
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

export async function createBookingAsync(
  payload: Omit<Reservation, 'id' | 'bookingCode' | 'createdAt' | 'status'> & { status?: ReservationStatus }
): Promise<Reservation> {
  if (!isSupabaseConfigured()) {
    return mockData.createReservation(payload);
  }

  const bookingCode = `AN-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
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
        selected_addons: payload.selectedAddons as any,
      })
      .select()
      .single();

    if (error || !data) {
      return mockData.createReservation(payload);
    }

    return mapDbBookingToReservation(data);
  } catch {
    return mockData.createReservation(payload);
  }
}

export async function updateBookingStatusAsync(
  id: string,
  newStatus: ReservationStatus
): Promise<Reservation | undefined> {
  if (!isSupabaseConfigured()) {
    return mockData.updateReservationStatus(id, newStatus);
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .or(`id.eq.${id},booking_code.eq.${id}`)
      .select()
      .maybeSingle();

    if (error || !data) {
      return mockData.updateReservationStatus(id, newStatus);
    }

    return mapDbBookingToReservation(data);
  } catch {
    return mockData.updateReservationStatus(id, newStatus);
  }
}

// ─── GOVERNANÇA (HOUSEKEEPING) ────────────────────────────────

export async function getHousekeepingAsync(): Promise<RoomHousekeeping[]> {
  if (!isSupabaseConfigured()) {
    return mockData.getHousekeepingList();
  }

  try {
    const { data, error } = await supabase
      .from('housekeeping')
      .select('*');

    if (error || !data || data.length === 0) {
      return mockData.getHousekeepingList();
    }

    const rooms = await getRoomsAsync();

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
  } catch {
    return mockData.getHousekeepingList();
  }
}

export async function updateHousekeepingAsync(
  roomId: string,
  newStatus: HousekeepingStatus,
  notes?: string
): Promise<RoomHousekeeping> {
  if (!isSupabaseConfigured()) {
    return mockData.updateRoomHousekeeping(roomId, newStatus, notes);
  }

  try {
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

    if (error || !data) {
      return mockData.updateRoomHousekeeping(roomId, newStatus, notes);
    }

    return {
      roomId: data.room_id,
      roomName: (await getRoomsAsync()).find((r) => r.id === roomId)?.name || 'Quarto',
      status: data.status as HousekeepingStatus,
      lastCleanedAt: data.last_cleaned_at,
      housekeeperName: data.housekeeper_name,
      notes: data.notes || undefined,
      maintenanceAlert: data.maintenance_alert,
    };
  } catch {
    return mockData.updateRoomHousekeeping(roomId, newStatus, notes);
  }
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

export async function getCouponByCodeAsync(code: string): Promise<Coupon | undefined> {
  if (!isSupabaseConfigured()) {
    return mockData.getCouponByCode(code);
  }

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (error || !data) {
      return mockData.getCouponByCode(code);
    }

    return mapDbCouponToCoupon(data);
  } catch {
    return mockData.getCouponByCode(code);
  }
}

export async function getAllCouponsAsync(): Promise<Coupon[]> {
  if (!isSupabaseConfigured()) {
    return mockData.getAllCoupons();
  }

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return mockData.getAllCoupons();
    }

    return data.map(mapDbCouponToCoupon);
  } catch {
    return mockData.getAllCoupons();
  }
}

export async function createCouponAsync(coupon: Omit<Coupon, 'id' | 'createdAt'>): Promise<Coupon> {
  if (!isSupabaseConfigured()) {
    const newCoupon: Coupon = {
      ...coupon,
      id: `cpn-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    return newCoupon;
  }

  try {
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

    if (error || !data) {
      throw new Error('Erro ao criar cupom');
    }

    return mapDbCouponToCoupon(data);
  } catch {
    throw new Error('Erro ao criar cupom no Supabase');
  }
}

export async function updateCouponAsync(id: string, updates: Partial<Coupon>): Promise<Coupon> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado');
  }

  try {
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

    if (error || !data) {
      throw new Error('Erro ao atualizar cupom');
    }

    return mapDbCouponToCoupon(data);
  } catch {
    throw new Error('Erro ao atualizar cupom no Supabase');
  }
}

// ─── BLOQUEIOS MANUAIS DE QUARTOS ────────────────────────────

export async function getRoomBlocksAsync(): Promise<RoomBlock[]> {
  if (!isSupabaseConfigured()) {
    const mockBlocks = mockData.getAllRoomBlocks();
    return mockBlocks.map((b) => ({
      ...b,
      roomName: mockData.getRoomById(b.roomId)?.name || 'Quarto',
    }));
  }

  try {
    const { data, error } = await supabase
      .from('room_blocks')
      .select(`
        *,
        rooms:room_id (name)
      `)
      .order('start_date', { ascending: false });

    if (error || !data) {
      const mockBlocks = mockData.getAllRoomBlocks();
      return mockBlocks.map((b) => ({
        ...b,
        roomName: mockData.getRoomById(b.roomId)?.name || 'Quarto',
      }));
    }

    return (data as any[]).map((row) =>
      mapDbRoomBlockToRoomBlock(row, row.rooms?.name)
    );
  } catch {
    const mockBlocks = mockData.getAllRoomBlocks();
    return mockBlocks.map((b) => ({
      ...b,
      roomName: mockData.getRoomById(b.roomId)?.name || 'Quarto',
    }));
  }
}

export async function createRoomBlockAsync(data: {
  roomId: string;
  startDate: string;
  endDate: string;
  reason: RoomBlockReason;
  notes?: string | null;
}): Promise<RoomBlock> {
  if (!isSupabaseConfigured()) {
    return mockData.createRoomBlock(data);
  }

  try {
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

    if (error || !newBlock) {
      console.error('[createRoomBlockAsync] Erro no Supabase:', error);
      return mockData.createRoomBlock(data);
    }

    return mapDbRoomBlockToRoomBlock(newBlock as any, (newBlock as any).rooms?.name);
  } catch (err) {
    console.error('[createRoomBlockAsync] Exceção:', err);
    return mockData.createRoomBlock(data);
  }
}

export async function deleteRoomBlockAsync(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return mockData.deleteRoomBlock(id);
  }

  try {
    const { error } = await supabase
      .from('room_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteRoomBlockAsync] Erro no Supabase:', error);
      return mockData.deleteRoomBlock(id);
    }

    return true;
  } catch (err) {
    console.error('[deleteRoomBlockAsync] Exceção:', err);
    return mockData.deleteRoomBlock(id);
  }
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
  if (!isSupabaseConfigured()) {
    return mockData.updateReservationBillingData(bookingId, billingData) || null;
  }

  try {
    const updatePayload: Record<string, any> = {};
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
      .update(updatePayload as any)
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) {
      console.error('[updateBookingBillingDataAsync] Erro no Supabase:', error);
      return mockData.updateReservationBillingData(bookingId, billingData) || null;
    }

    return mapDbBookingToReservation(data);
  } catch (err) {
    console.error('[updateBookingBillingDataAsync] Exceção:', err);
    return mockData.updateReservationBillingData(bookingId, billingData) || null;
  }
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
  if (!isSupabaseConfigured()) {
    return mockData.getAllReservations();
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return mockData.getAllReservations();
    }

    return data.map(mapDbBookingToReservation);
  } catch {
    return mockData.getAllReservations();
  }
}
