export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_section: string;
  description: string;
  image_url: string;
  sort_order: number;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  is_primary: number;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size: string;
  color_name: string;
  color_hex: string;
  stock: number;
  sku: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand: string;
  category_id: number | null;
  category_name?: string;
  category_slug?: string;
  gender: 'Femme' | 'Homme' | 'Mixte';
  price_mad: number;
  promo_price_mad: number | null;
  is_new: number;
  is_bestseller: number;
  is_active: number;
  stock_total: number;
  created_at: string;
  images: ProductImage[];
  primary_image: string;
  variants: ProductVariant[];
}

export interface StoreSettings {
  id: number;
  store_name: string;
  slogan: string;
  logo_url: string;
  hero_banner_url: string;
  hero_title: string;
  hero_subtitle: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  casablanca_address: string;
  opening_hours: string;
  shipping_casablanca_mad: number;
  shipping_other_cities_mad: number;
  free_shipping_threshold_mad: number;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
}

export interface Promotion {
  id: number;
  title: string;
  description: string;
  discount_percent: number;
  category_id: number | null;
  product_id: number | null;
  start_date: string;
  end_date: string;
  is_active: number;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_mad: number;
  max_uses: number;
  used_count: number;
  start_date: string;
  end_date: string;
  is_active: number;
}

export interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  neighborhood: string;
  address: string;
  postal_code: string;
  created_at: string;
  order_count?: number;
  total_spent_mad?: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  product_image: string;
  size: string;
  color_name: string;
  quantity: number;
  unit_price_mad: number;
  line_total_mad: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  city: string;
  neighborhood: string;
  address: string;
  postal_code: string;
  notes: string;
  subtotal_mad: number;
  shipping_fee_mad: number;
  discount_mad: number;
  coupon_code: string;
  total_mad: number;
  status: 'En attente' | 'Confirmée' | 'En préparation' | 'Expédiée' | 'Livrée' | 'Annulée';
  payment_method: string;
  created_at: string;
  items?: OrderItem[];
  payment?: {
    id: number;
    method: string;
    amount_mad: number;
    status: string;
    reference: string;
  };
}

export interface CartItem {
  product_id: number;
  variant_id?: number;
  slug: string;
  name: string;
  image: string;
  size: string;
  color_name: string;
  unit_price_mad: number;
  quantity: number;
  max_stock: number;
}

export function formatMad(amount: number): string {
  return `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Math.round(amount))} MAD`;
}
