import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Plus,
  Printer,
  Package,
  Menu,
  ShoppingBag,
  Bell,
  Scale,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const {
    storeSettings,
    currentBatch,
    batches,
    orders,
    syncStatus,
    spreadsheetId,
    setIsCreateOrderOpen,
    setIsCreateBatchOpen,
    setIsAIScanOpen,
    setIsSheetsSyncOpen,
    setPrintModalConfig,
    setSelectedBatchId,
    setActiveTab,
  } = useApp();

  const activeBatch = currentBatch || batches[0];
  const pendingDeliveryCount = orders.filter(
    (o) => o.status !== 'CANCELLED' && o.delivery_status !== 'DELIVERED'
  ).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-800 flex items-center justify-center text-white font-black shadow-sm text-lg">
            🦐
          </div>
          <div>
            <div className="font-black text-slate-900 text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5">
              <span>{storeSettings?.store_name || 'Hải Sản Tươi Quê'}</span>
              <span className="text-[10px] bg-teal-100 text-teal-900 font-bold px-1.5 py-0.2 rounded">
                {storeSettings?.condo_name || 'Chung Cư'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 hidden sm:block">
              Quản lý gom đơn hải sản quê & giao tận phòng
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Active Batch Tag */}
      {activeBatch && (
        <button
          onClick={() => {
            setSelectedBatchId(activeBatch.batch_id);
            setActiveTab('BATCH_DETAIL');
          }}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs text-teal-900 font-bold transition-colors"
        >
          <Package className="w-4 h-4 text-teal-800" />
          <span>Đợt hiện tại: {activeBatch.batch_name}</span>
          <span className="bg-teal-800 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
            {activeBatch.batch_code}
          </span>
        </button>
      )}

      {/* Right: Quick Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          id="nav-sheets-sync-btn"
          onClick={() => setIsSheetsSyncOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl border shadow-2xs transition-all active:scale-95 ${
            syncStatus === 'SYNCING'
              ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-200 animate-pulse'
              : syncStatus === 'SYNCED'
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              : syncStatus === 'UNAUTHENTICATED'
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              : syncStatus === 'ERROR'
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title={
            syncStatus === 'SYNCING'
              ? 'Đang tự động lưu lên Google Sheets...'
              : syncStatus === 'SYNCED'
              ? 'Tự động đồng bộ Google Sheets: Đã cập nhật mới nhất'
              : syncStatus === 'UNAUTHENTICATED'
              ? 'Chưa đăng nhập Google hoặc phiên đã hết hạn - Nhấn để kết nối lại'
              : 'Đồng bộ dữ liệu sang Google Sheets (7 Sheets Tabs)'
          }
        >
          {syncStatus === 'SYNCING' ? (
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          )}

          <span className="hidden sm:inline">
            {syncStatus === 'SYNCING'
              ? 'Đang lưu Sheets...'
              : syncStatus === 'SYNCED'
              ? 'Đã đồng bộ Sheets'
              : syncStatus === 'UNAUTHENTICATED'
              ? 'Kết nối Sheets'
              : syncStatus === 'ERROR'
              ? 'Lỗi Sheets'
              : 'Google Sheets'}
          </span>

          {syncStatus === 'SYNCED' && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
          {syncStatus === 'UNAUTHENTICATED' && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          id="nav-ai-scan-batch-btn"
          onClick={() => setIsAIScanOpen(true)}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-transform active:scale-95 border border-amber-400/50"
          title="Quét ảnh ghi chú Zalo/Notes để tự tạo đợt gom hàng bằng AI"
        >
          <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
          <span className="hidden sm:inline">⚡ Quét Ảnh (AI)</span>
          <span className="sm:hidden">Quét Ảnh</span>
        </button>

        <button
          id="nav-quick-create-order-btn"
          onClick={() => setIsCreateOrderOpen(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">+ Tạo Đơn Mới</span>
          <span className="sm:hidden">Tạo Đơn</span>
        </button>

        {activeBatch && (
          <button
            id="nav-batch-print-btn"
            onClick={() => {
              setPrintModalConfig({
                isOpen: true,
                mode: 'BATCH_ORDERS',
                batchId: activeBatch.batch_id,
              });
            }}
            title="In tất cả phiếu A4 đợt này"
            className="p-2 text-slate-700 hover:text-teal-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors hidden sm:flex items-center"
          >
            <Printer className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

