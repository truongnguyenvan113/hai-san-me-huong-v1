import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG, formatCurrency, formatDate } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Printer,
  DollarSign,
  AlertCircle,
  Eye,
  CheckCircle2,
  Building,
  Phone,
  Calendar,
  X
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const {
    orders,
    batches,
    customers,
    setIsCreateOrderOpen,
    setPrintModalConfig,
    cancelOrder,
    updateOrder,
    addPayment,
    addToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('ALL');

  // Quick Payment Modal
  const [quickPayOrder, setQuickPayOrder] = useState<Order | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'QR' | 'COD'>('QR');
  const [payNote, setPayNote] = useState('');

  // Cancel order modal
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);

  // Detail Drawer Modal
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Buildings list
  const buildings = Array.from(new Set(customers.map((c) => c.building))).filter(Boolean);

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    // Search query (code, customer, phone, room, building, product)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = order.order_code.toLowerCase().includes(q);
      const matchName = order.customer_name.toLowerCase().includes(q);
      const matchPhone = order.customer_phone.includes(q);
      const matchRoom = order.customer_room.toLowerCase().includes(q);
      const matchBuilding = order.customer_building.toLowerCase().includes(q);
      const matchItem = order.items.some((it) => it.product_name.toLowerCase().includes(q));
      if (!matchCode && !matchName && !matchPhone && !matchRoom && !matchBuilding && !matchItem) {
        return false;
      }
    }

    if (selectedBatchFilter !== 'ALL' && order.batch_id !== selectedBatchFilter) return false;
    if (selectedStatusFilter !== 'ALL' && order.status !== selectedStatusFilter) return false;
    if (selectedPaymentFilter !== 'ALL' && order.payment_status !== selectedPaymentFilter) return false;
    if (selectedBuildingFilter !== 'ALL' && order.customer_building !== selectedBuildingFilter) return false;

    return true;
  });

  const handleOpenQuickPay = (order: Order) => {
    setQuickPayOrder(order);
    setPayAmount(order.debt_amount);
    setPayMethod('QR');
    setPayNote('Thu tiền khi giao hải sản');
  };

  const handleConfirmQuickPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayOrder || payAmount <= 0) return;

    addPayment({
      transaction_id: `PAY-${Date.now()}`,
      order_id: quickPayOrder.order_id,
      order_code: quickPayOrder.order_code,
      customer_id: quickPayOrder.customer_id,
      customer_name: quickPayOrder.customer_name,
      amount: payAmount,
      payment_method: payMethod,
      note: payNote,
      created_at: new Date().toISOString(),
    });

    setQuickPayOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Title & Create action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-teal-800" /> Quản Lý Đơn Hàng Cư Dân
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Theo dõi, cân chia khối lượng thực tế, thu tiền và in phiếu dán thùng/túi.
          </p>
        </div>

        <button
          id="create-order-btn"
          onClick={() => setIsCreateOrderOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" /> + Tạo Đơn Hàng Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="search-orders-input"
              type="text"
              placeholder="Tìm theo số phòng (1205), tên, SĐT, mã đơn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          {/* Batch filter */}
          <div className="sm:col-span-3">
            <select
              id="filter-batch-select"
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

          {/* Status filter */}
          <div className="sm:col-span-2">
            <select
              id="filter-status-select"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.keys(ORDER_STATUS_CONFIG).map((key) => (
                <option key={key} value={key}>
                  {ORDER_STATUS_CONFIG[key as OrderStatus].label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment status filter */}
          <div className="sm:col-span-3">
            <select
              id="filter-payment-select"
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700"
            >
              <option value="ALL">Tất cả thanh toán</option>
              <option value="UNPAID">Chưa thanh toán (COD)</option>
              <option value="PARTIAL">Đã cọc một phần</option>
              <option value="PAID">Đã thanh toán đủ</option>
            </select>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Hiển thị <strong>{filteredOrders.length}</strong> / {orders.length} đơn hàng
          </div>
          <div className="flex gap-4">
            <span>
              Tổng tiền: <strong className="text-slate-900">{formatCurrency(filteredOrders.reduce((s, o) => s + o.total, 0))}</strong>
            </span>
            <span>
              Cần thu COD: <strong className="text-rose-700">{formatCurrency(filteredOrders.reduce((s, o) => s + o.debt_amount, 0))}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                <th className="py-3 px-3">Mã đơn</th>
                <th className="py-3 px-3 bg-teal-50/50">Phòng & Cư Dân</th>
                <th className="py-3 px-3">Hải sản đặt</th>
                <th className="py-3 px-3 text-right">Tổng tiền</th>
                <th className="py-3 px-3 text-right">Cần thu (COD)</th>
                <th className="py-3 px-3 text-center">Trạng thái đơn</th>
                <th className="py-3 px-3 text-center">Thanh toán</th>
                <th className="py-3 px-3 text-center w-28">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.COLLECTING;
                  const payCfg = PAYMENT_STATUS_CONFIG[order.payment_status] || PAYMENT_STATUS_CONFIG.UNPAID;

                  return (
                    <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-teal-900 text-xs">
                        {order.order_code}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatDate(order.delivery_date)}
                        </div>
                      </td>

                      {/* Prominent Condo Room Header */}
                      <td className="py-3 px-3 bg-teal-50/20">
                        <div className="font-black text-slate-900 text-sm">
                          {order.customer_building} - P.{order.customer_room}
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {order.customer_name} <span className="font-mono text-slate-500">({order.customer_phone})</span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3 text-xs">
                        <div className="space-y-0.5">
                          {order.items.map((it) => (
                            <div key={it.order_item_id} className="flex items-center gap-1 text-slate-700">
                              <span className="font-bold text-slate-900">• {it.product_name}:</span>
                              <span>
                                {it.quantity_actual !== undefined ? (
                                  <strong className="text-teal-900">{it.quantity_actual}{it.unit}</strong>
                                ) : (
                                  `${it.quantity_ordered}${it.unit}`
                                )}
                              </span>
                              {it.processing_note && it.processing_note !== 'Nguyên con' && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 px-1 rounded">
                                  {it.processing_note}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Totals */}
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatCurrency(order.total)}
                      </td>

                      {/* Debt / COD */}
                      <td className="py-3 px-3 text-right">
                        {order.debt_amount > 0 ? (
                          <span className="font-black text-rose-700">
                            {formatCurrency(order.debt_amount)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">
                            Đã trả đủ
                          </span>
                        )}
                      </td>

                      {/* Order status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          {order.is_packed ? 'Đã đóng túi' : order.is_weighed ? 'Đã cân' : statusCfg.label}
                        </span>
                      </td>

                      {/* Payment status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${payCfg.bg} ${payCfg.text} ${payCfg.border}`}
                        >
                          {payCfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`quick-print-order-${order.order_id}`}
                            onClick={() => {
                              setPrintModalConfig({
                                isOpen: true,
                                mode: 'SINGLE_ORDER',
                                orderId: order.order_id,
                              });
                            }}
                            title="In phiếu A4 dán thùng/túi"
                            className="p-1.5 text-teal-800 hover:bg-teal-50 rounded-lg border border-teal-200 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {order.debt_amount > 0 && (
                            <button
                              id={`quick-pay-order-${order.order_id}`}
                              onClick={() => handleOpenQuickPay(order)}
                              title="Thu tiền nhanh"
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            id={`view-order-details-${order.order_id}`}
                            onClick={() => setViewingOrder(order)}
                            title="Xem chi tiết đơn"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK PAYMENT MODAL */}
      {quickPayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <DollarSign className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900">Thu Tiền Đơn Hàng</h3>
              </div>
              <button
                onClick={() => setQuickPayOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickPay} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">
                  {quickPayOrder.customer_building} - Phòng {quickPayOrder.customer_room}
                </div>
                <div className="text-slate-600">
                  {quickPayOrder.customer_name} | Mã: {quickPayOrder.order_code}
                </div>
                <div className="text-rose-700 font-bold mt-1">
                  Số tiền còn nợ: {formatCurrency(quickPayOrder.debt_amount)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền thực thu (₫)
                </label>
                <input
                  type="number"
                  required
                  step="1000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-base text-emerald-800 focus:bg-white focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hình thức thanh toán
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-medium"
                >
                  <option value="QR">Quét mã VietQR</option>
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="COD">Thu COD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú thanh toán
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPayOrder(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm"
                >
                  Xác Nhận Đã Thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAILS DRAWER */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  {viewingOrder.order_code}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Chi tiết đơn: {viewingOrder.customer_building} - P.{viewingOrder.customer_room}
                </h3>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Cư dân đặt:</span>
                  <span className="font-bold text-slate-900">{viewingOrder.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Số điện thoại:</span>
                  <span className="font-bold text-slate-900">{viewingOrder.customer_phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Đợt hàng:</span>
                  <span className="font-medium text-slate-800">{viewingOrder.batch_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Ngày giao phòng:</span>
                  <span className="font-medium text-slate-800">{formatDate(viewingOrder.delivery_date)}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="font-bold text-slate-700 mb-2">Danh sách hải sản:</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="p-2">Sản phẩm</th>
                        <th className="p-2 text-center">SL Đặt</th>
                        <th className="p-2 text-center bg-teal-50">Cân thực tế</th>
                        <th className="p-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingOrder.items.map((it) => (
                        <tr key={it.order_item_id}>
                          <td className="p-2 font-semibold">
                            {it.product_name}
                            {it.processing_note && (
                              <span className="block text-[10px] text-amber-800 font-normal">
                                Sơ chế: {it.processing_note}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center">{it.quantity_ordered} {it.unit}</td>
                          <td className="p-2 text-center bg-teal-50/50 font-bold text-teal-900">
                            {it.quantity_actual !== undefined ? `${it.quantity_actual} ${it.unit}` : 'Chưa cân'}
                          </td>
                          <td className="p-2 text-right font-bold">
                            {formatCurrency(it.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(viewingOrder.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Đã thanh toán:</span>
                  <span className="font-bold">{formatCurrency(viewingOrder.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Còn nợ / COD:</span>
                  <span>{formatCurrency(viewingOrder.debt_amount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    const ord = viewingOrder;
                    setViewingOrder(null);
                    setPrintModalConfig({
                      isOpen: true,
                      mode: 'SINGLE_ORDER',
                      orderId: ord.order_id,
                    });
                  }}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> In Phiếu A4 Dán Thùng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
