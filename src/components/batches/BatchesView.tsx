import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BATCH_STATUS_CONFIG, formatCurrency, formatDate } from '../../utils/formatters';
import { CreateBatchModal } from './CreateBatchModal';
import {
  Package,
  Plus,
  Calendar,
  ChevronRight,
  Sparkles,
  Printer,
  CheckCircle2,
  Clock,
  Send,
  Truck
} from 'lucide-react';

export const BatchesView: React.FC = () => {
  const {
    batches,
    orders,
    setSelectedBatchId,
    setActiveTab,
    setCurrentBatch,
    currentBatch,
    setIsAIScanOpen,
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    setActiveTab('BATCH_DETAIL');
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-teal-800" /> Quản Lý Đợt Gom Hàng
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Mỗi đợt tương ứng với một lần gom đơn cư dân và đặt hàng tươi sống từ quê chuyển lên.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="ai-scan-batch-hero-btn"
            onClick={() => setIsAIScanOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl shadow-md transition-all active:scale-95 text-sm border border-amber-400"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" /> ⚡ Quét Ảnh / Ghi Chú (AI)
          </button>

          <button
            id="create-new-batch-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" /> Tạo Đợt Thủ Công
          </button>
        </div>
      </div>

      {/* AI Hero Banner Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-teal-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-amber-950 text-[11px] font-black rounded-full uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 fill-amber-950" /> Tính Năng Quét Ảnh Thông Minh
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Có ảnh chụp ghi chú gom đơn Zalo hoặc sổ tay gom hải sản?
            </h2>
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
              Chỉ cần chụp hoặc tải ảnh lên (hoặc nhấn <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-xs">Ctrl+V</kbd> dán ảnh), AI Gemini sẽ tự động nhận diện số phòng (1903A, 1006B...), món hải sản, số kg/khay và tạo đợt gom hàng chỉ trong 3 giây.
            </p>
          </div>

          <button
            onClick={() => setIsAIScanOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" /> Bấm Để Quét Ảnh Ngay
          </button>
        </div>
      </div>

      {/* Batches Grid or Empty State */}
      {batches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-teal-50 text-teal-800 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Chưa có đợt gom hàng nào</h3>
            <p className="text-xs text-slate-500 mt-1">
              Dữ liệu đợt cũ đã được làm sạch. Bắt đầu tạo đợt gom hải sản mới hoặc dùng AI quét ảnh danh sách đặt của cư dân!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsAIScanOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-xs"
            >
              <Sparkles className="w-4 h-4" /> Quét ảnh gom đơn (AI)
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs shadow-xs"
            >
              <Plus className="w-4 h-4" /> Tạo đợt mới
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.map((batch) => {
            const batchOrders = orders.filter((o) => o.batch_id === batch.batch_id && o.status !== 'CANCELLED');
            const totalAmount = batchOrders.reduce((sum, o) => sum + o.total, 0);
            const totalDebt = batchOrders.reduce((sum, o) => sum + o.debt_amount, 0);
            const isCurrent = currentBatch?.batch_id === batch.batch_id;

            const statusCfg = BATCH_STATUS_CONFIG[batch.status] || BATCH_STATUS_CONFIG.OPEN;

            return (
              <div
                key={batch.batch_id}
                id={`batch-card-${batch.batch_id}`}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md ${
                  isCurrent ? 'border-teal-600 ring-2 ring-teal-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                        {batch.batch_code}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-teal-700" /> Đang hoạt động
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5">{batch.batch_name}</h3>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                {/* Dates & Supplier */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Ngày mở: <strong>{formatDate(batch.batch_date)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-teal-700" />
                    <span>Giao phòng: <strong>{formatDate(batch.delivery_date)}</strong></span>
                  </div>
                  {batch.supplier_info?.name && (
                    <div className="col-span-2 text-slate-500 truncate mt-1">
                      Nguồn quê: {batch.supplier_info.name} ({batch.supplier_info.location})
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Số đơn</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {batchOrders.length} <span className="text-xs font-normal">phòng</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Tổng tiền</div>
                    <div className="text-base font-black text-teal-900 mt-0.5">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Cần thu (COD)</div>
                    <div className="text-base font-black text-rose-700 mt-0.5">
                      {formatCurrency(totalDebt)}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
                  {!isCurrent ? (
                    <button
                      id={`set-current-batch-btn-${batch.batch_id}`}
                      onClick={() => setCurrentBatch(batch.batch_id)}
                      className="text-xs font-semibold text-slate-600 hover:text-teal-800 transition-colors"
                    >
                      Đặt làm đợt hiện tại
                    </button>
                  ) : (
                    <span className="text-xs text-teal-800 font-medium">Đợt mặc định</span>
                  )}

                  <button
                    id={`open-batch-detail-btn-${batch.batch_id}`}
                    onClick={() => handleSelectBatch(batch.batch_id)}
                    className="flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-900 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-100 transition-colors"
                  >
                    Xử lý chi tiết đợt <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateBatchModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
