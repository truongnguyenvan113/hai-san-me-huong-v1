import React from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  Users,
  Sparkles,
  DollarSign,
  BarChart3,
  Settings,
  Scale,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, orders, setIsAIScanOpen, setIsSheetsSyncOpen } = useApp();

  const pendingDeliveryCount = orders.filter(
    (o) => o.status !== 'CANCELLED' && o.delivery_status !== 'DELIVERED'
  ).length;

  const unpaidCount = orders.filter(
    (o) => o.status !== 'CANCELLED' && o.debt_amount > 0
  ).length;

  const NAV_ITEMS: NavItem[] = [
    {
      id: 'DASHBOARD',
      label: 'Tổng Quan',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'BATCHES',
      label: 'Đợt Gom Hàng',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'ORDERS',
      label: 'Đơn Hàng Cư Dân',
      icon: <ShoppingBag className="w-4 h-4" />,
    },
    {
      id: 'DELIVERY',
      label: 'Giao Hàng Tận Phòng',
      icon: <Truck className="w-4 h-4" />,
      badge: pendingDeliveryCount > 0 ? pendingDeliveryCount : undefined,
    },
    {
      id: 'CUSTOMERS',
      label: 'Danh Sách Cư Dân',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'PRODUCTS',
      label: 'Bảng Giá Hải Sản',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'PAYMENTS',
      label: 'Sổ Quỹ & Công Nợ',
      icon: <DollarSign className="w-4 h-4" />,
      badge: unpaidCount > 0 ? unpaidCount : undefined,
    },
    {
      id: 'REPORTS',
      label: 'Báo Cáo Sản Lượng',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'SETTINGS',
      label: 'Cài Đặt & VietQR',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 md:top-[61px] left-0 z-40 h-full md:h-[calc(100vh-61px)] w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation list */}
        <div className="space-y-1">
          {/* Mobile Header in Drawer */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 md:hidden">
            <span className="font-bold text-slate-900 text-sm">Menu Quản Lý</span>
            <button onClick={onClose} className="p-1 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5 flex items-center justify-between">
            <span>Quy Trình Gom Hải Sản</span>
          </div>

          <button
            onClick={() => {
              setIsAIScanOpen(true);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 mb-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 border border-amber-300"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>⚡ Quét Ảnh / Ghi Chú AI</span>
          </button>

          <button
            onClick={() => {
              setIsSheetsSyncOpen(true);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 mb-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 border border-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>📊 Đồng Bộ Google Sheets</span>
          </button>

          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'BATCHES' && activeTab === 'BATCH_DETAIL');

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id.toLowerCase()}`}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-teal-900' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Condo Tip Box at bottom of sidebar */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
          <div className="font-black text-slate-900 flex items-center gap-1.5">
            <span>💡 Quy trình chuẩn:</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            1. Gom đơn cư dân <br />
            2. Chốt đặt người quê <br />
            3. Chốt giá & Cân thực tế <br />
            4. In phiếu A4 dán túi <br />
            5. Giao tận cửa phòng
          </div>
        </div>
      </aside>
    </>
  );
};
