/**
 * Database types generated from Supabase schema
 * These should be regenerated using: npx supabase gen types typescript
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  qr_code: {
    Tables: {
      codes: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          mode: 'managed' | 'direct';
          slug: string | null;
          destination_url: string;
          is_active: boolean;
          analytics_enabled: boolean;
          total_scans: number;
          last_scanned_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          mode?: 'managed' | 'direct';
          slug?: string | null;
          destination_url: string;
          is_active?: boolean;
          analytics_enabled?: boolean;
          total_scans?: number;
          last_scanned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          mode?: 'managed' | 'direct';
          slug?: string | null;
          destination_url?: string;
          is_active?: boolean;
          analytics_enabled?: boolean;
          total_scans?: number;
          last_scanned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      styles: {
        Row: {
          id: string;
          qr_id: string;
          foreground_color: string;
          background_color: string;
          error_correction: 'L' | 'M' | 'Q' | 'H';
          quiet_zone: number;
          module_shape: 'square' | 'rounded' | 'dots' | 'diamond';
          eye_shape: 'square' | 'rounded' | 'circle';
          logo_storage_path: string | null;
          logo_size_ratio: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          qr_id: string;
          foreground_color?: string;
          background_color?: string;
          error_correction?: 'L' | 'M' | 'Q' | 'H';
          quiet_zone?: number;
          module_shape?: 'square' | 'rounded' | 'dots' | 'diamond';
          eye_shape?: 'square' | 'rounded' | 'circle';
          logo_storage_path?: string | null;
          logo_size_ratio?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          qr_id?: string;
          foreground_color?: string;
          background_color?: string;
          error_correction?: 'L' | 'M' | 'Q' | 'H';
          quiet_zone?: number;
          module_shape?: 'square' | 'rounded' | 'dots' | 'diamond';
          eye_shape?: 'square' | 'rounded' | 'circle';
          logo_storage_path?: string | null;
          logo_size_ratio?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          qr_id: string;
          format: 'svg' | 'png' | 'pdf';
          storage_path: string;
          size_bytes: number | null;
          width: number | null;
          style_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          qr_id: string;
          format: 'svg' | 'png' | 'pdf';
          storage_path: string;
          size_bytes?: number | null;
          width?: number | null;
          style_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          qr_id?: string;
          format?: 'svg' | 'png' | 'pdf';
          storage_path?: string;
          size_bytes?: number | null;
          width?: number | null;
          style_hash?: string;
          created_at?: string;
        };
      };
      scan_events: {
        Row: {
          id: string;
          qr_id: string;
          scanned_at: string;
          country_code: string | null;
          region: string | null;
          device_type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          os_family: string | null;
          browser_family: string | null;
          referrer_domain: string | null;
          ip_hash: string | null;
        };
        Insert: {
          id?: string;
          qr_id: string;
          scanned_at?: string;
          country_code?: string | null;
          region?: string | null;
          device_type?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          os_family?: string | null;
          browser_family?: string | null;
          referrer_domain?: string | null;
          ip_hash?: string | null;
        };
        Update: {
          id?: string;
          qr_id?: string;
          scanned_at?: string;
          country_code?: string | null;
          region?: string | null;
          device_type?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          os_family?: string | null;
          browser_family?: string | null;
          referrer_domain?: string | null;
          ip_hash?: string | null;
        };
      };
      audit_log: {
        Row: {
          id: string;
          qr_id: string;
          actor_id: string | null;
          action: string;
          previous_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          qr_id: string;
          actor_id?: string | null;
          action: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          qr_id?: string;
          actor_id?: string | null;
          action?: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      generate_unique_slug: {
        Args: { length?: number };
        Returns: string;
      };
    };
    Enums: {
      qr_mode: 'managed' | 'direct';
      error_correction_level: 'L' | 'M' | 'Q' | 'H';
      module_shape: 'square' | 'rounded' | 'dots' | 'diamond';
      eye_shape: 'square' | 'rounded' | 'circle';
      asset_format: 'svg' | 'png' | 'pdf';
      device_type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
      audit_action: 'created' | 'updated' | 'destination_changed' | 'style_changed' | 'deactivated' | 'reactivated' | 'deleted';
    };
  };
}
