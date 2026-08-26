export type UnitType = 'kg' | 'gram' | 'con' | 'hộp' | 'túi' | 'khay' | 'combo';

export type ProcessingOption = 
  | 'Nguyên con'
  | 'Làm sạch'
  | 'Bỏ đầu'
  | 'Bóc vỏ'
  | 'Rút chỉ'
  | 'Cắt khúc'
  | 'Cắt lát'
  | 'Phi lê'
  | 'Giao sống oxy'
  | 'Ướp đá'
  | 'Khác';

export type BatchStatus = 
  | 'OPEN'          // Đang mở
  | 'COLLECTING'    // Đang gom đơn
  | 'CONFIRMED'     // Đã chốt
  | 'ORDERED'       // Đã đặt quê
  | 'RECEIVED'      // Đã nhận hàng
  | 'DISTRIBUTING'  // Đang chia hàng
  | 'DELIVERING'    // Đang giao
  | 'COMPLETED'     // Hoàn thành
  | 'CANCELLED';    // Đã hủy

export type OrderStatus = 
  | 'COLLECTING'    // Đang gom
  | 'CONFIRMED'     // Đã chốt
  | 'ORDERED'       // Đã đặt quê
  | 'RECEIVED'      // Đã nhận hàng
  | 'PACKED'        // Đã đóng gói
  | 'DELIVERING'    // Đang giao
  | 'DELIVERED'     // Đã giao
  | 'CANCELLED';    // Đã hủy

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'DEBT';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'QR' | 'COD' | 'DEBT';

export type DeliveryStatus = 'PENDING' | 'DELIVERING' | 'DELIVERED' | 'FAILED';

export interface Customer {
  customer_id: string;
  customer_code: string;
  name: string;
  phone: string;
  building: string; // Tòa nhà (ví dụ: Tòa A1, Tòa S2.05, Masteri...)
  room: string;     // Số phòng (ví dụ: 1205, 1802...)
  address?: string; // Địa chỉ chi tiết nếu cần
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  product_id: string;
  sku: string;
  product_name: string;
  category: string; // Tôm, Cua, Ghẹ, Cá biển, Mực/Bạch tuộc, Ốc/Ngao, Khác
  size?: string;    // Size 20-25 con/kg, 3-4 con/kg...
  origin?: string;  // Cà Mau, Quảng Ninh, Phú Quốc, Phan Thiết...
  unit: UnitType;
  default_price: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  image_url?: string;
}

export interface OrderItem {
  order_item_id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit: UnitType;
  size?: string;
  quantity_ordered: number;
  estimated_price: number;
  quantity_actual?: number;
  actual_price?: number;
  subtotal: number; // calculated from (quantity_actual ?? quantity_ordered) * (actual_price ?? estimated_price)
  processing_note?: string; // sơ chế: làm sạch, bỏ đầu, phi lê...
  item_note?: string;
  status?: 'PENDING' | 'WEIGHED' | 'PACKED' | 'OUT_OF_STOCK';
}

export interface Order {
  order_id: string;
  order_code: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_building: string;
  customer_room: string;
  batch_id: string;
  batch_name: string;
  order_date: string;
  delivery_date: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  paid_amount: number;
  debt_amount: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  delivery_status: DeliveryStatus;
  delivery_note?: string;
  delivered_at?: string;
  is_weighed?: boolean;
  is_packed?: boolean;
  is_verified?: boolean;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchItemSummary {
  product_id: string;
  product_name: string;
  unit: UnitType;
  size?: string;
  total_ordered: number;
  received_quantity?: number;
  estimated_price: number;
  actual_price?: number;
  order_count: number;
  orders: {
    order_id: string;
    order_code: string;
    customer_name: string;
    building: string;
    room: string;
    quantity: number;
    processing_note?: string;
  }[];
}

export interface Batch {
  batch_id: string;
  batch_code: string; // e.g. BATCH-20260825
  batch_name: string; // Đợt hàng hải sản Cà Mau 25/08
  batch_date: string;
  delivery_date: string;
  status: BatchStatus;
  notes?: string;
  supplier_info?: {
    name?: string;
    phone?: string;
    location?: string;
  };
  total_orders?: number;
  total_estimated_amount?: number;
  total_actual_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  transaction_id: string;
  order_id: string;
  order_code: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_method: PaymentMethod;
  note?: string;
  created_at: string;
}

export type TabType =
  | 'DASHBOARD'
  | 'BATCHES'
  | 'BATCH_DETAIL'
  | 'ORDERS'
  | 'DELIVERY'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'PAYMENTS'
  | 'REPORTS'
  | 'SETTINGS';

export interface AuditLog {
  log_id: string;
  action: string;
  entity: 'ORDER' | 'BATCH' | 'PRODUCT' | 'CUSTOMER' | 'PAYMENT' | 'PRICE' | 'WEIGHT' | 'SETTINGS';
  entity_id: string;
  description: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
}

export interface StoreSettings {
  store_name: string;
  owner_name: string;
  phone: string;
  hotline?: string;
  condo_name: string; // Chung cư Green Bay, Vinhomes Smart City, Geleximco 897 Giải Phóng...
  address: string;
  
  // Bank 1 (Tài khoản chính)
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  bank_bin?: string;
  
  // Bank 2 (Tài khoản phụ)
  bank_name_2?: string;
  bank_account_2?: string;
  bank_account_name_2?: string;
  bank_bin_2?: string;

  // Selected default bank for receiving payments ('BANK_1' | 'BANK_2')
  active_bank_account?: 'BANK_1' | 'BANK_2';
  
  bank_owner?: string;
  bank_qr_template?: 'compact2' | 'compact' | 'qr_only' | 'print'; // VietQR format
  qr_size?: 'large' | 'medium' | 'compact';
  invoice_footer_note?: string;
  slogan?: string;
  default_shipping_fee: number;
  show_vietqr?: boolean;
}
