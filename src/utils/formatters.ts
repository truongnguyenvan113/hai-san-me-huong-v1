import { BatchStatus, OrderStatus, PaymentStatus, DeliveryStatus } from '../types';

export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatShortCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
  if (amount >= 1000000) {
    const m = (amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 2);
    return `${m}m`;
  }
  if (amount >= 1000) {
    const k = (amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1);
    return `${k}k`;
  }
  return `${amount}đ`;
};

export const formatQuantity = (qty: number | undefined | null, unit: string = 'kg'): string => {
  if (qty === undefined || qty === null || isNaN(qty)) return `0 ${unit}`;
  // If integer or clean decimal
  const formattedNumber = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');
  return `${formattedNumber} ${unit}`;
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

// Batch status configuration
export const BATCH_STATUS_CONFIG: Record<
  BatchStatus,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  OPEN: {
    label: 'Đang mở',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    desc: 'Bắt đầu nhận đơn cư dân',
  },
  COLLECTING: {
    label: 'Đang gom đơn',
    bg: 'bg-yellow-100',
    text: 'text-yellow-900',
    border: 'border-yellow-300',
    desc: 'Đang nhận và gom số lượng',
  },
  CONFIRMED: {
    label: 'Đã chốt đơn',
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-300',
    desc: 'Khóa đơn, tổng hợp gửi quê',
  },
  ORDERED: {
    label: 'Đã đặt quê',
    bg: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-300',
    desc: 'Người ở quê đang đóng hàng chuyển lên',
  },
  RECEIVED: {
    label: 'Đã nhận hàng',
    bg: 'bg-teal-100',
    text: 'text-teal-900',
    border: 'border-teal-300',
    desc: 'Hàng đã về đến sảnh chung cư',
  },
  DISTRIBUTING: {
    label: 'Đang chia hàng',
    bg: 'bg-orange-100',
    text: 'text-orange-900',
    border: 'border-orange-300',
    desc: 'Cân thực tế, sơ chế, đóng túi từng phòng',
  },
  DELIVERING: {
    label: 'Đang giao tận phòng',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300',
    desc: 'Đang bấm chuông giao từng căn hộ',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    desc: 'Đã giao xong & quyết toán đủ',
  },
  CANCELLED: {
    label: 'Đã hủy đợt',
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    desc: 'Hủy đợt gom hàng',
  },
};

// Order status configuration
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  COLLECTING: {
    label: 'Đang gom',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
  },
  CONFIRMED: {
    label: 'Đã chốt',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  ORDERED: {
    label: 'Đã đặt quê',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  RECEIVED: {
    label: 'Đã nhận hàng',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
  },
  PACKED: {
    label: 'Đã cân & đóng gói',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
  },
  DELIVERING: {
    label: 'Đang giao',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
  },
  DELIVERED: {
    label: 'Đã giao phòng',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
};

// Payment status configuration
export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  UNPAID: {
    label: 'Chưa thanh toán',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  PARTIAL: {
    label: 'Đã cọc một phần',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  PAID: {
    label: 'Đã thanh toán đủ',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  DEBT: {
    label: 'Ghi nợ cư dân',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
};

// Helper to format VietQR transfer memo as requested: "Căn [Phòng] thanh toán tiền hải sản"
export const formatVietQRMemo = (room: string = '', building: string = ''): string => {
  let cleanRoom = (room || '').trim();
  // Strip leading P., P, Phòng, Phong, Căn, Can
  cleanRoom = cleanRoom.replace(/^(P|Phòng|Phong|Căn|Can)\.?\s*/i, '').trim();

  // If cleanRoom is purely digits (e.g. "1707") and building specifies a tower (e.g. "Tòa B", "B", "Block B", "Tháp B")
  if (/^\d+$/.test(cleanRoom) && building) {
    const towerMatch = building.match(/(?:Tòa|Toà|Block|Tháp)?\s*([A-Za-z0-9]+)$/i);
    if (towerMatch && towerMatch[1]) {
      const towerCode = towerMatch[1].toUpperCase();
      if (!cleanRoom.toUpperCase().endsWith(towerCode)) {
        cleanRoom = `${cleanRoom}${towerCode}`;
      }
    }
  }

  // Ensure any letter suffix in room is uppercase (e.g. 1707b -> 1707B, 1203a -> 1203A)
  cleanRoom = cleanRoom.replace(/(\d+)\s*([a-zA-Z]+)$/, (_, num, letter) => `${num}${letter.toUpperCase()}`);

  return cleanRoom ? `Căn ${cleanRoom} thanh toán tiền hải sản` : 'Thanh toán tiền hải sản';
};

// Generate VietQR Quick Link
export const getVietQRUrl = (
  bankName: string = 'Vietcombank',
  accountNumber: string = '',
  accountName: string = '',
  amount: number = 0,
  description: string = ''
): string => {
  if (!accountNumber) return '';
  const bankBinMap: Record<string, string> = {
    vietcombank: '970436',
    vcb: '970436',
    techcombank: '970407',
    tcb: '970407',
    mbbank: '970422',
    mb: '970422',
    vietinbank: '970415',
    bidv: '970418',
    acb: '970416',
    tpbank: '970423',
    vpbank: '970432',
    vib: '970441',
    sacombank: '970403',
  };

  const cleanBank = (bankName || '').toLowerCase().replace(/[\s\-_]+/g, '');
  const bin = bankBinMap[cleanBank] || '970436'; // default VCB
  const encodedDesc = encodeURIComponent(description || '');
  const encodedAccName = encodeURIComponent(accountName || '');

  return `https://img.vietqr.io/image/${bin}-${accountNumber}-compact.png?amount=${Math.round(
    amount || 0
  )}&addInfo=${encodedDesc}&accountName=${encodedAccName}`;
};
