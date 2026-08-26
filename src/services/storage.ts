import {
  Customer,
  Product,
  Order,
  Batch,
  PaymentTransaction,
  AuditLog,
  StoreSettings,
  OrderItem,
  BatchItemSummary
} from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'seafood_app_customers_v1',
  PRODUCTS: 'seafood_app_products_v1',
  BATCHES: 'seafood_app_batches_v1',
  ORDERS: 'seafood_app_orders_v1',
  PAYMENTS: 'seafood_app_payments_v1',
  AUDIT_LOGS: 'seafood_app_audit_logs_v1',
  SETTINGS: 'seafood_app_settings_v1',
  CURRENT_BATCH_ID: 'seafood_app_current_batch_id_v1',
};

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'Hải Sản Mẹ Hường',
  owner_name: 'Đặng Thị Vân (GSB-1004)',
  phone: '0916988982',
  hotline: '0916988982 ( Đặng Thị Vân | GSB-1004 )',
  condo_name: 'Chung cư Geleximco 897 Giải Phóng',
  address: 'Geleximco Southern Star, 897 Giải Phóng, Giáp Bát, Hoàng Mai, Hà Nội',
  bank_name: 'VIETCOMBANK',
  bank_account: '9988776655',
  bank_account_name: 'DANG THI VAN',
  bank_owner: 'DANG THI VAN',
  bank_qr_template: 'compact',
  invoice_footer_note: 'Hải sản tươi sống đánh bắt trong ngày từ quê gửi lên. Quý cư dân vui lòng bảo quản ngăn đông hoặc chế biến ngay!',
  slogan: 'Hải sản tươi ngon mỗi ngày - Gom tận gốc, giao tận cửa phòng',
  default_shipping_fee: 0,
  show_vietqr: true,
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
    merged.bank_account_name = merged.bank_account_name || merged.bank_owner || DEFAULT_SETTINGS.bank_account_name;
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
    return this.get<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  public saveProducts(products: Product[]): void {
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  public addProduct(product: Product): void {
    const products = this.getProducts();
    products.unshift(product);
    this.saveProducts(products);
    this.logAudit('CREATE_PRODUCT', 'PRODUCT', product.product_id, `Thêm sản phẩm mới: ${product.product_name}`);
  }

  public updateProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex(p => p.product_id === product.product_id);
    if (index !== -1) {
      products[index] = product;
      this.saveProducts(products);
      this.logAudit('UPDATE_PRODUCT', 'PRODUCT', product.product_id, `Cập nhật sản phẩm: ${product.product_name}`);
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
    return this.get<Batch[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
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

  // Orders
  public getOrders(): Order[] {
    return this.get<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
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
}

export const storage = new StorageService();
