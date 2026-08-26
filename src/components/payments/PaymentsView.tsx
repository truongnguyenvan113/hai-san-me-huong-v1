import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentTransaction, Order } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatVietQRMemo,
  getActiveBankAccountInfo,
} from '../../utils/formatters';
import { VietQRDisplay } from '../common/VietQRDisplay';
import {
  DollarSign,
  QrCode,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  Phone,
  ArrowUpRight,
  Download,
  X
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { payments, orders, storeSettings, addPayment, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'debt' | 'history'>('debt');
  const [searchQuery, setSearchQuery] = useState('');

  // Collect quick pay modal
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<Order | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'QR' | 'BANK_TRANSFER' | 'CASH' | 'COD'>('QR');
  const [payNote, setPayNote] = useState('');

  // Debt orders
  const debtOrders = orders
    .filter((o) => o.status !== 'CANCELLED' && o.debt_amount > 0)
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_room.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        o.order_code.toLowerCase().includes(q)
      );
    });

  const totalDebt = debtOrders.reduce((sum, o) => sum + o.debt_amount, 0);
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleOpenPayModal = (order: Order) => {
    setSelectedOrderForPay(order);
    setPayAmount(order.debt_amount);
    setPayMethod('QR');
    setPayNote(`Thu tiền hải sản P.${order.customer_room}`);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPay || payAmount <= 0) return;

    addPayment({
      transaction_id: `PAY-${Date.now()}`,
      order_id: selectedOrderForPay.order_id,
      order_code: selectedOrderForPay.order_code,
      customer_id: selectedOrderForPay.customer_id,
      customer_name: selectedOrderForPay.customer_name,
      amount: payAmount,
      payment_method: payMethod,
      note: payNote,
      created_at: new Date().toISOString(),
    });

    setSelectedOrderForPay(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-teal-800" /> Sổ Quỹ & Công Nợ Gom Đơn
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Theo dõi dòng tiền cọc, COD khi nhận hàng và thanh toán chuyển khoản VietQR của cư dân.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-700 uppercase">Tổng công nợ / COD chưa thu</div>
            <div className="text-2xl font-black text-rose-700 mt-1">{formatCurrency(totalDebt)}</div>
            <div className="text-xs text-slate-500 mt-1">{debtOrders.length} phòng chưa thanh toán đủ</div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-800 uppercase">Tổng tiền đã thu về</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{formatCurrency(totalReceived)}</div>
            <div className="text-xs text-slate-500 mt-1">{payments.length} giao dịch đã ghi nhận</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('debt')}
          className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'debt'
              ? 'border-teal-800 text-teal-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Danh Sách Cần Thu Tiền ({debtOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-teal-800 text-teal-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Lịch Sử Giao Dịch ({payments.length})
        </button>
      </div>

      {/* SUB-TAB 1: DEBT ORDERS */}
      {activeTab === 'debt' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="search-debt-orders"
                type="text"
                placeholder="Tìm phòng cần thu tiền (VD: 1205, A1, Nam...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                  <th className="py-3 px-3">Phòng & Cư Dân</th>
                  <th className="py-3 px-3">Mã đơn & Đợt</th>
                  <th className="py-3 px-3 text-right">Tổng tiền đơn</th>
                  <th className="py-3 px-3 text-right">Đã thanh toán</th>
                  <th className="py-3 px-3 text-right bg-rose-50 text-rose-900 font-black">
                    Cần thu (COD)
                  </th>
                  <th className="py-3 px-3 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {debtOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      🎉 Tuyệt vời! Không còn đơn nào nợ tiền.
                    </td>
                  </tr>
                ) : (
                  debtOrders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <span className="font-black text-slate-900 text-sm">
                          {order.customer_building} - P.{order.customer_room}
                        </span>
                        <div className="text-xs text-slate-600">
                          {order.customer_name} ({order.customer_phone})
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-teal-900 font-bold">{order.order_code}</div>
                        <div className="text-[11px] text-slate-500">{order.batch_name}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatCurrency(order.paid_amount)}
                      </td>
                      <td className="py-3 px-3 text-right bg-rose-50/50">
                        <span className="font-black text-rose-700 text-sm">
                          {formatCurrency(order.debt_amount)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          id={`pay-btn-${order.order_id}`}
                          onClick={() => handleOpenPayModal(order)}
                          className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1 mx-auto"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Thu Tiền Ngay
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PAYMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                <th className="py-3 px-3">Mã GD</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Khách hàng</th>
                <th className="py-3 px-3">Mã đơn</th>
                <th className="py-3 px-3">Hình thức</th>
                <th className="py-3 px-3 text-right">Số tiền thu</th>
                <th className="py-3 px-3">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Chưa có giao dịch thanh toán nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.transaction_id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">{p.transaction_id}</td>
                    <td className="py-3 px-3 text-xs text-slate-500">{formatDate(p.created_at)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{p.customer_name}</td>
                    <td className="py-3 px-3 font-mono text-teal-800 font-bold">{p.order_code}</td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800 text-sm">
                      +{formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">{p.note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* QUICK PAY & VIETQR MODAL */}
      {selectedOrderForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-800" /> Thu Tiền: {selectedOrderForPay.customer_building} - P.{selectedOrderForPay.customer_room}
              </h3>
              <button onClick={() => setSelectedOrderForPay(null)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900">{selectedOrderForPay.customer_name}</div>
                  <div className="text-slate-500 font-mono text-xs">{selectedOrderForPay.order_code}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Số tiền cần thu:</span>
                  <div className="text-base font-black text-rose-700">
                    {formatCurrency(selectedOrderForPay.debt_amount)}
                  </div>
                </div>
              </div>

              {/* VietQR Quick Scan */}
              {payMethod === 'QR' && (
                <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-200 text-center">
                  <div className="text-xs font-bold text-teal-950 mb-2">
                    Mã VietQR động tự động điền số tiền {formatCurrency(payAmount)}
                  </div>
                  <div className="flex justify-center">
                    <VietQRDisplay
                      bin={getActiveBankAccountInfo(storeSettings).bin}
                      accountNumber={getActiveBankAccountInfo(storeSettings).accountNumber}
                      accountName={getActiveBankAccountInfo(storeSettings).accountName}
                      amount={payAmount}
                      memo={formatVietQRMemo(selectedOrderForPay.customer_room, selectedOrderForPay.customer_building)}
                      template={(storeSettings.bank_qr_template as any) || 'compact2'}
                      sizeClass="w-44 h-44"
                    />
                  </div>
                  <div className="text-[11px] text-slate-700 mt-2 font-mono font-bold">
                    {getActiveBankAccountInfo(storeSettings).bankShortName} - STK: {getActiveBankAccountInfo(storeSettings).accountNumber} ({getActiveBankAccountInfo(storeSettings).accountName})
                  </div>
                  <div className="text-[11px] text-teal-900 font-bold mt-1 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 inline-block">
                    Nội dung: {formatVietQRMemo(selectedOrderForPay.customer_room, selectedOrderForPay.customer_building)}
                  </div>
                </div>
              )}

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
                <div className="grid grid-cols-3 gap-2">
                  {(['QR', 'CASH', 'BANK_TRANSFER'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        payMethod === m
                          ? 'bg-teal-800 text-white border-teal-800'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m === 'QR' ? 'Quét VietQR' : m === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPay(null)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Xác Nhận Đã Nhận Tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
