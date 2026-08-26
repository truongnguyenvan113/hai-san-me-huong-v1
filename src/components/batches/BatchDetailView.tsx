import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, BatchStatus, Order, OrderItem } from '../../types';
import { BATCH_STATUS_CONFIG, formatCurrency, formatDate, formatQuantity } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Cloud,
  Copy,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Package,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Send,
  Sparkles,
  Truck,
  User,
  AlertCircle,
  Scissors
} from 'lucide-react';

const BATCH_STAGES: BatchStatus[] = [
  'COLLECTING',
  'CONFIRMED',
  'ORDERED',
  'RECEIVED',
  'DISTRIBUTING',
  'DELIVERING',
  'COMPLETED',
];

export const BatchDetailView: React.FC = () => {
  const {
    selectedBatchId,
    setActiveTab,
    batches,
    orders,
    products,
    updateBatch,
    advanceBatchStage,
    updateOrder,
    updateBatchActualPrices,
    cancelOrder,
    getBatchItemSummary,
    setPrintModalConfig,
    setIsCreateOrderOpen,
    triggerSyncNow,
    syncStatus,
    spreadsheetId,
    addToast,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'actual_price' | 'actual_weight' | 'orders' | 'print'>(
    'summary'
  );

  // Price adjustment state
  const [actualPrices, setActualPrices] = useState<Record<string, number>>({});
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  // Order cancellation state
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Status transition confirm
  const [nextStatusToSet, setNextStatusToSet] = useState<BatchStatus | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  const batch = batches.find((b) => b.batch_id === selectedBatchId) || batches[0];
  if (!batch) {
    return (
      <div className="p-8 text-center text-slate-500">
        Không tìm thấy đợt hàng.
        <button
          onClick={() => setActiveTab('BATCHES')}
          className="ml-2 text-teal-800 font-bold underline"
        >
          Quay lại danh sách đợt hàng
        </button>
      </div>
    );
  }

  const batchOrders = orders.filter((o) => o.batch_id === batch.batch_id && o.status !== 'CANCELLED');
  const cancelledOrders = orders.filter((o) => o.batch_id === batch.batch_id && o.status === 'CANCELLED');
  const itemSummary = getBatchItemSummary(batch.batch_id);

  const totalEstimated = batchOrders.reduce((sum, o) => sum + o.total, 0);
  const totalPaid = batchOrders.reduce((sum, o) => sum + o.paid_amount, 0);
  const totalDebt = batchOrders.reduce((sum, o) => sum + o.debt_amount, 0);
  const totalPacked = batchOrders.filter((o) => o.is_packed).length;
  const totalDelivered = batchOrders.filter((o) => o.delivery_status === 'DELIVERED').length;

  const currentStageIndex = BATCH_STAGES.indexOf(batch.status);
  const nextStage = currentStageIndex >= 0 && currentStageIndex < BATCH_STAGES.length - 1 
    ? BATCH_STAGES[currentStageIndex + 1] 
    : null;

  // Handle stage change with cascade and instant push to Google Sheets
  const handleAdvanceStage = async (newStatus: BatchStatus) => {
    await advanceBatchStage(batch.batch_id, newStatus, true);
    addToast(
      'success',
      'Cập nhật tiến trình đợt gom',
      `Đã chuyển sang: ${BATCH_STATUS_CONFIG[newStatus].label} — Toàn bộ đơn hàng và tiến trình đã được đẩy lên Google Sheets!`
    );
  };

  const handleManualSyncSheets = async () => {
    setIsSyncingSheets(true);
    try {
      const ok = await triggerSyncNow();
      if (ok) {
        addToast('success', 'Đã đồng bộ Google Sheets', `Đã đẩy toàn bộ dữ liệu đợt ${batch.batch_code} lên Google Sheets thành công!`);
      }
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Copy Zalo / Quê order message
  const handleCopyZaloMessage = () => {
    let msg = `🦐 ĐƠN GOM HẢI SẢN NGÀY ${formatDate(batch.batch_date)} - ${batch.batch_name}\n`;
    msg += `----------------------------------------\n`;
    msg += `GỬI CHÚ BA / NGƯỜI Ở QUÊ ĐÓNG THÙNG:\n\n`;

    itemSummary.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.product_name.toUpperCase()}${item.size ? ` (${item.size})` : ''}\n`;
      msg += `   👉 Tổng số lượng: ${item.total_ordered} ${item.unit} (${item.order_count} phòng đặt)\n`;
      
      // Breakdown of special processing
      const processingList = item.orders
        .filter((o) => o.processing_note && o.processing_note !== 'Nguyên con')
        .map((o) => `P.${o.room}: ${o.quantity}${item.unit} (${o.processing_note})`);
      
      if (processingList.length > 0) {
        msg += `   ✂️ Yêu cầu sơ chế: ${processingList.join(', ')}\n`;
      }
      msg += `\n`;
    });

    msg += `----------------------------------------\n`;
    msg += `Tổng số đơn: ${batchOrders.length} phòng | Nhờ gửi xe lạnh đến chung cư trước 14h chiều.\n`;

    navigator.clipboard.writeText(msg);
    addToast('success', 'Đã sao chép tin nhắn', 'Bạn có thể dán (Ctrl+V) vào Zalo gửi cho người ở quê lấy hàng!');
  };

  // Apply actual prices to all items in batch
  const handleApplyActualPrices = () => {
    updateBatchActualPrices(batch.batch_id, actualPrices);
    setIsPriceModalOpen(false);
  };

  // Update item actual weight directly in Cân/Chia view
  const handleUpdateItemWeight = (orderId: string, itemId: string, weight: number) => {
    const order = orders.find((o) => o.order_id === orderId);
    if (!order) return;

    const newItems = order.items.map((it) => {
      if (it.order_item_id === itemId) {
        return {
          ...it,
          quantity_actual: weight,
          status: 'WEIGHED' as const,
        };
      }
      return it;
    });

    const allWeighed = newItems.every((it) => it.quantity_actual !== undefined && it.quantity_actual !== null);

    updateOrder({
      ...order,
      items: newItems,
      is_weighed: allWeighed,
    });
  };

  // Toggle order packing check
  const handleToggleOrderPack = (order: Order, field: 'is_weighed' | 'is_packed' | 'is_verified') => {
    updateOrder({
      ...order,
      [field]: !order[field],
      status: field === 'is_packed' && !order.is_packed ? 'PACKED' : order.status,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            id="back-to-batches-btn"
            onClick={() => setActiveTab('BATCHES')}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                {batch.batch_code}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  BATCH_STATUS_CONFIG[batch.status].bg
                } ${BATCH_STATUS_CONFIG[batch.status].text} ${BATCH_STATUS_CONFIG[batch.status].border}`}
              >
                {BATCH_STATUS_CONFIG[batch.status].label}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">{batch.batch_name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="batch-sync-sheets-btn"
            onClick={handleManualSyncSheets}
            disabled={isSyncingSheets || syncStatus === 'SYNCING'}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            title="Đẩy ngay toàn bộ trạng thái tiến trình và đơn hàng lên Google Sheets"
          >
            <Cloud className={`w-4 h-4 ${isSyncingSheets || syncStatus === 'SYNCING' ? 'animate-pulse' : ''}`} />
            {isSyncingSheets || syncStatus === 'SYNCING' ? 'Đang Đẩy Sheets...' : 'Đẩy Lên Sheets Ngay'}
          </button>

          <button
            id="open-create-order-in-batch-btn"
            onClick={() => setIsCreateOrderOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm Đơn Vào Đợt Này
          </button>

          <button
            id="batch-print-all-btn"
            onClick={() => {
              setPrintModalConfig({
                isOpen: true,
                mode: 'BATCH_ORDERS',
                batchId: batch.batch_id,
              });
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-teal-400" /> In Tất Cả Phiếu A4 ({batchOrders.length})
          </button>
        </div>
      </div>

      {/* WORKFLOW STEPPER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tiến trình luồng xử lý đợt gom:
            </span>
            <span className="text-xs font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              Bước {currentStageIndex + 1}/7: {BATCH_STATUS_CONFIG[batch.status].label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {nextStage && (
              <button
                id="advance-next-stage-quick-btn"
                onClick={() => setNextStatusToSet(nextStage)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-800 to-emerald-800 hover:from-teal-900 hover:to-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
              >
                <span>Chuyển sang: {BATCH_STATUS_CONFIG[nextStage].label}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex items-center justify-between min-w-[720px] gap-2">
            {BATCH_STAGES.map((stage, idx) => {
              const isPassed = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;

              return (
                <div key={stage} className="flex-1 flex flex-col items-center relative group">
                  <button
                    id={`batch-stage-btn-${stage.toLowerCase()}`}
                    onClick={() => setNextStatusToSet(stage)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-teal-800 text-white ring-4 ring-teal-100 scale-110 shadow-md'
                        : isPassed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-300 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                    title={`Click để chuyển đợt hàng sang: ${BATCH_STATUS_CONFIG[stage].label}`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </button>
                  <span
                    className={`text-[11px] font-bold mt-2 text-center whitespace-nowrap ${
                      isCurrent ? 'text-teal-900 font-black' : isPassed ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {BATCH_STATUS_CONFIG[stage].label}
                  </span>

                  {/* Arrow connector */}
                  {idx < BATCH_STAGES.length - 1 && (
                    <div
                      className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 ${
                        isPassed ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-teal-800 font-medium">
            <Cloud className="w-3.5 h-3.5" />
            <span>Tự động đồng bộ lên Google Sheets theo từng bước (Tab 1 Đơn Hàng, Tab 2 Đợt Gom, Tab 5 Cân Chia, Tab 6 Sổ Nợ)</span>
          </div>
          <span className="text-slate-400">Nhấp vào bất kỳ bước nào để chuyển trạng thái</span>
        </div>
      </div>

      {/* METRIC HIGHLIGHTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Tổng số đơn</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {batchOrders.length} <span className="text-xs font-normal text-slate-500">phòng</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Tổng tiền đợt hàng</div>
          <div className="text-xl font-black text-teal-900 mt-0.5">
            {formatCurrency(totalEstimated)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Đã đóng gói / Cân</div>
          <div className="text-xl font-black text-indigo-900 mt-0.5">
            {totalPacked}/{batchOrders.length} <span className="text-xs font-normal text-slate-500">đơn</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Còn thu khi giao (COD)</div>
          <div className="text-xl font-black text-rose-700 mt-0.5">
            {formatCurrency(totalDebt)}
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 overflow-x-auto text-xs sm:text-sm">
        <button
          id="subtab-summary-btn"
          onClick={() => setActiveSubTab('summary')}
          className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeSubTab === 'summary'
              ? 'border-teal-800 text-teal-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> 1. Tổng hợp đặt quê ({itemSummary.length} món)
        </button>

        <button
          id="subtab-price-btn"
          onClick={() => setActiveSubTab('actual_price')}
          className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeSubTab === 'actual_price'
              ? 'border-teal-800 text-teal-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" /> 2. Chốt giá thực tế
        </button>

        <button
          id="subtab-weight-btn"
          onClick={() => setActiveSubTab('actual_weight')}
          className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeSubTab === 'actual_weight'
              ? 'border-teal-800 text-teal-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" /> 3. Hàng về & Cân chia theo đơn
        </button>

        <button
          id="subtab-orders-btn"
          onClick={() => setActiveSubTab('orders')}
          className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeSubTab === 'orders'
              ? 'border-teal-800 text-teal-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> 4. Danh sách đơn ({batchOrders.length})
        </button>

        <button
          id="subtab-print-btn"
          onClick={() => setActiveSubTab('print')}
          className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeSubTab === 'print'
              ? 'border-teal-800 text-teal-900 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4" /> 5. In phiếu A4 & Giao hàng
        </button>
      </div>

      {/* SUB-TAB 1: BATCH PRODUCT SUMMARY */}
      {activeSubTab === 'summary' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-teal-50/70 p-4 rounded-2xl border border-teal-200">
            <div>
              <h3 className="text-base font-bold text-teal-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700" /> Bảng Tổng Hợp Số Lượng Cần Mua Từ Quê
              </h3>
              <p className="text-xs text-teal-800 mt-0.5">
                Tự động gom số lượng từ tất cả các đơn của cư dân trong đợt này.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="copy-zalo-batch-summary-btn"
                onClick={handleCopyZaloMessage}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95"
              >
                <Copy className="w-4 h-4" /> Sao Chép Tin Nhắn Gửi Quê (Zalo)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3">Tên hải sản & Quy cách</th>
                  <th className="py-3 px-3 text-center bg-teal-50 font-black text-teal-900">
                    Tổng khách đặt
                  </th>
                  <th className="py-3 px-3 text-center">Số phòng đặt</th>
                  <th className="py-3 px-3">Chi tiết các phòng & Yêu cầu sơ chế</th>
                  <th className="py-3 px-3 text-right">Đơn giá dự kiến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemSummary.map((item, idx) => (
                  <tr key={item.product_id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-black text-slate-900 text-sm">{item.product_name}</div>
                      {item.size && <div className="text-xs text-slate-500">{item.size}</div>}
                    </td>
                    <td className="py-3 px-3 text-center bg-teal-50/50">
                      <span className="text-base font-black text-teal-950">
                        {formatQuantity(item.total_ordered, item.unit)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {item.order_count} phòng
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {item.orders.map((ord, oidx) => (
                          <span
                            key={oidx}
                            className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200"
                          >
                            <span className="font-bold text-slate-900">P.{ord.room}:</span>
                            <span>{ord.quantity}{item.unit}</span>
                            {ord.processing_note && ord.processing_note !== 'Nguyên con' && (
                              <span className="text-amber-800 font-semibold bg-amber-50 px-1 rounded text-[10px]">
                                {ord.processing_note}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      {formatCurrency(item.estimated_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ACTUAL PRICE MANAGEMENT */}
      {activeSubTab === 'actual_price' && (
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-950">Chốt Giá Thực Tế Từ Quê Báo Lên</h4>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                Khi người ở quê báo giá chính xác cho chuyến hàng này, bạn chỉ cần nhập giá thực tế một lần dưới đây.
                Hệ thống sẽ tự động cập nhật <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">actual_price</code> cho toàn bộ đơn hàng trong đợt nhưng <strong>VẪN GIỮ NGUYÊN</strong> <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">estimated_price</code> để đối soát!
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3">Tên hải sản</th>
                  <th className="py-3 px-3 text-center">Tổng SL đặt</th>
                  <th className="py-3 px-3 text-right">Giá dự kiến</th>
                  <th className="py-3 px-3 text-right bg-amber-50/60 font-black text-amber-950">
                    Giá thực tế quê báo (₫)
                  </th>
                  <th className="py-3 px-3 text-center">Chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemSummary.map((item, idx) => {
                  const currentActual =
                    actualPrices[item.product_id] !== undefined
                      ? actualPrices[item.product_id]
                      : item.actual_price || item.estimated_price;
                  const diff = currentActual - item.estimated_price;

                  return (
                    <tr key={item.product_id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-black text-slate-900">
                        {item.product_name}
                        {item.size && <div className="text-xs font-normal text-slate-500">{item.size}</div>}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {formatQuantity(item.total_ordered, item.unit)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatCurrency(item.estimated_price)}
                      </td>
                      <td className="py-3 px-3 text-right bg-amber-50/30">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <input
                            id={`actual-price-input-${item.product_id}`}
                            type="number"
                            step="1000"
                            value={currentActual}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setActualPrices((prev) => ({ ...prev, [item.product_id]: val }));
                            }}
                            className="w-36 px-2.5 py-1.5 text-right text-sm font-bold bg-white border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-teal-700 shadow-xs"
                          />
                          <span className="text-xs text-slate-500">₫/{item.unit}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-xs font-bold">
                        {diff > 0 ? (
                          <span className="text-rose-600">+{formatCurrency(diff)}</span>
                        ) : diff < 0 ? (
                          <span className="text-emerald-600">-{formatCurrency(Math.abs(diff))}</span>
                        ) : (
                          <span className="text-slate-400">Không đổi</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              id="apply-actual-prices-btn"
              onClick={handleApplyActualPrices}
              className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Cập Nhật & Tính Lại Tiền Tất Cả Đơn Trong Đợt
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ACTUAL WEIGHT & PACKING CHECKLIST */}
      {activeSubTab === 'actual_weight' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 flex items-start gap-3">
            <Scale className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                Cân Thực Tế & Đóng Gói Theo Từng Phòng Chung Cư
              </h4>
              <p className="text-xs text-indigo-900 mt-0.5">
                Khi dỡ thùng hải sản ra chia cho từng khách: nhập khối lượng cân thực tế từng món, kiểm tra sơ chế và tích checklist đóng gói.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {batchOrders.map((order) => (
              <div
                key={order.order_id}
                id={`order-weigh-card-${order.order_id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all hover:border-slate-300"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black px-3 py-1 bg-slate-900 text-white rounded-xl">
                      {order.customer_building} - PHÒNG {order.customer_room}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{order.customer_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{order.customer_phone}</div>
                    </div>
                  </div>

                  {/* Checklist buttons */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      id={`toggle-weighed-${order.order_id}`}
                      onClick={() => handleToggleOrderPack(order, 'is_weighed')}
                      className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-colors ${
                        order.is_weighed
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {order.is_weighed ? 'Đã cân' : 'Chưa cân'}
                    </button>

                    <button
                      id={`toggle-packed-${order.order_id}`}
                      onClick={() => handleToggleOrderPack(order, 'is_packed')}
                      className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-colors ${
                        order.is_packed
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" /> {order.is_packed ? 'Đã đóng túi' : 'Chưa đóng'}
                    </button>

                    <button
                      id={`print-single-a4-btn-${order.order_id}`}
                      onClick={() => {
                        setPrintModalConfig({
                          isOpen: true,
                          mode: 'SINGLE_ORDER',
                          orderId: order.order_id,
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-700" /> In Phiếu A4
                    </button>
                  </div>
                </div>

                {/* Items in this order */}
                <div className="mt-3 space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.order_item_id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                    >
                      <div className="min-w-[200px]">
                        <div className="font-bold text-slate-900 text-sm">{item.product_name}</div>
                        {item.size && <div className="text-[11px] text-slate-500">{item.size}</div>}
                        {item.processing_note && (
                          <div className="mt-1 inline-block bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded text-[11px] border border-amber-300">
                            ✂️ {item.processing_note}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-slate-500 block text-[10px]">SL Khách đặt:</span>
                          <span className="font-bold text-slate-700">
                            {formatQuantity(item.quantity_ordered, item.unit)}
                          </span>
                        </div>

                        <div>
                          <span className="text-teal-950 font-bold block text-[10px]">CÂN THỰC TẾ:</span>
                          <div className="flex items-center gap-1">
                            <input
                              id={`weight-input-${item.order_item_id}`}
                              type="number"
                              step="0.05"
                              min="0"
                              value={item.quantity_actual !== undefined ? item.quantity_actual : item.quantity_ordered}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateItemWeight(order.order_id, item.order_item_id, val);
                              }}
                              className="w-24 px-2 py-1 bg-white border-2 border-teal-600 rounded-lg text-right font-black text-teal-950 text-sm focus:ring-2 focus:ring-teal-700"
                            />
                            <span className="font-semibold text-slate-600">{item.unit}</span>
                          </div>
                        </div>

                        <div className="text-right min-w-[90px]">
                          <span className="text-slate-500 block text-[10px]">Thành tiền:</span>
                          <span className="font-black text-slate-900 text-sm">
                            {formatCurrency(item.subtotal || (item.quantity_actual ?? item.quantity_ordered) * (item.actual_price ?? item.estimated_price))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer summary */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs">
                  <div className="text-slate-500 italic">
                    {order.delivery_note ? `Lưu ý: ${order.delivery_note}` : ''}
                  </div>
                  <div className="flex items-center gap-4 font-bold">
                    <span>
                      Tổng đơn: <span className="text-sm font-black text-slate-900">{formatCurrency(order.total)}</span>
                    </span>
                    <span>
                      Cần thu (COD):{' '}
                      <span className={order.debt_amount > 0 ? 'text-sm font-black text-rose-700' : 'text-emerald-700'}>
                        {order.debt_amount > 0 ? formatCurrency(order.debt_amount) : 'Đã trả đủ'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ORDERS LIST */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                  <th className="py-3 px-3">Mã đơn</th>
                  <th className="py-3 px-3">Phòng / Cư dân</th>
                  <th className="py-3 px-3">Sản phẩm đặt</th>
                  <th className="py-3 px-3 text-right">Tổng tiền</th>
                  <th className="py-3 px-3 text-right">Cần thu</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {batchOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-teal-900">
                      {order.order_code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-black text-slate-900">
                        {order.customer_building} - P.{order.customer_room}
                      </div>
                      <div className="text-xs text-slate-600">{order.customer_name} ({order.customer_phone})</div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-700">
                      {order.items.map((it) => (
                        <div key={it.order_item_id}>
                          • {it.product_name} ({it.quantity_actual ?? it.quantity_ordered} {it.unit})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {order.debt_amount > 0 ? (
                        <span className="font-bold text-rose-700">{formatCurrency(order.debt_amount)}</span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">
                          Đã trả đủ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {order.is_packed ? 'Đã đóng túi' : order.is_weighed ? 'Đã cân' : 'Đang xử lý'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`print-order-btn-${order.order_id}`}
                          onClick={() => {
                            setPrintModalConfig({
                              isOpen: true,
                              mode: 'SINGLE_ORDER',
                              orderId: order.order_id,
                            });
                          }}
                          title="In phiếu A4 dán túi"
                          className="p-1.5 text-teal-800 hover:bg-teal-50 rounded-lg border border-teal-200 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          id={`cancel-order-btn-${order.order_id}`}
                          onClick={() => setCancellingOrderId(order.order_id)}
                          title="Hủy đơn hàng"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PRINT HUB */}
      {activeSubTab === 'print' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="p-3 bg-teal-50 text-teal-800 rounded-xl w-fit mb-3">
                  <Printer className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">In Hàng Loạt Tất Cả Phiếu A4 Dán Túi</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Tự động gom {batchOrders.length} đơn hàng trong đợt thành một tệp in chuẩn, mỗi trang tương ứng một đơn hàng với header TÒA & SỐ PHÒNG siêu to để dán ngay lên túi/thùng xốp.
                </p>
              </div>

              <button
                id="batch-print-all-hub-btn"
                onClick={() => {
                  setPrintModalConfig({
                    isOpen: true,
                    mode: 'BATCH_ORDERS',
                    batchId: batch.batch_id,
                  });
                }}
                className="mt-6 w-full py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Mở Trình In Hàng Loạt ({batchOrders.length} Phiếu)
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl w-fit mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">In Bảng Kê Giao Hàng Tận Phòng</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Bảng tổng hợp gọn gàng sắp xếp theo Tòa và Tầng, hiển thị số phòng, tên khách, số tiền cần thu và ô tích ký nhận khi bấm chuông giao hàng.
                </p>
              </div>

              <button
                id="batch-print-delivery-sheet-btn"
                onClick={() => {
                  setPrintModalConfig({
                    isOpen: true,
                    mode: 'DELIVERY_LIST',
                    batchId: batch.batch_id,
                  });
                }}
                className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-teal-400" /> In Bảng Kê Giao Hàng A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for status change */}
      <ConfirmModal
        isOpen={nextStatusToSet !== null}
        onClose={() => setNextStatusToSet(null)}
        onConfirm={() => {
          if (nextStatusToSet) handleAdvanceStage(nextStatusToSet);
        }}
        title="Xác nhận chuyển trạng thái đợt hàng"
        message={`Bạn có chắc muốn chuyển đợt hàng sang trạng thái "${
          nextStatusToSet ? BATCH_STATUS_CONFIG[nextStatusToSet].label : ''
        }"?`}
      />

      {/* Confirmation Modal for order cancellation */}
      <ConfirmModal
        isOpen={cancellingOrderId !== null}
        onClose={() => setCancellingOrderId(null)}
        onConfirm={() => {
          if (cancellingOrderId) {
            cancelOrder(cancellingOrderId, 'Khách báo hủy');
          }
        }}
        title="Cảnh báo hủy đơn hàng"
        message="Đơn hàng này có thể đã được tổng hợp để gửi đặt ở quê. Bạn có chắc chắn muốn hủy đơn không?"
        isDangerous={true}
      />
    </div>
  );
};
