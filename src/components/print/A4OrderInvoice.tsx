import React from 'react';
import { Order, StoreSettings } from '../../types';
import {
  formatCurrency,
  formatQuantity,
  formatDate,
  getVietQRUrl,
  formatVietQRMemo,
  getActiveBankAccountInfo,
} from '../../utils/formatters';
import { Phone, Sparkles, QrCode, CheckCircle2 } from 'lucide-react';

interface A4OrderInvoiceProps {
  order: Order;
  settings: StoreSettings;
  selectedBank?: 'BANK_1' | 'BANK_2';
  qrSize?: 'large' | 'medium' | 'compact' | 'none';
  showBankDetails?: boolean;
}

export const A4OrderInvoice: React.FC<A4OrderInvoiceProps> = ({
  order,
  settings,
  selectedBank,
  qrSize = settings.qr_size || 'large',
  showBankDetails = true,
}) => {
  const hotlineDisplay = settings.hotline || settings.phone || '0916988982 ( Đặng Thị Vân | GSB-1004 )';
  const qrTransferMemo = formatVietQRMemo(order.customer_room, order.customer_building);
  const isFullyPaid = order.payment_status === 'PAID' || order.debt_amount === 0;
  const remainingAmount = order.debt_amount > 0 ? order.debt_amount : (isFullyPaid ? 0 : order.total);

  const bankInfo = getActiveBankAccountInfo(settings, selectedBank);
  const showQR = settings.show_vietqr !== false && qrSize !== 'none' && !isFullyPaid && !!bankInfo.accountNumber;

  const qrUrl = showQR
    ? getVietQRUrl(
        bankInfo.bin,
        bankInfo.accountNumber,
        bankInfo.accountName,
        remainingAmount,
        qrTransferMemo,
        (settings.bank_qr_template as any) || 'compact2'
      )
    : null;

  // Determine QR dimensions
  const qrDimensionClass =
    qrSize === 'large'
      ? 'w-20 h-20 sm:w-22 sm:h-22'
      : qrSize === 'medium'
      ? 'w-16 h-16'
      : 'w-12 h-12';

  return (
    <div
      id={`print-order-card-${order.order_id}`}
      className="bg-white text-slate-900 mx-auto font-sans p-2 sm:p-2.5 print:p-2 border border-slate-700 rounded-lg shadow-2xs w-full h-full flex flex-col justify-between text-xs"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      {/* 1. HEADER: ROOM, ORDER CODE, CUSTOMER & STORE */}
      <div className="border-b border-slate-700 pb-1 mb-1">
        <div className="flex items-baseline justify-between gap-1">
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
            {order.customer_building ? `${order.customer_building} - ` : ''}P.{order.customer_room}
          </div>
          <div className="font-mono font-bold text-[10.5px] bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded border border-slate-400">
            #{order.order_code}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mt-0.5 text-slate-800 font-medium">
          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[170px]">
            {order.customer_name}
          </div>
          <div className="font-mono font-bold text-slate-900 flex items-center gap-1 text-[11px]">
            <Phone className="w-3 h-3 text-teal-700 inline shrink-0" />
            {order.customer_phone}
          </div>
        </div>

        {/* STORE & HOTLINE */}
        <div className="flex items-center justify-between text-[9.5px] text-slate-600 mt-0.5 pt-0.5 border-t border-slate-200">
          <div className="font-semibold text-teal-900 flex items-center gap-1 truncate max-w-[150px]">
            <Sparkles className="w-2.5 h-2.5 text-teal-700 shrink-0" />
            {settings.store_name}
          </div>
          <div className="font-medium text-slate-700 text-right truncate">
            Hotline: <span className="font-bold text-slate-900">{hotlineDisplay}</span>
          </div>
        </div>
      </div>

      {/* 2. ITEMS TABLE */}
      <div className="flex-1 my-0.5 overflow-hidden">
        <table className="w-full text-left border-collapse text-[10px] leading-tight">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-100 text-slate-900 font-bold">
              <th className="py-0.5 px-1 text-center w-3">#</th>
              <th className="py-0.5 px-1">Tên hải sản</th>
              <th className="py-0.5 px-1 text-center w-11">SL</th>
              <th className="py-0.5 px-1 text-right w-13">Đơn giá</th>
              <th className="py-0.5 px-1 text-right w-15">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.items.map((item, idx) => {
              const qty = item.quantity_actual ?? item.quantity_ordered;
              const unitPrice = item.actual_price ?? item.estimated_price;
              const lineTotal = item.subtotal || qty * unitPrice;

              return (
                <tr key={item.order_item_id || idx}>
                  <td className="py-0.5 px-1 text-center text-slate-400 font-mono text-[9px]">
                    {idx + 1}
                  </td>
                  <td className="py-0.5 px-1">
                    <div className="font-bold text-slate-900 truncate max-w-[130px]">
                      {item.product_name}
                    </div>
                    {item.size && (
                      <div className="text-[8.5px] text-slate-500">{item.size}</div>
                    )}
                    {item.processing_note && (
                      <div className="text-[8.5px] text-amber-800 font-medium truncate max-w-[130px]">
                        * Sơ chế: {item.processing_note}
                      </div>
                    )}
                  </td>
                  <td className="py-0.5 px-1 text-center font-bold text-slate-800 whitespace-nowrap text-[9.5px]">
                    {formatQuantity(qty, item.unit)}
                  </td>
                  <td className="py-0.5 px-1 text-right text-slate-600 whitespace-nowrap text-[9.5px]">
                    {formatCurrency(unitPrice)}
                  </td>
                  <td className="py-0.5 px-1 text-right font-bold text-slate-900 whitespace-nowrap text-[9.5px]">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. PROMINENT PAYMENT & VIETQR BOX */}
      <div className="pt-1 border-t-2 border-slate-700 mt-1">
        {showQR && qrUrl ? (
          <div className="flex items-center justify-between gap-1.5 bg-slate-50 p-1 rounded-md border border-slate-300">
            {/* Left: QR Image - Crisp, High-Contrast and Big */}
            <div className="shrink-0 flex flex-col items-center bg-white p-0.5 rounded border border-slate-400">
              <img
                src={qrUrl}
                alt="VietQR Code"
                className={`${qrDimensionClass} object-contain bg-white block`}
                style={{ imageRendering: 'pixelated' }}
                loading="eager"
              />
              <span className="text-[7.5px] font-black text-slate-800 uppercase tracking-tighter mt-0.5 flex items-center gap-0.5">
                <QrCode className="w-2 h-2 text-teal-800 inline" /> QUÉT VIETQR
              </span>
            </div>

            {/* Middle: Bank Transfer Info in Text (STK, Bank, Memo) */}
            <div className="flex-1 min-w-0 text-[8.5px] leading-tight text-slate-800 pr-1">
              <div className="font-extrabold text-teal-900 truncate">
                NH: {bankInfo.bankShortName}
              </div>
              <div className="font-mono font-black text-slate-900 text-[9.5px]">
                STK: {bankInfo.accountNumber}
              </div>
              <div className="text-[8px] text-slate-600 truncate">
                CTK: {bankInfo.accountName}
              </div>
              <div className="text-[8px] text-slate-900 font-semibold truncate bg-amber-50 px-1 py-0.2 rounded border border-amber-200 mt-0.5" title={qrTransferMemo}>
                ND: {qrTransferMemo}
              </div>
            </div>

            {/* Right: Total Amount */}
            <div className="text-right shrink-0 pl-1 border-l border-slate-200">
              <div className="text-[8px] text-slate-500 font-semibold uppercase">
                {order.debt_amount > 0 ? 'Cần thanh toán' : 'Tổng tiền'}
              </div>
              <div className="text-xs sm:text-sm font-black text-rose-700 leading-none mt-0.5">
                {formatCurrency(remainingAmount)}
              </div>
              {order.paid_amount > 0 && (
                <div className="text-[7.5px] text-emerald-700 font-bold mt-0.5">
                  Đã cọc: {formatCurrency(order.paid_amount)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 py-0.5">
            <div>
              {isFullyPaid ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 font-black text-[10px] px-2 py-0.5 rounded border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" /> ĐÃ THANH TOÁN ĐỦ
                </span>
              ) : (
                <div className="text-[9px] text-slate-500">
                  {order.batch_name ? `${order.batch_name}` : `Ngày: ${formatDate(order.delivery_date)}`}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-[8.5px] text-slate-500 font-medium">
                {order.debt_amount > 0 ? 'Còn nợ (COD)' : 'Tổng tiền'}
              </div>
              <div className={`text-sm sm:text-base font-black leading-none ${order.debt_amount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {formatCurrency(order.debt_amount > 0 ? order.debt_amount : order.total)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
