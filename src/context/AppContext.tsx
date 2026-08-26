import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  Customer,
  Product,
  Order,
  Batch,
  PaymentTransaction,
  AuditLog,
  StoreSettings,
  BatchItemSummary
} from '../types';
import { storage } from '../services/storage';
import { autoSyncAll, SyncStats } from '../services/googleSheets';
import { getAccessToken } from '../services/googleAuth';

export type ActiveTab = 
  | 'DASHBOARD'
  | 'ORDERS'
  | 'BATCHES'
  | 'BATCH_DETAIL'
  | 'PRODUCTS'
  | 'CUSTOMERS'
  | 'CUSTOMER_DETAIL'
  | 'DELIVERY'
  | 'PAYMENTS'
  | 'REPORTS'
  | 'SETTINGS';

export type SyncStatusType = 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'UNAUTHENTICATED';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  title: string;
  message: string;
}

interface AppContextType {
  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedBatchId: string | null;
  setSelectedBatchId: (id: string | null) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  
  // Search & Global Filter
  globalSearch: string;
  setGlobalSearch: (s: string) => void;

  // Data
  settings: StoreSettings;
  storeSettings: StoreSettings;
  products: Product[];
  customers: Customer[];
  batches: Batch[];
  orders: Order[];
  payments: PaymentTransaction[];
  auditLogs: AuditLog[];
  currentBatch: Batch | null;

  // Google Sheets Auto-Sync States
  syncStatus: SyncStatusType;
  lastSyncStats: SyncStats | null;
  spreadsheetId: string;
  spreadsheetUrl: string;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  triggerSyncNow: () => Promise<boolean>;
  setSpreadsheetInfo: (id: string, url: string) => void;

  // Modals & UI States
  isCreateOrderOpen: boolean;
  setIsCreateOrderOpen: (open: boolean) => void;
  isCreateBatchOpen: boolean;
  setIsCreateBatchOpen: (open: boolean) => void;
  isCreateProductOpen: boolean;
  setIsCreateProductOpen: (open: boolean) => void;
  isCreateCustomerOpen: boolean;
  setIsCreateCustomerOpen: (open: boolean) => void;
  isAIScanOpen: boolean;
  setIsAIScanOpen: (open: boolean) => void;
  isSheetsSyncOpen: boolean;
  setIsSheetsSyncOpen: (open: boolean) => void;
  printModalConfig: {
    isOpen: boolean;
    mode: 'SINGLE_ORDER' | 'BATCH_ORDERS' | 'DELIVERY_LIST';
    orderId?: string;
    batchId?: string;
  };
  setPrintModalConfig: (config: {
    isOpen: boolean;
    mode: 'SINGLE_ORDER' | 'BATCH_ORDERS' | 'DELIVERY_LIST';
    orderId?: string;
    batchId?: string;
  }) => void;

  // Actions
  updateSettings: (s: StoreSettings) => void;
  updateStoreSettings: (s: StoreSettings) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  addBatch: (b: Batch) => void;
  updateBatch: (b: Batch) => void;
  setCurrentBatch: (batchId: string) => void;
  addOrder: (o: Order) => void;
  updateOrder: (o: Order) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  updateBatchActualPrices: (batchId: string, priceMap: Record<string, number>) => void;
  addPayment: (p: PaymentTransaction) => void;
  refreshData: () => void;
  resetSampleData: () => void;
  resetToSampleData: () => void;
  exportDataAsJSON: () => void;
  importDataFromJSON: (jsonStr: string) => boolean;

  // Toasts (accepts either (type, title, message) or ({ type, title, message }))
  toasts: ToastMessage[];
  addToast: (
    typeOrObj: ToastMessage['type'] | { type: string; title: string; message: string },
    title?: string,
    message?: string
  ) => void;
  removeToast: (id: string) => void;

  // Helpers
  getBatchItemSummary: (batchId: string) => BatchItemSummary[];
  getCustomerById: (id: string) => Customer | undefined;
  getProductById: (id: string) => Product | undefined;
  getOrderById: (id: string) => Order | undefined;
  getBatchById: (id: string) => Batch | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  const [settings, setSettings] = useState<StoreSettings>(storage.getSettings());
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Google Sheets Sync States
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('IDLE');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('seafood_sheets_autosync') !== 'false';
  });
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('seafood_sheets_spreadsheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('seafood_sheets_spreadsheet_url') || '';
  });
  const [lastSyncStats, setLastSyncStats] = useState<SyncStats | null>(() => {
    try {
      const saved = localStorage.getItem('seafood_sheets_last_sync');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isAIScanOpen, setIsAIScanOpen] = useState(false);
  const [isSheetsSyncOpen, setIsSheetsSyncOpen] = useState(false);

  const [printModalConfig, setPrintModalConfig] = useState<{
    isOpen: boolean;
    mode: 'SINGLE_ORDER' | 'BATCH_ORDERS' | 'DELIVERY_LIST';
    orderId?: string;
    batchId?: string;
  }>({
    isOpen: false,
    mode: 'SINGLE_ORDER',
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isInitialLoad = useRef(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = (
    typeOrObj: ToastMessage['type'] | { type: string; title: string; message: string },
    title?: string,
    message?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let tType: ToastMessage['type'] = 'info';
    let tTitle = '';
    let tMessage = '';

    if (typeof typeOrObj === 'object' && typeOrObj !== null) {
      tType = (typeOrObj.type?.toLowerCase() as any) || 'info';
      tTitle = typeOrObj.title;
      tMessage = typeOrObj.message;
    } else if (typeof typeOrObj === 'string') {
      tType = (typeOrObj.toLowerCase() as any) || 'info';
      tTitle = title || '';
      tMessage = message || '';
    }

    setToasts((prev) => [...prev, { id, type: tType, title: tTitle, message: tMessage }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setSpreadsheetInfo = (id: string, url: string) => {
    setSpreadsheetId(id);
    setSpreadsheetUrl(url);
    localStorage.setItem('seafood_sheets_spreadsheet_id', id);
    localStorage.setItem('seafood_sheets_spreadsheet_url', url);
  };

  const refreshData = () => {
    storage.init();
    setSettings(storage.getSettings());
    setProducts(storage.getProducts());
    setCustomers(storage.getCustomers());
    setBatches(storage.getBatches());
    setOrders(storage.getOrders());
    setPayments(storage.getPayments());
    setAuditLogs(storage.getAuditLogs());

    const curBatchId = storage.getCurrentBatchId();
    if (curBatchId && !selectedBatchId) {
      setSelectedBatchId(curBatchId);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // AUTO-SYNC ENGINE: Debounced synchronization on state changes
  const executeAutoSync = async (isManual = false) => {
    if (!autoSyncEnabled && !isManual) return false;

    const token = await getAccessToken();
    if (!token) {
      setSyncStatus('UNAUTHENTICATED');
      return false;
    }

    try {
      setSyncStatus('SYNCING');
      const result = await autoSyncAll(
        storage.getOrders(),
        storage.getBatches(),
        storage.getCustomers(),
        storage.getProducts()
      );

      if (result) {
        setSpreadsheetId(result.spreadsheetId);
        setSpreadsheetUrl(result.spreadsheetUrl);
        setLastSyncStats(result.stats);
        setSyncStatus('SYNCED');
        return true;
      }
      setSyncStatus('IDLE');
      return false;
    } catch (err: any) {
      console.warn('Auto-sync Google Sheets notice:', err?.message);
      setSyncStatus('ERROR');
      return false;
    }
  };

  const triggerSyncNow = async (): Promise<boolean> => {
    return await executeAutoSync(true);
  };

  // Watch for data updates and trigger debounced sync
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    if (!autoSyncEnabled) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      executeAutoSync();
    }, 1800);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [orders, batches, customers, products, payments, autoSyncEnabled]);

  const currentBatch = batches.find((b) => b.batch_id === (selectedBatchId || storage.getCurrentBatchId())) || batches[0] || null;

  const updateSettings = (newSettings: StoreSettings) => {
    storage.saveSettings(newSettings);
    setSettings(newSettings);
    addToast('success', 'Thành công', 'Đã lưu cấu hình cửa hàng');
  };

  const addProduct = (product: Product) => {
    storage.addProduct(product);
    setProducts(storage.getProducts());
    addToast('success', 'Đã thêm sản phẩm', product.product_name);
  };

  const updateProduct = (product: Product) => {
    storage.updateProduct(product);
    setProducts(storage.getProducts());
    addToast('success', 'Đã cập nhật', product.product_name);
  };

  const addCustomer = (customer: Customer) => {
    storage.addCustomer(customer);
    setCustomers(storage.getCustomers());
    addToast('success', 'Đã thêm khách hàng', `${customer.name} (${customer.building} - ${customer.room})`);
  };

  const updateCustomer = (customer: Customer) => {
    storage.updateCustomer(customer);
    setCustomers(storage.getCustomers());
    addToast('success', 'Đã cập nhật', customer.name);
  };

  const addBatch = (batch: Batch) => {
    storage.addBatch(batch);
    setBatches(storage.getBatches());
    setSelectedBatchId(batch.batch_id);
    addToast('success', 'Đã tạo đợt hàng mới', `${batch.batch_name} - Tự động đồng bộ Google Sheets`);
  };

  const updateBatch = (batch: Batch) => {
    storage.updateBatch(batch);
    setBatches(storage.getBatches());
    addToast('success', 'Đã cập nhật đợt hàng', batch.batch_name);
  };

  const setCurrentBatch = (batchId: string) => {
    storage.setCurrentBatchId(batchId);
    setSelectedBatchId(batchId);
    addToast('info', 'Chuyển đợt hàng', `Đã chọn đợt ${batchId}`);
  };

  const addOrder = (order: Order) => {
    storage.addOrder(order);
    setOrders(storage.getOrders());
    addToast('success', 'Tạo đơn thành công', `${order.order_code} - Phòng ${order.customer_room}`);
  };

  const updateOrder = (order: Order) => {
    storage.updateOrder(order);
    setOrders(storage.getOrders());
    addToast('success', 'Đã cập nhật đơn hàng', `${order.order_code}`);
  };

  const cancelOrder = (orderId: string, reason?: string) => {
    storage.cancelOrder(orderId, reason);
    setOrders(storage.getOrders());
    addToast('warning', 'Đã hủy đơn hàng', `Mã đơn: ${orderId}`);
  };

  const updateBatchActualPrices = (batchId: string, priceMap: Record<string, number>) => {
    storage.updateBatchActualPrices(batchId, priceMap);
    setOrders(storage.getOrders());
    addToast('success', 'Cập nhật giá thực tế', 'Đã cập nhật giá mới cho tất cả đơn trong đợt');
  };

  const addPayment = (payment: PaymentTransaction) => {
    storage.addPayment(payment);
    setPayments(storage.getPayments());
    setOrders(storage.getOrders());
    addToast('success', 'Thu tiền thành công', `+${payment.amount.toLocaleString()}đ cho đơn ${payment.order_code}`);
  };

  const resetSampleData = () => {
    storage.resetToSampleData();
    refreshData();
    addToast('info', 'Khôi phục dữ liệu mẫu', 'Đã nạp lại bộ dữ liệu hải sản mẫu đầy đủ');
  };

  const exportDataAsJSON = () => {
    const jsonStr = storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haisan-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Đã tải xuống', 'Tệp sao lưu dữ liệu JSON đã được lưu');
  };

  const importDataFromJSON = (jsonStr: string): boolean => {
    const ok = storage.importAllData(jsonStr);
    if (ok) {
      refreshData();
    }
    return ok;
  };

  const getBatchItemSummary = (batchId: string) => storage.getBatchItemSummary(batchId);
  const getCustomerById = (id: string) => customers.find((c) => c.customer_id === id);
  const getProductById = (id: string) => products.find((p) => p.product_id === id);
  const getOrderById = (id: string) => orders.find((o) => o.order_id === id);
  const getBatchById = (id: string) => batches.find((b) => b.batch_id === id);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedBatchId,
        setSelectedBatchId,
        selectedCustomerId,
        setSelectedCustomerId,
        selectedOrderId,
        setSelectedOrderId,
        globalSearch,
        setGlobalSearch,
        settings,
        storeSettings: settings,
        products,
        customers,
        batches,
        orders,
        payments,
        auditLogs,
        currentBatch,
        syncStatus,
        lastSyncStats,
        spreadsheetId,
        spreadsheetUrl,
        autoSyncEnabled,
        setAutoSyncEnabled: (enabled: boolean) => {
          setAutoSyncEnabled(enabled);
          localStorage.setItem('seafood_sheets_autosync', String(enabled));
          if (enabled) executeAutoSync();
        },
        triggerSyncNow,
        setSpreadsheetInfo,
        isCreateOrderOpen,
        setIsCreateOrderOpen,
        isCreateBatchOpen,
        setIsCreateBatchOpen,
        isCreateProductOpen,
        setIsCreateProductOpen,
        isCreateCustomerOpen,
        setIsCreateCustomerOpen,
        isAIScanOpen,
        setIsAIScanOpen,
        isSheetsSyncOpen,
        setIsSheetsSyncOpen,
        printModalConfig,
        setPrintModalConfig,
        updateSettings,
        updateStoreSettings: updateSettings,
        addProduct,
        updateProduct,
        addCustomer,
        updateCustomer,
        addBatch,
        updateBatch,
        setCurrentBatch,
        addOrder,
        updateOrder,
        cancelOrder,
        updateBatchActualPrices,
        addPayment,
        refreshData,
        resetSampleData,
        resetToSampleData: resetSampleData,
        exportDataAsJSON,
        importDataFromJSON,
        toasts,
        addToast,
        removeToast,
        getBatchItemSummary,
        getCustomerById,
        getProductById,
        getOrderById,
        getBatchById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

