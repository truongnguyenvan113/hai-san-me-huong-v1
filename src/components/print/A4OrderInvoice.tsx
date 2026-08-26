import React from 'react';
import { Order, StoreSettings } from '../../types';
import { formatCurrency, formatQuantity, formatDate, getVietQRUrl, formatVietQRMemo } from '../../utils/formatters';
import { Phone, Sparkles } from 'lucide-react';

interface A4OrderInvoiceProps {
  order: Order;
  settings: StoreSettings;
  isCompactSticker?: boolean;
}

export const A4OrderInvoice: React.FC<A4OrderInvoiceProps> = ({
  order,
  settings,
}) => {
  const hotlineDisplay = settings.hotline || '0916988982 ( Đặng Thị Vân | GSB-1004 )';
  const qrTransferMemo = formatVietQRMemo(order.customer_room, order.customer_building);
  const remainingAmount = order.debt_amount > 0 ? order.debt_amount : (order.payment_status !== 'PAID' ? order.total : 0);

  const qrUrl =
    remainingAmount > 0 && settings.bank_account && settings.show_vietqr
      ? getVietQRUrl(
          settings.bank_name,
          settings.bank_account,
          settings.bank_account_name,
          remainingAmount,
          qrTransferMemo
        )
      : null;

  return (
    <div
      id={`print-order-card-${order.order_id}`}
      className="bg-white text-slate-900 mx-auto font-sans p-2.5 sm:p-3 print:p-2 border border-slate-700 rounded-lg shadow-2xs w-full h-full flex flex-col justify-between text-xs"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      {/* 1. COMPACT HEADER: ROOM & CUSTOMER */}
      <div className="border-b border-slate-700 pb-1.5 mb-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
            {order.customer_building ? `${order.customer_building} - ` : ''}P.{order.customer_room}
          </div>
          <div className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300">
            #{order.order_code}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mt-1 text-slate-800 font-medium">
          <div className="font-bold text-slate-900 text-sm truncate max-w-[170px]">
            {order.customer_name}
          </div>
          <div className="font-mono font-bold text-slate-900 flex items-center gap-1 text-xs">
            <Phone className="w-3 h-3 text-teal-700 inline" />
            {order.customer_phone}
          </div>
        </div>

        {/* STORE & HOTLINE */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-slate-200">
          <div className="font-semibold text-teal-900 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-700" />
            {settings.store_name}
          </div>
          <div className="font-medium text-slate-700">
            Hotline: <span className="font-bold text-slate-900">{hotlineDisplay}</span>
          </div>
        </div>
      </div>

      {/* 2. ITEMS TABLE (COMPACT, HIGH READABILITY) */}
      <div className="flex-1 my-0.5 overflow-hidden">
        <table className="w-full text-left border-collapse text-[10.5px] leading-tight">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-100 text-slate-900 font-bold">
              <th className="py-0.5 px-1 text-center w-4">#</th>
              <th className="py-0.5 px-1">Tên hải sản</th>
              <th className="py-0.5 px-1 text-center w-12">SL</th>
              <th className="py-0.5 px-1 text-right w-14">Đơn giá</th>
              <th className="py-0.5 px-1 text-right w-16">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.items.map((item, idx) => {
              const qty = item.quantity_actual ?? item.quantity_ordered;
              const unitPrice = item.actual_price ?? item.estimated_price;
              const lineTotal = item.subtotal || qty * unitPrice;

              return (
                <tr key={item.order_item_id || idx}>
                  <td className="py-0.5 px-1 text-center text-slate-400 font-mono text-[9.5px]">
                    {idx + 1}
                  </td>
                  <td className="py-0.5 px-1">
                    <div className="font-bold text-slate-900 truncate max-w-[130px]">
                      {item.product_name}
                    </div>
                    {item.size && (
                      <div className="text-[9.5px] text-slate-500">{item.size}</div>
                    )}
                    {item.processing_note && (
                      <div className="text-[9.5px] text-amber-800 font-medium truncate max-w-[130px]">
                        * Sơ chế: {item.processing_note}
                      </div>
                    )}
                  </td>
                  <td className="py-0.5 px-1 text-center font-bold text-slate-800 whitespace-nowrap text-[10px]">
                    {formatQuantity(qty, item.unit)}
                  </td>
                  <td className="py-0.5 px-1 text-right text-slate-600 whitespace-nowrap text-[10px]">
                    {formatCurrency(unitPrice)}
                  </td>
                  <td className="py-0.5 px-1 text-right font-bold text-slate-900 whitespace-nowrap text-[10px]">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. TOTAL & QR BAR */}
      <div className="pt-1.5 border-t border-slate-700 mt-1 flex items-center justify-between gap-2">
        {qrUrl ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src={qrUrl}
              alt="VietQR"
              className="w-8 h-8 object-contain rounded border border-slate-300 bg-white shrink-0"
            />
            <div className="text-[9px] leading-tight text-slate-600 min-w-0">
              <div className="font-bold text-slate-800">Quét VietQR</div>
              <div className="text-[8.5px] text-teal-800 font-semibold truncate max-w-[125px]" title={qrTransferMemo}>
                {qrTransferMemo}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500">
            {order.batch_name ? `${order.batch_name}` : `Ngày: ${formatDate(order.delivery_date)}`}
          </div>
        )}

        <div className="text-right shrink-0">
          <div className="text-[10px] text-slate-500 font-medium">Tổng thanh toán</div>
          <div className="text-sm sm:text-base font-black text-slate-900 leading-none">
            {formatCurrency(order.total)}
          </div>
        </div>
      </div>
    </div>
  );
};

