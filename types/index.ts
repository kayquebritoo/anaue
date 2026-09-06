// ============================================================
// Anauê Amazônia — Tipos Globais
// Arquitetura: Feature-Sliced Design
// Fase: Mock Data (futuro: Supabase)
// ============================================================

// ─── Acomodações ─────────────────────────────────────────────

export type RoomType = 'bangalo' | 'suite' | 'chale' | 'casa-arvore';

export type RoomCategory = 'standard' | 'superior' | 'deluxe' | 'premium';

export interface RoomAmenity {
  id: string;
  name: string;
  icon: string; // nome do ícone Lucide
}

export interface RoomImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface Room {
  id: string;
  slug: string;
  name: string;
  type: RoomType;
  category: RoomCategory;
  shortDescription: string;
  longDescription: string;
  pricePerNight: number; // BRL
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  amenities: RoomAmenity[];
  images: RoomImage[];
  gallery_images?: string[];    // caminhos das imagens para lightbox
  video_url?: string | null;   // tour em vídeo (opcional)
  icalImportUrl?: string | null; // URL de iCal importação (Airbnb/Booking)
  icalExportUrl?: string | null; // URL de iCal exportação (nosso PMS)
  icalSyncedAt?: string | null;  // Última sincronização
  rating: number; // 0-5
  reviewCount: number;
  isFeatured: boolean;
  isAvailable: boolean;
  tags: string[];
}

// ─── Up-sell de Experiências (Add-ons) ───────────────────────

export interface AddonExperience {
  id: string;
  name: string;
  category: 'gastronomia' | 'aventura' | 'bem-estar' | 'logistica';
  shortDescription: string;
  price: number; // BRL por pessoa / por serviço
  priceType: 'per_person' | 'fixed';
  duration: string;
  imageUrl: string;
  isPopular?: boolean;
}

// ─── Experiências Independentes ───────────────────────────────

export interface Experience {
  id: string;
  slug: string;
  name: string;
  category: 'bem-estar' | 'aventura' | 'gastronomia' | 'logistica';
  shortDescription: string;
  longDescription: string;
  price: number; // BRL por pessoa
  priceType: 'per_person' | 'fixed';
  duration: string;
  imageUrl: string;
  gallery_images?: string[];
  isPopular?: boolean;
}

// ─── Usuários ────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string; // ISO 8601
}

// ─── Checkout & Pagamento ────────────────────────────────────

export type PaymentMethodType = 'pix' | 'credit_card';

export type InvoiceStatus = 'pending' | 'issued' | 'exempt';

export interface GuestFormData {
  fullName: string;
  email: string;
  phone: string;
  document: string; // CPF ou Passaporte
  specialRequests?: string;
  requestInvoice?: boolean;
  taxId?: string; // CPF ou CNPJ específico para faturamento
  companyName?: string; // Razão Social / Nome Completo Fiscal
  billingAddress?: string; // Endereço Fiscal Completo
}

export interface CreditCardData {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  installments: number;
}

export interface CheckoutState {
  room: Room | null;
  experience: Experience | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  serviceDate?: string;       // para experiências avulsas
  serviceTime?: string;       // para experiências avulsas
  selectedAddons: AddonExperience[];
  guestData: GuestFormData;
  paymentMethod: PaymentMethodType;
  cardData: CreditCardData;
}

// ─── Reservas ────────────────────────────────────────────────

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';

export interface Reservation {
  id: string;
  bookingCode: string; // ex: AN-8942
  userId: string;
  roomId: string;
  checkIn: string;   // ISO 8601 date
  checkOut: string;  // ISO 8601 date
  guests: number;
  totalPrice: number;
  roomPrice: number;
  addonsPrice: number;
  discountPrice: number;
  status: ReservationStatus;
  specialRequests: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestDocument?: string | null;
  taxId?: string | null;
  companyName?: string | null;
  billingAddress?: string | null;
  invoiceStatus?: InvoiceStatus;
  invoiceNumber?: string | null;
  invoiceIssuedAt?: string | null;
  paymentMethod: PaymentMethodType;
  selectedAddons: { id: string; name: string; price: number }[];
  createdAt: string; // ISO 8601
}

// ─── Busca / Filtros ─────────────────────────────────────────

export interface SearchParams {
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
}

export interface SearchFilters extends SearchParams {
  minPrice: number | null;
  maxPrice: number | null;
  types: RoomType[];
  categories: RoomCategory[];
}

// ─── Cupons de Desconto ─────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minSpend: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Governança & PMS Admin ──────────────────────────────────

export type HousekeepingStatus = 'dirty' | 'cleaning' | 'clean' | 'inspected';

export interface RoomHousekeeping {
  roomId: string;
  roomName: string;
  status: HousekeepingStatus;
  lastCleanedAt: string; // ISO string ou formatado
  housekeeperName: string;
  notes?: string;
  maintenanceAlert?: string | null;
}

export interface AdminKPIs {
  occupancyRate: number; // Porcentagem (0-100)
  occupiedRoomsCount: number;
  totalRoomsCount: number;
  pendingCheckInsCount: number;
  pendingCheckOutsCount: number;
  activeGuestsCount: number;
  monthlyRevenueEstimated: number;
}

// ─── Bloqueios Manuais de Quarto ────────────────────────────

export type RoomBlockReason = 'maintenance' | 'owner_use' | 'other';

export interface RoomBlock {
  id: string;
  roomId: string;
  roomName?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: RoomBlockReason;
  notes?: string | null;
  createdAt: string;
}

// ─── Exportação de Tipos de Banco (Supabase) ─────────────────
export type { Database, DbRoom, DbExperience, DbBooking, DbCoupon, DbHousekeeping, DbRoomBlock } from './database';
