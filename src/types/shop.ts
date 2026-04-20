export type ShopProductCategory =
  | 'nfc_card'
  | 'review_board'
  | 'table_talker'
  | 'window_decal'
  | 'badge'
  | 'other';

export type ShopOrderStatus =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type ShopCustomizationFieldType =
  | 'logo'
  | 'bio_page_link'
  | 'custom_text'
  | 'color';

export interface ShopProductRecord {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: ShopProductCategory;
  base_price_pence: number;
  primary_image_url: string | null;
  gallery_image_urls: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ShopProductVariantRecord {
  id: string;
  product_id: string;
  label: string;
  sku: string | null;
  price_delta_pence: number;
  stock_qty: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ShopProductCustomizationRecord {
  id: string;
  product_id: string;
  field_key: string;
  field_label: string;
  field_type: ShopCustomizationFieldType;
  is_required: boolean;
  constraints: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

export interface ShopOrderRecord {
  id: string;
  org_id: string;
  user_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: ShopOrderStatus;
  subtotal_pence: number;
  shipping_pence: number;
  tax_pence: number;
  total_pence: number;
  shipping_address: Record<string, unknown> | null;
  tracking_number: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  customization_values: Record<string, unknown> | null;
  quantity: number;
  unit_price_pence: number;
  line_total_pence: number;
  created_at: string;
}

/**
 * UI helper: human label for a category enum value.
 */
export const SHOP_CATEGORY_LABELS: Record<ShopProductCategory, string> = {
  nfc_card: 'NFC Cards',
  review_board: 'Review Boards',
  table_talker: 'Table Talkers',
  window_decal: 'Window Decals',
  badge: 'Badges',
  other: 'Other',
};
