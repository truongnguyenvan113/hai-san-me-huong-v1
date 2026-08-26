import React from 'react';
import { useApp } from '../../context/AppContext';
import { BATCH_STATUS_CONFIG, formatCurrency, formatDate } from '../../utils/formatters';
import {
  ShoppingBag,
  Package,
  Truck,
  DollarSign,
  Plus,
  Printer,
  Scale,
  Users,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Home,
  Building,
  FileSpreadsheet
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentBatch,
    batches,
    orders,
    customers,
    setActiveTab,
    setSelectedBatchId,
    setIsCreateOrderOpen,
    setIsCreateBatchOpen,
    setIsAIScanOpen,
    setIsSheetsSyncOpen,
    setPrintModalConfig,
  } = useApp();

  const activeBatch = currentBatch || batches[0];
  const activeBatchOrders = activeBatch
    ? orders.filter((o) => o.batch_id === activeBatch.batch_id && o.status !== 'CANCELLED')
    : [];

  const collectingCount = activeBatchOrders.filter((o) => o.status === 'COLLECTING').length;
  const confirmedCount = activeBatchOrders.filter(
    (o) => o.status === 'CONFIRMED' || o.status === 'ORDERED' || o.status === 'RECEIVED' || o.status === 'PACKED'
  ).length;

  const totalEstimatedAmount = activeBatchOrders.reduce((sum, o) => {
    return sum + o.items.reduce((s, it) => s + it.quantity_ordered * it.estimated_price, 0);
  }, 0);

  const totalActualAmount = activeBatchOrders.reduce((sum, o) => sum + o.total, 0);

  const undeliveredOrders = activeBatchOrders.filter((o) => o.delivery_status !== 'DELIVERED');
  const unpaidOrders = activeBatchOrders.filter((o) => o.debt_amount > 0);
  const totalDebt = unpaidOrders.reduce((sum, o) => sum + o.debt_amount, 0);

  const handleOpenActiveBatch = () => {
    if (activeBatch) {
      setSelectedBatchId(activeBatch.batch_id);
      setActiveTab('BATCH_DETAIL');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Current Batch Hero Card */}
      {activeBatch ? (
        <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-teal-900/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" /> ĐỢT HÀNG HIỆN TẠI
                </span>
                <span className="text-slate-400 text-xs font-mono">{activeBatch.batch_code}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mt-2 text-white">
                {activeBatch.batch_name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-300">
                <span>Ngày mở: <strong>{formatDate(activeBatch.batch_date)}</strong></span>
                <span>•</span>
                <span>Giao phòng: <strong className="text-teal-300">{formatDate(activeBatch.delivery_date)}</strong></span>
                <span>•</span>
                <span>
                  Trạng thái:{' '}
                  <strong className="text-amber-300">
                    {BATCH_STATUS_CONFIG[activeBatch.status]?.label}
                  </strong>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="hero-ai-scan-batch-btn"
                onClick={() => setIsAIScanOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm border border-amber-300"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" /> ⚡ Quét Ảnh Gom Đơn (AI)
              </button>

              <button
                id="hero-create-order-btn"
                onClick={() => setIsCreateOrderOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4" /> + Tạo Đơn Nhanh
              </button>

              <button
                id="hero-sheets-sync-btn"
                onClick={() => setIsSheetsSyncOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold rounded-xl border border-emerald-400/30 transition-all active:scale-95 text-xs sm:text-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" /> Google Sheets
              </button>

              <button
                id="hero-batch-detail-btn"
                onClick={handleOpenActiveBatch}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all text-xs sm:text-sm"
              >
                Xử lý đợt này <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 text-center">
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">Chưa có đợt gom hàng nào đang mở</h3>
          <p className="text-xs text-slate-500 mt-1">Tạo đợt hàng mới để bắt đầu nhận đơn cư dân.</p>
          <button
            onClick={() => setIsCreateBatchOpen(true)}
            className="mt-3 px-4 py-2 bg-teal-800 text-white font-bold text-xs rounded-xl"
          >
            + Tạo Đợt Gom Hàng Mới
          </button>
        </div>
      )}

      {/* DASHBOARD METRIC CARDS (Exact match to user spec) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Đơn đang gom */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Đơn đang gom</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {collectingCount} <span className="text-xs font-normal text-slate-500">đơn</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Chờ khóa sổ đặt quê</div>
        </div>

        {/* Đã chốt */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Đã chốt đặt</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950 mt-2">
            {confirmedCount} <span className="text-xs font-normal text-slate-500">đơn</span>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">Tổng cộng {activeBatchOrders.length} phòng</div>
        </div>

        {/* Tổng tiền dự kiến */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng tiền dự kiến</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-700 mt-2">
            {formatCurrency(totalEstimatedAmount)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Theo giá lúc đặt</div>
        </div>

        {/* Tổng tiền thực tế */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng tiền thực tế</span>
            <div className="p-2 bg-teal-50 text-teal-800 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-950 mt-2">
            {formatCurrency(totalActualAmount)}
          </div>
          <div className="text-[11px] text-teal-800 font-medium mt-1">Sau khi cân & chốt giá</div>
        </div>

        {/* Chưa giao */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Chưa giao phòng</span>
            <div className="p-2 bg-orange-50 text-orange-700 rounded-xl">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-950 mt-2">
            {undeliveredOrders.length} <span className="text-xs font-normal text-slate-500">đơn</span>
          </div>
          <div className="text-[11px] text-orange-700 font-medium mt-1">Cần mang lên cửa phòng</div>
        </div>

        {/* Chưa thanh toán */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Chưa thanh toán đủ</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {unpaidOrders.length} <span className="text-xs font-normal text-slate-500">đơn</span>
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Thu tiền mặt / QR khi giao</div>
        </div>

        {/* Công nợ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors col-span-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng tiền COD / Công nợ cần thu</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {formatCurrency(totalDebt)}
          </div>
          <div className="text-[11px] text-purple-800 font-medium mt-1">
            Đã thanh toán trước: {formatCurrency(totalActualAmount - totalDebt)}
          </div>
        </div>
      </div>

      {/* TWO COLUMN WORKFLOW HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgent Orders to deliver by Condo Room */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-800" /> Danh Sách Cần Giao Tận Phòng ({undeliveredOrders.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Sắp xếp theo thứ tự Tòa nhà và Số phòng</p>
            </div>

            <button
              id="dash-open-delivery-tab-btn"
              onClick={() => setActiveTab('DELIVERY')}
              className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1"
            >
              Xem toàn bộ <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {undeliveredOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                🎉 Tất cả các đơn trong đợt hàng đã được giao tận phòng thành công!
              </div>
            ) : (
              undeliveredOrders.slice(0, 5).map((order) => (
                <div
                  key={order.order_id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs px-2.5 py-1 bg-slate-900 text-white rounded-lg">
                      {order.customer_building} - P.{order.customer_room}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{order.customer_name}</div>
                      <div className="text-slate-500 font-mono">{order.customer_phone}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm">{formatCurrency(order.total)}</div>
                    {order.debt_amount > 0 ? (
                      <span className="font-bold text-rose-700">Thu COD: {formatCurrency(order.debt_amount)}</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Đã thanh toán</span>
                    )}
                  </div>

                  <button
                    id={`dash-print-order-${order.order_id}`}
                    onClick={() => {
                      setPrintModalConfig({
                        isOpen: true,
                        mode: 'SINGLE_ORDER',
                        orderId: order.order_id,
                      });
                    }}
                    className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-lg flex items-center gap-1 text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> In Phiếu A4
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Workflow Shortcuts */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Thao Tác Nhanh
            </h3>

            <button
              id="quick-create-order-dash-btn"
              onClick={() => setIsCreateOrderOpen(true)}
              className="w-full p-3 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-xl border border-teal-200 font-bold text-xs flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-800" /> Tạo đơn khách mới
              </span>
              <ChevronRight className="w-4 h-4 text-teal-700" />
            </button>

            <button
              id="quick-print-all-dash-btn"
              onClick={() => {
                if (activeBatch) {
                  setPrintModalConfig({
                    isOpen: true,
                    mode: 'BATCH_ORDERS',
                    batchId: activeBatch.batch_id,
                  });
                }
              }}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl border border-slate-200 font-bold text-xs flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-700" /> In tất cả phiếu dán A4
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              id="quick-weigh-dash-btn"
              onClick={() => {
                if (activeBatch) {
                  setSelectedBatchId(activeBatch.batch_id);
                  setActiveTab('BATCH_DETAIL');
                }
              }}
              className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl border border-indigo-200 font-bold text-xs flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-700" /> Cân chia & Đóng gói
              </span>
              <ChevronRight className="w-4 h-4 text-indigo-600" />
            </button>

            <button
              id="quick-delivery-sheet-dash-btn"
              onClick={() => {
                if (activeBatch) {
                  setPrintModalConfig({
                    isOpen: true,
                    mode: 'DELIVERY_LIST',
                    batchId: activeBatch.batch_id,
                  });
                }
              }}
              className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl border border-amber-200 font-bold text-xs flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-700" /> In bảng kê giao tận phòng
              </span>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </button>
          </div>

          {/* Quick condo stat */}
          <div className="bg-teal-950 text-white rounded-2xl p-4 text-xs">
            <div className="font-black text-teal-300 uppercase tracking-widest text-[10px]">
              DỮ LIỆU CƯ DÂN
            </div>
            <div className="text-xl font-black mt-1">
              {customers.length} <span className="text-xs font-normal text-slate-300">hộ gia đình đã lưu</span>
            </div>
            <p className="text-slate-300 text-[11px] mt-1">
              Thông tin phòng, tòa, số điện thoại được lưu tự động, không phải nhập lại mỗi lần tạo đơn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
