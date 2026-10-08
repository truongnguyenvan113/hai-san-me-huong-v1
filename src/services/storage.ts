import {
  Customer,
  Product,
  Order,
  Batch,
  PaymentTransaction,
  AuditLog,
  StoreSettings,
  OrderItem,
  BatchItemSummary,
  BackupSnapshot,
  BackupData,
  SnapshotTrigger,
  DiffComparisonResult
} from '../types';
import appSettingsConfig from '../config/appSettings.json';

const STORAGE_KEYS = {
  CUSTOMERS: 'seafood_app_customers_v1',
  PRODUCTS: 'seafood_app_products_v1',
  BATCHES: 'seafood_app_batches_v1',
  ORDERS: 'seafood_app_orders_v1',
  PAYMENTS: 'seafood_app_payments_v1',
  AUDIT_LOGS: 'seafood_app_audit_logs_v1',
  SETTINGS: 'seafood_app_settings_v1',
  CURRENT_BATCH_ID: 'seafood_app_current_batch_id_v1',
  SNAPSHOTS: 'seafood_app_snapshots_v1',
  LAST_AUTO_BACKUP: 'seafood_app_last_auto_backup_v1',
  UNITS: 'seafood_app_units_v1',
  CATEGORIES: 'seafood_app_categories_v1',
};

export const DEFAULT_CATEGORIES: string[] = (
  Array.isArray(appSettingsConfig?.categories) && appSettingsConfig.categories.length > 0
    ? appSettingsConfig.categories
    : [
        'Tôm',
        'Cua',
        'Ghẹ',
        'Cá biển',
        'Mực',
        'Ốc & Ngao',
        'Hàu & Sò',
        'Chả cá & Đồ chế biến',
        'Đồ khô & Một nắng',
        'Gia vị & Khác',
        'Khác',
      ]
);

export const DEFAULT_UNITS: string[] = (
  Array.isArray(appSettingsConfig?.units) && appSettingsConfig.units.length > 0
    ? appSettingsConfig.units
    : [
        'Kg',
        'Hộp',
        'Khay',
        'Con',
        'Chai',
        'Lon',
        'Bịch',
        'Thùng',
        'Túi',
        'Gói',
        'Gram',
        'Phần',
        'Combo',
        'Rế',
        'Xù',
        'Vỉ',
        'kg',
      ]
);

const BASE_DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'Hải Sản Mẹ Hường',
  owner_name: 'Đặng Thị Vân (GSB-1004)',
  phone: '0916988982',
  hotline: '0916988982 ( Đặng Thị Vân | GSB-1004 )',
  condo_name: 'Chung cư Geleximco 897 Giải Phóng',
  address: 'Geleximco Southern Star, 897 Giải Phóng, Giáp Bát, Hoàng Mai, Hà Nội',
  
  // Bank 1 (Chính) - Mặc định ABBANK
  bank_name: 'ABBANK',
  bank_account: '9988776655',
  bank_account_name: 'DANG THI VAN',
  bank_bin: '970425',
  
  // Bank 2 (Phụ) - Mặc định BIDV
  bank_name_2: 'BIDV',
  bank_account_2: '12400008899',
  bank_account_name_2: 'DANG THI VAN',
  bank_bin_2: '970418',
  
  active_bank_account: 'BANK_1',
  bank_owner: 'DANG THI VAN',
  bank_qr_template: 'compact2',
  qr_size: 'large',
  invoice_footer_note: 'Hải sản tươi sống đánh bắt trong ngày từ quê gửi lên. Quý cư dân vui lòng bảo quản ngăn đông hoặc chế biến ngay!',
  slogan: 'Hải sản tươi ngon mỗi ngày - Gom tận gốc, giao tận cửa phòng',
  default_shipping_fee: 0,
  show_vietqr: true,
};

export const DEFAULT_SETTINGS: StoreSettings = {
  ...BASE_DEFAULT_SETTINGS,
  ...((appSettingsConfig?.settings as Partial<StoreSettings>) || {}),
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    product_id: 'PROD-001',
    sku: 'TOM-SU-20',
    product_name: 'Tôm Sú Cà Mau Tươi Sống',
    category: 'Tôm',
    size: 'Size 20-25 con/kg',
    origin: 'Năm Căn - Cà Mau',
    unit: 'kg',
    default_price: 450000,
    description: 'Tôm sú thiên nhiên Cà Mau thịt chắc ngọt, vỏ mỏng.',
    status: 'ACTIVE',
  },
  {
    product_id: 'PROD-002',
    sku: 'CUA-GACH-CA-MAU',
    product_name: 'Cua Gạch Cà Mau Dây Nhỏ',
    category: 'Cua',
    size: 'Size 2-3 con/kg (400-500g/con)',
    origin: 'Cà Mau',
    unit: 'kg',
    default_price: 580000,
    description: 'Cua gạch son đầy 100%, dây trói không trọng lượng.',
    status: 'ACTIVE',
  },
  {
    product_id: 'PROD-003',
    sku: 'GHE-XANH-PHAN-THIET',
    product_name: 'Ghẹ Xanh Phan Thiết',
    category: 'Ghẹ',
    size: 'Size 4-5 con/kg',
    origin: 'Phan Thiết',
    unit: 'kg',
    default_price: 420000,
    description: 'Ghẹ xanh lưới biển sâu, chắc thịt, thơm ngọt.',
    status: 'ACTIVE',
  },
  {
    product_id: 'PROD-004',
    sku: 'MUC-TRUNG-PHU-QUOC',
    product_name: 'Mực Trứng Phú Quốc Cấp Đông Tàu',
    category: 'Mực',
    size: 'Size 9-12cm (khoảng 25 con/kg)',
    origin: 'Phú Quốc',
    unit: 'kg',
    default_price: 320000,
    description: 'Mực trứng ôm trứng 90-100%, hấp gừng hoặc nướng muối ớt siêu ngon.',
    status: 'ACTIVE',
  },
  {
    product_id: 'PROD-005',
    sku: 'CA-THU-PHAN-THIET',
    product_name: 'Cá Thu Cắt Lát Khúc Giữa',
    category: 'Cá biển',
    size: 'Cắt lát dày 2cm',
    origin: 'Phan Thiết',
    unit: 'kg',
    default_price: 280000,
    description: 'Cá thu phấn tươi rói cắt khúc giữa, không đầu đuôi.',
    status: 'ACTIVE',
  },
  {
    product_id: 'PROD-006',
    sku: 'SO-HUYET-CO-TO',
    product_name: 'Sò Huyết Cồ Tươi Sống',
    category: 'Ốc & Ngao',
    size: 'Size 40-50 con/kg',
    origin: 'Cô Tô - Quảng Ninh',
    unit: 'kg',
    default_price: 240000,
    description: 'Sò huyết cồ béo múp, bổ dưỡng.',
    status: 'ACTIVE',
  },
  {
    product_id: 'PROD-007',
    sku: 'NGAO-HAI-COI',
    product_name: 'Ngao Hai Cồi To',
    category: 'Ốc & Ngao',
    size: 'Size 15-20 con/kg',
    origin: 'Vân Đồn',
    unit: 'kg',
    default_price: 160000,
    description: 'Ngao 2 cồi giòn ngọt sần sật, hấp sả ớt hoặc xào bơ tỏi.',
    status: 'ACTIVE',
  },
  {
    product_id: 'PROD-008',
    sku: 'CA-HOI-NAUY',
    product_name: 'Cá Hồi Nauy Tươi Phi Lê',
    category: 'Cá biển',
    size: 'Phi lê rút xương bỏ da',
    origin: 'Nauy nhập khẩu',
    unit: 'kg',
    default_price: 590000,
    description: 'Thịt cam tươi vân mỡ đều, chuẩn ăn sashimi hoặc áp chảo.',
    status: 'ACTIVE',
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    customer_id: 'CUST-001',
    customer_code: 'KH-1205-A1',
    name: 'Nguyễn Văn An',
    phone: '0901234567',
    building: 'Tòa A1',
    room: '1205',
    address: 'Phòng 1205, Tòa A1',
    note: 'Thường nhận hàng sau 17h30, thích tôm bơi sống',
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    customer_id: 'CUST-002',
    customer_code: 'KH-1502-A1',
    name: 'Trần Thị Bích Mai',
    phone: '0912345678',
    building: 'Tòa A1',
    room: '1502',
    address: 'Phòng 1502, Tòa A1',
    note: 'Giao bấm chuông để trước cửa nếu không có nhà, sơ chế sạch',
    created_at: '2026-08-02T09:00:00Z',
    updated_at: '2026-08-02T09:00:00Z',
  },
  {
    customer_id: 'CUST-003',
    customer_code: 'KH-1808-A2',
    name: 'Lê Hoàng Cường',
    phone: '0987654321',
    building: 'Tòa A2',
    room: '1808',
    address: 'Phòng 1808, Tòa A2',
    note: 'Khách quen, hay mua cua gạch và mực trứng',
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
  {
    customer_id: 'CUST-004',
    customer_code: 'KH-0806-B1',
    name: 'Phạm Thu Dung',
    phone: '0934567890',
    building: 'Tòa B1',
    room: '806',
    address: 'Phòng 806, Tòa B1',
    note: 'Cắt lát phi lê mỏng cho bé ăn dặm',
    created_at: '2026-08-10T11:00:00Z',
    updated_at: '2026-08-10T11:00:00Z',
  },
  {
    customer_id: 'CUST-005',
    customer_code: 'KH-2201-B2',
    name: 'Vũ Đức Hải',
    phone: '0978901234',
    building: 'Tòa B2',
    room: '2201',
    address: 'Phòng 2201, Tòa B2',
    note: 'Thanh toán chuyển khoản VietQR ngay sau khi giao',
    created_at: '2026-08-15T14:00:00Z',
    updated_at: '2026-08-15T14:00:00Z',
  }
];

export const INITIAL_BATCHES: Batch[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_PAYMENTS: PaymentTransaction[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export function normalizeProductName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function deduplicateProductsList(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) {
    if (!p || !p.product_name) continue;
    const normName = normalizeProductName(p.product_name);
    if (!normName) continue;
    if (!map.has(normName)) {
      map.set(normName, p);
    } else {
      // Merge details to retain richest information
      const existing = map.get(normName)!;
      map.set(normName, {
        ...existing,
        sku: existing.sku || p.sku,
        category: existing.category && existing.category !== 'Hải sản' ? existing.category : p.category || existing.category,
        size: existing.size || p.size,
        origin: existing.origin || p.origin,
        unit: existing.unit || p.unit,
        default_price: existing.default_price || p.default_price,
        description: existing.description || p.description,
        status: existing.status === 'ACTIVE' || p.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      });
    }
  }

  // Ensure every product in the list has a strictly unique product_id
  const seenIds = new Set<string>();
  return Array.from(map.values()).map((p, idx) => {
    let pid = (p.product_id || '').trim();
    if (!pid || seenIds.has(pid)) {
      pid = pid ? `${pid}-${idx + 1}` : `PROD-${Date.now()}-${idx + 1}`;
    }
    seenIds.add(pid);
    return {
      ...p,
      product_id: pid,
    };
  });
}

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing to localStorage key "${key}":`, e);
    }
  }

  public init(): void {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    } else {
      // Ensure hotline and settings are up to date
      const curSettings = this.getSettings();
      if (curSettings.hotline === '0988 776 655' || curSettings.phone === '0988 776 655') {
        this.set(STORAGE_KEYS.SETTINGS, {
          ...curSettings,
          hotline: DEFAULT_SETTINGS.hotline,
          phone: DEFAULT_SETTINGS.phone,
          owner_name: DEFAULT_SETTINGS.owner_name,
        });
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    } else {
      // Deduplicate existing products on init and ensure unique product_ids
      const savedProds = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
      const dedupedProds = deduplicateProductsList(savedProds);
      const hasChanges = dedupedProds.length !== savedProds.length || dedupedProds.some((p, i) => p.product_id !== savedProds[i]?.product_id);
      if (hasChanges) {
        this.set(STORAGE_KEYS.PRODUCTS, dedupedProds);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      this.set(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    }

    // Clean up sample batches 'BATCH-20260825' and 'BATCH-20260818' if present in localStorage
    const savedBatches = this.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    const filteredBatches = savedBatches.filter(
      (b) =>
        b.batch_id !== 'BATCH-20260825' &&
        b.batch_id !== 'BATCH-20260818' &&
        !b.batch_name?.includes('Phú Quốc 18/08') &&
        !b.batch_name?.includes('Cà Mau & Phan Thiết 25/08')
    );
    this.set(STORAGE_KEYS.BATCHES, filteredBatches);

    // Clean up sample orders belonging to those batches
    const savedOrders = this.get<Order[]>(STORAGE_KEYS.ORDERS, []);
    const filteredOrders = savedOrders.filter(
      (o) =>
        o.batch_id !== 'BATCH-20260825' &&
        o.batch_id !== 'BATCH-20260818' &&
        !o.batch_name?.includes('Phú Quốc 18/08') &&
        !o.batch_name?.includes('Cà Mau & Phan Thiết 25/08')
    );
    this.set(STORAGE_KEYS.ORDERS, filteredOrders);

    // Clean up sample payments
    const savedPayments = this.get<PaymentTransaction[]>(STORAGE_KEYS.PAYMENTS, []);
    const filteredPayments = savedPayments.filter(
      (p) => p.order_id !== 'ORD-20260825-001' && p.order_id !== 'ORD-20260825-003' && p.order_id !== 'ORD-20260825-005'
    );
    this.set(STORAGE_KEYS.PAYMENTS, filteredPayments);

    // Clean up current batch ID if it pointed to sample batch
    const currentBatchId = this.get<string | null>(STORAGE_KEYS.CURRENT_BATCH_ID, null);
    if (currentBatchId === 'BATCH-20260825' || currentBatchId === 'BATCH-20260818') {
      this.set(STORAGE_KEYS.CURRENT_BATCH_ID, filteredBatches[0]?.batch_id || null);
    }
  }

  // Settings
  public getSettings(): StoreSettings {
    const saved = this.get<StoreSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const merged: StoreSettings = {
      ...DEFAULT_SETTINGS,
      ...(saved || {}),
    };
    if (merged.store_name === 'Hải Sản Tươi Quê - Chung Cư Xanh' || !merged.store_name) {
      merged.store_name = DEFAULT_SETTINGS.store_name;
    }
    if (merged.condo_name === 'Chung Cư EcoGreen City' || !merged.condo_name) {
      merged.condo_name = DEFAULT_SETTINGS.condo_name;
    }
    if (merged.address === 'Tòa CT1, EcoGreen City, Nguyễn Xiển, Hà Nội' || !merged.address) {
      merged.address = DEFAULT_SETTINGS.address;
    }
    if (merged.hotline === '0988 776 655' || !merged.hotline) {
      merged.hotline = DEFAULT_SETTINGS.hotline;
    }
    if (merged.phone === '0988 776 655' || !merged.phone) {
      merged.phone = DEFAULT_SETTINGS.phone;
    }
    merged.phone = merged.phone || merged.hotline || DEFAULT_SETTINGS.phone;
    merged.hotline = merged.hotline || merged.phone || DEFAULT_SETTINGS.hotline;
    merged.bank_name = merged.bank_name || DEFAULT_SETTINGS.bank_name;
    merged.bank_account = merged.bank_account || DEFAULT_SETTINGS.bank_account;
    merged.bank_account_name = merged.bank_account_name || merged.bank_owner || DEFAULT_SETTINGS.bank_account_name;
    merged.bank_bin = merged.bank_bin || DEFAULT_SETTINGS.bank_bin;

    merged.bank_name_2 = merged.bank_name_2 || DEFAULT_SETTINGS.bank_name_2;
    merged.bank_account_2 = merged.bank_account_2 || DEFAULT_SETTINGS.bank_account_2;
    merged.bank_account_name_2 = merged.bank_account_name_2 || merged.bank_account_name || DEFAULT_SETTINGS.bank_account_name_2;
    merged.bank_bin_2 = merged.bank_bin_2 || DEFAULT_SETTINGS.bank_bin_2;

    merged.active_bank_account = merged.active_bank_account || 'BANK_1';
    merged.bank_qr_template = merged.bank_qr_template || 'compact2';
    merged.qr_size = merged.qr_size || 'large';
    merged.bank_owner = merged.bank_owner || merged.bank_account_name || DEFAULT_SETTINGS.bank_owner;
    merged.slogan = merged.slogan || DEFAULT_SETTINGS.slogan;
    merged.show_vietqr = merged.show_vietqr !== undefined ? merged.show_vietqr : true;
    return merged;
  }

  public saveSettings(settings: StoreSettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
    this.logAudit('UPDATE_SETTINGS', 'SETTINGS', 'STORE', 'Cập nhật cấu hình cửa hàng & thông tin ngân hàng');
  }

  // Current Batch
  public getCurrentBatchId(): string | null {
    const saved = this.get<string | null>(STORAGE_KEYS.CURRENT_BATCH_ID, null);
    if (saved === 'BATCH-20260825' || saved === 'BATCH-20260818') return null;
    return saved;
  }

  public setCurrentBatchId(batchId: string): void {
    this.set(STORAGE_KEYS.CURRENT_BATCH_ID, batchId);
  }

  // Products
  public getProducts(): Product[] {
    const raw = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const deduped = deduplicateProductsList(raw);
    const needsUpdate = deduped.length !== raw.length || deduped.some((p, i) => p.product_id !== raw[i]?.product_id);
    if (needsUpdate) {
      this.set(STORAGE_KEYS.PRODUCTS, deduped);
    }
    return deduped;
  }

  public saveProducts(products: Product[]): void {
    const deduped = deduplicateProductsList(products);
    this.set(STORAGE_KEYS.PRODUCTS, deduped);
  }

  public addProduct(product: Product): void {
    const products = this.getProducts();
    const normName = normalizeProductName(product.product_name);
    const normSku = (product.sku || '').trim().toLowerCase();

    const existingIndex = products.findIndex(
      (p) => normalizeProductName(p.product_name) === normName || (normSku && (p.sku || '').trim().toLowerCase() === normSku)
    );

    if (existingIndex !== -1) {
      // Update existing product without creating duplicates
      products[existingIndex] = {
        ...products[existingIndex],
        ...product,
        product_name: product.product_name || products[existingIndex].product_name,
        category: product.category && product.category !== 'Hải sản' ? product.category : products[existingIndex].category,
        size: product.size || products[existingIndex].size,
        origin: product.origin || products[existingIndex].origin,
        default_price: product.default_price || products[existingIndex].default_price,
        unit: product.unit || products[existingIndex].unit,
      };
      this.saveProducts(products);
      this.logAudit('UPDATE_PRODUCT', 'PRODUCT', products[existingIndex].product_id, `Cập nhật thông tin hải sản: ${products[existingIndex].product_name}`);
    } else {
      products.unshift(product);
      this.saveProducts(products);
      this.logAudit('CREATE_PRODUCT', 'PRODUCT', product.product_id, `Thêm hải sản mới: ${product.product_name}`);
    }
  }

  public updateProduct(product: Product): void {
    const products = this.getProducts();
    const normName = normalizeProductName(product.product_name);
    const index = products.findIndex(
      (p) => p.product_id === product.product_id || normalizeProductName(p.product_name) === normName
    );

    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...product,
      };
      this.saveProducts(products);
      this.logAudit('UPDATE_PRODUCT', 'PRODUCT', products[index].product_id, `Cập nhật sản phẩm: ${products[index].product_name}`);
    }
  }

  public deleteProduct(productId: string): void {
    const products = this.getProducts();
    const target = products.find((p) => p.product_id === productId);
    const next = products.filter((p) => p.product_id !== productId);
    this.saveProducts(next);
    if (target) {
      this.logAudit('DELETE_PRODUCT', 'PRODUCT', productId, `Xóa sản phẩm hải sản khỏi danh mục: ${target.product_name}`);
    }
  }

  public bulkAddProducts(newProducts: Partial<Product>[]): Product[] {
    const current = this.getProducts();
    const added: Product[] = [];

    for (const p of newProducts) {
      if (!p.product_name || !p.product_name.trim()) continue;
      const trimmedName = p.product_name.trim();
      const normName = normalizeProductName(trimmedName);

      const exists = current.some((cp) => normalizeProductName(cp.product_name) === normName);
      if (!exists) {
        const timestamp = Date.now() + Math.floor(Math.random() * 1000);
        const newProd: Product = {
          product_id: p.product_id || `PROD-${timestamp}`,
          sku: p.sku || `HS-${timestamp.toString().slice(-4)}`,
          product_name: trimmedName,
          category: p.category || 'Khác',
          size: p.size || '',
          origin: p.origin || '',
          unit: p.unit || 'kg',
          default_price: Number(p.default_price) || 200000,
          description: p.description || '',
          status: p.status || 'ACTIVE',
        };
        current.unshift(newProd);
        added.push(newProd);
      }
    }

    if (added.length > 0) {
      this.saveProducts(current);
      this.logAudit('BULK_CREATE_PRODUCTS', 'PRODUCT', `COUNT-${added.length}`, `Thêm nhanh ${added.length} hải sản vào danh mục`);
    }
    return current;
  }

  // Units Management (Kg, Hộp, Khay, Con, Chai,...)
  public getUnits(): string[] {
    const units = this.get<string[]>(STORAGE_KEYS.UNITS, DEFAULT_UNITS);
    if (!Array.isArray(units) || units.length === 0) {
      return DEFAULT_UNITS;
    }
    return units;
  }

  public saveUnits(units: string[]): void {
    const cleaned = Array.from(new Set(units.map((u) => (u || '').trim()).filter(Boolean)));
    this.set(STORAGE_KEYS.UNITS, cleaned);
  }

  public addUnit(unit: string): string[] {
    const current = this.getUnits();
    const cleanUnit = (unit || '').trim();
    if (!cleanUnit) return current;
    if (!current.some((u) => u.toLowerCase() === cleanUnit.toLowerCase())) {
      const next = [...current, cleanUnit];
      this.saveUnits(next);
      this.logAudit('CREATE_UNIT', 'SETTINGS', cleanUnit, `Thêm đơn vị tính mới: ${cleanUnit}`);
      return next;
    }
    return current;
  }

  public updateUnit(oldUnit: string, newUnit: string): string[] {
    const current = this.getUnits();
    const cleanOld = (oldUnit || '').trim();
    const cleanNew = (newUnit || '').trim();
    if (!cleanNew) return current;

    const next = current.map((u) => (u.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : u));
    this.saveUnits(next);

    // Also update any products using this unit
    const products = this.getProducts();
    let prodsChanged = false;
    const updatedProds = products.map((p) => {
      if (p.unit && p.unit.toLowerCase() === cleanOld.toLowerCase()) {
        prodsChanged = true;
        return { ...p, unit: cleanNew };
      }
      return p;
    });
    if (prodsChanged) {
      this.saveProducts(updatedProds);
    }

    this.logAudit('UPDATE_UNIT', 'SETTINGS', cleanNew, `Đổi tên đơn vị tính từ ${cleanOld} sang ${cleanNew}`);
    return next;
  }

  public deleteUnit(unit: string): string[] {
    const current = this.getUnits();
    const cleanUnit = (unit || '').trim().toLowerCase();
    const next = current.filter((u) => u.toLowerCase() !== cleanUnit);
    this.saveUnits(next);
    this.logAudit('DELETE_UNIT', 'SETTINGS', cleanUnit, `Xóa đơn vị tính: ${unit.trim()}`);
    return next;
  }

  public resetUnits(): string[] {
    this.saveUnits(DEFAULT_UNITS);
    return DEFAULT_UNITS;
  }

  // Categories Management (Tôm, Cua, Ghẹ, Mực, Cá biển,...)
  public getCategories(): string[] {
    const categories = this.get<string[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    if (!Array.isArray(categories) || categories.length === 0) {
      return DEFAULT_CATEGORIES;
    }
    return categories;
  }

  public saveCategories(categories: string[]): void {
    const cleaned = Array.from(new Set(categories.map((c) => (c || '').trim()).filter(Boolean)));
    this.set(STORAGE_KEYS.CATEGORIES, cleaned);
  }

  public addCategory(cat: string): string[] {
    const current = this.getCategories();
    const cleanCat = (cat || '').trim();
    if (!cleanCat) return current;
    if (!current.some((c) => c.toLowerCase() === cleanCat.toLowerCase())) {
      const next = [...current, cleanCat];
      this.saveCategories(next);
      this.logAudit('CREATE_CATEGORY', 'SETTINGS', cleanCat, `Thêm danh mục hải sản mới: ${cleanCat}`);
      return next;
    }
    return current;
  }

  public updateCategory(oldCat: string, newCat: string): string[] {
    const current = this.getCategories();
    const cleanOld = (oldCat || '').trim();
    const cleanNew = (newCat || '').trim();
    if (!cleanNew) return current;

    const next = current.map((c) => (c.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c));
    this.saveCategories(next);

    // Also update any products using this category
    const products = this.getProducts();
    let changed = false;
    const updated = products.map((p) => {
      if (p.category && p.category.toLowerCase() === cleanOld.toLowerCase()) {
        changed = true;
        return { ...p, category: cleanNew };
      }
      return p;
    });
    if (changed) this.saveProducts(updated);

    this.logAudit('UPDATE_CATEGORY', 'SETTINGS', cleanNew, `Đổi tên danh mục từ ${cleanOld} sang ${cleanNew}`);
    return next;
  }

  public deleteCategory(cat: string): string[] {
    const current = this.getCategories();
    const cleanCat = (cat || '').trim().toLowerCase();
    const next = current.filter((c) => c.toLowerCase() !== cleanCat);
    this.saveCategories(next);
    this.logAudit('DELETE_CATEGORY', 'SETTINGS', cat.trim(), `Xóa danh mục hải sản: ${cat.trim()}`);
    return next;
  }

  public resetCategories(): string[] {
    this.saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }

  // Export current settings, units, and categories configuration (for Git and Server sync)
  public exportSettingsConfig() {
    return {
      settings: this.getSettings(),
      units: this.getUnits(),
      categories: this.getCategories(),
      lastUpdated: new Date().toISOString(),
    };
  }

  // Import and apply settings, units, and categories configuration from Git or Server
  public importSettingsConfig(config?: { settings?: Partial<StoreSettings>; units?: string[]; categories?: string[] }) {
    if (!config) return;
    if (config.settings) {
      this.saveSettings({ ...this.getSettings(), ...config.settings });
    }
    if (Array.isArray(config.units) && config.units.length > 0) {
      this.saveUnits(config.units);
    }
    if (Array.isArray(config.categories) && config.categories.length > 0) {
      this.saveCategories(config.categories);
    }
  }

  // Customers
  public getCustomers(): Customer[] {
    return this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  public saveCustomers(customers: Customer[]): void {
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
  }

  public addCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    customers.unshift(customer);
    this.saveCustomers(customers);
    this.logAudit('CREATE_CUSTOMER', 'CUSTOMER', customer.customer_id, `Thêm khách hàng: ${customer.name} (${customer.building} - ${customer.room})`);
  }

  public updateCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.customer_id === customer.customer_id);
    if (index !== -1) {
      customers[index] = customer;
      this.saveCustomers(customers);
      this.logAudit('UPDATE_CUSTOMER', 'CUSTOMER', customer.customer_id, `Cập nhật khách hàng: ${customer.name}`);
    }
  }

  // Batches
  public getBatches(): Batch[] {
    const raw = this.get<Batch[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((b) => b && typeof b === 'object' && b.batch_id)
      .map((b, idx) => ({
        ...b,
        batch_id: b.batch_id || `BATCH-${idx + 1}`,
        batch_code: b.batch_code || `DOT-${String(idx + 1).padStart(3, '0')}`,
        batch_name: b.batch_name || `Đợt Gom #${idx + 1}`,
        status: b.status || 'COLLECTING',
        batch_date: b.batch_date || new Date().toISOString().slice(0, 10),
        delivery_date: b.delivery_date || b.batch_date || new Date().toISOString().slice(0, 10),
        supplier_info: b.supplier_info || { location: 'Quảng Ninh & Cà Mau' },
        notes: b.notes || '',
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      }));
  }

  public saveBatches(batches: Batch[]): void {
    this.set(STORAGE_KEYS.BATCHES, batches);
  }

  public addBatch(batch: Batch): void {
    const batches = this.getBatches();
    batches.unshift(batch);
    this.saveBatches(batches);
    this.setCurrentBatchId(batch.batch_id);
    this.logAudit('CREATE_BATCH', 'BATCH', batch.batch_id, `Tạo đợt hàng mới: ${batch.batch_name}`);
  }

  public updateBatch(batch: Batch): void {
    const batches = this.getBatches();
    const index = batches.findIndex(b => b.batch_id === batch.batch_id);
    if (index !== -1) {
      batches[index] = batch;
      this.saveBatches(batches);
      this.logAudit('UPDATE_BATCH', 'BATCH', batch.batch_id, `Cập nhật đợt hàng: ${batch.batch_name} - Trạng thái: ${batch.status}`);
    }
  }

  public deleteBatch(batchId: string): { success: boolean; deletedOrdersCount: number; batchName: string } {
    const batches = this.getBatches();
    const batchToDelete = batches.find((b) => b.batch_id === batchId);
    if (!batchToDelete) {
      return { success: false, deletedOrdersCount: 0, batchName: '' };
    }

    const batchName = batchToDelete.batch_name;

    // 1. Remove the batch
    const updatedBatches = batches.filter((b) => b.batch_id !== batchId);
    this.saveBatches(updatedBatches);

    // 2. Remove all orders belonging to this batch
    const allOrders = this.getOrders();
    const remainingOrders = allOrders.filter((o) => o.batch_id !== batchId);
    const deletedOrdersCount = allOrders.length - remainingOrders.length;
    this.saveOrders(remainingOrders);

    // 3. Remove payment transactions associated with deleted orders
    const deletedOrderIds = new Set(allOrders.filter((o) => o.batch_id === batchId).map((o) => o.order_id));
    const allPayments = this.getPayments();
    const remainingPayments = allPayments.filter((p) => !deletedOrderIds.has(p.order_id));
    if (remainingPayments.length !== allPayments.length) {
      this.set(STORAGE_KEYS.PAYMENTS, remainingPayments);
    }

    // 4. Update current batch id if it was pointing to this batch
    const curBatchId = this.getCurrentBatchId();
    if (curBatchId === batchId) {
      const nextBatchId = updatedBatches.length > 0 ? updatedBatches[0].batch_id : null;
      if (nextBatchId) {
        this.setCurrentBatchId(nextBatchId);
      } else {
        this.set(STORAGE_KEYS.CURRENT_BATCH_ID, null);
      }
    }

    this.logAudit(
      'DELETE_BATCH',
      'BATCH',
      batchId,
      `Xóa đợt hàng: ${batchName} và ${deletedOrdersCount} đơn hàng liên quan`
    );

    return { success: true, deletedOrdersCount, batchName };
  }

  // Orders
  public getOrders(): Order[] {
    const raw = this.get<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((o) => o && typeof o === 'object')
      .map((o, idx) => {
        const order_code = o.order_code || `ORD-${String(idx + 1).padStart(3, '0')}`;
        const order_id = o.order_id || `ORDER-${order_code}`;

        const rawItems = Array.isArray(o.items) ? o.items : [];
        const items: OrderItem[] = (rawItems.length > 0 ? rawItems : [
          {
            order_item_id: `ITEM-${order_code}-1`,
            order_id,
            product_id: 'PROD-1',
            product_name: 'Hải Sản Tươi',
            quantity_ordered: 1,
            unit: 'kg',
            estimated_price: Number(o.total) || 150000,
            subtotal: Number(o.total) || 150000,
            status: 'PENDING',
          }
        ]).filter(Boolean).map((it: any, iIdx: number) => {
          const qty = Number(it.quantity_actual ?? it.quantity_ordered) || 1;
          const price = Number(it.actual_price ?? it.estimated_price) || 0;
          const subtotal = typeof it.subtotal === 'number' && !isNaN(it.subtotal) ? it.subtotal : Math.round(qty * price);
          return {
            order_item_id: it.order_item_id || `ITEM-${order_code}-${iIdx + 1}`,
            order_id,
            product_id: it.product_id || `PROD-${iIdx + 1}`,
            product_name: it.product_name || 'Hải sản',
            size: it.size || '',
            quantity_ordered: Number(it.quantity_ordered) || 1,
            quantity_actual: it.quantity_actual !== undefined && it.quantity_actual !== null ? Number(it.quantity_actual) : undefined,
            unit: it.unit || 'kg',
            estimated_price: Number(it.estimated_price) || 0,
            actual_price: it.actual_price !== undefined && it.actual_price !== null ? Number(it.actual_price) : undefined,
            subtotal,
            processing_note: it.processing_note || '',
            item_note: it.item_note || '',
            status: it.status || 'PENDING',
          };
        });

        const calcSubtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0);
        const total = typeof o.total === 'number' && !isNaN(o.total) ? o.total : calcSubtotal;
        const paid_amount = typeof o.paid_amount === 'number' && !isNaN(o.paid_amount) ? o.paid_amount : 0;
        const debt_amount = typeof o.debt_amount === 'number' && !isNaN(o.debt_amount) ? o.debt_amount : Math.max(0, total - paid_amount);

        return {
          ...o,
          order_id,
          order_code,
          customer_id: o.customer_id || `CUST-${o.customer_room || idx + 1}`,
          customer_name: o.customer_name || 'Cư dân',
          customer_phone: String(o.customer_phone || '').trim(),
          customer_building: o.customer_building || 'Tòa A',
          customer_room: o.customer_room || '',
          batch_id: o.batch_id || 'BATCH-DEFAULT',
          batch_name: o.batch_name || 'Đợt Gom Hàng',
          items,
          subtotal: calcSubtotal,
          total,
          paid_amount,
          debt_amount,
          status: o.status || 'COLLECTING',
          delivery_status: o.delivery_status || 'PENDING',
          payment_status: o.payment_status || (paid_amount >= total && total > 0 ? 'PAID' : paid_amount > 0 ? 'PARTIAL' : 'UNPAID'),
          payment_method: o.payment_method || 'QR',
          order_date: o.order_date || o.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          delivery_date: o.delivery_date || o.order_date || new Date().toISOString().slice(0, 10),
          created_at: o.created_at || new Date().toISOString(),
          updated_at: o.updated_at || new Date().toISOString(),
        };
      });
  }

  public saveOrders(orders: Order[]): void {
    this.set(STORAGE_KEYS.ORDERS, orders);
  }

  public calculateOrderItemSubtotal(item: OrderItem): number {
    const qty = item.quantity_actual !== undefined && item.quantity_actual !== null ? item.quantity_actual : item.quantity_ordered;
    const price = item.actual_price !== undefined && item.actual_price !== null ? item.actual_price : item.estimated_price;
    return Math.round(qty * price);
  }

  public recalculateOrder(order: Order): Order {
    let subtotal = 0;
    const items = order.items.map(item => {
      const itemSubtotal = this.calculateOrderItemSubtotal(item);
      subtotal += itemSubtotal;
      return {
        ...item,
        subtotal: itemSubtotal
      };
    });

    const total = Math.max(0, subtotal - (order.discount || 0) + (order.shipping_fee || 0));
    const paid = order.paid_amount || 0;
    const debt = Math.max(0, total - paid);
    
    let payment_status = order.payment_status;
    if (paid >= total && total > 0) {
      payment_status = 'PAID';
    } else if (paid > 0 && paid < total) {
      payment_status = 'PARTIAL';
    } else if (paid === 0) {
      payment_status = 'UNPAID';
    }

    return {
      ...order,
      items,
      subtotal,
      total,
      paid_amount: paid,
      debt_amount: debt,
      payment_status,
      updated_at: new Date().toISOString()
    };
  }

  public addOrder(order: Order): void {
    const orders = this.getOrders();
    const calculatedOrder = this.recalculateOrder(order);
    orders.unshift(calculatedOrder);
    this.saveOrders(orders);
    this.logAudit('CREATE_ORDER', 'ORDER', order.order_id, `Tạo đơn hàng ${order.order_code} cho ${order.customer_name} (${order.customer_building} - ${order.customer_room})`);
  }

  public updateOrder(order: Order): void {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.order_id === order.order_id);
    if (index !== -1) {
      const calculatedOrder = this.recalculateOrder(order);
      orders[index] = calculatedOrder;
      this.saveOrders(orders);
      this.logAudit('UPDATE_ORDER', 'ORDER', order.order_id, `Cập nhật đơn hàng ${order.order_code}`);
    }
  }

  public cancelOrder(orderId: string, reason?: string): void {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.order_id === orderId);
    if (index !== -1) {
      orders[index].status = 'CANCELLED';
      orders[index].updated_at = new Date().toISOString();
      if (reason) {
        orders[index].note = (orders[index].note ? orders[index].note + ' | ' : '') + `Lý do hủy: ${reason}`;
      }
      this.saveOrders(orders);
      this.logAudit('CANCEL_ORDER', 'ORDER', orderId, `Hủy đơn hàng ${orders[index].order_code}. Lý do: ${reason || 'Khách yêu cầu'}`);
    }
  }

  // Update actual prices across an entire batch
  public updateBatchActualPrices(batchId: string, priceMap: Record<string, number>): void {
    const orders = this.getOrders();
    let updatedCount = 0;

    const newOrders = orders.map(order => {
      if (order.batch_id !== batchId || order.status === 'CANCELLED') return order;

      let changed = false;
      const newItems = order.items.map(item => {
        if (priceMap[item.product_id] !== undefined) {
          changed = true;
          return {
            ...item,
            actual_price: priceMap[item.product_id]
          };
        }
        return item;
      });

      if (changed) {
        updatedCount++;
        return this.recalculateOrder({ ...order, items: newItems });
      }
      return order;
    });

    this.saveOrders(newOrders);
    this.logAudit('CHANGE_PRICE', 'PRICE', batchId, `Cập nhật giá thực tế đợt hàng ${batchId} cho ${updatedCount} đơn hàng`);
  }

  // Payments
  public getPayments(): PaymentTransaction[] {
    return this.get<PaymentTransaction[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  }

  public addPayment(payment: PaymentTransaction): void {
    const payments = this.getPayments();
    payments.unshift(payment);
    this.set(STORAGE_KEYS.PAYMENTS, payments);

    // Update order paid amount
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(o => o.order_id === payment.order_id);
    if (orderIndex !== -1) {
      const order = orders[orderIndex];
      const newPaidAmount = (order.paid_amount || 0) + payment.amount;
      const updatedOrder = this.recalculateOrder({
        ...order,
        paid_amount: newPaidAmount,
        payment_method: payment.payment_method
      });
      orders[orderIndex] = updatedOrder;
      this.saveOrders(orders);
    }

    this.logAudit('CREATE_PAYMENT', 'PAYMENT', payment.transaction_id, `Thu tiền ${payment.amount.toLocaleString()}đ cho đơn ${payment.order_code} (${payment.customer_name})`);
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  public logAudit(action: string, entity: AuditLog['entity'], entity_id: string, description: string, old_val?: any, new_val?: any): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      log_id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      entity,
      entity_id,
      description,
      old_value: old_val,
      new_value: new_val,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 300)); // keep last 300 logs
  }

  // Aggregation Helpers
  public getBatchItemSummary(batchId: string): BatchItemSummary[] {
    const orders = this.getOrders().filter(o => o.batch_id === batchId && o.status !== 'CANCELLED');
    const summaryMap: Record<string, BatchItemSummary> = {};

    for (const order of orders) {
      for (const item of order.items) {
        if (!summaryMap[item.product_id]) {
          summaryMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            unit: item.unit,
            size: item.size,
            total_ordered: 0,
            received_quantity: 0,
            estimated_price: item.estimated_price,
            actual_price: item.actual_price,
            order_count: 0,
            orders: []
          };
        }

        const sum = summaryMap[item.product_id];
        sum.total_ordered += (item.quantity_ordered || 0);
        sum.order_count += 1;
        if (item.actual_price) {
          sum.actual_price = item.actual_price;
        }
        sum.orders.push({
          order_id: order.order_id,
          order_code: order.order_code,
          customer_name: order.customer_name,
          building: order.customer_building,
          room: order.customer_room,
          quantity: item.quantity_ordered,
          processing_note: item.processing_note
        });
      }
    }

    return Object.values(summaryMap);
  }

  // Backup & Restore
  public exportAllData(): string {
    const data = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      settings: this.getSettings(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      batches: this.getBatches(),
      orders: this.getOrders(),
      payments: this.getPayments(),
      audit_logs: this.getAuditLogs(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importAllData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.products) this.set(STORAGE_KEYS.PRODUCTS, data.products);
      if (data.customers) this.set(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.batches) this.set(STORAGE_KEYS.BATCHES, data.batches);
      if (data.orders) this.set(STORAGE_KEYS.ORDERS, data.orders);
      if (data.payments) this.set(STORAGE_KEYS.PAYMENTS, data.payments);
      if (data.settings) this.set(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.audit_logs) this.set(STORAGE_KEYS.AUDIT_LOGS, data.audit_logs);
      this.logAudit('RESTORE_DATA', 'BATCH', 'SYSTEM', 'Khôi phục toàn bộ dữ liệu từ file sao lưu');
      return true;
    } catch (e) {
      console.error('Import data failed:', e);
      return false;
    }
  }

  // Snapshot Backup & Diff Comparison Engine
  public getSnapshots(): BackupSnapshot[] {
    return this.get<BackupSnapshot[]>(STORAGE_KEYS.SNAPSHOTS, []);
  }

  public saveSnapshots(snapshots: BackupSnapshot[]): void {
    // Keep up to 30 most recent snapshots
    this.set(STORAGE_KEYS.SNAPSHOTS, snapshots.slice(0, 30));
  }

  public getCurrentBackupData(): BackupData {
    return {
      orders: this.getOrders(),
      batches: this.getBatches(),
      customers: this.getCustomers(),
      products: this.getProducts(),
      storeSettings: this.getSettings(),
      activeBatchId: this.getCurrentBatchId() || undefined,
      exportedAt: new Date().toISOString(),
    };
  }

  public createSnapshot(
    trigger: SnapshotTrigger = 'MANUAL',
    customTitle?: string
  ): BackupSnapshot {
    const data = this.getCurrentBackupData();
    const activeBatch = data.batches.find(b => b.batch_id === data.activeBatchId) || data.batches[0];
    const totalRevenue = data.orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const titleMap: Record<SnapshotTrigger, string> = {
      AUTO_2H: 'Sao lưu tự động định kỳ (Mỗi 2 giờ)',
      MANUAL: customTitle || 'Điểm sao lưu thủ công',
      BEFORE_ACCOUNT_SWITCH: 'Tự động lưu trước khi chuyển đổi / đăng xuất tài khoản Google',
      BEFORE_RESTORE: 'Tự động lưu trước khi nạp dữ liệu mới / khôi phục',
      BEFORE_SHEETS_PULL: 'Tự động lưu trước khi đồng bộ ngược từ Google Sheets',
    };

    const newSnapshot: BackupSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      trigger,
      title: customTitle || titleMap[trigger] || 'Bản sao lưu dữ liệu',
      summary: {
        ordersCount: data.orders.length,
        batchesCount: data.batches.length,
        customersCount: data.customers.length,
        productsCount: data.products.length,
        totalRevenue,
        activeBatchName: activeBatch ? activeBatch.batch_name : undefined,
      },
      data,
    };

    const currentSnapshots = this.getSnapshots();
    this.saveSnapshots([newSnapshot, ...currentSnapshots]);

    if (trigger === 'AUTO_2H') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LAST_AUTO_BACKUP, Date.now().toString());
      }
    }

    this.logAudit(
      'SNAPSHOT_CREATED',
      'SETTINGS',
      newSnapshot.id,
      `Đã tạo bản sao lưu (${newSnapshot.title}) gồm ${data.orders.length} đơn hàng, ${data.batches.length} đợt gom`
    );

    return newSnapshot;
  }

  public deleteSnapshot(snapshotId: string): boolean {
    const list = this.getSnapshots();
    const filtered = list.filter(s => s.id !== snapshotId);
    if (filtered.length !== list.length) {
      this.saveSnapshots(filtered);
      return true;
    }
    return false;
  }

  public clearAllSnapshots(): void {
    this.set(STORAGE_KEYS.SNAPSHOTS, []);
  }

  // Restore whole state from a snapshot
  public restoreFromSnapshot(snapshot: BackupSnapshot, saveBackupFirst = true): boolean {
    if (!snapshot || !snapshot.data) return false;

    if (saveBackupFirst) {
      this.createSnapshot('BEFORE_RESTORE', `Lưu an toàn trước khi khôi phục bản [${new Date(snapshot.timestamp).toLocaleString('vi-VN')}]`);
    }

    const { products, customers, batches, orders, storeSettings, activeBatchId } = snapshot.data;
    if (products) this.set(STORAGE_KEYS.PRODUCTS, products);
    if (customers) this.set(STORAGE_KEYS.CUSTOMERS, customers);
    if (batches) this.set(STORAGE_KEYS.BATCHES, batches);
    if (orders) this.set(STORAGE_KEYS.ORDERS, orders);
    if (storeSettings) this.set(STORAGE_KEYS.SETTINGS, storeSettings);
    if (activeBatchId) this.set(STORAGE_KEYS.CURRENT_BATCH_ID, activeBatchId);

    this.logAudit(
      'RESTORE_SNAPSHOT',
      'SETTINGS',
      snapshot.id,
      `Khôi phục thành công từ bản sao lưu: ${snapshot.title} (${new Date(snapshot.timestamp).toLocaleString('vi-VN')})`
    );

    return true;
  }

  // Smart Merge data from a snapshot without destroying existing records
  public mergeFromSnapshot(snapshot: BackupSnapshot): {
    restoredOrders: number;
    restoredBatches: number;
    restoredCustomers: number;
    restoredProducts: number;
  } {
    if (!snapshot || !snapshot.data) {
      return { restoredOrders: 0, restoredBatches: 0, restoredCustomers: 0, restoredProducts: 0 };
    }

    this.createSnapshot('BEFORE_RESTORE', `Lưu an toàn trước khi gộp dữ liệu từ bản [${new Date(snapshot.timestamp).toLocaleString('vi-VN')}]`);

    const currentProducts = this.getProducts();
    const currentCustomers = this.getCustomers();
    const currentBatches = this.getBatches();
    const currentOrders = this.getOrders();

    let addedBatches = 0;
    let addedOrders = 0;
    let addedCustomers = 0;
    let addedProducts = 0;

    // Merge Batches
    const mergedBatches = [...currentBatches];
    for (const b of snapshot.data.batches || []) {
      if (!mergedBatches.some(curr => curr.batch_id === b.batch_id || curr.batch_code === b.batch_code)) {
        mergedBatches.push(b);
        addedBatches++;
      }
    }

    // Merge Orders
    const mergedOrders = [...currentOrders];
    for (const o of snapshot.data.orders || []) {
      if (!mergedOrders.some(curr => curr.order_id === o.order_id || curr.order_code === o.order_code)) {
        mergedOrders.push(o);
        addedOrders++;
      }
    }

    // Merge Customers
    const mergedCustomers = [...currentCustomers];
    for (const c of snapshot.data.customers || []) {
      if (!mergedCustomers.some(curr => (curr.phone && curr.phone === c.phone) || (curr.room === c.room && curr.building === c.building))) {
        mergedCustomers.push(c);
        addedCustomers++;
      }
    }

    // Merge Products
    const mergedProducts = [...currentProducts];
    for (const p of snapshot.data.products || []) {
      if (!mergedProducts.some(curr => curr.sku === p.sku || curr.product_name.toLowerCase() === p.product_name.toLowerCase())) {
        mergedProducts.push(p);
        addedProducts++;
      }
    }

    this.saveBatches(mergedBatches);
    this.saveOrders(mergedOrders);
    this.saveCustomers(mergedCustomers);
    this.saveProducts(mergedProducts);

    return {
      restoredBatches: addedBatches,
      restoredOrders: addedOrders,
      restoredCustomers: addedCustomers,
      restoredProducts: addedProducts,
    };
  }

  // Periodic 2-Hour Auto-Backup Checker
  public checkAndTriggerAutoBackup(intervalHours = 2): BackupSnapshot | null {
    if (typeof window === 'undefined') return null;

    const lastBackupStr = localStorage.getItem(STORAGE_KEYS.LAST_AUTO_BACKUP);
    const lastBackupTime = lastBackupStr ? parseInt(lastBackupStr, 10) : 0;
    const now = Date.now();
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Check if enough time has passed and there is actual data in the app
    const hasData = this.getOrders().length > 0 || this.getBatches().length > 0;
    if (hasData && (now - lastBackupTime >= intervalMs || !lastBackupStr)) {
      return this.createSnapshot('AUTO_2H');
    }

    return null;
  }

  // Visual Diff Comparison between current data and any backup data
  public compareDataDiff(
    currentData: BackupData,
    snapshotData: BackupData
  ): DiffComparisonResult {
    const currentOrders = currentData.orders || [];
    const snapshotOrders = snapshotData.orders || [];
    const currentBatches = currentData.batches || [];
    const snapshotBatches = snapshotData.batches || [];
    const currentCustomers = currentData.customers || [];
    const snapshotCustomers = snapshotData.customers || [];
    const currentProducts = currentData.products || [];
    const snapshotProducts = snapshotData.products || [];

    const currentRevenue = currentOrders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const snapshotRevenue = snapshotOrders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    // Batches Diff
    const onlyInCurrentBatches = currentBatches.filter(
      cb => !snapshotBatches.some(sb => sb.batch_id === cb.batch_id || sb.batch_code === cb.batch_code)
    );
    const onlyInSnapshotBatches = snapshotBatches.filter(
      sb => !currentBatches.some(cb => cb.batch_id === sb.batch_id || cb.batch_code === sb.batch_code)
    );
    const commonBatches = currentBatches
      .map(cb => {
        const match = snapshotBatches.find(sb => sb.batch_id === cb.batch_id || sb.batch_code === cb.batch_code);
        return match ? { current: cb, snapshot: match } : null;
      })
      .filter(Boolean) as { current: Batch; snapshot: Batch }[];

    // Orders Diff
    const onlyInCurrentOrders = currentOrders.filter(
      co => !snapshotOrders.some(so => so.order_id === co.order_id || so.order_code === co.order_code)
    );
    const onlyInSnapshotOrders = snapshotOrders.filter(
      so => !currentOrders.some(co => co.order_id === so.order_id || co.order_code === so.order_code)
    );
    const commonOrders = currentOrders
      .map(co => {
        const match = snapshotOrders.find(so => so.order_id === co.order_id || so.order_code === co.order_code);
        return match ? { current: co, snapshot: match } : null;
      })
      .filter(Boolean) as { current: Order; snapshot: Order }[];

    // Customers Diff
    const onlyInCurrentCustomers = currentCustomers.filter(
      cc => !snapshotCustomers.some(sc => (sc.phone && sc.phone === cc.phone) || (sc.room === cc.room && sc.building === cc.building))
    );
    const onlyInSnapshotCustomers = snapshotCustomers.filter(
      sc => !currentCustomers.some(cc => (cc.phone && cc.phone === sc.phone) || (cc.room === sc.room && cc.building === sc.building))
    );

    // Products Diff
    const onlyInCurrentProducts = currentProducts.filter(
      cp => !snapshotProducts.some(sp => sp.sku === cp.sku || sp.product_name.toLowerCase() === cp.product_name.toLowerCase())
    );
    const onlyInSnapshotProducts = snapshotProducts.filter(
      sp => !currentProducts.some(cp => cp.sku === sp.sku || cp.product_name.toLowerCase() === sp.product_name.toLowerCase())
    );

    // Settings Diff
    const currSet = currentData.storeSettings || DEFAULT_SETTINGS;
    const snapSet = snapshotData.storeSettings || DEFAULT_SETTINGS;

    return {
      currentStats: {
        ordersCount: currentOrders.length,
        batchesCount: currentBatches.length,
        customersCount: currentCustomers.length,
        productsCount: currentProducts.length,
        totalRevenue: currentRevenue,
      },
      snapshotStats: {
        ordersCount: snapshotOrders.length,
        batchesCount: snapshotBatches.length,
        customersCount: snapshotCustomers.length,
        productsCount: snapshotProducts.length,
        totalRevenue: snapshotRevenue,
      },
      batchesDiff: {
        onlyInCurrent: onlyInCurrentBatches,
        onlyInSnapshot: onlyInSnapshotBatches,
        common: commonBatches,
      },
      ordersDiff: {
        onlyInCurrent: onlyInCurrentOrders,
        onlyInSnapshot: onlyInSnapshotOrders,
        common: commonOrders,
      },
      customersDiff: {
        onlyInCurrent: onlyInCurrentCustomers,
        onlyInSnapshot: onlyInSnapshotCustomers,
      },
      productsDiff: {
        onlyInCurrent: onlyInCurrentProducts,
        onlyInSnapshot: onlyInSnapshotProducts,
      },
      settingsDiff: {
        storeNameChanged: currSet.store_name !== snapSet.store_name,
        bankChanged: currSet.bank_account !== snapSet.bank_account || currSet.bank_name !== snapSet.bank_name,
        currentBank: `${currSet.bank_name || 'ABBANK'} - ${currSet.bank_account || '(Chưa nhập)'}`,
        snapshotBank: `${snapSet.bank_name || 'ABBANK'} - ${snapSet.bank_account || '(Chưa nhập)'}`,
      },
    };
  }

  public sanitizeAndHealAllData(): {
    fixedOrders: number;
    fixedBatches: number;
    fixedCustomers: number;
    fixedProducts: number;
    orphansResolved: number;
    message: string;
  } {
    const rawOrders = this.get<any[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const rawBatches = this.get<any[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    const rawCustomers = this.get<any[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const rawProducts = this.get<any[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);

    let fixedOrders = 0;
    let fixedBatches = 0;
    let fixedCustomers = 0;
    let fixedProducts = 0;
    let orphansResolved = 0;

    // 1. Heal Batches
    const healedBatches: Batch[] = (Array.isArray(rawBatches) ? rawBatches : [])
      .filter((b) => b && typeof b === 'object' && (b.batch_id || b.batch_code || b.batch_name))
      .map((b, idx) => {
        const batch_id = b.batch_id || `BATCH-${idx + 1}`;
        const batch_code = b.batch_code || `DOT-${String(idx + 1).padStart(3, '0')}`;
        const batch_name = b.batch_name || `Đợt Gom #${idx + 1}`;
        const status = b.status || 'COLLECTING';
        if (!b.batch_id || !b.batch_code || !b.batch_name) fixedBatches++;
        return {
          ...b,
          batch_id,
          batch_code,
          batch_name,
          status,
          batch_date: b.batch_date || new Date().toISOString().slice(0, 10),
          delivery_date: b.delivery_date || b.batch_date || new Date().toISOString().slice(0, 10),
          supplier_info: b.supplier_info || { location: 'Quảng Ninh & Cà Mau' },
          notes: b.notes || '',
          created_at: b.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

    // 2. Heal Products
    const validProds = (Array.isArray(rawProducts) ? rawProducts : []).filter((p) => p && typeof p === 'object');
    const healedProducts = deduplicateProductsList(validProds);
    fixedProducts = Math.max(0, validProds.length - healedProducts.length);

    // 3. Heal Customers
    const healedCustomers: Customer[] = (Array.isArray(rawCustomers) ? rawCustomers : [])
      .filter((c) => c && typeof c === 'object' && (c.name || c.room || c.customer_code))
      .map((c, idx) => {
        const customer_id = c.customer_id || `CUST-${idx + 1}`;
        const customer_code = c.customer_code || `CD-${String(idx + 1).padStart(3, '0')}`;
        const name = c.name || 'Cư dân';
        const phone = String(c.phone || '').trim();
        return {
          ...c,
          customer_id,
          customer_code,
          name,
          phone,
          building: c.building || 'Tòa A',
          room: c.room || '',
          address: c.address || `${c.building || 'Tòa A'} - P.${c.room || ''}`,
          note: c.note || '',
          created_at: c.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

    // If there are raw orders but ALL batches were deleted, create a fallback active batch
    const validRawOrders = (Array.isArray(rawOrders) ? rawOrders : []).filter((o) => o && typeof o === 'object');
    if (healedBatches.length === 0 && validRawOrders.length > 0) {
      const defaultBatch: Batch = {
        batch_id: 'BATCH-001',
        batch_code: 'DOT-001',
        batch_name: 'Đợt Gom Hàng #1',
        batch_date: new Date().toISOString().slice(0, 10),
        delivery_date: new Date().toISOString().slice(0, 10),
        status: 'COLLECTING',
        supplier_info: { location: 'Quảng Ninh & Cà Mau' },
        notes: 'Đợt gom hàng mặc định sau khi chuẩn hóa dữ liệu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      healedBatches.push(defaultBatch);
      fixedBatches++;
    }

    // 4. Heal Orders & link tightly to existing batches
    const healedOrders: Order[] = validRawOrders.map((o, idx) => {
      const order_code = o.order_code || `ORD-${String(idx + 1).padStart(3, '0')}`;
      const order_id = o.order_id || `ORDER-${order_code}`;
      const rawItems = Array.isArray(o.items) ? o.items : [];
      const items: OrderItem[] = (rawItems.length > 0 ? rawItems : [
        {
          order_item_id: `ITEM-${order_code}-1`,
          order_id,
          product_id: 'PROD-1',
          product_name: 'Hải Sản Tươi',
          quantity_ordered: 1,
          unit: 'kg',
          estimated_price: Number(o.total) || 150000,
          subtotal: Number(o.total) || 150000,
          status: 'PENDING',
        }
      ]).filter(Boolean).map((it: any, iIdx: number) => {
        const qty = Number(it.quantity_actual ?? it.quantity_ordered) || 1;
        const price = Number(it.actual_price ?? it.estimated_price) || 0;
        const subtotal = typeof it.subtotal === 'number' && !isNaN(it.subtotal) ? it.subtotal : Math.round(qty * price);
        return {
          order_item_id: it.order_item_id || `ITEM-${order_code}-${iIdx + 1}`,
          order_id,
          product_id: it.product_id || `PROD-${iIdx + 1}`,
          product_name: it.product_name || 'Hải sản',
          size: it.size || '',
          quantity_ordered: Number(it.quantity_ordered) || 1,
          quantity_actual: it.quantity_actual !== undefined && it.quantity_actual !== null ? Number(it.quantity_actual) : undefined,
          unit: it.unit || 'kg',
          estimated_price: Number(it.estimated_price) || 0,
          actual_price: it.actual_price !== undefined && it.actual_price !== null ? Number(it.actual_price) : undefined,
          subtotal,
          processing_note: it.processing_note || '',
          item_note: it.item_note || '',
          status: it.status || 'PENDING',
        };
      });

      const calcSubtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0);
      const total = typeof o.total === 'number' && !isNaN(o.total) ? o.total : calcSubtotal;
      const paid_amount = typeof o.paid_amount === 'number' && !isNaN(o.paid_amount) ? o.paid_amount : 0;
      const debt_amount = typeof o.debt_amount === 'number' && !isNaN(o.debt_amount) ? o.debt_amount : Math.max(0, total - paid_amount);

      // Find matching batch
      let matchedBatch = healedBatches.find(b => b.batch_id === o.batch_id);
      if (!matchedBatch) {
        matchedBatch = healedBatches.find(b => b.batch_name.trim().toLowerCase() === String(o.batch_name || '').trim().toLowerCase());
        if (matchedBatch) {
          orphansResolved++;
        }
      }
      if (!matchedBatch && healedBatches.length > 0) {
        matchedBatch = healedBatches[0];
        orphansResolved++;
      }

      const batch_id = matchedBatch ? matchedBatch.batch_id : (o.batch_id || 'BATCH-001');
      const batch_name = matchedBatch ? matchedBatch.batch_name : (o.batch_name || 'Đợt Gom Hàng');

      fixedOrders++;

      return {
        ...o,
        order_id,
        order_code,
        customer_id: o.customer_id || `CUST-${o.customer_room || idx + 1}`,
        customer_name: o.customer_name || 'Cư dân',
        customer_phone: String(o.customer_phone || '').trim(),
        customer_building: o.customer_building || 'Tòa A',
        customer_room: o.customer_room || '',
        batch_id,
        batch_name,
        items,
        subtotal: calcSubtotal,
        total,
        paid_amount,
        debt_amount,
        status: o.status || 'COLLECTING',
        delivery_status: o.delivery_status || 'PENDING',
        payment_status: o.payment_status || (paid_amount >= total && total > 0 ? 'PAID' : paid_amount > 0 ? 'PARTIAL' : 'UNPAID'),
        payment_method: o.payment_method || 'QR',
        order_date: o.order_date || o.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        delivery_date: o.delivery_date || o.order_date || new Date().toISOString().slice(0, 10),
        created_at: o.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // 5. Ensure currentBatchId points to a valid batch
    const currentBid = this.getCurrentBatchId();
    if (!currentBid || !healedBatches.some((b) => b.batch_id === currentBid)) {
      this.setCurrentBatchId(healedBatches[0]?.batch_id || null);
    }

    this.saveBatches(healedBatches);
    this.saveProducts(healedProducts);
    this.saveCustomers(healedCustomers);
    this.saveOrders(healedOrders);

    const message = `Đã chuẩn hóa & sửa định dạng: ${fixedOrders} đơn hàng, ${fixedBatches} đợt gom, ${fixedCustomers} cư dân, ${fixedProducts} hải sản, giải quyết ${orphansResolved} đơn mồ côi.`;

    return {
      fixedOrders,
      fixedBatches,
      fixedCustomers,
      fixedProducts,
      orphansResolved,
      message,
    };
  }

  public getLocalDataHealthReport(): {
    isHealthy: boolean;
    totalOrders: number;
    totalBatches: number;
    totalCustomers: number;
    totalProducts: number;
    orphanOrdersCount: number;
    nanPriceCount: number;
    issues: string[];
  } {
    const orders = this.get<any[]>(STORAGE_KEYS.ORDERS, []);
    const batches = this.get<any[]>(STORAGE_KEYS.BATCHES, []);
    const customers = this.get<any[]>(STORAGE_KEYS.CUSTOMERS, []);
    const products = this.get<any[]>(STORAGE_KEYS.PRODUCTS, []);

    const issues: string[] = [];
    const batchIdSet = new Set(batches.map((b) => b?.batch_id).filter(Boolean));

    let orphanOrdersCount = 0;
    let nanPriceCount = 0;

    for (const o of orders) {
      if (!o) continue;
      if (o.batch_id && !batchIdSet.has(o.batch_id)) {
        orphanOrdersCount++;
      }
      if (isNaN(Number(o.total)) || isNaN(Number(o.paid_amount))) {
        nanPriceCount++;
      }
    }

    if (orphanOrdersCount > 0) {
      issues.push(`Có ${orphanOrdersCount} đơn hàng bị mồ côi (thuộc đợt gom đã bị xóa hoặc sai mã)`);
    }
    if (nanPriceCount > 0) {
      issues.push(`Có ${nanPriceCount} đơn hàng bị lỗi số tiền (NaN / không hợp lệ)`);
    }
    if (batches.length === 0 && orders.length > 0) {
      issues.push('Không có đợt gom nào nhưng vẫn còn đơn hàng trong hệ thống');
    }

    return {
      isHealthy: issues.length === 0,
      totalOrders: orders.length,
      totalBatches: batches.length,
      totalCustomers: customers.length,
      totalProducts: products.length,
      orphanOrdersCount,
      nanPriceCount,
      issues,
    };
  }

  public resetToSampleData(): void {
    this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.set(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    this.set(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    this.set(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    this.set(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    this.set(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    this.set(STORAGE_KEYS.CURRENT_BATCH_ID, null);
  }

  // Clear all operational data (orders, batches, customers, products, payments) safely for a clean pull from Google Sheets
  public clearOperationalDataForFreshSync(): void {
    try {
      this.createSnapshot(
        'BEFORE_CLEAR_LOCAL' as any,
        'Tự động sao lưu an toàn trước khi xóa sạch dữ liệu local để kéo từ Google Sheets'
      );
    } catch (e) {
      console.warn('Không thể tạo bản sao lưu trước khi dọn local:', e);
    }

    this.set(STORAGE_KEYS.ORDERS, []);
    this.set(STORAGE_KEYS.BATCHES, []);
    this.set(STORAGE_KEYS.CUSTOMERS, []);
    this.set(STORAGE_KEYS.PRODUCTS, []);
    this.set(STORAGE_KEYS.PAYMENTS, []);
    this.set(STORAGE_KEYS.AUDIT_LOGS, []);
    this.set(STORAGE_KEYS.CURRENT_BATCH_ID, null);
  }

  // Wipe entire local storage while preserving essential auth/sync tokens
  public clearEntireLocalStorage(preserveTokens = true): void {
    try {
      this.createSnapshot(
        'MANUAL_WIPE' as any,
        'Tự động sao lưu an toàn trước khi xóa sạch toàn bộ dữ liệu cục bộ'
      );
    } catch (e) {
      // ignore
    }

    const preservedTokensMap: Record<string, string | null> = {};
    const tokensToPreserve = [
      'google_access_token',
      'google_token_saved_at',
      'seafood_sheets_spreadsheet_id',
      'seafood_sheets_spreadsheet_url',
      'github_personal_access_token',
    ];

    if (preserveTokens) {
      for (const t of tokensToPreserve) {
        preservedTokensMap[t] = localStorage.getItem(t);
      }
    }

    // Remove all app-related storage keys
    Object.values(STORAGE_KEYS).forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });

    // Re-store preserved auth tokens
    if (preserveTokens) {
      for (const t of tokensToPreserve) {
        if (preservedTokensMap[t] !== null) {
          localStorage.setItem(t, preservedTokensMap[t]!);
        }
      }
    }

    // Initialize clean defaults
    this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.set(STORAGE_KEYS.UNITS, DEFAULT_UNITS);
    this.set(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    this.set(STORAGE_KEYS.PRODUCTS, []);
    this.set(STORAGE_KEYS.CUSTOMERS, []);
    this.set(STORAGE_KEYS.BATCHES, []);
    this.set(STORAGE_KEYS.ORDERS, []);
    this.set(STORAGE_KEYS.PAYMENTS, []);
    this.set(STORAGE_KEYS.AUDIT_LOGS, []);
    this.set(STORAGE_KEYS.CURRENT_BATCH_ID, null);
  }
}

export const storage = new StorageService();
