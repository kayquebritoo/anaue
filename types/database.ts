// ============================================================
// types/database.ts
// Tipos Gerados / Estruturados do Banco de Dados Supabase
// Schema: public (rooms, experiences, bookings, housekeeping)
// Compatível com @supabase/supabase-js v2
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: string;
          category: string;
          short_description: string;
          long_description: string;
          price_per_night: number;
          max_guests: number;
          bedrooms: number;
          bathrooms: number;
          area_m2: number;
          amenities: Json;
          images: Json;
          gallery_images: string[] | null;
          video_url: string | null;
          ical_import_url: string | null;
          ical_export_url: string | null;
          ical_synced_at: string | null;
          rating: number;
          review_count: number;
          is_featured: boolean;
          is_available: boolean;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          type: string;
          category: string;
          short_description: string;
          long_description: string;
          price_per_night: number;
          max_guests: number;
          bedrooms?: number;
          bathrooms?: number;
          area_m2?: number;
          amenities?: Json;
          images?: Json;
          gallery_images?: string[] | null;
          video_url?: string | null;
          ical_import_url?: string | null;
          ical_export_url?: string | null;
          ical_synced_at?: string | null;
          rating?: number;
          review_count?: number;
          is_featured?: boolean;
          is_available?: boolean;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          type?: string;
          category?: string;
          short_description?: string;
          long_description?: string;
          price_per_night?: number;
          max_guests?: number;
          bedrooms?: number;
          bathrooms?: number;
          area_m2?: number;
          amenities?: Json;
          images?: Json;
          gallery_images?: string[] | null;
          video_url?: string | null;
          ical_import_url?: string | null;
          ical_export_url?: string | null;
          ical_synced_at?: string | null;
          rating?: number;
          review_count?: number;
          is_featured?: boolean;
          is_available?: boolean;
          tags?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      experiences: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string;
          short_description: string;
          long_description: string;
          price: number;
          price_type: string;
          duration: string;
          image_url: string;
          gallery_images: string[] | null;
          is_popular: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category: string;
          short_description: string;
          long_description: string;
          price: number;
          price_type?: string;
          duration: string;
          image_url: string;
          gallery_images?: string[] | null;
          is_popular?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          category?: string;
          short_description?: string;
          long_description?: string;
          price?: number;
          price_type?: string;
          duration?: string;
          image_url?: string;
          gallery_images?: string[] | null;
          is_popular?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          booking_code: string;
          room_id: string | null;
          user_id: string | null;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          check_in_date: string;
          check_out_date: string;
          guests: number;
          room_price: number;
          addons_price: number;
          discount_price: number;
          total_price: number;
          status: string;
          special_requests: string | null;
          payment_method: string;
          selected_addons: Json;
          guest_document?: string | null;
          tax_id?: string | null;
          company_name?: string | null;
          billing_address?: string | null;
          invoice_status: string;
          invoice_number?: string | null;
          invoice_issued_at?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_code?: string;
          room_id?: string | null;
          user_id?: string | null;
          guest_name: string;
          guest_email: string;
          guest_phone?: string;
          check_in_date: string;
          check_out_date: string;
          guests?: number;
          room_price?: number;
          addons_price?: number;
          discount_price?: number;
          total_price: number;
          status?: string;
          special_requests?: string | null;
          payment_method?: string;
          selected_addons?: Json;
          guest_document?: string | null;
          tax_id?: string | null;
          company_name?: string | null;
          billing_address?: string | null;
          invoice_status?: string;
          invoice_number?: string | null;
          invoice_issued_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_code?: string;
          room_id?: string | null;
          user_id?: string | null;
          guest_name?: string;
          guest_email?: string;
          guest_phone?: string;
          check_in_date?: string;
          check_out_date?: string;
          guests?: number;
          room_price?: number;
          addons_price?: number;
          discount_price?: number;
          total_price?: number;
          status?: string;
          special_requests?: string | null;
          payment_method?: string;
          selected_addons?: Json;
          guest_document?: string | null;
          tax_id?: string | null;
          company_name?: string | null;
          billing_address?: string | null;
          invoice_status?: string;
          invoice_number?: string | null;
          invoice_issued_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          }
        ];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_type: string;
          discount_value: number;
          min_spend: number;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: string;
          discount_value: number;
          min_spend?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: string;
          discount_value?: number;
          min_spend?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      housekeeping: {
        Row: {
          room_id: string;
          status: string;
          last_cleaned_at: string;
          housekeeper_name: string;
          notes: string | null;
          maintenance_alert: string | null;
        };
        Insert: {
          room_id: string;
          status?: string;
          last_cleaned_at?: string;
          housekeeper_name?: string;
          notes?: string | null;
          maintenance_alert?: string | null;
        };
        Update: {
          room_id?: string;
          status?: string;
          last_cleaned_at?: string;
          housekeeper_name?: string;
          notes?: string | null;
          maintenance_alert?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'housekeeping_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: true;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          }
        ];
      };
      room_blocks: {
        Row: {
          id: string;
          room_id: string;
          start_date: string;
          end_date: string;
          reason: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          start_date: string;
          end_date: string;
          reason?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          start_date?: string;
          end_date?: string;
          reason?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_blocks_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type DbRoom = Database['public']['Tables']['rooms']['Row'];
export type DbExperience = Database['public']['Tables']['experiences']['Row'];
export type DbBooking = Database['public']['Tables']['bookings']['Row'];
export type DbCoupon = Database['public']['Tables']['coupons']['Row'];
export type DbHousekeeping = Database['public']['Tables']['housekeeping']['Row'];
export type DbRoomBlock = Database['public']['Tables']['room_blocks']['Row'];
