import { Order, Batch, Customer, Product, StoreSettings } from '../types';
import { getAccessToken, setAccessTokenInMemory } from './googleAuth';
import { storage } from './storage';

export interface SyncStats {
  ordersCount: number;
  batchesCount: number;
  customersCount: number;
  productsCount: number;
  weighingCount: number;
  financeCount: number;
  settingsSynced?: boolean;
  syncedAt: string;
}

export interface RestoreStats {
  ordersCount: number;
  batchesCount: number;
  customersCount: number;
  productsCount: number;
  settingsRestored: boolean;
  restoredAt: string;
}

export const SHEET_NAMES = {
  ORDERS: 'Đơn Hàng Chi Tiết',
  BATCHES: 'Đợt Gom Hàng',
  CUSTOMERS: 'Danh Bạ Cư Dân',
  PRODUCTS: 'Danh Mục Hải Sản',
  WEIGHING: 'Cân Chia Thực Tế',
  FINANCE: 'Sổ Nợ & Doanh Thu',
  SETTINGS: 'Cấu Hình Hệ Thống',
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

    // Handle expired or invalid access token
    if (
      res.status === 401 ||
      res.status === 403 ||
      errorData?.error?.status === 'UNAUTHENTICATED' ||
      message.toLowerCase().includes('authentication credentials') ||
      message.toLowerCase().includes('invalid credentials')
    ) {
      setAccessTokenInMemory(null);
      throw new Error('Phiên đăng nhập Google đã hết hạn hoặc mã xác thực không hợp lệ. Vui lòng nhấn "Đăng nhập lại" để làm mới phiên.');
    }

    throw new Error(`Lỗi Google Sheets API: ${message}`);
  }

  return res.json();
}

// Helper: Search for existing seafood spreadsheet in Google Drive to prevent duplicates
export async function searchSpreadsheetsOnDrive(
  searchQuery: string = 'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư'
): Promise<Array<{ id: string; name: string; url: string; modifiedTime?: string }>> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const q = `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=10`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn('Drive API list files status:', res.status);
      return [];
    }

    const data = await res.json();
    if (data && Array.isArray(data.files)) {
      return data.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
        modifiedTime: f.modifiedTime,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Cannot search Google Drive for existing sheets:', err);
    return [];
  }
}

// 1. Create a new Spreadsheet dedicated for Seafood Management (7 Tabs)
export async function createSeafoodSpreadsheet(
  title: string = 'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const requestBody = {
    properties: {
      title: `${title}`,
    },
    sheets: [
      { properties: { title: SHEET_NAMES.ORDERS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.BATCHES, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.CUSTOMERS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.PRODUCTS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.WEIGHING, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.FINANCE, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.SETTINGS, gridProperties: { frozenRowCount: 1 } } },
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

// 2. Ensure all 7 required sheet tabs exist in an existing spreadsheet
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

// 3. Prepare data rows for each sheet tab (Including Tab 7: Settings)
export function prepareSheetData(
  orders: Order[],
  batches: Batch[],
  customers: Customer[],
  products: Product[],
  settingsInput?: StoreSettings
) {
  const settings = settingsInput || storage.getSettings();

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

  // Tab 5: Cân Chia Hàng Thực Tế
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

  // Tab 7: Cấu Hình Hệ Thống (Store Settings & 2-Bank Account Config)
  const settingsHeader = ['Mã Cấu Hình / Thuộc Tính', 'Giá Trị Thiết Lập', 'Mô Tả & Hướng Dẫn Nghiệp Vụ'];
  const settingsRows = [
    ['STORE_NAME', settings.store_name || '', 'Tên cửa hàng hải sản hiển thị trên phiếu in & tiêu đề'],
    ['OWNER_NAME', settings.owner_name || '', 'Tên chủ shop / cư dân đại diện'],
    ['PHONE', settings.phone || '', 'Số điện thoại di động chính'],
    ['HOTLINE', settings.hotline || settings.phone || '', 'Hotline liên hệ in nổi bật trên phiếu A4'],
    ['CONDO_NAME', settings.condo_name || '', 'Tên khu chung cư phục vụ gom đơn'],
    ['ADDRESS', settings.address || '', 'Địa chỉ tập kết & giao nhận hải sản'],
    ['BANK_1_NAME', settings.bank_name || 'ABBANK', 'Ngân hàng 1 (Tài khoản chính, VD: ABBANK, BIDV, Vietcombank)'],
    ['BANK_1_ACCOUNT', settings.bank_account || '', 'Số tài khoản Ngân hàng 1'],
    ['BANK_1_ACCOUNT_NAME', settings.bank_account_name || settings.bank_owner || '', 'Tên chủ tài khoản Ngân hàng 1'],
    ['BANK_1_BIN', settings.bank_bin || '970425', 'Mã BIN VietQR Ngân hàng 1'],
    ['BANK_2_NAME', settings.bank_name_2 || 'BIDV', 'Ngân hàng 2 (Tài khoản phụ)'],
    ['BANK_2_ACCOUNT', settings.bank_account_2 || '', 'Số tài khoản Ngân hàng 2'],
    ['BANK_2_ACCOUNT_NAME', settings.bank_account_name_2 || settings.bank_account_name || '', 'Tên chủ tài khoản Ngân hàng 2'],
    ['BANK_2_BIN', settings.bank_bin_2 || '970418', 'Mã BIN VietQR Ngân hàng 2'],
    ['ACTIVE_BANK_ACCOUNT', settings.active_bank_account || 'BANK_1', 'Tài khoản nhận tiền mặc định được chọn (BANK_1 hoặc BANK_2)'],
    ['BANK_QR_TEMPLATE', settings.bank_qr_template || 'compact2', 'Mẫu hiển thị VietQR (compact2, compact, qr_only, print)'],
    ['QR_SIZE', settings.qr_size || 'large', 'Kích thước in mã VietQR (large = To rõ nét, medium = Vừa)'],
    ['SHOW_VIETQR', String(settings.show_vietqr !== false), 'Bật / Tắt tạo và in mã VietQR tự động (true / false)'],
    ['INVOICE_FOOTER_NOTE', settings.invoice_footer_note || '', 'Ghi chú dặn dò bảo quản ở chân phiếu in dán bao bì'],
    ['SLOGAN', settings.slogan || '', 'Khẩu hiệu bán hàng'],
    ['DEFAULT_SHIPPING_FEE', String(settings.default_shipping_fee || 0), 'Phí ship nội bộ chung cư mặc định (VNĐ)'],
    ['LAST_SYNC_TIME', new Date().toISOString(), 'Thời gian sao lưu cấu hình lên Google Sheets'],
  ];

  return {
    [SHEET_NAMES.ORDERS]: { header: ordersHeader, rows: ordersRows },
    [SHEET_NAMES.BATCHES]: { header: batchesHeader, rows: batchesRows },
    [SHEET_NAMES.CUSTOMERS]: { header: customersHeader, rows: customersRows },
    [SHEET_NAMES.PRODUCTS]: { header: productsHeader, rows: productsRows },
    [SHEET_NAMES.WEIGHING]: { header: weighingHeader, rows: weighingRows },
    [SHEET_NAMES.FINANCE]: { header: financeHeader, rows: financeRows },
    [SHEET_NAMES.SETTINGS]: { header: settingsHeader, rows: settingsRows },
  };
}

// 4. Sync all 7 categories (including Settings) to the designated Spreadsheet Tabs
export async function syncAllToGoogleSheets(
  spreadsheetId: string,
  orders: Order[],
  batches: Batch[],
  customers: Customer[],
  products: Product[],
  settings?: StoreSettings
): Promise<SyncStats> {
  // Ensure all 7 tabs exist first
  await ensureSheetTabsExist(spreadsheetId);

  const preparedData = prepareSheetData(orders, batches, customers, products, settings);

  // Clear and update all 7 sheets
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
    settingsSynced: true,
    syncedAt: now,
  };
}

// 5. Automated Sync Engine (finds existing spreadsheet on Drive or creates if missing, updates all 7 tabs)
export async function autoSyncAll(
  orders: Order[],
  batches: Batch[],
  customers: Customer[],
  products: Product[],
  settings?: StoreSettings,
  options?: { title?: string }
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; stats: SyncStats } | null> {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }

  let spreadsheetId = localStorage.getItem('seafood_sheets_spreadsheet_id') || '';
  let spreadsheetUrl = localStorage.getItem('seafood_sheets_spreadsheet_url') || '';

  // If no spreadsheet ID in localStorage (e.g. running on new local/domain), first try searching Google Drive
  if (!spreadsheetId) {
    try {
      const searchResults = await searchSpreadsheetsOnDrive(options?.title || 'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư');
      if (searchResults && searchResults.length > 0) {
        // Reuse the existing most recently modified spreadsheet on user's Google Drive
        spreadsheetId = searchResults[0].id;
        spreadsheetUrl = searchResults[0].url;
        localStorage.setItem('seafood_sheets_spreadsheet_id', spreadsheetId);
        localStorage.setItem('seafood_sheets_spreadsheet_url', spreadsheetUrl);
      }
    } catch (err) {
      console.warn('Could not search Drive for existing sheet, will check creation fallback:', err);
    }
  }

  // If still no spreadsheet found, create one
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
    products,
    settings
  );

  localStorage.setItem('seafood_sheets_last_sync', JSON.stringify(stats));

  return {
    spreadsheetId,
    spreadsheetUrl,
    stats,
  };
}

// 6. REVERSE SYNC / PULL MECHANISM (Synchronize backwards from Google Sheets to App)
export async function pullAndRestoreFromGoogleSheets(spreadsheetId: string): Promise<RestoreStats> {
  if (!spreadsheetId) {
    throw new Error('Chưa cung cấp ID tệp Google Sheets để nạp dữ liệu');
  }

  // 1. Get spreadsheet metadata first to discover existing sheet tabs
  const meta = await fetchSheetsApi(`/${spreadsheetId}?fields=sheets(properties(sheetId,title))`);
  const sheetList: Array<{ title: string; sheetId?: number }> = (meta.sheets || []).map((s: any) => ({
    title: s.properties?.title || '',
    sheetId: s.properties?.sheetId,
  })).filter((s: any) => Boolean(s.title));

  if (sheetList.length === 0) {
    throw new Error('Không tìm thấy bất kỳ trang tính nào trong tệp Google Sheets này');
  }

  // 2. Fetch all values safely for existing sheets
  const ranges = sheetList.map((s) => `'${s.title}'!A1:Z1000`);
  const response = await fetchSheetsApi(
    `/${spreadsheetId}/values:batchGet?${ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&')}`
  );

  const valueRanges = response.valueRanges || [];
  const getSheetDataByTitle = (targetTitle: string): any[][] => {
    const found = valueRanges.find((vr: any) => {
      if (!vr || !vr.range) return false;
      const cleanRange = vr.range.replace(/^'|'$/g, '');
      return (
        cleanRange.startsWith(targetTitle) ||
        cleanRange.startsWith(`'${targetTitle}'`) ||
        vr.range.startsWith(`'${targetTitle}'!`) ||
        vr.range.startsWith(`${targetTitle}!`)
      );
    });
    return (found && found.values) || [];
  };

  // Helper to find sheet by candidate names or keywords
  const findSheetRows = (exactName: string, keywords: string[]): any[][] => {
    // Try exact match first
    const exactRows = getSheetDataByTitle(exactName);
    if (exactRows && exactRows.length > 0) return exactRows;

    // Try keyword match in sheet title
    for (const sheet of sheetList) {
      const lower = sheet.title.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        const rows = getSheetDataByTitle(sheet.title);
        if (rows && rows.length > 0) return rows;
      }
    }

    // Try inspecting headers (row 0) of all sheets
    for (const sheet of sheetList) {
      const rows = getSheetDataByTitle(sheet.title);
      if (rows && rows.length > 0 && Array.isArray(rows[0])) {
        const headerStr = rows[0].join(' ').toLowerCase();
        if (keywords.some((kw) => headerStr.includes(kw.toLowerCase()))) {
          return rows;
        }
      }
    }

    return [];
  };

  // Helper: column finder in header row
  const findColIndex = (headers: string[], candidates: string[], fallback: number): number => {
    if (!headers || headers.length === 0) return fallback;
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').trim().toLowerCase();
      if (candidates.some((c) => h.includes(c.toLowerCase()))) {
        return i;
      }
    }
    return fallback;
  };

  // ----------------------------------------------------
  // PARSE SETTINGS TAB
  // ----------------------------------------------------
  const settingsRows = findSheetRows(SHEET_NAMES.SETTINGS, ['cấu hình', 'hệ thống', 'settings', 'config', 'ngân hàng']);
  let restoredSettings: Partial<StoreSettings> = {};
  let settingsRestored = false;

  if (settingsRows.length > 1) {
    const currentSettings = storage.getSettings();
    const configMap: Record<string, string> = {};
    for (let i = 1; i < settingsRows.length; i++) {
      const row = settingsRows[i];
      if (row[0]) {
        configMap[String(row[0]).trim()] = row[1] !== undefined ? String(row[1]).trim() : '';
      }
    }

    restoredSettings = {
      ...currentSettings,
      store_name: configMap['STORE_NAME'] || currentSettings.store_name,
      owner_name: configMap['OWNER_NAME'] || currentSettings.owner_name,
      phone: configMap['PHONE'] || currentSettings.phone,
      hotline: configMap['HOTLINE'] || currentSettings.hotline,
      condo_name: configMap['CONDO_NAME'] || currentSettings.condo_name,
      address: configMap['ADDRESS'] || currentSettings.address,
      bank_name: configMap['BANK_1_NAME'] || currentSettings.bank_name,
      bank_account: configMap['BANK_1_ACCOUNT'] || currentSettings.bank_account,
      bank_account_name: configMap['BANK_1_ACCOUNT_NAME'] || currentSettings.bank_account_name,
      bank_bin: configMap['BANK_1_BIN'] || currentSettings.bank_bin,
      bank_name_2: configMap['BANK_2_NAME'] || currentSettings.bank_name_2,
      bank_account_2: configMap['BANK_2_ACCOUNT'] || currentSettings.bank_account_2,
      bank_account_name_2: configMap['BANK_2_ACCOUNT_NAME'] || currentSettings.bank_account_name_2,
      bank_bin_2: configMap['BANK_2_BIN'] || currentSettings.bank_bin_2,
      active_bank_account: (configMap['ACTIVE_BANK_ACCOUNT'] as any) || currentSettings.active_bank_account || 'BANK_1',
      bank_qr_template: (configMap['BANK_QR_TEMPLATE'] as any) || currentSettings.bank_qr_template || 'compact2',
      qr_size: (configMap['QR_SIZE'] as any) || currentSettings.qr_size || 'large',
      show_vietqr: configMap['SHOW_VIETQR'] !== undefined ? configMap['SHOW_VIETQR'] === 'true' : currentSettings.show_vietqr,
      invoice_footer_note: configMap['INVOICE_FOOTER_NOTE'] || currentSettings.invoice_footer_note,
      slogan: configMap['SLOGAN'] || currentSettings.slogan,
      default_shipping_fee: configMap['DEFAULT_SHIPPING_FEE'] ? parseFloat(configMap['DEFAULT_SHIPPING_FEE']) || 0 : currentSettings.default_shipping_fee,
    };

    storage.saveSettings(restoredSettings as StoreSettings);
    settingsRestored = true;
  }

  // ----------------------------------------------------
  // PARSE BATCHES TAB
  // ----------------------------------------------------
  const batchesRows = findSheetRows(SHEET_NAMES.BATCHES, ['đợt gom', 'đợt hàng', 'đợt', 'batches', 'batch', 'mã đợt']);
  const restoredBatches: Batch[] = [];

  if (batchesRows.length > 1) {
    const bHeaders = (batchesRows[0] || []).map((h: any) => String(h || '').trim());
    const colCode = findColIndex(bHeaders, ['mã đợt', 'mã', 'code'], 0);
    const colName = findColIndex(bHeaders, ['tên đợt', 'tên đợt gom', 'đợt gom', 'tên'], 1);
    const colDate = findColIndex(bHeaders, ['ngày tạo', 'ngày mở', 'ngày tạo đợt'], 2);
    const colDelivery = findColIndex(bHeaders, ['ngày giao', 'ngày giao dự kiến', 'giao'], 3);
    const colStatus = findColIndex(bHeaders, ['trạng thái', 'tình trạng'], 4);
    const colOrigin = findColIndex(bHeaders, ['nguồn', 'quê', 'nhà cung cấp', 'vùng'], 5);
    const colNotes = findColIndex(bHeaders, ['ghi chú', 'notes'], 9);

    for (let i = 1; i < batchesRows.length; i++) {
      const r = batchesRows[i];
      if (!r || r.length === 0) continue;
      const rawCode = String(r[colCode] || '').trim();
      const rawName = String(r[colName] || '').trim();

      if (!rawCode && !rawName) continue;

      const batchCode = rawCode || `DOT-${String(i).padStart(3, '0')}`;
      const batchId = rawCode || `BATCH-${batchCode}`;
      const batchName = rawName || `Đợt Gom Hải Sản #${i}`;
      const batchDate = r[colDate] ? String(r[colDate]).trim() : new Date().toISOString().slice(0, 10);
      const deliveryDate = r[colDelivery] ? String(r[colDelivery]).trim() : batchDate;

      // Status mapping
      const rawStatus = String(r[colStatus] || '').toLowerCase();
      let status: Batch['status'] = 'COLLECTING';
      if (rawStatus.includes('mở') || rawStatus.includes('gom') || rawStatus.includes('open') || rawStatus.includes('collecting')) {
        status = 'COLLECTING';
      } else if (rawStatus.includes('chốt') || rawStatus.includes('confirmed')) {
        status = 'CONFIRMED';
      } else if (rawStatus.includes('quê') || rawStatus.includes('đặt') || rawStatus.includes('ordered')) {
        status = 'ORDERED';
      } else if (rawStatus.includes('nhận') || rawStatus.includes('về') || rawStatus.includes('received') || rawStatus.includes('cân')) {
        status = 'RECEIVED';
      } else if (rawStatus.includes('đang giao') || rawStatus.includes('delivering') || rawStatus.includes('ship')) {
        status = 'DELIVERING';
      } else if (rawStatus.includes('hoàn thành') || rawStatus.includes('giao xong') || rawStatus.includes('completed') || rawStatus.includes('delivered')) {
        status = 'COMPLETED';
      } else if (rawStatus.includes('hủy') || rawStatus.includes('cancel')) {
        status = 'CANCELLED';
      }

      restoredBatches.push({
        batch_id: batchId,
        batch_code: batchCode,
        batch_name: batchName,
        batch_date: batchDate,
        delivery_date: deliveryDate,
        status,
        supplier_info: { location: r[colOrigin] ? String(r[colOrigin]).trim() : 'Quảng Ninh & Cà Mau' },
        notes: r[colNotes] ? String(r[colNotes]).trim() : '',
        created_at: batchDate,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // ----------------------------------------------------
  // PARSE ORDERS TAB
  // ----------------------------------------------------
  const ordersRows = findSheetRows(SHEET_NAMES.ORDERS, ['đơn hàng', 'chi tiết đơn', 'orders', 'đơn', 'mã đơn']);
  const restoredOrders: Order[] = [];

  if (ordersRows.length > 1) {
    const oHeaders = (ordersRows[0] || []).map((h: any) => String(h || '').trim());
    const colOrderCode = findColIndex(oHeaders, ['mã đơn', 'code', 'mã'], 0);
    const colCustName = findColIndex(oHeaders, ['tên khách hàng', 'tên cư dân', 'tên khách', 'khách hàng', 'cư dân'], 1);
    const colPhone = findColIndex(oHeaders, ['số điện thoại', 'sđt', 'phone', 'điện thoại'], 2);
    const colBuilding = findColIndex(oHeaders, ['tòa nhà', 'tòa', 'building'], 3);
    const colRoom = findColIndex(oHeaders, ['số phòng', 'phòng', 'căn hộ', 'room'], 4);
    const colBatch = findColIndex(oHeaders, ['đợt gom', 'đợt hàng', 'tên đợt', 'mã đợt', 'đợt'], 5);
    const colDelivery = findColIndex(oHeaders, ['ngày giao hàng', 'ngày giao', 'delivery'], 6);
    const colItems = findColIndex(oHeaders, ['món hải sản', 'sản phẩm', 'mặt hàng', 'món đặt', 'chi tiết'], 7);
    const colTotal = findColIndex(oHeaders, ['tổng tiền', 'tổng cộng', 'thành tiền', 'tiền đơn'], 8);
    const colPaid = findColIndex(oHeaders, ['đã thanh toán', 'đã trả', 'đã thu'], 9);
    const colDebt = findColIndex(oHeaders, ['còn nợ', 'nợ', 'chưa thu'], 10);
    const colOrderStatus = findColIndex(oHeaders, ['trạng thái đơn', 'trạng thái'], 11);
    const colDeliveryStatus = findColIndex(oHeaders, ['trạng thái giao', 'giao hàng'], 12);
    const colPaymentStatus = findColIndex(oHeaders, ['thanh toán', 'tình trạng thanh toán'], 13);
    const colPaymentMethod = findColIndex(oHeaders, ['hình thức', 'phương thức', 'chuyển khoản', 'tiền mặt'], 14);
    const colNote = findColIndex(oHeaders, ['ghi chú đơn', 'ghi chú', 'note'], 15);
    const colCreatedAt = findColIndex(oHeaders, ['thời gian tạo', 'ngày tạo', 'created'], 16);

    for (let i = 1; i < ordersRows.length; i++) {
      const r = ordersRows[i];
      if (!r || r.length === 0) continue;
      const orderCode = String(r[colOrderCode] || '').trim();
      const custName = String(r[colCustName] || '').trim();
      if (!orderCode && !custName) continue;

      const effectiveOrderCode = orderCode || `ORD-${String(i).padStart(3, '0')}`;
      const custPhone = r[colPhone] ? String(r[colPhone]).trim() : '';
      const building = r[colBuilding] ? String(r[colBuilding]).trim() : '';
      const room = r[colRoom] ? String(r[colRoom]).trim() : '';
      const rawBatch = r[colBatch] ? String(r[colBatch]).trim() : '';
      const deliveryDate = r[colDelivery] ? String(r[colDelivery]).trim() : '';
      const itemsSummaryStr = r[colItems] ? String(r[colItems]).trim() : '';
      const total = parseFloat(String(r[colTotal] || '0').replace(/[^\d.]/g, '')) || 0;
      const paid = parseFloat(String(r[colPaid] || '0').replace(/[^\d.]/g, '')) || 0;
      const debt = parseFloat(String(r[colDebt] || '0').replace(/[^\d.]/g, '')) || Math.max(0, total - paid);
      const rawOrderStatus = String(r[colOrderStatus] || '').toLowerCase();
      const rawDeliveryStatus = String(r[colDeliveryStatus] || '').toLowerCase();
      const paymentMethod = String(r[colPaymentMethod] || 'QR').trim();
      const note = r[colNote] ? String(r[colNote]).trim() : '';
      const createdAt = r[colCreatedAt] ? String(r[colCreatedAt]).trim() : new Date().toISOString();

      // Find matching batch
      const matchedBatch = restoredBatches.find(
        (b) => b.batch_code === rawBatch || b.batch_name === rawBatch || b.batch_id === rawBatch
      ) || restoredBatches[0];

      // Parse items
      const parsedItems = (itemsSummaryStr ? itemsSummaryStr.split(';') : []).map((seg: string, idx: number) => {
        const clean = seg.trim();
        const parts = clean.split(':');
        const pName = parts[0]?.trim() || 'Hải sản tươi';
        const qtyMatch = parts[1]?.match(/([\d.]+)\s*(\w+)?/);
        const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
        const unit = (qtyMatch && qtyMatch[2] ? qtyMatch[2] : 'kg') as any;

        return {
          order_item_id: `ITEM-${effectiveOrderCode}-${idx + 1}`,
          order_id: `ORD-${effectiveOrderCode}`,
          product_id: `PROD-${idx + 1}`,
          product_name: pName,
          quantity_ordered: qty,
          quantity_actual: qty,
          unit,
          estimated_price: total > 0 ? Math.round(total / (parts.length || 1)) : 0,
          actual_price: total > 0 ? Math.round(total / (parts.length || 1)) : 0,
          subtotal: total > 0 ? Math.round(total / (parts.length || 1)) : 0,
          status: 'PACKED' as const,
        };
      });

      // Order status resolution
      let status: Order['status'] = 'CONFIRMED';
      if (rawOrderStatus.includes('hủy') || rawOrderStatus.includes('cancel')) {
        status = 'CANCELLED';
      } else if (rawOrderStatus.includes('giao xong') || rawOrderStatus.includes('hoàn thành')) {
        status = 'DELIVERED';
      } else if (rawOrderStatus.includes('đang giao')) {
        status = 'DELIVERING';
      } else if (rawOrderStatus.includes('nhận') || rawOrderStatus.includes('đóng')) {
        status = 'PACKED';
      }

      // Delivery status resolution
      let delivery_status: Order['delivery_status'] = 'PENDING';
      if (rawDeliveryStatus.includes('đã giao') || rawDeliveryStatus.includes('xong') || rawDeliveryStatus.includes('delivered')) {
        delivery_status = 'DELIVERED';
      } else if (rawDeliveryStatus.includes('đang') || rawDeliveryStatus.includes('delivering') || rawDeliveryStatus.includes('ship')) {
        delivery_status = 'DELIVERING';
      }

      // Payment status resolution
      let payment_status: Order['payment_status'] = 'UNPAID';
      if (paid >= total && total > 0) {
        payment_status = 'PAID';
      } else if (paid > 0 && paid < total) {
        payment_status = 'PARTIAL';
      } else if (debt > 0 && paid === 0) {
        payment_status = 'DEBT';
      }

      restoredOrders.push({
        order_id: `ORD-${effectiveOrderCode}`,
        order_code: effectiveOrderCode,
        customer_id: `CUST-${room || effectiveOrderCode}`,
        customer_name: custName || 'Cư dân',
        customer_phone: custPhone,
        customer_building: building || 'Tòa Nhà',
        customer_room: room || '101',
        batch_id: matchedBatch ? matchedBatch.batch_id : 'BATCH-ACTIVE',
        batch_name: matchedBatch ? matchedBatch.batch_name : rawBatch || 'Đợt Gom Hải Sản',
        order_date: createdAt.slice(0, 10),
        delivery_date: deliveryDate || (matchedBatch ? matchedBatch.delivery_date : createdAt.slice(0, 10)),
        items: parsedItems.length > 0 ? parsedItems : [
          {
            order_item_id: `ITEM-${effectiveOrderCode}-1`,
            order_id: `ORD-${effectiveOrderCode}`,
            product_id: 'PROD-1',
            product_name: 'Hải Sản Tươi',
            quantity_ordered: 1,
            unit: 'kg' as const,
            estimated_price: total,
            subtotal: total,
            status: 'PENDING' as const,
          },
        ],
        subtotal: total,
        discount: 0,
        shipping_fee: 0,
        total,
        paid_amount: paid,
        debt_amount: debt,
        status,
        payment_status,
        delivery_status,
        payment_method: (paymentMethod as any) || 'QR',
        note,
        created_at: createdAt,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // ----------------------------------------------------
  // PARSE CUSTOMERS TAB & MERGE FROM ORDERS
  // ----------------------------------------------------
  const customersRows = findSheetRows(SHEET_NAMES.CUSTOMERS, ['cư dân', 'danh bạ', 'khách hàng', 'customers', 'khách']);
  const restoredCustomers: Customer[] = [];

  if (customersRows.length > 1) {
    const cHeaders = (customersRows[0] || []).map((h: any) => String(h || '').trim());
    const colCustCode = findColIndex(cHeaders, ['mã cư dân', 'mã khách', 'mã', 'code'], 0);
    const colName = findColIndex(cHeaders, ['tên cư dân', 'tên khách hàng', 'tên', 'họ tên'], 1);
    const colPhone = findColIndex(cHeaders, ['số điện thoại', 'sđt', 'phone'], 2);
    const colBuilding = findColIndex(cHeaders, ['tòa nhà', 'tòa', 'building'], 3);
    const colRoom = findColIndex(cHeaders, ['số phòng', 'phòng', 'room', 'căn hộ'], 4);
    const colAddress = findColIndex(cHeaders, ['địa chỉ', 'address'], 5);
    const colNote = findColIndex(cHeaders, ['ghi chú', 'note'], 9);

    for (let i = 1; i < customersRows.length; i++) {
      const r = customersRows[i];
      if (!r || r.length === 0) continue;
      const cName = String(r[colName] || '').trim();
      const cCode = String(r[colCustCode] || '').trim();
      if (!cName && !cCode) continue;

      const custCode = cCode || `CD-${String(i).padStart(3, '0')}`;
      restoredCustomers.push({
        customer_id: `CUST-${custCode}`,
        customer_code: custCode,
        name: cName || 'Cư dân',
        phone: r[colPhone] ? String(r[colPhone]).trim() : '',
        building: r[colBuilding] ? String(r[colBuilding]).trim() : 'Tòa Nhà',
        room: r[colRoom] ? String(r[colRoom]).trim() : '',
        address: r[colAddress] ? String(r[colAddress]).trim() : '',
        note: r[colNote] ? String(r[colNote]).trim() : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Also synthesize customers from Orders if customer list was sparse
  for (const o of restoredOrders) {
    const exists = restoredCustomers.some(
      (c) => (c.phone && c.phone === o.customer_phone) || (c.room === o.customer_room && c.building === o.customer_building)
    );
    if (!exists && (o.customer_name || o.customer_room)) {
      restoredCustomers.push({
        customer_id: o.customer_id,
        customer_code: `CD-${o.customer_room || o.customer_phone || restoredCustomers.length + 1}`,
        name: o.customer_name,
        phone: o.customer_phone,
        building: o.customer_building,
        room: o.customer_room,
        address: `${o.customer_building} - ${o.customer_room}`,
        note: o.note || '',
        created_at: o.created_at,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // ----------------------------------------------------
  // PARSE PRODUCTS TAB
  // ----------------------------------------------------
  const productsRows = findSheetRows(SHEET_NAMES.PRODUCTS, ['danh mục', 'hải sản', 'sản phẩm', 'products', 'bảng giá']);
  const restoredProducts: Product[] = [];

  if (productsRows.length > 1) {
    const pHeaders = (productsRows[0] || []).map((h: any) => String(h || '').trim());
    const colSku = findColIndex(pHeaders, ['mã sku', 'sku', 'mã'], 0);
    const colPName = findColIndex(pHeaders, ['tên hải sản', 'tên sản phẩm', 'sản phẩm', 'tên'], 1);
    const colCategory = findColIndex(pHeaders, ['loại', 'danh mục', 'phân loại'], 2);
    const colSize = findColIndex(pHeaders, ['quy cách', 'kích cỡ', 'size'], 3);
    const colOrigin = findColIndex(pHeaders, ['xuất xứ', 'nguồn gốc', 'quê'], 4);
    const colUnit = findColIndex(pHeaders, ['đơn vị tính', 'đơn vị', 'đvt'], 5);
    const colPrice = findColIndex(pHeaders, ['giá bán', 'giá', 'đơn giá', 'giá mặc định'], 6);
    const colStatus = findColIndex(pHeaders, ['trạng thái', 'tình trạng'], 7);
    const colDesc = findColIndex(pHeaders, ['mô tả', 'ghi chú'], 8);

    for (let i = 1; i < productsRows.length; i++) {
      const r = productsRows[i];
      if (!r || r.length === 0) continue;
      const sku = String(r[colSku] || '').trim();
      const pName = String(r[colPName] || '').trim();
      if (!sku && !pName) continue;

      const effectiveSku = sku || `SKU-${String(i).padStart(3, '0')}`;
      restoredProducts.push({
        product_id: `PROD-${effectiveSku}`,
        sku: effectiveSku,
        product_name: pName || 'Hải Sản Tươi',
        category: r[colCategory] ? String(r[colCategory]).trim() : 'Hải sản',
        size: r[colSize] ? String(r[colSize]).trim() : '',
        origin: r[colOrigin] ? String(r[colOrigin]).trim() : '',
        unit: (r[colUnit] ? String(r[colUnit]).trim() : 'kg') as any,
        default_price: parseFloat(String(r[colPrice] || '0').replace(/[^\d.]/g, '')) || 0,
        status: String(r[colStatus] || '').includes('ngưng') ? 'INACTIVE' : 'ACTIVE',
        description: r[colDesc] ? String(r[colDesc]).trim() : '',
      });
    }
  }

  // ----------------------------------------------------
  // PERSIST RESTORED DATA TO STORAGE
  // ----------------------------------------------------
  if (restoredProducts.length > 0) {
    storage.saveProducts(restoredProducts);
  }
  if (restoredCustomers.length > 0) {
    storage.saveCustomers(restoredCustomers);
  }
  if (restoredBatches.length > 0) {
    storage.saveBatches(restoredBatches);
    // Set active batch ID to the first restored batch
    storage.setCurrentBatchId(restoredBatches[0].batch_id);
  }
  if (restoredOrders.length > 0) {
    storage.saveOrders(restoredOrders);
  }

  const now = new Date().toISOString();
  return {
    ordersCount: restoredOrders.length,
    batchesCount: restoredBatches.length,
    customersCount: restoredCustomers.length,
    productsCount: restoredProducts.length,
    settingsRestored,
    restoredAt: now,
  };
}

// 7. Direct Settings Export & Import helpers
export async function exportSettingsToGoogleSheets(
  spreadsheetId: string,
  settings: StoreSettings
): Promise<boolean> {
  await ensureSheetTabsExist(spreadsheetId);
  const prepared = prepareSheetData([], [], [], [], settings);
  const settingsData = prepared[SHEET_NAMES.SETTINGS];

  await fetchSheetsApi(`/${spreadsheetId}/values/${SHEET_NAMES.SETTINGS}!A1:C50?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({
      range: `${SHEET_NAMES.SETTINGS}!A1:C${settingsData.rows.length + 1}`,
      values: [settingsData.header, ...settingsData.rows],
    }),
  });

  return true;
}
