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
  public: {
    Tables: {
      bio_link_pages: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          bio: string | null;
          slug: string;
          avatar_storage_path: string | null;
          theme: 'minimal' | 'midnight' | 'gradient-sunset' | 'gradient-ocean' | 'neon' | 'pastel-dream' | 'bold' | 'glass' | 'retro' | 'nature' | 'cosmic' | 'brutalist';
          custom_bg_color: string | null;
          custom_text_color: string | null;
          custom_accent_color: string | null;
          button_style: 'filled' | 'outline' | 'shadow';
          font_title: string | null;
          font_body: string | null;
          border_radius: string | null;
          spacing: string | null;
          background_variant: string | null;
          is_active: boolean;
          analytics_enabled: boolean;
          total_views: number;
          last_viewed_at: string | null;
          qr_code_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          bio?: string | null;
          slug: string;
          avatar_storage_path?: string | null;
          theme?: 'minimal' | 'midnight' | 'gradient-sunset' | 'gradient-ocean' | 'neon' | 'pastel-dream' | 'bold' | 'glass' | 'retro' | 'nature' | 'cosmic' | 'brutalist';
          custom_bg_color?: string | null;
          custom_text_color?: string | null;
          custom_accent_color?: string | null;
          button_style?: 'filled' | 'outline' | 'shadow';
          font_title?: string | null;
          font_body?: string | null;
          border_radius?: string | null;
          spacing?: string | null;
          background_variant?: string | null;
          is_active?: boolean;
          analytics_enabled?: boolean;
          total_views?: number;
          last_viewed_at?: string | null;
          qr_code_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          bio?: string | null;
          slug?: string;
          avatar_storage_path?: string | null;
          theme?: 'minimal' | 'midnight' | 'gradient-sunset' | 'gradient-ocean' | 'neon' | 'pastel-dream' | 'bold' | 'glass' | 'retro' | 'nature' | 'cosmic' | 'brutalist';
          custom_bg_color?: string | null;
          custom_text_color?: string | null;
          custom_accent_color?: string | null;
          button_style?: 'filled' | 'outline' | 'shadow';
          font_title?: string | null;
          font_body?: string | null;
          border_radius?: string | null;
          spacing?: string | null;
          background_variant?: string | null;
          is_active?: boolean;
          analytics_enabled?: boolean;
          total_views?: number;
          last_viewed_at?: string | null;
          qr_code_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bio_link_items: {
        Row: {
          id: string;
          page_id: string;
          title: string;
          url: string;
          icon: string | null;
          icon_type: 'emoji' | 'image' | 'favicon' | null;
          icon_url: string | null;
          show_icon: boolean;
          sort_order: number;
          is_enabled: boolean;
          total_clicks: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          title: string;
          url: string;
          icon?: string | null;
          icon_type?: 'emoji' | 'image' | 'favicon' | null;
          icon_url?: string | null;
          show_icon?: boolean;
          sort_order?: number;
          is_enabled?: boolean;
          total_clicks?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          title?: string;
          url?: string;
          icon?: string | null;
          icon_type?: 'emoji' | 'image' | 'favicon' | null;
          icon_url?: string | null;
          show_icon?: boolean;
          sort_order?: number;
          is_enabled?: boolean;
          total_clicks?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      bio_link_view_events: {
        Row: {
          id: string;
          page_id: string;
          viewed_at: string;
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
          page_id: string;
          viewed_at?: string;
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
          page_id?: string;
          viewed_at?: string;
          country_code?: string | null;
          region?: string | null;
          device_type?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          os_family?: string | null;
          browser_family?: string | null;
          referrer_domain?: string | null;
          ip_hash?: string | null;
        };
      };
      bio_link_click_events: {
        Row: {
          id: string;
          item_id: string;
          page_id: string;
          clicked_at: string;
          country_code: string | null;
          device_type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          ip_hash: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          page_id: string;
          clicked_at?: string;
          country_code?: string | null;
          device_type?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          ip_hash?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          page_id?: string;
          clicked_at?: string;
          country_code?: string | null;
          device_type?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          ip_hash?: string | null;
        };
      };
      bio_link_audit_log: {
        Row: {
          id: string;
          page_id: string;
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
          page_id: string;
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
          page_id?: string;
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
      generate_bio_unique_slug: {
        Args: { length?: number };
        Returns: string;
      };
    };
    Enums: {
      bio_link_theme: 'minimal' | 'midnight' | 'gradient-sunset' | 'gradient-ocean' | 'neon' | 'pastel-dream' | 'bold' | 'glass' | 'retro' | 'nature' | 'cosmic' | 'brutalist';
      bio_link_button_style: 'filled' | 'outline' | 'shadow';
      bio_link_audit_action: 'created' | 'updated' | 'link_added' | 'link_updated' | 'link_removed' | 'link_reordered' | 'theme_changed' | 'deactivated' | 'reactivated' | 'deleted';
    };
  };
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
