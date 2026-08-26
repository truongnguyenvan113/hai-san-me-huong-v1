import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BackupSnapshot, DiffComparisonResult } from '../../types';
import {
  X,
  Clock,
  History,
  GitCompare,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  GitMerge,
  Download,
  Trash2,
  Database,
  Building,
  CreditCard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Sparkles,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface BackupCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSnapshot?: BackupSnapshot | null;
}

export const BackupCompareModal: React.FC<BackupCompareModalProps> = ({
  isOpen,
  onClose,
  initialSnapshot,
}) => {
  const {
    snapshots,
    restoreFromSnapshot,
    mergeFromSnapshot,
    deleteSnapshot,
    compareDataDiff,
    getCurrentBackupData,
    createSnapshot,
    addToast,
  } = useApp();

  const [activeSnapshotId, setActiveSnapshotId] = useState<string>(
    initialSnapshot?.id || (snapshots.length > 0 ? snapshots[0].id : '')
  );
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isMergeConfirmOpen, setIsMergeConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BATCHES' | 'ORDERS' | 'SETTINGS'>('OVERVIEW');

  if (!isOpen) return null;

  const currentData = getCurrentBackupData();
  const selectedSnapshot = snapshots.find((s) => s.id === activeSnapshotId) || snapshots[0] || null;

  const diffResult: DiffComparisonResult | null = selectedSnapshot
    ? compareDataDiff(currentData, selectedSnapshot.data)
    : null;

  const handleRestore = () => {
    if (!selectedSnapshot) return;
    const ok = restoreFromSnapshot(selectedSnapshot, true);
    if (ok) {
      setIsRestoreConfirmOpen(false);
      onClose();
    }
  };

  const handleMerge = () => {
    if (!selectedSnapshot) return;
    mergeFromSnapshot(selectedSnapshot);
    setIsMergeConfirmOpen(false);
    onClose();
  };

  const handleDelete = () => {
    if (!selectedSnapshot) return;
    deleteSnapshot(selectedSnapshot.id);
    setIsDeleteConfirmOpen(false);
    const remaining = snapshots.filter((s) => s.id !== selectedSnapshot.id);
    if (remaining.length > 0) {
      setActiveSnapshotId(remaining[0].id);
    }
  };

  const handleDownloadSnapshotJSON = (snapshot: BackupSnapshot) => {
    const jsonStr = JSON.stringify(snapshot.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot-${snapshot.trigger.toLowerCase()}-${new Date(snapshot.timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Đã tải xuống', `Đã xuất tệp sao lưu "${snapshot.title}"`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case 'AUTO_2H':
        return (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> Tự động 2h
          </span>
        );
      case 'BEFORE_ACCOUNT_SWITCH':
        return (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold rounded-full flex items-center gap-1">
            <History className="w-3 h-3" /> Lưu khi đổi Google
          </span>
        );
      case 'BEFORE_SHEETS_PULL':
        return (
          <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-bold rounded-full flex items-center gap-1">
            <Database className="w-3 h-3" /> Trước nạp Sheets
          </span>
        );
      case 'BEFORE_RESTORE':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Trước khôi phục
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Thủ công
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
              <GitCompare className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                So Sánh & Khôi Phục Từ Bản Sao Lưu
              </h2>
              <p className="text-xs text-slate-300">
                Đối chiếu dữ liệu máy chủ/nguồn với các điểm sao lưu lịch sử (đặc biệt hữu ích khi đổi tài khoản Google mới chưa có dữ liệu).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {snapshots.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Chưa có bản sao lưu lịch sử nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Hệ thống sẽ tự động tạo bản sao lưu mỗi 2 giờ hoặc khi bạn đổi tài khoản Google. Bạn cũng có thể bấm nút bên dưới để tạo ngay 1 điểm sao lưu.
              </p>
            </div>
            <button
              onClick={() => {
                createSnapshot('MANUAL', 'Điểm sao lưu đầu tiên');
              }}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              + Tạo Bản Sao Lưu Ngay Bây Giờ
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar: Snapshot List */}
            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto max-h-64 md:max-h-full space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 px-1">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-teal-800" /> Các Bản Sao Lưu ({snapshots.length})
                </span>
                <button
                  onClick={() => createSnapshot('MANUAL', 'Sao lưu thủ công')}
                  className="text-[11px] font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer"
                >
                  + Tạo mới
                </button>
              </div>

              {snapshots.map((snap) => {
                const isSelected = snap.id === activeSnapshotId;
                return (
                  <div
                    key={snap.id}
                    onClick={() => setActiveSnapshotId(snap.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-white border-teal-700 shadow-xs ring-2 ring-teal-600/20'
                        : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-bold text-xs text-slate-900 line-clamp-1">
                        {snap.title}
                      </div>
                      {getTriggerBadge(snap.trigger)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDateTime(snap.timestamp)}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                      <span>{snap.summary.batchesCount} đợt gom</span>
                      <span>{snap.summary.ordersCount} đơn</span>
                      <span className="font-bold text-teal-800">
                        {formatCurrency(snap.summary.totalRevenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Content: Diff Details */}
            {selectedSnapshot && diffResult && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Snapshot Quick Banner */}
                <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">{selectedSnapshot.title}</span>
                      {getTriggerBadge(selectedSnapshot.trigger)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thời điểm lưu: <span className="font-mono font-bold text-slate-700">{formatDateTime(selectedSnapshot.timestamp)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleDownloadSnapshotJSON(selectedSnapshot)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Tải file JSON bản này về máy"
                    >
                      <Download className="w-3.5 h-3.5" /> Xuất File JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMergeConfirmOpen(true)}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Chỉ bổ sung các đơn hàng và đợt gom còn thiếu từ bản sao lưu này vào máy"
                    >
                      <GitMerge className="w-3.5 h-3.5" /> Gộp Dữ Liệu
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRestoreConfirmOpen(true)}
                      className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-black text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Khôi phục toàn bộ dữ liệu từ bản sao lưu này"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Khôi Phục Bản Này
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa bản sao lưu này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-tabs Navigation */}
                <div className="flex border-b border-slate-200 px-4 bg-white text-xs font-bold gap-4">
                  <button
                    onClick={() => setActiveTab('OVERVIEW')}
                    className={`py-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'OVERVIEW'
                        ? 'border-teal-800 text-teal-900'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Tổng Quan Đối Chiếu
                  </button>
                  <button
                    onClick={() => setActiveTab('BATCHES')}
                    className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                      activeTab === 'BATCHES'
                        ? 'border-teal-800 text-teal-900'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Đợt Gom Hàng ({diffResult.batchesDiff.onlyInSnapshot.length} bản chỉ có trong backup)
                  </button>
                  <button
                    onClick={() => setActiveTab('ORDERS')}
                    className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                      activeTab === 'ORDERS'
                        ? 'border-teal-800 text-teal-900'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Đơn Hàng ({diffResult.ordersDiff.onlyInSnapshot.length} đơn thiếu)
                  </button>
                  <button
                    onClick={() => setActiveTab('SETTINGS')}
                    className={`py-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'SETTINGS'
                        ? 'border-teal-800 text-teal-900'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Cấu Hình & Ngân Hàng
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                  {activeTab === 'OVERVIEW' && (
                    <div className="space-y-4">
                      {/* Side-by-Side Comparison Metric Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current App State */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              1. Dữ Liệu Hiện Tại Trên Máy
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                              Đang dùng
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                              <div className="text-slate-500 text-[11px]">Đợt gom hàng:</div>
                              <div className="text-base font-black text-slate-900">{diffResult.currentStats.batchesCount} đợt</div>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                              <div className="text-slate-500 text-[11px]">Tổng số đơn:</div>
                              <div className="text-base font-black text-slate-900">{diffResult.currentStats.ordersCount} đơn</div>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                              <div className="text-slate-500 text-[11px]">Danh bạ cư dân:</div>
                              <div className="text-base font-black text-slate-900">{diffResult.currentStats.customersCount} người</div>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                              <div className="text-slate-500 text-[11px]">Doanh thu:</div>
                              <div className="text-sm font-black text-emerald-700">{formatCurrency(diffResult.currentStats.totalRevenue)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Selected Snapshot State */}
                        <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-teal-950 uppercase flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-teal-800" /> 2. Bản Sao Lưu Chọn Đối Chiếu
                            </span>
                            <span className="text-[10px] bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full font-bold">
                              Bản Snapshot
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-white rounded-xl border border-teal-200">
                              <div className="text-slate-500 text-[11px]">Đợt gom hàng:</div>
                              <div className="text-base font-black text-teal-900">{diffResult.snapshotStats.batchesCount} đợt</div>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-teal-200">
                              <div className="text-slate-500 text-[11px]">Tổng số đơn:</div>
                              <div className="text-base font-black text-teal-900">{diffResult.snapshotStats.ordersCount} đơn</div>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-teal-200">
                              <div className="text-slate-500 text-[11px]">Danh bạ cư dân:</div>
                              <div className="text-base font-black text-teal-900">{diffResult.snapshotStats.customersCount} người</div>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-teal-200">
                              <div className="text-slate-500 text-[11px]">Doanh thu:</div>
                              <div className="text-sm font-black text-teal-800">{formatCurrency(diffResult.snapshotStats.totalRevenue)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary Analysis */}
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700" /> Kết Quả Đối Soát & Khuyến Nghị:
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-amber-800">
                          {diffResult.currentStats.ordersCount === 0 && diffResult.snapshotStats.ordersCount > 0 && (
                            <li className="font-bold text-rose-800">
                              Dữ liệu hiện tại trên máy đang trống (0 đơn). Bản sao lưu có {diffResult.snapshotStats.ordersCount} đơn hàng và {diffResult.snapshotStats.batchesCount} đợt gom. Bạn nên nhấn <b>"Khôi Phục Bản Này"</b> để nạp lại dữ liệu ngay.
                            </li>
                          )}
                          {diffResult.ordersDiff.onlyInSnapshot.length > 0 && (
                            <li>
                              Có <b>{diffResult.ordersDiff.onlyInSnapshot.length}</b> đơn hàng trong bản sao lưu chưa có trên máy. Bạn có thể dùng tính năng <b>"Gộp Dữ Liệu"</b> để bổ sung thêm vào máy mà không xóa đơn hiện tại.
                            </li>
                          )}
                          {diffResult.batchesDiff.onlyInSnapshot.length > 0 && (
                            <li>
                              Có <b>{diffResult.batchesDiff.onlyInSnapshot.length}</b> đợt gom trong bản sao lưu chưa có trên máy.
                            </li>
                          )}
                          {diffResult.ordersDiff.onlyInSnapshot.length === 0 && diffResult.batchesDiff.onlyInSnapshot.length === 0 && (
                            <li className="text-emerald-800 font-bold">
                              Dữ liệu hiện tại đã đồng nhất đầy đủ với bản sao lưu này!
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeTab === 'BATCHES' && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-700">
                        Danh sách các đợt gom hàng chỉ có trong bản sao lưu ({diffResult.batchesDiff.onlyInSnapshot.length}):
                      </div>
                      {diffResult.batchesDiff.onlyInSnapshot.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                          Không có đợt gom nào bị thiếu so với bản sao lưu này.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {diffResult.batchesDiff.onlyInSnapshot.map((b) => (
                            <div
                              key={b.batch_id}
                              className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{b.batch_name}</div>
                                <div className="text-[11px] text-slate-500 font-mono">Mã đợt: {b.batch_code || b.batch_id}</div>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-md">
                                  Trạng thái: {b.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'ORDERS' && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-700">
                        Danh sách các đơn hàng chỉ có trong bản sao lưu ({diffResult.ordersDiff.onlyInSnapshot.length}):
                      </div>
                      {diffResult.ordersDiff.onlyInSnapshot.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                          Không có đơn hàng nào bị thiếu so với bản sao lưu này.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {diffResult.ordersDiff.onlyInSnapshot.map((o) => (
                            <div
                              key={o.order_id}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900">
                                  {o.order_code} - {o.customer_name} ({o.customer_building} - {o.customer_room})
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {o.items?.map((it) => `${it.product_name} (${it.quantity_ordered} ${it.unit})`).join(', ')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-black text-teal-900">{formatCurrency(o.total)}</div>
                                <span className="text-[10px] font-bold text-slate-500">{o.payment_status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'SETTINGS' && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-teal-800" /> So Sánh Cấu Hình Cửa Hàng & Tài Khoản Ngân Hàng:
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                          <div className="font-bold text-slate-700">Cấu hình máy hiện tại:</div>
                          <div className="text-slate-600">Cửa hàng: <b>{currentData.storeSettings.store_name}</b></div>
                          <div className="text-slate-600">Chung cư: <b>{currentData.storeSettings.condo_name}</b></div>
                          <div className="text-slate-600">Hotline: <b>{currentData.storeSettings.hotline}</b></div>
                          <div className="text-slate-600">Ngân hàng: <b>{diffResult.settingsDiff.currentBank}</b></div>
                        </div>

                        <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 space-y-1.5">
                          <div className="font-bold text-teal-900">Cấu hình trong bản sao lưu:</div>
                          <div className="text-slate-700">Cửa hàng: <b>{selectedSnapshot.data.storeSettings.store_name}</b></div>
                          <div className="text-slate-700">Chung cư: <b>{selectedSnapshot.data.storeSettings.condo_name}</b></div>
                          <div className="text-slate-700">Hotline: <b>{selectedSnapshot.data.storeSettings.hotline}</b></div>
                          <div className="text-slate-700">Ngân hàng: <b>{diffResult.settingsDiff.snapshotBank}</b></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Tự động lưu trữ an toàn trước mỗi lần khôi phục hoặc đăng xuất tài khoản Google.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isRestoreConfirmOpen}
        onClose={() => setIsRestoreConfirmOpen(false)}
        onConfirm={handleRestore}
        title="Xác nhận khôi phục dữ liệu từ bản sao lưu"
        message={`Hệ thống sẽ tự động tạo 1 bản sao lưu an toàn cho dữ liệu hiện tại trước, sau đó khôi phục toàn bộ ${selectedSnapshot?.summary.ordersCount} đơn hàng và ${selectedSnapshot?.summary.batchesCount} đợt gom từ bản "${selectedSnapshot?.title}". Bạn có chắc chắn muốn khôi phục?`}
        confirmText="Khôi phục ngay"
      />

      <ConfirmModal
        isOpen={isMergeConfirmOpen}
        onClose={() => setIsMergeConfirmOpen(false)}
        onConfirm={handleMerge}
        title="Xác nhận gộp dữ liệu từ bản sao lưu"
        message="Hệ thống sẽ bổ sung các đợt gom, đơn hàng và danh bạ cư dân còn thiếu từ bản sao lưu này vào máy mà không ghi đè hay làm mất dữ liệu hiện tại. Bạn có muốn tiếp tục?"
        confirmText="Gộp dữ liệu ngay"
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa bản sao lưu"
        message="Bản sao lưu này sẽ bị xóa khỏi lịch sử lưu trữ. Thao tác này không thể hoàn tác. Bạn có chắc chắn muốn xóa?"
        isDangerous={true}
        confirmText="Xóa bản sao lưu"
      />
    </div>
  );
};
