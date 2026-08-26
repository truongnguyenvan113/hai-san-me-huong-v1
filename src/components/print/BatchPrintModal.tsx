import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { A4OrderInvoice } from './A4OrderInvoice';
import { Printer, X, ExternalLink, CheckCircle2, QrCode, CreditCard, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { printElement, openPrintTab } from '../../utils/printHelper';
import { getBankByCodeOrName } from '../../utils/banks';

export const BatchPrintModal: React.FC = () => {
  const { printModalConfig, setPrintModalConfig, orders, settings, getBatchById, getOrderById } = useApp();

  const [printBankChoice, setPrintBankChoice] = useState<'BANK_1' | 'BANK_2'>(() => {
    return settings.active_bank_account || 'BANK_1';
  });
  const [printQrSize, setPrintQrSize] = useState<'large' | 'medium' | 'none'>(() => {
    return (settings.qr_size as any) || 'large';
  });

  // Keep state synchronized if settings change
  useEffect(() => {
    if (settings.active_bank_account) {
      setPrintBankChoice(settings.active_bank_account);
    }
    if (settings.qr_size) {
      setPrintQrSize((settings.qr_size as any) || 'large');
    }
  }, [settings.active_bank_account, settings.qr_size]);

  // Keyboard shortcut listener: Cmd+P (Mac) or Ctrl+P (Windows) to trigger clean print immediately, Escape to close
  useEffect(() => {
    if (!printModalConfig.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [printModalConfig.isOpen]);

  if (!printModalConfig.isOpen) return null;

  const handleClose = () => {
    setPrintModalConfig({ ...printModalConfig, isOpen: false });
  };

  const handlePrint = () => {
    printElement('printable-content');
  };

  const handleOpenNewTab = () => {
    openPrintTab('printable-content');
  };

  let printableOrders = [];
  const currentBatch = printModalConfig.batchId ? getBatchById(printModalConfig.batchId) : null;

  if (printModalConfig.mode === 'SINGLE_ORDER' && printModalConfig.orderId) {
    const single = getOrderById(printModalConfig.orderId);
    if (single) printableOrders.push(single);
  } else if (printModalConfig.batchId) {
    printableOrders = orders
      .filter((o) => o.batch_id === printModalConfig.batchId && o.status !== 'CANCELLED')
      .sort((a, b) => {
        // Sort by Building then Room for efficient delivery order
        if (a.customer_building !== b.customer_building) {
          return a.customer_building.localeCompare(b.customer_building);
        }
        return a.customer_room.localeCompare(b.customer_room, undefined, { numeric: true });
      });
  }

  const bank1Obj = getBankByCodeOrName(settings.bank_name || 'ABBANK');
  const bank2Obj = getBankByCodeOrName(settings.bank_name_2 || 'BIDV');

  return (
    <div
      id="batch-print-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex flex-col items-center p-2 sm:p-6 print:p-0 print:bg-white print:static"
    >
      {/* Top action bar - HIDDEN WHEN PRINTING */}
      <div className="w-full max-w-4xl bg-white rounded-2xl p-4 mb-4 shadow-xl border border-slate-200 flex flex-col gap-3 print:hidden sticky top-2 z-10 print-hide">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-700" />
                {printModalConfig.mode === 'SINGLE_ORDER' && 'Xem & In Phiếu Đơn Hàng (Khổ A4 dán túi)'}
                {printModalConfig.mode === 'BATCH_ORDERS' && `In Hàng Loạt Tất Cả Phiếu Đợt (${printableOrders.length} Đơn)`}
                {printModalConfig.mode === 'DELIVERY_LIST' && `Bảng Kê Giao Hàng Tận Phòng (${printableOrders.length} Phòng)`}
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Hỗ trợ macOS & Windows
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {printModalConfig.mode === 'DELIVERY_LIST'
                ? 'Danh sách tổng hợp các phòng cần giao theo thứ tự Tòa & Tầng'
                : 'Bố cục 6 đơn/trang A4 kèm VietQR to nổi bật, sắc nét và đường kéo cắt ✂️ dán bao bì.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Print Button */}
            <button
              id="modal-print-trigger-btn"
              onClick={handlePrint}
              title="Lệnh in trực tiếp tới máy in trên máy tính (Cmd+P hoặc Ctrl+P)"
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Bấm In Ngay (Cmd/Ctrl + P)
            </button>

            {/* Open In New Tab Alternative */}
            <button
              id="modal-open-newtab-btn"
              onClick={handleOpenNewTab}
              title="Mở sang tab trình duyệt riêng để xem trước toàn màn hình hoặc lưu file PDF"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all text-xs cursor-pointer border border-slate-300"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Tab riêng / Lưu PDF
            </button>

            <button
              id="close-print-modal-btn"
              onClick={handleClose}
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ in (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINT CONTROLS: CHỌN TÀI KHOẢN NGÂN HÀNG & KÍCH THƯỚC QR */}
        {printModalConfig.mode !== 'DELIVERY_LIST' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            {/* 1. Chọn Ngân Hàng In QR */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-teal-700" /> Tài khoản nhận trên QR:
              </span>
              <div className="inline-flex rounded-lg shadow-2xs bg-white p-0.5 border border-slate-300">
                <button
                  type="button"
                  onClick={() => setPrintBankChoice('BANK_1')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all ${
                    printBankChoice === 'BANK_1'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  NH 1: {bank1Obj.shortName} ({settings.bank_account || 'Chưa nhập'})
                </button>
                {settings.bank_account_2 && (
                  <button
                    type="button"
                    onClick={() => setPrintBankChoice('BANK_2')}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all ${
                      printBankChoice === 'BANK_2'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    NH 2: {bank2Obj.shortName} ({settings.bank_account_2})
                  </button>
                )}
              </div>
            </div>

            {/* 2. Chọn kích thước QR */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-teal-700" /> Kích thước VietQR:
              </span>
              <select
                value={printQrSize}
                onChange={(e) => setPrintQrSize(e.target.value as any)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs shadow-2xs focus:ring-1 focus:ring-teal-700 cursor-pointer"
              >
                <option value="large">Mã To Nổi Bật (Dễ quét nhất ⭐)</option>
                <option value="medium">Mã Vừa</option>
                <option value="none">Không in QR (Chỉ chữ)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Printable Content Area */}
      <div
        id="printable-content"
        className="w-full max-w-4xl space-y-8 print:space-y-0 print:w-full print:max-w-none bg-white"
      >
        {/* MODE 1 & 2: A4 STICKER INVOICES (2 COLS x 3 ROWS = 6 ORDERS PER A4 PAGE) */}
        {(printModalConfig.mode === 'SINGLE_ORDER' || printModalConfig.mode === 'BATCH_ORDERS') && (
          <div className="space-y-8 print:space-y-0">
            {Array.from({ length: Math.ceil(printableOrders.length / 6) || 1 }).map((_, pageIdx) => {
              const pageOrders = printableOrders.slice(pageIdx * 6, pageIdx * 6 + 6);

              return (
                <div
                  key={`print-page-${pageIdx}`}
                  className="bg-white rounded-2xl border border-slate-300 print:border-none shadow-xl print:shadow-none p-3 sm:p-4 print:p-0 print:w-full print:h-[285mm] print:max-h-[285mm] print:overflow-hidden print:page-break-after-always print:break-after-page"
                  style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                >
                  {/* Page cut frame (2 cols x 3 rows with bold dashed lines) */}
                  <div className="grid grid-cols-2 grid-rows-3 h-full gap-0 border-2 border-dashed border-slate-500 rounded-lg overflow-hidden bg-white">
                    {pageOrders.map((order, cellIdx) => {
                      const isLeftCol = cellIdx % 2 === 0;
                      const isBottomRow = cellIdx >= 4;

                      return (
                        <div
                          key={order.order_id}
                          className={`relative p-2 flex flex-col justify-between ${
                            isLeftCol ? 'border-r-2 border-dashed border-slate-500' : ''
                          } ${
                            !isBottomRow ? 'border-b-2 border-dashed border-slate-500' : ''
                          }`}
                          style={{ minHeight: '90mm' }}
                        >
                          {/* Cut Guide Marker */}
                          <div className="absolute -top-2 left-2 z-10 text-[9px] text-slate-500 bg-white px-1 pointer-events-none font-mono flex items-center gap-0.5 select-none print:flex">
                            <span>✂️</span>
                            <span className="text-[8px] text-slate-400">cắt</span>
                          </div>

                          <A4OrderInvoice
                            order={order}
                            settings={settings}
                            selectedBank={printBankChoice}
                            qrSize={printQrSize}
                          />
                        </div>
                      );
                    })}

                    {/* Fill remaining empty cells up to 6 so grid cut lines remain intact on the last page */}
                    {Array.from({ length: Math.max(0, 6 - pageOrders.length) }).map((_, emptyIdx) => {
                      const cellIdx = pageOrders.length + emptyIdx;
                      const isLeftCol = cellIdx % 2 === 0;
                      const isBottomRow = cellIdx >= 4;

                      return (
                        <div
                          key={`empty-cell-${emptyIdx}`}
                          className={`relative p-2 flex items-center justify-center text-slate-300 text-xs italic ${
                            isLeftCol ? 'border-r-2 border-dashed border-slate-500' : ''
                          } ${
                            !isBottomRow ? 'border-b-2 border-dashed border-slate-500' : ''
                          }`}
                          style={{ minHeight: '90mm' }}
                        >
                          <span className="text-[10px] text-slate-300 select-none print:hidden">
                            Ô trống cắt A4
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 3: DELIVERY SUMMARY SHEET */}
        {printModalConfig.mode === 'DELIVERY_LIST' && (
          <div
            id="print-delivery-sheet-container"
            className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-4 text-slate-900"
          >
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
              <div className="text-xs font-black uppercase text-teal-800 tracking-widest">{settings.store_name}</div>
              <h1 className="text-2xl font-black text-slate-900 uppercase my-1">
                BẢNG KÊ GIAO HẢI SẢN TẬN PHÒNG CHUNG CƯ
              </h1>
              <div className="text-sm font-medium text-slate-600">
                Đợt gom: <span className="font-bold text-slate-900">{currentBatch?.batch_name}</span> | Ngày giao:{' '}
                <span className="font-bold text-slate-900">{formatDate(currentBatch?.delivery_date)}</span>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-100 font-bold text-slate-900">
                  <th className="py-2.5 px-2 text-center w-10">STT</th>
                  <th className="py-2.5 px-3">Tòa & Phòng</th>
                  <th className="py-2.5 px-3">Khách hàng & SĐT</th>
                  <th className="py-2.5 px-3">Chi tiết hàng đặt</th>
                  <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                  <th className="py-2.5 px-3 text-right">Cần thu (COD)</th>
                  <th className="py-2.5 px-3 text-center">Hình thức</th>
                  <th className="py-2.5 px-2 text-center w-16">Ký nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {printableOrders.map((order, index) => {
                  const itemsSummary = order.items
                    .map((it) => `${it.product_name} (${it.quantity_actual ?? it.quantity_ordered}${it.unit})`)
                    .join(', ');

                  return (
                    <tr key={order.order_id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 text-center font-bold text-slate-500">{index + 1}</td>
                      <td className="py-3 px-3 font-black text-slate-900 text-sm whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-300">
                          {order.customer_building} - P.{order.customer_room}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{order.customer_name}</div>
                        <div className="text-xs text-slate-600 font-mono">{order.customer_phone}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-700 max-w-xs">
                        <div className="line-clamp-2">{itemsSummary}</div>
                        {order.delivery_note && (
                          <div className="text-[11px] text-teal-800 font-medium italic mt-0.5">
                            * {order.delivery_note}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {order.debt_amount > 0 ? (
                          <span className="font-black text-rose-700 text-sm">
                            {formatCurrency(order.debt_amount)}
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded">
                            ĐÃ TRẢ ĐỦ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-xs">
                        <span className="font-medium text-slate-600">
                          {order.payment_method === 'QR' ? 'VietQR' : order.payment_method || 'COD'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="w-6 h-6 border-2 border-slate-400 rounded mx-auto"></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Total Row */}
            <div className="mt-6 pt-4 border-t-2 border-slate-900 flex flex-wrap justify-between items-center text-sm font-bold">
              <div>Tổng cộng: {printableOrders.length} đơn hàng</div>
              <div className="flex gap-6">
                <div>
                  Tổng doanh thu: {formatCurrency(printableOrders.reduce((sum, o) => sum + o.total, 0))}
                </div>
                <div className="text-rose-700 font-black">
                  Tổng tiền mặt/COD cần thu:{' '}
                  {formatCurrency(printableOrders.reduce((sum, o) => sum + o.debt_amount, 0))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
