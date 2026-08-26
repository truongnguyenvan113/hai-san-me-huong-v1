import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, Order } from '../../types';
import { CreateCustomerModal } from './CreateCustomerModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Users,
  Plus,
  Search,
  Phone,
  Building,
  Home,
  ShoppingBag,
  Clock,
  ChevronRight,
  Eye,
  Edit2,
  X
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers, orders, updateCustomer } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const buildings = Array.from(new Set(customers.map((c) => c.building))).filter(Boolean);

  const filteredCustomers = customers.filter((c) => {
    if (selectedBuilding !== 'ALL' && c.building !== selectedBuilding) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchRoom = c.room.toLowerCase().includes(q);
      const matchBuilding = c.building.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchRoom && !matchBuilding) return false;
    }
    return true;
  });

  const getCustomerStats = (customerId: string) => {
    const custOrders = orders.filter((o) => o.customer_id === customerId && o.status !== 'CANCELLED');
    const totalSpent = custOrders.reduce((sum, o) => sum + o.total, 0);
    const totalPaid = custOrders.reduce((sum, o) => sum + o.paid_amount, 0);
    const totalDebt = custOrders.reduce((sum, o) => sum + o.debt_amount, 0);
    const latestOrder = custOrders[0] || null;

    return {
      orderCount: custOrders.length,
      totalSpent,
      totalPaid,
      totalDebt,
      latestOrder,
      orders: custOrders,
    };
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    updateCustomer({
      ...editingCustomer,
      updated_at: new Date().toISOString(),
    });
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-teal-800" /> Danh Sách Cư Dân Chung Cư
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Lưu cố định Tòa, Phòng, SĐT và lịch sử mua hàng, không phải hỏi lại mỗi lần gom đơn.
          </p>
        </div>

        <button
          id="create-customer-btn"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" /> + Thêm Cư Dân Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="search-customer-input"
              type="text"
              placeholder="Tìm cư dân theo số phòng (1205), tên, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              id="customer-building-filter"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-medium"
            >
              <option value="ALL">Tất cả tòa nhà</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const stats = getCustomerStats(cust.customer_id);

          return (
            <div
              key={cust.customer_id}
              id={`customer-card-${cust.customer_id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-base font-black px-3 py-1 bg-slate-900 text-white rounded-xl">
                      {cust.building} - P.{cust.room}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2.5">{cust.name}</h3>
                  </div>

                  <button
                    id={`edit-customer-btn-${cust.customer_id}`}
                    onClick={() => setEditingCustomer(cust)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {cust.phone}
                  </div>
                  {cust.note && (
                    <div className="text-[11px] text-slate-500 italic line-clamp-2 mt-1">
                      💡 {cust.note}
                    </div>
                  )}
                </div>

                {/* Purchase stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Số đơn</span>
                    <strong className="text-slate-900 text-sm">{stats.orderCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tổng mua</span>
                    <strong className="text-teal-900 text-xs">{formatCurrency(stats.totalSpent)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Công nợ</span>
                    <strong className={stats.totalDebt > 0 ? 'text-rose-700 text-xs' : 'text-emerald-700 text-xs'}>
                      {formatCurrency(stats.totalDebt)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* View History Button */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  id={`view-customer-history-btn-${cust.customer_id}`}
                  onClick={() => setViewingCustomer(cust)}
                  className="w-full py-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5 text-teal-800" /> Xem Lịch Sử Đơn ({stats.orderCount})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateCustomerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {/* CUSTOMER DETAIL & HISTORY MODAL */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-black px-2.5 py-0.5 bg-slate-900 text-white rounded-lg">
                  {viewingCustomer.building} - PHÒNG {viewingCustomer.room}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{viewingCustomer.name}</h3>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {viewingCustomer.phone}
                </div>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const stats = getCustomerStats(viewingCustomer.customer_id);

              return (
                <div className="space-y-4 mt-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-slate-500 block">Tổng số đơn</span>
                      <strong className="text-base text-slate-900">{stats.orderCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tổng tiền đã mua</span>
                      <strong className="text-sm text-teal-900">{formatCurrency(stats.totalSpent)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Còn nợ</span>
                      <strong className={stats.totalDebt > 0 ? 'text-sm text-rose-700' : 'text-sm text-emerald-700'}>
                        {formatCurrency(stats.totalDebt)}
                      </strong>
                    </div>
                  </div>

                  {/* Order History */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Lịch sử gom đơn hải sản ({stats.orders.length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {stats.orders.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs">Chưa có đơn hàng nào.</div>
                      ) : (
                        stats.orders.map((ord) => (
                          <div
                            key={ord.order_id}
                            className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{ord.order_code}</span>
                                <span className="font-normal text-slate-500">({formatDate(ord.delivery_date)})</span>
                              </div>
                              <div className="text-slate-500 text-[11px] mt-0.5">
                                {ord.items.map((i) => `${i.product_name} (${i.quantity_actual ?? i.quantity_ordered}${i.unit})`).join(', ')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{formatCurrency(ord.total)}</div>
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                {ord.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chỉnh Sửa Thông Tin Cư Dân</h3>
              <button onClick={() => setEditingCustomer(null)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="space-y-3 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ tên</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tòa</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.building}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, building: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.room}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, room: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={editingCustomer.note || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 text-white font-bold rounded-xl"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
