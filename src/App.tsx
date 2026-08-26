import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { BatchesView } from './components/batches/BatchesView';
import { BatchDetailView } from './components/batches/BatchDetailView';
import { OrdersView } from './components/orders/OrdersView';
import { DeliveryView } from './components/delivery/DeliveryView';
import { CustomersView } from './components/customers/CustomersView';
import { ProductsView } from './components/products/ProductsView';
import { PaymentsView } from './components/payments/PaymentsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

import { CreateOrderModal } from './components/orders/CreateOrderModal';
import { CreateBatchModal } from './components/batches/CreateBatchModal';
import { CreateCustomerModal } from './components/customers/CreateCustomerModal';
import { AIScanBatchModal } from './components/ai/AIScanBatchModal';
import { GoogleSheetsSyncModal } from './components/sheets/GoogleSheetsSyncModal';
import { BatchPrintModal } from './components/print/BatchPrintModal';
import { ToastContainer } from './components/common/Toast';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    isCreateOrderOpen,
    setIsCreateOrderOpen,
    isCreateBatchOpen,
    setIsCreateBatchOpen,
    isCreateCustomerOpen,
    setIsCreateCustomerOpen,
    isAIScanOpen,
    setIsAIScanOpen,
    isSheetsSyncOpen,
    setIsSheetsSyncOpen,
    printModalConfig,
    setPrintModalConfig,
    toasts,
    removeToast,
  } = useApp();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto open Google Sheets sync modal if URL hash or search contains sync
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSyncHash = window.location.hash.includes('sync');
      const hasSyncQuery = new URLSearchParams(window.location.search).get('sync') === 'true';
      if (hasSyncHash || hasSyncQuery) {
        setIsSheetsSyncOpen(true);
      }
    }
  }, [setIsSheetsSyncOpen]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return <DashboardView />;
      case 'BATCHES':
        return <BatchesView />;
      case 'BATCH_DETAIL':
        return <BatchDetailView />;
      case 'ORDERS':
        return <OrdersView />;
      case 'DELIVERY':
        return <DeliveryView />;
      case 'CUSTOMERS':
        return <CustomersView />;
      case 'PRODUCTS':
        return <ProductsView />;
      case 'PAYMENTS':
        return <PaymentsView />;
      case 'REPORTS':
        return <ReportsView />;
      case 'SETTINGS':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Container */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto max-w-full">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <MobileNav />

      {/* Global Modals */}
      <CreateOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
      />

      <CreateBatchModal
        isOpen={isCreateBatchOpen}
        onClose={() => setIsCreateBatchOpen(false)}
      />

      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
      />

      <AIScanBatchModal
        isOpen={isAIScanOpen}
        onClose={() => setIsAIScanOpen(false)}
      />

      <GoogleSheetsSyncModal
        isOpen={isSheetsSyncOpen}
        onClose={() => setIsSheetsSyncOpen(false)}
      />

      <BatchPrintModal
        isOpen={printModalConfig.isOpen}
        onClose={() => setPrintModalConfig({ ...printModalConfig, isOpen: false })}
        mode={printModalConfig.mode}
        batchId={printModalConfig.batchId}
        orderId={printModalConfig.orderId}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
