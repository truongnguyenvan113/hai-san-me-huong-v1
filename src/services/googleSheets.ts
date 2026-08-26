import { Order, Batch, Customer, Product } from '../types';
import { getAccessToken } from './googleAuth';

export interface SyncStats {
  ordersCount: number;
  batchesCount: number;
  customersCount: number;
  productsCount: number;
  weighingCount: number;
  financeCount: number;
  syncedAt: string;
}

const SHEET_NAMES = {
  ORDERS: 'Đơn Hàng Chi Tiết',
  BATCHES: 'Đợt Gom Hàng',
  CUSTOMERS: 'Danh Bạ Cư Dân',
  PRODUCTS: 'Danh Mục Hải Sản',
  WEIGHING: 'Cân Chia Thực Tế',
  FINANCE: 'Sổ Nợ & Doanh Thu',
};

// Helper: Make authenticated request to Google Sheets API
async function fetchSheetsApi(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Chưa đăng nhập Google hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP error ${res.status}: ${res.statusText}`;
    throw new Error(`Lỗi Google Sheets API: ${message}`);
  }

  return res.json();
}

// 1. Create a new Spreadsheet dedicated for Seafood Management
export async function createSeafoodSpreadsheet(
  title: string = 'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const requestBody = {
    properties: {
      title: `${title} (${new Date().toLocaleDateString('vi-VN')})`,
    },
    sheets: [
      { properties: { title: SHEET_NAMES.ORDERS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.BATCHES, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.CUSTOMERS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.PRODUCTS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.WEIGHING, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.FINANCE, gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const data = await fetchSheetsApi('', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

// 2. Ensure all required sheet tabs exist in an existing spreadsheet
export async function ensureSheetTabsExist(spreadsheetId: string) {
  const meta = await fetchSheetsApi(`/${spreadsheetId}`);
  const existingTitles = (meta.sheets || []).map((s: any) => s.properties?.title);

  const missingSheets = Object.values(SHEET_NAMES).filter(
    (name) => !existingTitles.includes(name)
  );

  if (missingSheets.length > 0) {
    const requests = missingSheets.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));

    await fetchSheetsApi(`/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }
}

// Format VND currency string
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

// Translate status to Vietnamese labels
const translateOrderStatus = (status: string) => {
  const map: Record<string, string> = {
    COLLECTING: 'Đang gom',
    CONFIRMED: 'Đã chốt đơn',
    ORDERED: 'Đã đặt quê',
    RECEIVED: 'Đã nhận hàng',
    PACKED: 'Đã đóng túi',
    DELIVERING: 'Đang giao',
    DELIVERED: 'Đã giao xong',
    CANCELLED: 'Đã hủy',
  };
  return map[status] || status;
};

const translatePaymentStatus = (status: string) => {
  const map: Record<string, string> = {
    UNPAID: 'Chưa thanh toán',
    PARTIAL: 'Thanh toán một phần',
    PAID: 'Đã thanh toán',
    DEBT: 'Còn nợ (Ghi sổ)',
  };
  return map[status] || status;
};

const translateDeliveryStatus = (status: string) => {
  const map: Record<string, string> = {
    PENDING: 'Chờ giao',
    DELIVERING: 'Đang ship',
    DELIVERED: 'Đã giao',
    FAILED: 'Giao thất bại',
  };
  return map[status] || status;
};

// 3. Prepare data rows for each sheet tab
export function prepareSheetData(
  orders: Order[],
  batches: Batch[],
  customers: Customer[],
  products: Product[]
) {
  // Tab 1: Đơn Hàng Chi Tiết
  const ordersHeader = [
    'Mã Đơn',
    'Tên Khách Hàng',
    'Số Điện Thoại',
    'Tòa Nhà',
    'Số Phòng',
    'Đợt Gom Hàng',
    'Ngày Giao Hàng',
    'Món Hải Sản Đặt',
    'Tổng Tiền Đơn (VNĐ)',
    'Đã Thanh Toán (VNĐ)',
    'Còn Nợ (VNĐ)',
    'Trạng Thái Đơn',
    'Trạng Thái Giao',
    'Thanh Toán',
    'Hình Thức',
    'Ghi Chú Đơn',
    'Thời Gian Tạo',
  ];

  const ordersRows = orders.map((o) => {
    const itemsSummary = (o.items || [])
      .map((item) => {
        const qty = item.quantity_actual ?? item.quantity_ordered;
        const sizeStr = item.size ? ` (${item.size})` : '';
        const noteStr = item.processing_note ? ` [${item.processing_note}]` : '';
        return `${item.product_name}${sizeStr}: ${qty} ${item.unit}${noteStr}`;
      })
      .join('; ');

    return [
      o.order_code,
      o.customer_name,
      o.customer_phone || '',
      o.customer_building || '',
      o.customer_room || '',
      o.batch_name || '',
      o.delivery_date || '',
      itemsSummary,
      o.total || 0,
      o.paid_amount || 0,
      o.debt_amount || 0,
      translateOrderStatus(o.status),
      translateDeliveryStatus(o.delivery_status),
      translatePaymentStatus(o.payment_status),
      o.payment_method || '',
      o.note || '',
      o.created_at || '',
    ];
  });

  // Tab 2: Đợt Gom Hàng
  const batchesHeader = [
    'Mã Đợt',
    'Tên Đợt Gom',
    'Ngày Tạo Đợt',
    'Ngày Giao Dự Kiến',
    'Trạng Thái Đợt',
    'Nguồn Cung Cấp / Quê',
    'Tổng Số Đơn Hàng',
    'Tổng Doanh Thu (VNĐ)',
    'Tổng Khối Lượng (kg/khay)',
    'Ghi Chú Đợt',
  ];

  const batchesRows = batches.map((b) => {
    const batchOrders = orders.filter((o) => o.batch_id === b.batch_id && o.status !== 'CANCELLED');
    const totalRev = batchOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalWeight = batchOrders.reduce((sum, o) => {
      return (
        sum +
        (o.items || []).reduce((itemSum, item) => itemSum + (item.quantity_actual ?? item.quantity_ordered ?? 0), 0)
      );
    }, 0);

    const statusMap: Record<string, string> = {
      OPEN: 'Đang mở gom',
      COLLECTING: 'Đang gom đơn',
      CONFIRMED: 'Đã chốt gom',
      ORDERED: 'Đã đặt hàng quê',
      RECEIVED: 'Đã nhận hải sản',
      DISTRIBUTING: 'Đang cân chia',
      DELIVERING: 'Đang đi giao',
      COMPLETED: 'Đã hoàn thành',
      CANCELLED: 'Đã hủy',
    };

    return [
      b.batch_code,
      b.batch_name,
      b.batch_date || b.created_at || '',
      b.delivery_date || '',
      statusMap[b.status] || b.status,
      b.supplier_info?.location || 'Quảng Ninh & Cà Mau',
      batchOrders.length,
      totalRev,
      totalWeight,
      b.notes || '',
    ];
  });

  // Tab 3: Danh Bạ Cư Dân
  const customersHeader = [
    'Mã Cư Dân',
    'Tên Cư Dân',
    'Số Điện Thoại',
    'Tòa Nhà',
    'Số Phòng Căn Hộ',
    'Địa Chỉ Chi Tiết',
    'Tổng Đơn Đã Đặt',
    'Tổng Tiền Đã Mua (VNĐ)',
    'Tổng Tiền Đang Nợ (VNĐ)',
    'Ghi Chú Khách',
  ];

  const customersRows = customers.map((c) => {
    const custOrders = orders.filter((o) => o.customer_id === c.customer_id && o.status !== 'CANCELLED');
    const totalSpent = custOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalDebt = custOrders.reduce((sum, o) => sum + (o.debt_amount || 0), 0);

    return [
      c.customer_code,
      c.name,
      c.phone || '',
      c.building || '',
      c.room || '',
      c.address || '',
      custOrders.length,
      totalSpent,
      totalDebt,
      c.note || '',
    ];
  });

  // Tab 4: Danh Mục Hải Sản
  const productsHeader = [
    'Mã SKU',
    'Tên Hải Sản',
    'Nhóm Phân Loại',
    'Quy Cách / Size',
    'Xuất Xứ Vùng Biển',
    'Đơn Vị Tính',
    'Đơn Giá Niêm Yết (VNĐ)',
    'Trạng Thái Kinh Doanh',
    'Mô Tả Sản Phẩm',
  ];

  const productsRows = products.map((p) => [
    p.sku,
    p.product_name,
    p.category || '',
    p.size || '',
    p.origin || '',
    p.unit || 'kg',
    p.default_price || 0,
    p.status === 'ACTIVE' ? 'Đang bán' : 'Tạm ngưng',
    p.description || '',
  ]);

  // Tab 5: Cân Chia Hàng Thực Tế (Phân bổ cho từng căn hộ)
  const weighingHeader = [
    'Mã Đơn',
    'Tòa & Phòng',
    'Tên Khách Hàng',
    'Đợt Gom',
    'Món Hải Sản',
    'Quy Cách / Size',
    'Số Lượng Đặt',
    'Số Cân Thực Tế',
    'Đơn Vị',
    'Đơn Giá Thực Tế (VNĐ)',
    'Thành Tiền Món (VNĐ)',
    'Yêu Cầu Sơ Chế',
    'Trạng Thái Cân',
    'Ghi Chú Món',
  ];

  const weighingRows: any[] = [];
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const isWeighed = item.status === 'WEIGHED' || (item.quantity_actual !== undefined && item.quantity_actual > 0);
      weighingRows.push([
        o.order_code,
        `${o.customer_building ? o.customer_building + ' - ' : ''}P.${o.customer_room}`,
        o.customer_name,
        o.batch_name,
        item.product_name,
        item.size || '',
        item.quantity_ordered,
        item.quantity_actual ?? item.quantity_ordered,
        item.unit,
        item.actual_price ?? item.estimated_price,
        item.subtotal || (item.quantity_actual ?? item.quantity_ordered) * (item.actual_price ?? item.estimated_price),
        item.processing_note || 'Nguyên con',
        isWeighed ? 'Đã cân xong' : 'Chờ cân chia',
        item.item_note || '',
      ]);
    });
  });

  // Tab 6: Sổ Nợ & Doanh Thu
  const financeHeader = [
    'Tòa & Phòng',
    'Tên Khách Hàng',
    'Số Điện Thoại',
    'Mã Đơn Hàng',
    'Đợt Gom Hàng',
    'Ngày Giao',
    'Tổng Tiền Đơn (VNĐ)',
    'Đã Thanh Toán (VNĐ)',
    'Tiền Còn Nợ (VNĐ)',
    'Tình Trạng Công Nợ',
    'Hình Thức Thanh Toán',
    'Ghi Chú Thu Tiền',
  ];

  const financeRows = orders
    .filter((o) => o.status !== 'CANCELLED')
    .map((o) => [
      `${o.customer_building ? o.customer_building + ' - ' : ''}P.${o.customer_room}`,
      o.customer_name,
      o.customer_phone || '',
      o.order_code,
      o.batch_name,
      o.delivery_date || '',
      o.total || 0,
      o.paid_amount || 0,
      o.debt_amount || 0,
      translatePaymentStatus(o.payment_status),
      o.payment_method || 'Chưa ghi nhận',
      o.delivery_note || o.note || '',
    ]);

  return {
    [SHEET_NAMES.ORDERS]: { header: ordersHeader, rows: ordersRows },
    [SHEET_NAMES.BATCHES]: { header: batchesHeader, rows: batchesRows },
    [SHEET_NAMES.CUSTOMERS]: { header: customersHeader, rows: customersRows },
    [SHEET_NAMES.PRODUCTS]: { header: productsHeader, rows: productsRows },
    [SHEET_NAMES.WEIGHING]: { header: weighingHeader, rows: weighingRows },
    [SHEET_NAMES.FINANCE]: { header: financeHeader, rows: financeRows },
  };
}

// 4. Sync all categories to the designated Spreadsheet Tabs
export async function syncAllToGoogleSheets(
  spreadsheetId: string,
  orders: Order[],
  batches: Batch[],
  customers: Customer[],
  products: Product[]
): Promise<SyncStats> {
  // Ensure tabs exist first
  await ensureSheetTabsExist(spreadsheetId);

  const preparedData = prepareSheetData(orders, batches, customers, products);

  // Clear and update all 6 sheets
  const valueRanges = Object.entries(preparedData).map(([sheetTitle, { header, rows }]) => {
    return {
      range: `${sheetTitle}!A1:Z${Math.max(rows.length + 10, 50)}`,
      values: [header, ...rows],
    };
  });

  // 1. Clear old data from all tabs
  const clearRanges = Object.keys(preparedData).map((title) => `${title}!A1:Z500`);
  await fetchSheetsApi(`/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({ ranges: clearRanges }),
  });

  // 2. Write new formatted data
  await fetchSheetsApi(`/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    }),
  });

  const now = new Date().toISOString();
  return {
    ordersCount: orders.length,
    batchesCount: batches.length,
    customersCount: customers.length,
    productsCount: products.length,
    weighingCount: preparedData[SHEET_NAMES.WEIGHING].rows.length,
    financeCount: preparedData[SHEET_NAMES.FINANCE].rows.length,
    syncedAt: now,
  };
}

// 5. Automated Sync Engine (creates sheet if missing, updates all 6 tabs)
export async function autoSyncAll(
  orders: Order[],
  batches: Batch[],
  customers: Customer[],
  products: Product[],
  options?: { title?: string }
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; stats: SyncStats } | null> {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }

  let spreadsheetId = localStorage.getItem('seafood_sheets_spreadsheet_id') || '';
  let spreadsheetUrl = localStorage.getItem('seafood_sheets_spreadsheet_url') || '';

  // If no spreadsheet exists yet, auto-create one
  if (!spreadsheetId) {
    const created = await createSeafoodSpreadsheet(
      options?.title || 'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư'
    );
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
    localStorage.setItem('seafood_sheets_spreadsheet_id', spreadsheetId);
    localStorage.setItem('seafood_sheets_spreadsheet_url', spreadsheetUrl);
  }

  // Push all latest data
  const stats = await syncAllToGoogleSheets(
    spreadsheetId,
    orders,
    batches,
    customers,
    products
  );

  localStorage.setItem('seafood_sheets_last_sync', JSON.stringify(stats));

  return {
    spreadsheetId,
    spreadsheetUrl,
    stats,
  };
}

