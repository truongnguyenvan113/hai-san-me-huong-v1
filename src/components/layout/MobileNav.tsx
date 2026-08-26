import React from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Package, Truck, Users, Home, Sparkles } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsCreateOrderOpen,
    setIsAIScanOpen,
    currentBatch,
    batches,
    setSelectedBatchId,
    orders,
  } = useApp();

  const activeBatch = currentBatch || batches[0];
  const pendingDeliveryCount = orders.filter(
    (o) => o.status !== 'CANCELLED' && o.delivery_status !== 'DELIVERED'
  ).length;

  const handleOpenCurrentBatch = () => {
    if (activeBatch) {
      setSelectedBatchId(activeBatch.batch_id);
      setActiveTab('BATCH_DETAIL');
    } else {
      setActiveTab('BATCHES');
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg">
      {/* 1. Dashboard / Home */}
      <button
        id="mobile-nav-dash-btn"
        onClick={() => setActiveTab('DASHBOARD')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
          activeTab === 'DASHBOARD' ? 'text-teal-800' : 'text-slate-500'
        }`}
      >
        <Home className="w-5 h-5" />
        <span>Tổng quan</span>
      </button>

      {/* 2. Đợt hàng hiện tại */}
      <button
        id="mobile-nav-batch-btn"
        onClick={handleOpenCurrentBatch}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
          activeTab === 'BATCH_DETAIL' || activeTab === 'BATCHES' ? 'text-teal-800' : 'text-slate-500'
        }`}
      >
        <Package className="w-5 h-5" />
        <span>Đợt gom</span>
      </button>

      {/* 3. ⚡ AI Quick Scan (Center Prominent Button) */}
      <button
        id="mobile-nav-ai-scan-btn"
        onClick={() => setIsAIScanOpen(true)}
        className="flex flex-col items-center -mt-5"
        title="Quét ảnh ghi chú Zalo tạo đợt tự động"
      >
        <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform active:scale-95">
          <Sparkles className="w-6 h-6 fill-slate-950" />
        </div>
        <span className="text-[10px] font-black text-amber-950 mt-0.5">⚡ Quét Ảnh</span>
      </button>

      {/* 4. Đơn cần giao */}
      <button
        id="mobile-nav-delivery-btn"
        onClick={() => setActiveTab('DELIVERY')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
          activeTab === 'DELIVERY' ? 'text-teal-800' : 'text-slate-500'
        }`}
      >
        <Truck className="w-5 h-5" />
        <span>Cần giao</span>
        {pendingDeliveryCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {pendingDeliveryCount}
          </span>
        )}
      </button>

      {/* 5. Khách hàng */}
      <button
        id="mobile-nav-customers-btn"
        onClick={() => setActiveTab('CUSTOMERS')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
          activeTab === 'CUSTOMERS' ? 'text-teal-800' : 'text-slate-500'
        }`}
      >
        <Users className="w-5 h-5" />
        <span>Cư dân</span>
      </button>
    </nav>
  );
};
