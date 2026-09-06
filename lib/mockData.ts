// ============================================================
// lib/mockData.ts
// Camada de acesso a dados — Mock Data Phase
//
// ⚠️  FUTURO: Troque cada função por uma query Supabase equivalente.
//    Os contratos de retorno (tipos) devem permanecer inalterados.
// ============================================================

import type {
  Room,
  User,
  Reservation,
  SearchParams,
  AddonExperience,
  Experience,
  HousekeepingStatus,
  RoomHousekeeping,
  AdminKPIs,
  ReservationStatus,
  Coupon,
  RoomBlock,
} from '@/types';

// Importações estáticas (substituir por fetch/supabase no futuro)
import roomsData from '@/mocks/rooms.json';
import usersData from '@/mocks/users.json';
import reservationsData from '@/mocks/reservations.json';
import addonsData from '@/mocks/addons.json';
import experiencesData from '@/mocks/experiences.json';
import housekeepingData from '@/mocks/housekeeping.json';
import couponsData from '@/mocks/coupons.json';
import roomBlocksData from '@/mocks/roomBlocks.json';

// Cast seguro para os tipos corretos
const rooms = roomsData as Room[];
const users = usersData as User[];
let dynamicReservations: Reservation[] = (reservationsData as unknown as Reservation[]).map((res) => ({
  ...res,
  bookingCode: res.bookingCode || `AN-${Math.floor(1000 + Math.random() * 9000)}`,
  roomPrice: res.roomPrice || res.totalPrice,
  addonsPrice: res.addonsPrice || 0,
  discountPrice: res.discountPrice || 0,
  guestName: res.guestName || 'Hóspede Anauê',
  guestEmail: res.guestEmail || 'hospede@anaue.com.br',
  guestPhone: res.guestPhone || '+55 (92) 99999-9999',
  paymentMethod: res.paymentMethod || 'pix',
  selectedAddons: res.selectedAddons || [],
}));

let dynamicHousekeeping: RoomHousekeeping[] = housekeepingData as RoomHousekeeping[];
let dynamicRoomBlocks: RoomBlock[] = roomBlocksData as RoomBlock[];

const addons = addonsData as AddonExperience[];
const experiences = experiencesData as Experience[];
const coupons = couponsData as Coupon[];

const SESSION_STORAGE_KEY = 'anaue_reservations_store';
const HOUSEKEEPING_STORAGE_KEY = 'anaue_housekeeping_store';
const ROOM_BLOCKS_STORAGE_KEY = 'anaue_room_blocks_store';

function getStoredReservations(): Reservation[] {
  if (typeof window === 'undefined') return dynamicReservations;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return dynamicReservations;
    const parsed = JSON.parse(raw) as Reservation[];
    // Mesclar únicos
    const map = new Map<string, Reservation>();
    dynamicReservations.forEach((r) => map.set(r.id, r));
    parsed.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  } catch {
    return dynamicReservations;
  }
}

function saveStoredReservations(list: Reservation[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota
  }
}

function getStoredHousekeeping(): RoomHousekeeping[] {
  if (typeof window === 'undefined') return dynamicHousekeeping;
  try {
    const raw = sessionStorage.getItem(HOUSEKEEPING_STORAGE_KEY);
    if (!raw) return dynamicHousekeeping;
    return JSON.parse(raw) as RoomHousekeeping[];
  } catch {
    return dynamicHousekeeping;
  }
}

function saveStoredHousekeeping(list: RoomHousekeeping[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(HOUSEKEEPING_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota
  }
}

// ─── Room Blocks (Bloqueios Manuais) ───────────────────────────

function getStoredRoomBlocks(): RoomBlock[] {
  if (typeof window === 'undefined') return dynamicRoomBlocks;
  try {
    const raw = sessionStorage.getItem(ROOM_BLOCKS_STORAGE_KEY);
    if (!raw) return dynamicRoomBlocks;
    return JSON.parse(raw) as RoomBlock[];
  } catch {
    return dynamicRoomBlocks;
  }
}

function saveStoredRoomBlocks(list: RoomBlock[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ROOM_BLOCKS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota
  }
}

export function getAllRoomBlocks(): RoomBlock[] {
  return getStoredRoomBlocks();
}

export function createRoomBlock(data: Omit<RoomBlock, 'id' | 'createdAt'>): RoomBlock {
  const current = getStoredRoomBlocks();
  const newBlock: RoomBlock = {
    ...data,
    id: `blk-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newBlock, ...current];
  dynamicRoomBlocks = updated;
  saveStoredRoomBlocks(updated);
  return newBlock;
}

export function deleteRoomBlock(id: string): boolean {
  const current = getStoredRoomBlocks();
  const exists = current.some((b) => b.id === id);
  if (!exists) return false;
  const updated = current.filter((b) => b.id !== id);
  dynamicRoomBlocks = updated;
  saveStoredRoomBlocks(updated);
  return true;
}

// ─── Rooms ────────────────────────────────────────────────────

export function getRooms(): Room[] {
  return rooms;
}

export function getFeaturedRooms(): Room[] {
  return rooms.filter((room) => room.isFeatured);
}

export function getRoomById(id: string): Room | undefined {
  return rooms.find((room) => room.id === id);
}

export function getRoomBySlug(slug: string): Room | undefined {
  return rooms.find((room) => room.slug === slug);
}

export function searchRooms(params: SearchParams): Room[] {
  return rooms.filter((room) => {
    if (!room.isAvailable) return false;
    if (params.guests > room.maxGuests) return false;
    return true;
  });
}

// ─── Add-ons (Up-sell) ────────────────────────────────────────

export function getAddons(): AddonExperience[] {
  return addons;
}

export function getAddonById(id: string): AddonExperience | undefined {
  return addons.find((addon) => addon.id === id);
}

// ─── Experiences ──────────────────────────────────────────────

export function getExperiences(): Experience[] {
  return experiences;
}

export function getExperienceById(id: string): Experience | undefined {
  return experiences.find((exp) => exp.id === id);
}

export function getExperienceBySlug(slug: string): Experience | undefined {
  return experiences.find((exp) => exp.slug === slug);
}

// ─── Cupons de Desconto ─────────────────────────────────────

export function getAllCoupons(): Coupon[] {
  return coupons;
}

export function getCouponByCode(code: string): Coupon | undefined {
  const normalized = code.trim().toUpperCase();
  return coupons.find((c) => c.code.toUpperCase() === normalized);
}

export function validateCoupon(code: string, orderTotal: number): { valid: boolean; coupon?: Coupon; error?: string } {
  const coupon = getCouponByCode(code);

  if (!coupon) {
    return { valid: false, error: 'Cupom não encontrado.' };
  }

  if (!coupon.isActive) {
    return { valid: false, error: 'Este cupom está inativo.' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: 'Este cupom expirou.' };
  }

  if (orderTotal < coupon.minSpend) {
    return { valid: false, error: `Pedido mínimo de ${formatPrice(coupon.minSpend)} para este cupom.` };
  }

  return { valid: true, coupon };
}

export function calculateCouponDiscount(coupon: Coupon, subtotal: number): number {
  if (coupon.discountType === 'percentage') {
    return Math.round(subtotal * (coupon.discountValue / 100));
  }
  return Math.min(coupon.discountValue, subtotal);
}

// ─── Users ───────────────────────────────────────────────────

export function getUserById(id: string): User | undefined {
  return users.find((user) => user.id === id);
}

// ─── Reservations ────────────────────────────────────────────

export function getAllReservations(): Reservation[] {
  return getStoredReservations();
}

export function getReservationsByUser(userId: string): Reservation[] {
  const all = getStoredReservations();
  return all.filter((res) => res.userId === userId);
}

export function getReservationsByRoom(roomId: string): Reservation[] {
  const all = getStoredReservations();
  return all.filter((res) => res.roomId === roomId);
}

export function getReservationById(idOrCode: string): Reservation | undefined {
  const all = getStoredReservations();
  return all.find((res) => res.id === idOrCode || res.bookingCode === idOrCode);
}

export function getReservationsByEmail(email: string): Reservation[] {
  const all = getStoredReservations();
  const normalized = email.trim().toLowerCase();
  return all.filter((res) => res.guestEmail.toLowerCase() === normalized);
}

export function createReservation(payload: Omit<Reservation, 'id' | 'bookingCode' | 'createdAt' | 'status'> & { status?: ReservationStatus }): Reservation {
  const newId = `res-${Date.now().toString(36)}`;
  const bookingCode = `AN-${Math.floor(1000 + Math.random() * 9000)}`;

  const newReservation: Reservation = {
    ...payload,
    id: newId,
    bookingCode,
    status: payload.status || 'confirmed',
    createdAt: new Date().toISOString(),
  };

  const current = getStoredReservations();
  const updated = [newReservation, ...current];
  dynamicReservations = updated;
  saveStoredReservations(updated);

  return newReservation;
}

export function updateReservationStatus(id: string, newStatus: ReservationStatus): Reservation | undefined {
  const current = getStoredReservations();
  let updatedRes: Reservation | undefined;

  const updated = current.map((res) => {
    if (res.id === id || res.bookingCode === id) {
      updatedRes = { ...res, status: newStatus };
      return updatedRes;
    }
    return res;
  });

  if (updatedRes) {
    dynamicReservations = updated;
    saveStoredReservations(updated);
  }

  return updatedRes;
}

export function updateReservationBillingData(
  id: string,
  billingData: {
    taxId?: string | null;
    companyName?: string | null;
    billingAddress?: string | null;
    invoiceStatus?: import('@/types').InvoiceStatus;
    invoiceNumber?: string | null;
  }
): Reservation | undefined {
  const current = getStoredReservations();
  let updatedRes: Reservation | undefined;

  const updated = current.map((res) => {
    if (res.id === id || res.bookingCode === id) {
      updatedRes = {
        ...res,
        taxId: billingData.taxId !== undefined ? billingData.taxId : res.taxId,
        companyName: billingData.companyName !== undefined ? billingData.companyName : res.companyName,
        billingAddress: billingData.billingAddress !== undefined ? billingData.billingAddress : res.billingAddress,
        invoiceStatus: billingData.invoiceStatus !== undefined ? billingData.invoiceStatus : res.invoiceStatus || 'pending',
        invoiceNumber: billingData.invoiceNumber !== undefined ? billingData.invoiceNumber : res.invoiceNumber,
        invoiceIssuedAt: billingData.invoiceStatus === 'issued' ? new Date().toISOString() : res.invoiceIssuedAt,
      };
      return updatedRes;
    }
    return res;
  });

  if (updatedRes) {
    dynamicReservations = updated;
    saveStoredReservations(updated);
  }

  return updatedRes;
}

// ─── Governança / Housekeeping ────────────────────────────────

export function getHousekeepingList(): RoomHousekeeping[] {
  const stored = getStoredHousekeeping();
  // Assegurar sincronia de nomes com os 4 quartos reais
  return rooms.map((room) => {
    const existing = stored.find((h) => h.roomId === room.id);
    if (existing) return existing;
    return {
      roomId: room.id,
      roomName: room.name,
      status: 'clean' as HousekeepingStatus,
      lastCleanedAt: new Date().toISOString(),
      housekeeperName: 'Equipe Anauê',
      notes: 'Quarto preparado e higienizado.',
      maintenanceAlert: null,
    };
  });
}

export function updateRoomHousekeeping(
  roomId: string,
  newStatus: HousekeepingStatus,
  notes?: string
): RoomHousekeeping {
  const currentList = getHousekeepingList();
  const updated = currentList.map((item) => {
    if (item.roomId === roomId) {
      return {
        ...item,
        status: newStatus,
        lastCleanedAt: new Date().toISOString(),
        notes: notes !== undefined ? notes : item.notes,
      };
    }
    return item;
  });

  dynamicHousekeeping = updated;
  saveStoredHousekeeping(updated);

  return updated.find((i) => i.roomId === roomId)!;
}

// ─── KPIs & Dashboard PMS ────────────────────────────────────

export function getAdminKPIs(targetDateStr?: string): AdminKPIs {
  const allReservations = getStoredReservations();
  const targetDate = targetDateStr || new Date().toISOString().split('T')[0];
  const totalRooms = rooms.length; // 4 quartos reais

  // Reservas ativas hoje (check-in <= targetDate e check-out > targetDate e status != cancelled)
  const activeToday = allReservations.filter((r) => {
    if (r.status === 'cancelled') return false;
    return r.checkIn <= targetDate && r.checkOut > targetDate;
  });

  const occupiedRoomsCount = Math.min(totalRooms, activeToday.length);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0;

  // Check-ins pendentes para a data
  const pendingCheckIns = allReservations.filter((r) => {
    return r.checkIn === targetDate && r.status === 'confirmed';
  }).length;

  // Check-outs previstos para a data
  const pendingCheckOuts = allReservations.filter((r) => {
    return r.checkOut === targetDate && (r.status === 'checked_in' || r.status === 'confirmed');
  }).length;

  // Total de hóspedes no sítio
  const activeGuestsCount = activeToday.reduce((sum, r) => sum + (r.guests || 2), 0);

  // Receita estimada do mês
  const monthlyRevenue = allReservations
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + (r.totalPrice || 0), 0);

  return {
    occupancyRate,
    occupiedRoomsCount,
    totalRoomsCount: totalRooms,
    pendingCheckInsCount: pendingCheckIns,
    pendingCheckOutsCount: pendingCheckOuts,
    activeGuestsCount,
    monthlyRevenueEstimated: monthlyRevenue,
  };
}

export function getDailyActions(targetDateStr?: string) {
  const allReservations = getStoredReservations();
  const targetDate = targetDateStr || new Date().toISOString().split('T')[0];

  const checkIns = allReservations
    .filter((r) => r.checkIn === targetDate && r.status !== 'cancelled')
    .map((r) => ({
      ...r,
      actionType: 'check_in' as const,
      roomName: getRoomById(r.roomId)?.name || 'Quarto',
    }));

  const checkOuts = allReservations
    .filter((r) => r.checkOut === targetDate && r.status !== 'cancelled')
    .map((r) => ({
      ...r,
      actionType: 'check_out' as const,
      roomName: getRoomById(r.roomId)?.name || 'Quarto',
    }));

  const inHouse = allReservations
    .filter((r) => r.checkIn < targetDate && r.checkOut > targetDate && r.status !== 'cancelled')
    .map((r) => ({
      ...r,
      actionType: 'in_house' as const,
      roomName: getRoomById(r.roomId)?.name || 'Quarto',
    }));

  return {
    checkIns,
    checkOuts,
    inHouse,
    allToday: [...checkIns, ...checkOuts],
  };
}

// ─── Formatadores ─────────────────────────────────────────────

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

