import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Truck,
  Building,
  Phone,
  CheckCircle2,
  Printer,
  DollarSign,
  Search,
  Filter,
  PackageCheck,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export const DeliveryView: React.FC = () => {
  const { orders, batches, currentBatch, updateOrder, addPayment, setPrintModalConfig } = useApp();

  const [selectedBatchFilter, setSelectedBatchFilter] = useState(
    currentBatch ? currentBatch.batch_id : 'ALL'
  );
  const [selectedBuilding, setSelectedBuilding] = useState('ALL');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('ALL');
  const [searchRoom, setSearchRoom] = useState('');

  // Collect unique buildings
  const buildings = Array.from(new Set(orders.map((o) => o.customer_building))).filter(Boolean);

  const filteredOrders = orders
    .filter((o) => {
      if (o.status === 'CANCELLED') return false;
      if (selectedBatchFilter !== 'ALL' && o.batch_id !== selectedBatchFilter) return false;
      if (selectedBuilding !== 'ALL' && o.customer_building !== selectedBuilding) return false;
      if (deliveryStatusFilter !== 'ALL' && o.delivery_status !== deliveryStatusFilter) return false;
      if (searchRoom.trim()) {
        const q = searchRoom.toLowerCase();
        if (
          !o.customer_room.toLowerCase().includes(q) &&
          !o.customer_name.toLowerCase().includes(q) &&
          !o.customer_phone.includes(q)
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by Building then Room number (natural sort)
      if (a.customer_building !== b.customer_building) {
        return a.customer_building.localeCompare(b.customer_building);
      }
      return a.customer_room.localeCompare(b.customer_room, undefined, { numeric: true });
    });

  // Mark as delivered & optionally collect money
  const handleMarkDelivered = (order: Order) => {
    updateOrder({
      ...order,
      delivery_status: 'DELIVERED',
      status: 'DELIVERED',
      delivered_at: new Date().toISOString(),
    });
  };

  const handleCollectAndDeliver = (order: Order) => {
    if (order.debt_amount > 0) {
      addPayment({
        transaction_id: `PAY-${Date.now()}`,
        order_id: order.order_id,
        order_code: order.order_code,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        amount: order.debt_amount,
        payment_method: 'CASH',
        note: `Thu COD tận cửa phòng ${order.customer_room}`,
        created_at: new Date().toISOString(),
      });
    }

    updateOrder({
      ...order,
      delivery_status: 'DELIVERED',
      status: 'DELIVERED',
      delivered_at: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-teal-800" /> Giao Hàng Tận Phòng Chung Cư
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Sắp xếp lộ trình giao hàng tối ưu theo từng Tòa nhà và Số tầng/phòng.
          </p>
        </div>

        <button
          id="print-delivery-sheet-action-btn"
          onClick={() => {
            setPrintModalConfig({
              isOpen: true,
              mode: 'DELIVERY_LIST',
              batchId: selectedBatchFilter !== 'ALL' ? selectedBatchFilter : currentBatch?.batch_id,
            });
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-xs sm:text-sm"
        >
          <Printer className="w-4 h-4 text-teal-400" /> In Bảng Kê Giao Hàng A4
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="delivery-search-input"
              type="text"
              placeholder="Tìm theo phòng (1205), tên, SĐT..."
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              id="delivery-batch-select"
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-medium"
            >
              <option value="ALL">Tất cả đợt hàng</option>
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              id="delivery-building-select"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700"
            >
              <option value="ALL">Tất cả tòa nhà</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              id="delivery-status-select"
              value={deliveryStatusFilter}
              onChange={(e) => setDeliveryStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chưa giao</option>
              <option value="DELIVERED">Đã giao xong</option>
            </select>
          </div>
        </div>
      </div>

      {/* Delivery Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Không có đơn giao nào thỏa mãn điều kiện lọc.
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const isDelivered = order.delivery_status === 'DELIVERED';

            return (
              <div
                key={order.order_id}
                id={`delivery-order-card-${order.order_id}`}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                  isDelivered ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header with big Room Number */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black px-3.5 py-1.5 bg-slate-900 text-white rounded-xl shadow-xs">
                      {order.customer_building} - P.{order.customer_room}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{order.customer_name}</div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {order.customer_phone}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      isDelivered
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {isDelivered ? 'Đã giao' : 'Chưa giao'}
                  </span>
                </div>

                {/* Items List */}
                <div className="my-3 space-y-1 text-xs">
                  {order.items.map((it) => (
                    <div key={it.order_item_id} className="flex justify-between text-slate-700">
                      <div>
                        <span className="font-bold text-slate-900">• {it.product_name}</span>
                        {it.processing_note && it.processing_note !== 'Nguyên con' && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-1 py-0.5 rounded ml-1 font-medium">
                            {it.processing_note}
                          </span>
                        )}
                      </div>
                      <span className="font-black text-teal-900">
                        {it.quantity_actual !== undefined ? it.quantity_actual : it.quantity_ordered} {it.unit}
                      </span>
                    </div>
                  ))}
                </div>

                {order.delivery_note && (
                  <div className="bg-teal-50/70 p-2.5 rounded-xl border border-teal-200 text-xs text-teal-950 font-medium mb-3">
                    💬 Lưu ý: {order.delivery_note}
                  </div>
                )}

                {/* Totals & Delivery actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Tổng tiền: </span>
                    <span className="font-black text-slate-900 text-sm">{formatCurrency(order.total)}</span>
                    <div className="mt-0.5">
                      {order.debt_amount > 0 ? (
                        <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Thu COD: {formatCurrency(order.debt_amount)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Đã thanh toán đủ
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`delivery-print-btn-${order.order_id}`}
                      onClick={() => {
                        setPrintModalConfig({
                          isOpen: true,
                          mode: 'SINGLE_ORDER',
                          orderId: order.order_id,
                        });
                      }}
                      className="p-2 bg-slate-100 hover:bg-teal-50 text-slate-700 rounded-xl border border-slate-200"
                      title="In phiếu A4 dán túi"
                    >
                      <Printer className="w-4 h-4 text-teal-800" />
                    </button>

                    {!isDelivered && (
                      <>
                        {order.debt_amount > 0 ? (
                          <button
                            id={`collect-and-deliver-btn-${order.order_id}`}
                            onClick={() => handleCollectAndDeliver(order)}
                            className="px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Thu Tiền & Đã Giao
                          </button>
                        ) : (
                          <button
                            id={`mark-delivered-btn-${order.order_id}`}
                            onClick={() => handleMarkDelivered(order)}
                            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã Giao Phòng
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
