import { Order, Batch, Customer, Product, StoreSettings } from '../types';
import { getAccessToken, setAccessTokenInMemory, refreshGoogleSession, isAutoReconnectEnabled } from './googleAuth';
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

// Helper: Extract & sanitize clean spreadsheet ID from full URL, partial URL, or raw ID
export function extractSpreadsheetId(rawInput: string): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();

  // 1. If full Google Sheets URL: e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const urlMatch =
    trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i) ||
    trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].trim();
  }

  // 2. Remove URL artifacts, query params, hashes, and /edit suffixes
  let cleaned = trimmed.split('?')[0].split('#')[0];
  cleaned = cleaned.replace(/\/edit\/?$/i, '').replace(/^\/+|\/+$/g, '').trim();

  // 3. If string still has path slashes, look for an alphanumeric candidate ID of sufficient length
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    const candidate = parts.find((p) => p.length > 20 && !p.includes('.'));
    if (candidate) return candidate.trim();
  }

  return cleaned;
}

// Helper: Safely inspect response to detect HTML pages (Vite SPA index.html or Google HTML error pages)
async function parseResponseSafely(res: Response): Promise<{ isHtml: boolean; data: any; rawText: string }> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const rawText = await res.text().catch(() => '');
  const trimmed = rawText.trim();
  const isHtml =
    contentType.includes('text/html') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML') ||
    (trimmed.startsWith('<') && trimmed.includes('</'));

  if (isHtml) {
    return { isHtml: true, data: null, rawText };
  }

  try {
    const data = JSON.parse(rawText);
    return { isHtml: false, data, rawText };
  } catch {
    return { isHtml: false, data: null, rawText };
  }
}

// Helper: Make authenticated request to Google Sheets API with robust direct/proxy dual-fallback
async function fetchSheetsApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Chưa đăng nhập Google hoặc phiên đăng nhập đã hết hạn. Vui lòng nhấn "Đăng nhập Google" để tiếp tục.');
  }

  // Sanitize endpoint if it contains an un-extracted spreadsheet ID or full URL
  let safeEndpoint = endpoint;
  if (safeEndpoint.startsWith('/')) {
    const segments = safeEndpoint.slice(1).split(/[/?#:]/);
    const candidateId = segments[0];
    if (candidateId && (candidateId.includes('http') || candidateId.includes('spreadsheets') || candidateId.length > 15)) {
      const cleaned = extractSpreadsheetId(candidateId);
      if (cleaned && cleaned !== candidateId) {
        safeEndpoint = safeEndpoint.replace(`/${candidateId}`, `/${cleaned}`);
      }
    }
  }

  // Detect execution environment: on localhost/local dev, direct Google API works natively without depending on proxy
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.'));

  const directUrl = `https://sheets.googleapis.com/v4/spreadsheets${safeEndpoint}`;
  const proxyUrl = `/api/google-proxy/sheets${safeEndpoint}`;

  // Preferred order: on localhost use direct Google Sheets API first (no missing proxy issue);
  // in hosted/preview iframe use proxy first, then fallback to direct
  const primaryUrl = isLocalhost ? directUrl : proxyUrl;
  const fallbackUrl = isLocalhost ? proxyUrl : directUrl;

  const executeCall = async (url: string) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const parsed = await parseResponseSafely(res);
    return { ok: res.ok, status: res.status, parsed };
  };

  let executionResult: { ok: boolean; status: number; parsed: { isHtml: boolean; data: any; rawText: string } } | null = null;

  try {
    executionResult = await executeCall(primaryUrl);
    // If the response is an HTML document (e.g. Vite SPA index.html fallback) or server 404/502/500, try the fallback URL
    if (
      executionResult.parsed.isHtml ||
      (!executionResult.ok && (executionResult.status === 404 || executionResult.status === 502 || executionResult.status === 500))
    ) {
      console.warn(`[Google Sheets] Primary call to ${primaryUrl} returned ${executionResult.status} (isHtml: ${executionResult.parsed.isHtml}). Attempting fallback to ${fallbackUrl}...`);
      const fallbackResult = await executeCall(fallbackUrl).catch(() => null);
      if (fallbackResult && !fallbackResult.parsed.isHtml) {
        executionResult = fallbackResult;
      }
    }
  } catch (primaryErr: any) {
    console.warn(`[Google Sheets] Primary call failed (${primaryErr?.message}), trying fallback to ${fallbackUrl}...`);
    try {
      executionResult = await executeCall(fallbackUrl);
    } catch (fallbackErr: any) {
      console.error('Failed both primary and fallback Google Sheets calls:', fallbackErr);
      throw new Error(
        `Không thể kết nối đến Google Sheets (Lỗi mạng hoặc bị chặn kết nối): ${fallbackErr?.message || primaryErr?.message}`
      );
    }
  }

  if (!executionResult) {
    throw new Error('Không nhận được phản hồi từ dịch vụ Google Sheets');
  }

  // Handle case where response is still HTML
  if (executionResult.parsed.isHtml) {
    throw new Error(
      `Google API trả về nội dung HTML thay vì dữ liệu JSON (Mã trạng thái ${executionResult.status}). Vui lòng kiểm tra lại link Google Sheets của bạn và đảm bảo tài khoản có quyền "Người chỉnh sửa" (Editor).`
    );
  }

  // Handle HTTP error codes
  if (!executionResult.ok) {
    const errorData = executionResult.parsed.data;
    const message = errorData?.error?.message || `HTTP ${executionResult.status}`;

    const isAuthError =
      executionResult.status === 401 ||
      executionResult.status === 403 ||
      errorData?.error?.status === 'UNAUTHENTICATED' ||
      message.toLowerCase().includes('authentication credentials') ||
      message.toLowerCase().includes('invalid credentials');

    if (isAuthError) {
      setAccessTokenInMemory(null);
      throw new Error('Phiên đăng nhập Google đã hết hạn hoặc chưa có quyền truy cập tệp Sheet này. Vui lòng bấm "Đăng nhập lại" để cấp quyền.');
    }

    if (executionResult.status === 404 || message.toLowerCase().includes('not found')) {
      throw new Error('Không tìm thấy tệp Google Sheet với ID này. Vui lòng kiểm tra lại ID hoặc liên kết bảng tính đã kết nối.');
    }

    throw new Error(`Lỗi Google Sheets API: ${message}`);
  }

  return executionResult.parsed.data;
}

// Helper: Search for existing seafood spreadsheet in Google Drive to prevent duplicates
export async function searchSpreadsheetsOnDrive(
  searchQuery: string = 'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư'
): Promise<Array<{ id: string; name: string; url: string; modifiedTime?: string }>> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.'));

    const q = `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
    const queryString = `q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=10`;
    const directUrl = `https://www.googleapis.com/drive/v3/files?${queryString}`;
    const proxyUrl = `/api/google-proxy/drive/files?${queryString}`;

    const primaryUrl = isLocalhost ? directUrl : proxyUrl;
    const fallbackUrl = isLocalhost ? proxyUrl : directUrl;

    let res = await fetch(primaryUrl, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);

    let parsed = res ? await parseResponseSafely(res) : { isHtml: true, data: null, rawText: '' };
    if (!res || !res.ok || parsed.isHtml) {
      res = await fetch(fallbackUrl, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (res) {
        parsed = await parseResponseSafely(res);
      }
    }

    if (!res || !res.ok || parsed.isHtml || !parsed.data) {
      return [];
    }

    const data = parsed.data;
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

// 2. Ensure all 7 required sheet tabs exist in an existing spreadsheet and have sufficient grid space
export async function ensureSheetTabsExist(spreadsheetId: string) {
  const meta = await fetchSheetsApi(`/${spreadsheetId}`);
  const existingSheets = meta.sheets || [];
  const existingTitles: string[] = existingSheets.map((s: any) =>
    String(s.properties?.title || '').trim().toLowerCase()
  );

  const missingSheets = Object.values(SHEET_NAMES).filter(
    (name) => !existingTitles.includes(name.trim().toLowerCase())
  );

  const requests: any[] = [];

  if (missingSheets.length > 0) {
    missingSheets.forEach((title) => {
      requests.push({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
              frozenRowCount: 1,
            },
          },
        },
      });
    });
  }

  // Ensure all existing sheets have at least 1000 rows and 26 columns to prevent grid limit errors
  for (const s of existingSheets) {
    const sId = s.properties?.sheetId;
    const grid = s.properties?.gridProperties;
    const currentRows = grid?.rowCount || 0;
    const currentCols = grid?.columnCount || 0;

    if (currentRows < 1000 || currentCols < 26) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sId,
            gridProperties: {
              rowCount: Math.max(currentRows, 1000),
              columnCount: Math.max(currentCols, 26),
            },
          },
          fields: 'gridProperties(rowCount,columnCount)',
        },
      });
    }
  }

  if (requests.length > 0) {
    try {
      await fetchSheetsApi(`/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests }),
      });
    } catch (updateErr: any) {
      console.warn('[Google Sheets] ensureSheetTabsExist update notice:', updateErr?.message);
    }
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

// Helper to force Google Sheets to preserve leading zeros in text fields (e.g. '0916988982', '0381000...')
function preserveLeadingZero(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^0\d+$/.test(str)) {
    return `'${str}`;
  }
  return str;
}

// Clean string imported from Google Sheets (strip leading quote and trim)
function cleanSheetString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/^'/, '');
}

// Convert 1-based column number to A1 column letter (e.g. 1 -> A, 17 -> Q, 26 -> Z, 27 -> AA)
export function columnToLetter(column: number): string {
  let temp: number;
  let letter = '';
  let col = Math.max(1, column);
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - temp - 1) / 26);
  }
  return letter || 'A';
}

// Parse numbers and currency strings from Google Sheets reliably (e.g. "1.500.000", "280k", "150,000", 250000)
export function parseVietnameseCurrency(raw: any): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : Math.round(raw);
  if (!raw) return 0;
  let str = String(raw).trim().toLowerCase();

  // Match "k" suffix (e.g. "280k", "55k", "145.5k")
  const kMatch = str.match(/^([\d.,]+)\s*k$/);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    return !isNaN(num) ? Math.round(num * 1000) : 0;
  }

  // Remove non-numeric characters except dots and commas
  str = str.replace(/[^\d.,]/g, '');
  if (!str) return 0;

  // Handle dots as thousand separators (e.g. "1.500.000" or "280.000")
  const dotCount = (str.match(/\./g) || []).length;
  const commaCount = (str.match(/,/g) || []).length;

  if (dotCount > 1) {
    str = str.replace(/\./g, '');
  } else if (commaCount > 1) {
    str = str.replace(/,/g, '');
  } else if (dotCount === 1 && commaCount === 1) {
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (dotCount === 1 && commaCount === 0) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      str = parts[0] + parts[1];
    }
  } else if (commaCount === 1 && dotCount === 0) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      str = parts[0] + parts[1];
    } else {
      str = str.replace(',', '.');
    }
  }

  const val = parseFloat(str);
  return !isNaN(val) ? Math.round(val) : 0;
}

// 3. Prepare data rows for each sheet tab (Including Tab 7: Settings)
export function prepareSheetData(
  ordersInput: Order[],
  batchesInput: Batch[],
  customersInput: Customer[],
  productsInput: Product[],
  settingsInput?: StoreSettings
) {
  const settings = settingsInput || storage.getSettings();

  // Bulletproof sanitation of all incoming arrays
  const orders = (Array.isArray(ordersInput) ? ordersInput : []).filter((o) => o && typeof o === 'object');
  const batches = (Array.isArray(batchesInput) ? batchesInput : []).filter((b) => b && typeof b === 'object');
  const customers = (Array.isArray(customersInput) ? customersInput : []).filter((c) => c && typeof c === 'object');
  const products = (Array.isArray(productsInput) ? productsInput : []).filter((p) => p && typeof p === 'object');

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
    const rawItems = Array.isArray(o.items) ? o.items.filter(Boolean) : [];
    const itemsSummary = rawItems
      .map((item) => {
        const qty = item.quantity_actual ?? item.quantity_ordered ?? 1;
        const sizeStr = item.size ? ` (${item.size})` : '';
        const noteStr = item.processing_note ? ` [${item.processing_note}]` : '';
        return `${item.product_name || 'Hải sản'}${sizeStr}: ${qty} ${item.unit || 'kg'}${noteStr}`;
      })
      .join('; ');

    const total = typeof o.total === 'number' && !isNaN(o.total) ? Math.round(o.total) : 0;
    const paid = typeof o.paid_amount === 'number' && !isNaN(o.paid_amount) ? Math.round(o.paid_amount) : 0;
    const debt = typeof o.debt_amount === 'number' && !isNaN(o.debt_amount) ? Math.round(o.debt_amount) : Math.max(0, total - paid);

    return [
      o.order_code || '',
      o.customer_name || 'Cư dân',
      preserveLeadingZero(o.customer_phone),
      o.customer_building || '',
      o.customer_room || '',
      o.batch_name || '',
      o.delivery_date || '',
      itemsSummary,
      total,
      paid,
      debt,
      translateOrderStatus(o.status || 'COLLECTING'),
      translateDeliveryStatus(o.delivery_status || 'PENDING'),
      translatePaymentStatus(o.payment_status || 'UNPAID'),
      o.payment_method || 'QR',
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
    'Tiến Trình Luồng Xử Lý',
    'Tiến Độ Cân Chia & Đóng Gói',
    'Tiến Độ Giao Tận Phòng',
    'Nguồn Cung Cấp / Quê',
    'Tổng Số Đơn Hàng',
    'Tổng Doanh Thu (VNĐ)',
    'Đã Thu Tiền (VNĐ)',
    'Còn Nợ (VNĐ)',
    'Tổng Khối Lượng (kg/khay)',
    'Ghi Chú Đợt',
  ];

  const batchesRows = batches.map((b) => {
    const batchOrders = orders.filter((o) => o && o.batch_id === b.batch_id && o.status !== 'CANCELLED');
    const totalRev = batchOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalPaid = batchOrders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
    const totalDebt = batchOrders.reduce((sum, o) => sum + (Number(o.debt_amount) || 0), 0);
    const totalWeight = batchOrders.reduce((sum, o) => {
      const orderItems = Array.isArray(o.items) ? o.items.filter(Boolean) : [];
      return (
        sum +
        orderItems.reduce((itemSum, item) => itemSum + (Number(item?.quantity_actual ?? item?.quantity_ordered) || 0), 0)
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

    const workflowStepMap: Record<string, string> = {
      OPEN: 'Bước 1/7: Mở nhận đơn gom',
      COLLECTING: 'Bước 1/7: Đang gom đơn cư dân',
      CONFIRMED: 'Bước 2/7: Đã chốt số lượng đợt',
      ORDERED: 'Bước 3/7: Đã đặt hàng quê & đóng thùng',
      RECEIVED: 'Bước 4/7: Hải sản đã về chung cư',
      DISTRIBUTING: 'Bước 5/7: Đang cân chia & đóng túi',
      DELIVERING: 'Bước 6/7: Đang đi giao tận phòng',
      COMPLETED: 'Bước 7/7: Đã hoàn tất đợt gom',
      CANCELLED: 'Đã hủy đợt gom',
    };

    const totalOrdersCount = batchOrders.length;
    const weighedCount = batchOrders.filter(
      (o) => o.is_weighed || (o.items || []).every((it) => it.quantity_actual !== undefined && it.quantity_actual > 0)
    ).length;
    const packedCount = batchOrders.filter((o) => o.is_packed).length;
    const deliveredCount = batchOrders.filter((o) => o.delivery_status === 'DELIVERED').length;
    const distributingCount = batchOrders.filter((o) => o.delivery_status === 'DELIVERING').length;

    const weighAndPackProgress = totalOrdersCount > 0 
      ? `Đã cân: ${weighedCount}/${totalOrdersCount} đơn | Đã đóng túi: ${packedCount}/${totalOrdersCount} đơn`
      : 'Chưa có đơn';

    const deliveryProgress = totalOrdersCount > 0
      ? `Đã giao: ${deliveredCount}/${totalOrdersCount} đơn${distributingCount > 0 ? ` (Đang giao: ${distributingCount})` : ''}`
      : 'Chưa có đơn';

    return [
      b.batch_code,
      b.batch_name,
      b.batch_date || b.created_at || '',
      b.delivery_date || '',
      statusMap[b.status] || b.status,
      workflowStepMap[b.status] || b.status,
      weighAndPackProgress,
      deliveryProgress,
      b.supplier_info?.location || 'Quảng Ninh & Cà Mau',
      totalOrdersCount,
      totalRev,
      totalPaid,
      totalDebt,
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
      preserveLeadingZero(c.phone),
      c.building || '',
      c.room || '',
      c.address || '',
      custOrders.length,
      totalSpent,
      totalDebt,
      c.note || '',
    ];
  });

  // Tab 4: Danh Mục Hải Sản (Tự động lọc trùng tên hải sản & hợp nhất thông tin đầy đủ nhất)
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

  // Map to enforce unique seafood product names (normalized)
  const uniqueProductsMap = new Map<string, Product>();

  (products || []).forEach((p) => {
    if (!p || !p.product_name) return;
    const normKey = p.product_name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normKey) return;
    if (!uniqueProductsMap.has(normKey)) {
      uniqueProductsMap.set(normKey, p);
    } else {
      const existing = uniqueProductsMap.get(normKey)!;
      uniqueProductsMap.set(normKey, {
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
  });

  const uniqueProductList = Array.from(uniqueProductsMap.values());

  const productsRows = uniqueProductList.map((p) => [
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
      preserveLeadingZero(o.customer_phone),
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

  // Tab 7: Cấu Hình Hệ Thống (Store Settings, Bank Accounts, Units, Categories)
  const currentUnits = storage.getUnits();
  const currentCategories = storage.getCategories();
  const settingsHeader = ['Mã Cấu Hình / Thuộc Tính', 'Giá Trị Thiết Lập', 'Mô Tả & Hướng Dẫn Nghiệp Vụ'];
  const settingsRows = [
    ['STORE_NAME', settings.store_name || '', 'Tên cửa hàng hải sản hiển thị trên phiếu in & tiêu đề'],
    ['OWNER_NAME', settings.owner_name || '', 'Tên chủ shop / cư dân đại diện'],
    ['PHONE', preserveLeadingZero(settings.phone), 'Số điện thoại di động chính'],
    ['HOTLINE', preserveLeadingZero(settings.hotline || settings.phone), 'Hotline liên hệ in nổi bật trên phiếu A4'],
    ['CONDO_NAME', settings.condo_name || '', 'Tên khu chung cư phục vụ gom đơn'],
    ['ADDRESS', settings.address || '', 'Địa chỉ tập kết & giao nhận hải sản'],
    ['BANK_1_NAME', settings.bank_name || 'ABBANK', 'Ngân hàng 1 (Tài khoản chính, VD: ABBANK, BIDV, Vietcombank)'],
    ['BANK_1_ACCOUNT', preserveLeadingZero(settings.bank_account), 'Số tài khoản Ngân hàng 1 (Bảo lưu nguyên vẹn số 0 đầu)'],
    ['BANK_1_ACCOUNT_NAME', settings.bank_account_name || settings.bank_owner || '', 'Tên chủ tài khoản Ngân hàng 1'],
    ['BANK_1_BIN', settings.bank_bin || '970425', 'Mã BIN VietQR Ngân hàng 1'],
    ['BANK_2_NAME', settings.bank_name_2 || 'BIDV', 'Ngân hàng 2 (Tài khoản phụ)'],
    ['BANK_2_ACCOUNT', preserveLeadingZero(settings.bank_account_2), 'Số tài khoản Ngân hàng 2 (Bảo lưu nguyên vẹn số 0 đầu)'],
    ['BANK_2_ACCOUNT_NAME', settings.bank_account_name_2 || settings.bank_account_name || '', 'Tên chủ tài khoản Ngân hàng 2'],
    ['BANK_2_BIN', settings.bank_bin_2 || '970418', 'Mã BIN VietQR Ngân hàng 2'],
    ['ACTIVE_BANK_ACCOUNT', settings.active_bank_account || 'BANK_1', 'Tài khoản nhận tiền mặc định được chọn (BANK_1 hoặc BANK_2)'],
    ['BANK_QR_TEMPLATE', settings.bank_qr_template || 'compact2', 'Mẫu hiển thị VietQR (compact2, compact, qr_only, print)'],
    ['QR_SIZE', settings.qr_size || 'large', 'Kích thước in mã VietQR (large = To rõ nét, medium = Vừa)'],
    ['SHOW_VIETQR', String(settings.show_vietqr !== false), 'Bật / Tắt tạo và in mã VietQR tự động (true / false)'],
    ['INVOICE_FOOTER_NOTE', settings.invoice_footer_note || '', 'Ghi chú dặn dò bảo quản ở chân phiếu in dán bao bì'],
    ['SLOGAN', settings.slogan || '', 'Khẩu hiệu bán hàng'],
    ['UNITS_LIST', currentUnits.join('; '), 'Danh sách Đơn vị tính (Kg, Hộp, Khay, Con, Chai, Lon, Bịch, Thùng...)'],
    ['CATEGORIES_LIST', currentCategories.join('; '), 'Danh sách Danh mục hải sản (Tôm, Cua, Ghẹ, Cá biển, Mực, Ốc & Ngao...)'],
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
  // Always sanitize and heal local data before syncing to ensure flawless tabular matrices
  storage.sanitizeAndHealAllData();

  // Ensure all 7 tabs exist and have at least 1,000 rows and 26 columns
  await ensureSheetTabsExist(spreadsheetId);

  const safeOrders = orders && orders.length > 0 ? orders : storage.getOrders();
  const safeBatches = batches && batches.length > 0 ? batches : storage.getBatches();
  const safeCustomers = customers && customers.length > 0 ? customers : storage.getCustomers();
  const safeProducts = products && products.length > 0 ? products : storage.getProducts();

  const preparedData = prepareSheetData(safeOrders, safeBatches, safeCustomers, safeProducts, settings);

  // 1. Clear old data from all tabs safely using unbounded A:Z ranges (eliminating grid limits errors completely)
  try {
    const clearRanges = Object.keys(preparedData).map((sheetTitle) => {
      return `'${sheetTitle.replace(/'/g, "''")}'!A:Z`;
    });
    await fetchSheetsApi(`/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      body: JSON.stringify({ ranges: clearRanges }),
    });
  } catch (clearErr: any) {
    console.warn('[Google Sheets] batchClear unbounded A:Z notice, attempting sheet name fallback:', clearErr?.message);
    try {
      const fallbackRanges = Object.keys(preparedData).map((sheetTitle) => `'${sheetTitle.replace(/'/g, "''")}'`);
      await fetchSheetsApi(`/${spreadsheetId}/values:batchClear`, {
        method: 'POST',
        body: JSON.stringify({ ranges: fallbackRanges }),
      });
    } catch (fallbackErr: any) {
      console.warn('[Google Sheets] batchClear fallback notice, proceeding with write:', fallbackErr?.message);
    }
  }

  // 2. Write new formatted data with exact matching rectangular matrix (A1:EndColRowCount)
  const valueRanges = Object.entries(preparedData).map(([sheetTitle, { header, rows }]) => {
    const numCols = header.length;
    const endCol = columnToLetter(numCols);

    const sanitizedRows = rows.map((row) => {
      const paddedRow = new Array(numCols).fill('');
      for (let c = 0; c < numCols; c++) {
        const cell = row[c];
        if (cell === null || cell === undefined) {
          paddedRow[c] = '';
        } else if (typeof cell === 'number') {
          paddedRow[c] = isNaN(cell) ? 0 : cell;
        } else {
          paddedRow[c] = cell;
        }
      }
      return paddedRow;
    });

    const allValues = [header, ...sanitizedRows];
    const totalRows = allValues.length;

    return {
      range: `'${sheetTitle.replace(/'/g, "''")}'!A1:${endCol}${totalRows}`,
      values: allValues,
    };
  });

  await fetchSheetsApi(`/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    }),
  });

  const now = new Date().toISOString();
  return {
    ordersCount: safeOrders.length,
    batchesCount: safeBatches.length,
    customersCount: safeCustomers.length,
    productsCount: safeProducts.length,
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

  let spreadsheetId = extractSpreadsheetId(localStorage.getItem('seafood_sheets_spreadsheet_id') || '');
  let spreadsheetUrl = localStorage.getItem('seafood_sheets_spreadsheet_url') || '';

  // If no spreadsheet ID in localStorage (e.g. running on new local/domain), first try searching Google Drive
  if (!spreadsheetId) {
    try {
      const searchResults = await searchSpreadsheetsOnDrive(options?.title || 'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư');
      if (searchResults && searchResults.length > 0) {
        // Reuse the existing most recently modified spreadsheet on user's Google Drive
        spreadsheetId = extractSpreadsheetId(searchResults[0].id);
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
    spreadsheetId = extractSpreadsheetId(created.spreadsheetId);
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
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Chưa cung cấp ID tệp Google Sheets hợp lệ để nạp dữ liệu. Vui lòng kiểm tra lại ID hoặc link Google Sheet.');
  }

  // 1. Get spreadsheet metadata first to discover existing sheet tabs
  const meta = await fetchSheetsApi(`/${cleanId}?fields=sheets(properties(sheetId,title,gridProperties))`);
  const sheetList: Array<{ title: string; sheetId?: number; columnCount?: number; rowCount?: number }> = (meta.sheets || [])
    .map((s: any) => ({
      title: s.properties?.title || '',
      sheetId: s.properties?.sheetId,
      columnCount: s.properties?.gridProperties?.columnCount || 26,
      rowCount: s.properties?.gridProperties?.rowCount || 1000,
    }))
    .filter((s: any) => Boolean(s.title));

  if (sheetList.length === 0) {
    throw new Error('Không tìm thấy bất kỳ trang tính nào trong tệp Google Sheets này');
  }

  // 2. Fetch all values safely for existing sheets with grid bounds protection & fallback
  let valueRanges: any[] = [];
  try {
    const ranges = sheetList.map((s) => {
      const maxCol = columnToLetter(Math.min(s.columnCount || 26, 26));
      const maxRow = Math.min(s.rowCount || 1000, 1000);
      return `'${s.title.replace(/'/g, "''")}'!A1:${maxCol}${maxRow}`;
    });
    const queryString = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
    const response = await fetchSheetsApi(`/${spreadsheetId}/values:batchGet?${queryString}`);
    valueRanges = response.valueRanges || [];
  } catch (batchErr: any) {
    console.warn('[Google Sheets] batchGet failed, falling back to individual tab fetch:', batchErr?.message);
    for (const sheet of sheetList) {
      try {
        const maxCol = columnToLetter(Math.min(sheet.columnCount || 26, 26));
        const maxRow = Math.min(sheet.rowCount || 1000, 1000);
        const safeRange = `'${sheet.title.replace(/'/g, "''")}'!A1:${maxCol}${maxRow}`;
        const singleRes = await fetchSheetsApi(`/${spreadsheetId}/values/${encodeURIComponent(safeRange)}`);
        if (singleRes && singleRes.values) {
          valueRanges.push({ range: sheet.title, values: singleRes.values });
        }
      } catch (singleErr: any) {
        console.warn(`[Google Sheets] Could not fetch sheet "${sheet.title}":`, singleErr?.message);
      }
    }
  }
  const getSheetDataByTitle = (targetTitle: string): any[][] => {
    const targetNorm = targetTitle.trim().toLowerCase();
    const found = valueRanges.find((vr: any) => {
      if (!vr || !vr.range) return false;
      const cleanRange = vr.range.replace(/^'|'$/g, '').toLowerCase();
      const rangeSheetName = vr.range.includes('!')
        ? vr.range.split('!')[0].replace(/^'|'$/g, '').trim().toLowerCase()
        : cleanRange.trim();
      return (
        rangeSheetName === targetNorm ||
        rangeSheetName.includes(targetNorm) ||
        targetNorm.includes(rangeSheetName)
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
      store_name: cleanSheetString(configMap['STORE_NAME']) || currentSettings.store_name,
      owner_name: cleanSheetString(configMap['OWNER_NAME']) || currentSettings.owner_name,
      phone: cleanSheetString(configMap['PHONE']) || currentSettings.phone,
      hotline: cleanSheetString(configMap['HOTLINE']) || currentSettings.hotline,
      condo_name: cleanSheetString(configMap['CONDO_NAME']) || currentSettings.condo_name,
      address: cleanSheetString(configMap['ADDRESS']) || currentSettings.address,
      bank_name: cleanSheetString(configMap['BANK_1_NAME']) || currentSettings.bank_name,
      bank_account: cleanSheetString(configMap['BANK_1_ACCOUNT']) || currentSettings.bank_account,
      bank_account_name: cleanSheetString(configMap['BANK_1_ACCOUNT_NAME']) || currentSettings.bank_account_name,
      bank_bin: cleanSheetString(configMap['BANK_1_BIN']) || currentSettings.bank_bin,
      bank_name_2: cleanSheetString(configMap['BANK_2_NAME']) || currentSettings.bank_name_2,
      bank_account_2: cleanSheetString(configMap['BANK_2_ACCOUNT']) || currentSettings.bank_account_2,
      bank_account_name_2: cleanSheetString(configMap['BANK_2_ACCOUNT_NAME']) || currentSettings.bank_account_name_2,
      bank_bin_2: cleanSheetString(configMap['BANK_2_BIN']) || currentSettings.bank_bin_2,
      active_bank_account: (cleanSheetString(configMap['ACTIVE_BANK_ACCOUNT']) as any) || currentSettings.active_bank_account || 'BANK_1',
      bank_qr_template: (cleanSheetString(configMap['BANK_QR_TEMPLATE']) as any) || currentSettings.bank_qr_template || 'compact2',
      qr_size: (cleanSheetString(configMap['QR_SIZE']) as any) || currentSettings.qr_size || 'large',
      show_vietqr: configMap['SHOW_VIETQR'] !== undefined ? configMap['SHOW_VIETQR'] === 'true' : currentSettings.show_vietqr,
      invoice_footer_note: cleanSheetString(configMap['INVOICE_FOOTER_NOTE']) || currentSettings.invoice_footer_note,
      slogan: cleanSheetString(configMap['SLOGAN']) || currentSettings.slogan,
      default_shipping_fee: configMap['DEFAULT_SHIPPING_FEE'] ? parseFloat(configMap['DEFAULT_SHIPPING_FEE']) || 0 : currentSettings.default_shipping_fee,
    };

    storage.saveSettings(restoredSettings as StoreSettings);
    settingsRestored = true;

    // Restore and merge Units from Google Sheets config
    if (configMap['UNITS_LIST']) {
      const unitsFromSheet = configMap['UNITS_LIST']
        .split(/[;,]/)
        .map((u) => u.trim())
        .filter(Boolean);
      if (unitsFromSheet.length > 0) {
        const currentU = storage.getUnits();
        const mergedU = Array.from(new Set([...currentU, ...unitsFromSheet]));
        storage.saveUnits(mergedU);
      }
    }

    // Restore and merge Categories from Google Sheets config
    if (configMap['CATEGORIES_LIST']) {
      const catsFromSheet = configMap['CATEGORIES_LIST']
        .split(/[;,]/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (catsFromSheet.length > 0) {
        const currentC = storage.getCategories();
        const mergedC = Array.from(new Set([...currentC, ...catsFromSheet]));
        storage.saveCategories(mergedC);
      }
    }
  }

  // ----------------------------------------------------
  // PARSE WEIGHING TAB (TAB 5) - FOR EXACT WEIGHTS & SPECS
  // ----------------------------------------------------
  const weighingRows = findSheetRows(SHEET_NAMES.WEIGHING, ['cân chia', 'thực tế', 'weighing', 'cân']);
  interface WeighedItemInfo {
    size?: string;
    actualQty?: number;
    orderedQty?: number;
    unit?: string;
    actualPrice?: number;
    subtotal?: number;
    processingNote?: string;
    isWeighed: boolean;
    itemNote?: string;
  }
  const weighedItemsMap = new Map<string, WeighedItemInfo>();

  if (weighingRows.length > 1) {
    const wHeaders = (weighingRows[0] || []).map((h: any) => String(h || '').trim());
    const wColOrderCode = findColIndex(wHeaders, ['mã đơn', 'code', 'mã'], 0);
    const wColProdName = findColIndex(wHeaders, ['món hải sản', 'sản phẩm', 'tên món', 'hải sản'], 4);
    const wColSize = findColIndex(wHeaders, ['quy cách', 'size', 'loại'], 5);
    const wColOrderedQty = findColIndex(wHeaders, ['số lượng đặt', 'đặt'], 6);
    const wColActualQty = findColIndex(wHeaders, ['số cân thực tế', 'thực tế', 'số kg'], 7);
    const wColUnit = findColIndex(wHeaders, ['đơn vị', 'unit'], 8);
    const wColPrice = findColIndex(wHeaders, ['đơn giá', 'giá'], 9);
    const wColSubtotal = findColIndex(wHeaders, ['thành tiền', 'tổng'], 10);
    const wColProcessing = findColIndex(wHeaders, ['sơ chế', 'yêu cầu sơ chế'], 11);
    const wColStatus = findColIndex(wHeaders, ['trạng thái cân', 'tình trạng'], 12);
    const wColItemNote = findColIndex(wHeaders, ['ghi chú món', 'ghi chú'], 13);

    for (let i = 1; i < weighingRows.length; i++) {
      const r = weighingRows[i];
      if (!r || r.length === 0) continue;
      const orderCode = String(r[wColOrderCode] || '').trim().toLowerCase();
      const pName = String(r[wColProdName] || '').trim().toLowerCase();
      if (!orderCode || !pName) continue;

      const actQty = parseFloat(String(r[wColActualQty] || '0').replace(/[^\d.]/g, ''));
      const ordQty = parseFloat(String(r[wColOrderedQty] || '0').replace(/[^\d.]/g, ''));
      const actPrice = parseVietnameseCurrency(r[wColPrice]);
      const subtotal = parseVietnameseCurrency(r[wColSubtotal]);
      const rawWStatus = String(r[wColStatus] || '').toLowerCase();
      const isWeighed = rawWStatus.includes('xong') || rawWStatus.includes('đã cân') || (actQty > 0 && !isNaN(actQty));

      const key = `${orderCode}___${pName}`;
      weighedItemsMap.set(key, {
        size: r[wColSize] ? String(r[wColSize]).trim() : undefined,
        orderedQty: !isNaN(ordQty) ? ordQty : undefined,
        actualQty: !isNaN(actQty) && actQty > 0 ? actQty : undefined,
        unit: r[wColUnit] ? String(r[wColUnit]).trim() : undefined,
        actualPrice: !isNaN(actPrice) && actPrice > 0 ? actPrice : undefined,
        subtotal: !isNaN(subtotal) && subtotal > 0 ? subtotal : undefined,
        processingNote: r[wColProcessing] ? String(r[wColProcessing]).trim() : undefined,
        isWeighed,
        itemNote: r[wColItemNote] ? String(r[wColItemNote]).trim() : undefined,
      });
    }
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
    const colStatus = findColIndex(bHeaders, ['trạng thái đợt', 'trạng thái', 'tình trạng'], 4);
    const colWorkflow = findColIndex(bHeaders, ['tiến trình luồng xử lý', 'tiến trình', 'luồng xử lý', 'bước'], 5);
    const colOrigin = findColIndex(bHeaders, ['nguồn', 'quê', 'nhà cung cấp', 'vùng'], 8);
    const colNotes = findColIndex(bHeaders, ['ghi chú', 'notes'], bHeaders.length - 1);

    const existingBatches = storage.getBatches();

    for (let i = 1; i < batchesRows.length; i++) {
      const r = batchesRows[i];
      if (!r || r.length === 0) continue;
      const rawCode = String(r[colCode] || '').trim();
      const rawName = String(r[colName] || '').trim();

      if (!rawCode && !rawName) continue;

      const batchCode = rawCode || `DOT-${String(i).padStart(3, '0')}`;
      const batchName = rawName || `Đợt Gom Hải Sản #${i}`;

      // Check existing batch for seamless ID matching
      const existingMatch = existingBatches.find(
        (eb) =>
          eb.batch_code.trim().toLowerCase() === batchCode.toLowerCase() ||
          eb.batch_name.trim().toLowerCase() === batchName.toLowerCase() ||
          eb.batch_id.trim().toLowerCase() === rawCode.toLowerCase()
      );

      const batchId = existingMatch ? existingMatch.batch_id : (rawCode.startsWith('BATCH-') ? rawCode : `BATCH-${batchCode}`);
      const batchDate = r[colDate] ? String(r[colDate]).trim() : (existingMatch?.batch_date || new Date().toISOString().slice(0, 10));
      const deliveryDate = r[colDelivery] ? String(r[colDelivery]).trim() : (existingMatch?.delivery_date || batchDate);

      // Status mapping - Comprehensive checks on both Status column and Workflow Step column
      const rawStatus = String(r[colStatus] || '').toLowerCase().trim();
      const rawWorkflow = colWorkflow !== -1 ? String(r[colWorkflow] || '').toLowerCase().trim() : '';
      const combinedStatus = `${rawStatus} ${rawWorkflow}`;

      let status: Batch['status'] = 'COLLECTING';

      if (combinedStatus.includes('hủy') || combinedStatus.includes('cancel')) {
        status = 'CANCELLED';
      } else if (
        combinedStatus.includes('bước 7') ||
        combinedStatus.includes('7/7') ||
        combinedStatus.includes('hoàn tất') ||
        combinedStatus.includes('hoàn thành') ||
        combinedStatus.includes('completed')
      ) {
        status = 'COMPLETED';
      } else if (
        combinedStatus.includes('bước 6') ||
        combinedStatus.includes('6/7') ||
        combinedStatus.includes('đi giao') ||
        combinedStatus.includes('giao tận phòng') ||
        combinedStatus.includes('đang giao') ||
        combinedStatus.includes('delivering') ||
        combinedStatus.includes('đang ship')
      ) {
        status = 'DELIVERING';
      } else if (
        combinedStatus.includes('bước 5') ||
        combinedStatus.includes('5/7') ||
        combinedStatus.includes('cân chia') ||
        combinedStatus.includes('đóng túi') ||
        combinedStatus.includes('đóng gói') ||
        combinedStatus.includes('distributing') ||
        combinedStatus.includes('chia hàng')
      ) {
        status = 'DISTRIBUTING';
      } else if (
        combinedStatus.includes('bước 4') ||
        combinedStatus.includes('4/7') ||
        combinedStatus.includes('đã về') ||
        combinedStatus.includes('nhận hải sản') ||
        combinedStatus.includes('nhận hàng') ||
        combinedStatus.includes('về chung cư') ||
        combinedStatus.includes('received')
      ) {
        status = 'RECEIVED';
      } else if (
        combinedStatus.includes('bước 3') ||
        combinedStatus.includes('3/7') ||
        combinedStatus.includes('đặt hàng quê') ||
        combinedStatus.includes('đặt quê') ||
        combinedStatus.includes('đóng thùng') ||
        combinedStatus.includes('ordered') ||
        combinedStatus.includes('đã đặt')
      ) {
        status = 'ORDERED';
      } else if (
        combinedStatus.includes('bước 2') ||
        combinedStatus.includes('2/7') ||
        combinedStatus.includes('chốt đợt') ||
        combinedStatus.includes('chốt số lượng') ||
        combinedStatus.includes('đã chốt') ||
        combinedStatus.includes('confirmed')
      ) {
        status = 'CONFIRMED';
      } else {
        status = 'COLLECTING';
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
      const total = parseVietnameseCurrency(r[colTotal]);
      const paid = parseVietnameseCurrency(r[colPaid]);
      const debt = r[colDebt] ? parseVietnameseCurrency(r[colDebt]) : Math.max(0, total - paid);
      const rawOrderStatus = String(r[colOrderStatus] || '').toLowerCase().trim();
      const rawDeliveryStatus = String(r[colDeliveryStatus] || '').toLowerCase().trim();
      const paymentMethod = String(r[colPaymentMethod] || 'QR').trim();
      const note = r[colNote] ? String(r[colNote]).trim() : '';
      const createdAt = r[colCreatedAt] ? String(r[colCreatedAt]).trim() : new Date().toISOString();

      // Find matching batch
      const matchedBatch = restoredBatches.find(
        (b) =>
          b.batch_code.toLowerCase() === rawBatch.toLowerCase() ||
          b.batch_name.toLowerCase() === rawBatch.toLowerCase() ||
          b.batch_id.toLowerCase() === rawBatch.toLowerCase()
      ) || restoredBatches[0];

      // Parse items & augment from Tab 5 weighing map if available
      const parsedItems = (itemsSummaryStr ? itemsSummaryStr.split(';') : []).map((seg: string, idx: number) => {
        const clean = seg.trim();
        const parts = clean.split(':');
        const pName = parts[0]?.trim() || 'Hải sản tươi';
        const qtyMatch = parts[1]?.match(/([\d.]+)\s*(\w+)?/);
        const parsedQty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
        const parsedUnit = (qtyMatch && qtyMatch[2] ? qtyMatch[2] : 'kg') as any;

        // Check if there is extra info in Tab 5
        const weighKey = `${effectiveOrderCode.toLowerCase()}___${pName.toLowerCase()}`;
        const weighInfo = weighedItemsMap.get(weighKey);

        const qtyOrdered = weighInfo?.orderedQty ?? parsedQty;
        const qtyActual = weighInfo?.actualQty ?? parsedQty;
        const unit = weighInfo?.unit || parsedUnit;
        const estPrice = total > 0 ? Math.round(total / (itemsSummaryStr.split(';').length || 1)) : 0;
        const actPrice = weighInfo?.actualPrice ?? estPrice;
        const itemSubtotal = weighInfo?.subtotal ?? (qtyActual * actPrice);

        return {
          order_item_id: `ITEM-${effectiveOrderCode}-${idx + 1}`,
          order_id: `ORD-${effectiveOrderCode}`,
          product_id: `PROD-${idx + 1}`,
          product_name: pName,
          size: weighInfo?.size || '',
          quantity_ordered: qtyOrdered,
          quantity_actual: qtyActual,
          unit,
          estimated_price: estPrice,
          actual_price: actPrice,
          subtotal: itemSubtotal || total,
          processing_note: weighInfo?.processingNote || '',
          item_note: weighInfo?.itemNote || '',
          status: weighInfo?.isWeighed ? ('WEIGHED' as const) : ('PACKED' as const),
        };
      });

      // Order status resolution
      let status: Order['status'] = 'CONFIRMED';
      let delivery_status: Order['delivery_status'] = 'PENDING';
      let is_packed = false;
      let is_weighed = false;

      if (rawOrderStatus.includes('hủy') || rawOrderStatus.includes('cancel')) {
        status = 'CANCELLED';
      } else if (
        rawDeliveryStatus.includes('đã giao') ||
        rawDeliveryStatus.includes('giao xong') ||
        rawDeliveryStatus.includes('delivered') ||
        rawOrderStatus.includes('đã giao') ||
        rawOrderStatus.includes('hoàn thành')
      ) {
        status = 'DELIVERED';
        delivery_status = 'DELIVERED';
        is_packed = true;
        is_weighed = true;
      } else if (
        rawDeliveryStatus.includes('đang ship') ||
        rawDeliveryStatus.includes('đang giao') ||
        rawDeliveryStatus.includes('delivering') ||
        rawDeliveryStatus.includes('đi giao') ||
        rawOrderStatus.includes('đang giao') ||
        rawOrderStatus.includes('delivering')
      ) {
        status = 'DELIVERING';
        delivery_status = 'DELIVERING';
        is_packed = true;
        is_weighed = true;
      } else if (
        rawOrderStatus.includes('đóng túi') ||
        rawOrderStatus.includes('đóng gói') ||
        rawOrderStatus.includes('packed')
      ) {
        status = 'PACKED';
        delivery_status = 'PENDING';
        is_packed = true;
        is_weighed = true;
      } else if (rawOrderStatus.includes('nhận') || rawOrderStatus.includes('received')) {
        status = 'RECEIVED';
        delivery_status = 'PENDING';
      } else if (rawOrderStatus.includes('đặt') || rawOrderStatus.includes('quê') || rawOrderStatus.includes('ordered')) {
        status = 'ORDERED';
        delivery_status = 'PENDING';
      } else if (rawOrderStatus.includes('chốt') || rawOrderStatus.includes('confirmed')) {
        status = 'CONFIRMED';
        delivery_status = 'PENDING';
      } else {
        status = 'COLLECTING';
        delivery_status = 'PENDING';
      }

      // Check if batch is in advanced stages
      if (matchedBatch) {
        if (matchedBatch.status === 'COMPLETED' && status !== 'CANCELLED') {
          status = 'DELIVERED';
          delivery_status = 'DELIVERED';
          is_packed = true;
          is_weighed = true;
        } else if (matchedBatch.status === 'DELIVERING' && status !== 'CANCELLED') {
          if (delivery_status === 'PENDING') {
            delivery_status = 'DELIVERING';
            status = 'DELIVERING';
          }
          is_packed = true;
          is_weighed = true;
        } else if (matchedBatch.status === 'DISTRIBUTING' && status !== 'CANCELLED') {
          if (status === 'COLLECTING' || status === 'CONFIRMED' || status === 'ORDERED' || status === 'RECEIVED') {
            status = 'PACKED';
          }
          is_packed = true;
          is_weighed = true;
        }
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
        is_weighed,
        is_packed,
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

    const seenProductNames = new Set<string>();
    const seenProductIds = new Set<string>();

    for (let i = 1; i < productsRows.length; i++) {
      const r = productsRows[i];
      if (!r || r.length === 0) continue;
      const sku = String(r[colSku] || '').trim();
      const pName = String(r[colPName] || '').trim();
      if (!sku && !pName) continue;

      const normName = (pName || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (normName && seenProductNames.has(normName)) {
        // Skip duplicate product names on Google Sheets
        continue;
      }
      if (normName) {
        seenProductNames.add(normName);
      }

      const effectiveSku = sku || `SKU-${String(i).padStart(3, '0')}`;
      let uniqueProdId = `PROD-${effectiveSku}`;
      if (seenProductIds.has(uniqueProdId)) {
        uniqueProdId = `${uniqueProdId}-${i}`;
      }
      seenProductIds.add(uniqueProdId);

      restoredProducts.push({
        product_id: uniqueProdId,
        sku: effectiveSku,
        product_name: pName || 'Hải Sản Tươi',
        category: r[colCategory] ? String(r[colCategory]).trim() : 'Hải sản',
        size: r[colSize] ? String(r[colSize]).trim() : '',
        origin: r[colOrigin] ? String(r[colOrigin]).trim() : '',
        unit: (r[colUnit] ? String(r[colUnit]).trim() : 'kg') as any,
        default_price: parseVietnameseCurrency(r[colPrice]),
        status: String(r[colStatus] || '').includes('ngưng') ? 'INACTIVE' : 'ACTIVE',
        description: r[colDesc] ? String(r[colDesc]).trim() : '',
      });
    }
  }

  // ----------------------------------------------------
  // PERSIST RESTORED DATA TO STORAGE
  // ----------------------------------------------------
  const hasOrdersTab = sheetList.some((s) => {
    const t = s.title.toLowerCase();
    return t.includes('đơn hàng') || t.includes('orders') || t.includes('đơn');
  });
  const hasBatchesTab = sheetList.some((s) => {
    const t = s.title.toLowerCase();
    return t.includes('đợt gom') || t.includes('batches') || t.includes('đợt hàng');
  });
  const hasCustomersTab = sheetList.some((s) => {
    const t = s.title.toLowerCase();
    return t.includes('cư dân') || t.includes('customers') || t.includes('danh bạ');
  });
  const hasProductsTab = sheetList.some((s) => {
    const t = s.title.toLowerCase();
    return t.includes('hải sản') || t.includes('products') || t.includes('danh mục');
  });

  if (restoredProducts.length > 0) {
    storage.saveProducts(restoredProducts);

    // Harvest and merge unique categories and units from restored products on Google Sheets
    const prodCats = restoredProducts.map((p) => (p.category || '').trim()).filter(Boolean);
    const prodUnits = restoredProducts.map((p) => (p.unit || '').trim()).filter(Boolean);
    if (prodCats.length > 0) {
      const mergedCats = Array.from(new Set([...storage.getCategories(), ...prodCats]));
      storage.saveCategories(mergedCats);
    }
    if (prodUnits.length > 0) {
      const mergedUnits = Array.from(new Set([...storage.getUnits(), ...prodUnits]));
      storage.saveUnits(mergedUnits);
    }
  } else if (hasProductsTab && productsRows.length <= 1) {
    // If sheet tab is present but explicitly empty, keep existing to prevent accidental total wipe
    console.info('[Google Sheets] Products tab empty on sheets, keeping current products catalog.');
  }

  if (restoredCustomers.length > 0) {
    storage.saveCustomers(restoredCustomers);
  }

  if (hasBatchesTab) {
    if (restoredBatches.length > 0) {
      storage.saveBatches(restoredBatches);
      storage.setCurrentBatchId(restoredBatches[0].batch_id);
    } else if (restoredOrders.length > 0) {
      // If batch tab had no rows but orders exist, create default batch for them
      const autoBatch: Batch = {
        batch_id: 'BATCH-001',
        batch_code: 'DOT-001',
        batch_name: 'Đợt Gom Hàng #1',
        batch_date: new Date().toISOString().slice(0, 10),
        delivery_date: new Date().toISOString().slice(0, 10),
        status: 'COLLECTING',
        supplier_info: { location: 'Quảng Ninh & Cà Mau' },
        notes: 'Đợt tạo tự động khi nạp đơn hàng từ Google Sheets',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      storage.saveBatches([autoBatch]);
      storage.setCurrentBatchId(autoBatch.batch_id);
    } else {
      // Both batches and orders on sheets are empty: user deleted batch on sheets!
      storage.saveBatches([]);
      storage.setCurrentBatchId(null);
    }
  }

  if (hasOrdersTab) {
    storage.saveOrders(restoredOrders);
  }

  // Always self-heal local storage after restore to ensure pristine format & valid references
  storage.sanitizeAndHealAllData();

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

// 7. CLEAN SLATE PULL: Completely wipe local operational cache and pull 100% fresh mirror from Google Sheets
export async function cleanPullAndRestoreFromGoogleSheets(spreadsheetId: string): Promise<RestoreStats> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Chưa cung cấp ID hoặc liên kết tệp Google Sheets hợp lệ để nạp dữ liệu. Vui lòng kiểm tra lại link Google Sheets.');
  }

  // 1. Create a safe backup snapshot of existing data BEFORE wiping anything
  try {
    storage.createSnapshot(
      'BEFORE_CLEAR_LOCAL' as any,
      'Tự động sao lưu an toàn trước khi dọn sạch dữ liệu để kéo từ Google Sheets'
    );
  } catch (snapErr) {
    console.warn('Không thể tạo bản sao lưu trước khi dọn local:', snapErr);
  }

  // 2. Pre-flight check: Verify that Google Sheet metadata can be fetched BEFORE clearing local data!
  // This guarantees that if the spreadsheet ID is invalid, 404, or unauthenticated, local data is NOT wiped by mistake!
  await fetchSheetsApi(`/${cleanId}?fields=sheets(properties(sheetId,title))`);

  // 3. Clear operational data locally now that we confirmed sheet is reachable
  storage.clearOperationalDataForFreshSync();

  // 4. Pull all sheets data fresh from Google Sheets
  const stats = await pullAndRestoreFromGoogleSheets(cleanId);

  return stats;
}

// 7. Direct Settings Export & Import helpers
export async function exportSettingsToGoogleSheets(
  spreadsheetId: string,
  settings: StoreSettings
): Promise<boolean> {
  await ensureSheetTabsExist(spreadsheetId);
  const prepared = prepareSheetData([], [], [], [], settings);
  const settingsData = prepared[SHEET_NAMES.SETTINGS];

  // 1. Clear old data from settings tab
  try {
    await fetchSheetsApi(`/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      body: JSON.stringify({ ranges: [`'${SHEET_NAMES.SETTINGS}'!A1:C100`] }),
    });
  } catch (err: any) {
    console.warn('Clear settings sheet warning:', err?.message);
  }

  // 2. Write new formatted settings data with exact range A1:C{rows}
  const allValues = [settingsData.header, ...settingsData.rows];
  await fetchSheetsApi(`/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${SHEET_NAMES.SETTINGS}'!A1:C${allValues.length}`,
          values: allValues,
        },
      ],
    }),
  });

  return true;
}
