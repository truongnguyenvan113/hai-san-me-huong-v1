import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  Customer,
  Product,
  Order,
  Batch,
  BatchStatus,
  PaymentTransaction,
  AuditLog,
  StoreSettings,
  BatchItemSummary,
  BackupSnapshot,
  BackupData,
  SnapshotTrigger,
  DiffComparisonResult
} from '../types';
import { storage } from '../services/storage';
import {
  autoSyncAll,
  pullAndRestoreFromGoogleSheets,
  exportSettingsToGoogleSheets,
  searchSpreadsheetsOnDrive,
  createSeafoodSpreadsheet,
  SyncStats,
  RestoreStats,
} from '../services/googleSheets';
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
  pullFromSheets: (targetSpreadsheetId?: string) => Promise<RestoreStats | null>;
  exportSettingsToSheets: () => Promise<boolean>;
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
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;
  selectedCompareSnapshot: BackupSnapshot | null;
  setSelectedCompareSnapshot: (snapshot: BackupSnapshot | null) => void;
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

  // Snapshots & Safe Backup Comparison
  snapshots: BackupSnapshot[];
  createSnapshot: (trigger?: SnapshotTrigger, customTitle?: string) => BackupSnapshot;
  deleteSnapshot: (snapshotId: string) => void;
  restoreFromSnapshot: (snapshot: BackupSnapshot, saveBackupFirst?: boolean) => boolean;
  mergeFromSnapshot: (snapshot: BackupSnapshot) => {
    restoredOrders: number;
    restoredBatches: number;
    restoredCustomers: number;
    restoredProducts: number;
  };
  compareDataDiff: (currentData: BackupData, snapshotData: BackupData) => DiffComparisonResult;
  getCurrentBackupData: () => BackupData;

  // Actions
  updateSettings: (s: StoreSettings) => void;
  updateStoreSettings: (s: StoreSettings) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  addBatch: (b: Batch) => void;
  updateBatch: (b: Batch, cascadeToOrders?: boolean) => void;
  advanceBatchStage: (batchId: string, newStatus: BatchStatus, cascadeToOrders?: boolean) => Promise<boolean>;
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
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedCompareSnapshot, setSelectedCompareSnapshot] = useState<BackupSnapshot | null>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(() => storage.getSnapshots());

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
        storage.getProducts(),
        storage.getSettings()
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
      const isAuthErr =
        err?.message?.includes('hết hạn') ||
        err?.message?.includes('đăng nhập') ||
        err?.message?.includes('authentication credentials') ||
        err?.message?.includes('UNAUTHENTICATED');
      setSyncStatus(isAuthErr ? 'UNAUTHENTICATED' : 'ERROR');
      return false;
    }
  };

  const triggerSyncNow = async (): Promise<boolean> => {
    return await executeAutoSync(true);
  };

  // REVERSE SYNC / PULL from Google Sheets back into app
  const pullFromSheets = async (targetSpreadsheetId?: string): Promise<RestoreStats | null> => {
    const activeSpreadsheetId = targetSpreadsheetId || spreadsheetId || localStorage.getItem('seafood_sheets_spreadsheet_id') || '';
    if (!activeSpreadsheetId) {
      addToast('error', 'Chưa có Google Sheets', 'Vui lòng liên kết tệp Google Sheets trước khi tải dữ liệu');
      return null;
    }

    const token = await getAccessToken();
    if (!token) {
      setSyncStatus('UNAUTHENTICATED');
      addToast('warning', 'Chưa đăng nhập Google', 'Vui lòng kết nối tài khoản Google để tải dữ liệu');
      return null;
    }

    try {
      setSyncStatus('SYNCING');
      const restoreStats = await pullAndRestoreFromGoogleSheets(activeSpreadsheetId);
      refreshData();
      
      // Select the first batch if any batches were restored
      const latestBatches = storage.getBatches();
      if (latestBatches.length > 0) {
        setSelectedBatchId(latestBatches[0].batch_id);
        storage.setCurrentBatchId(latestBatches[0].batch_id);
      }

      setSyncStatus('SYNCED');
      addToast(
        'success',
        'Đã nạp dữ liệu từ Google Sheets thành công',
        `Đã nạp: ${restoreStats.batchesCount} đợt gom, ${restoreStats.ordersCount} đơn hàng, ${restoreStats.customersCount} cư dân, ${restoreStats.productsCount} hải sản!`
      );
      return restoreStats;
    } catch (err: any) {
      console.error('Lỗi khi nạp dữ liệu từ Google Sheets:', err);
      const isAuthErr =
        err?.message?.includes('hết hạn') ||
        err?.message?.includes('đăng nhập') ||
        err?.message?.includes('authentication credentials') ||
        err?.message?.includes('UNAUTHENTICATED');
      setSyncStatus(isAuthErr ? 'UNAUTHENTICATED' : 'ERROR');
      addToast('error', 'Lỗi đồng bộ từ Sheets', err?.message || 'Không thể đọc dữ liệu từ tệp Google Sheets');
      return null;
    }
  };

  // Export only settings to Google Sheets
  const exportSettingsToSheets = async (): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) {
      setSyncStatus('UNAUTHENTICATED');
      addToast('warning', 'Chưa đăng nhập Google', 'Vui lòng kết nối tài khoản Google để xuất cấu hình');
      return false;
    }

    let activeSpreadsheetId = spreadsheetId || localStorage.getItem('seafood_sheets_spreadsheet_id') || '';

    // If no spreadsheet is bound yet, auto search or create it
    if (!activeSpreadsheetId) {
      try {
        const searchResults = await searchSpreadsheetsOnDrive('Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư');
        if (searchResults && searchResults.length > 0) {
          activeSpreadsheetId = searchResults[0].id;
          setSpreadsheetId(activeSpreadsheetId);
          setSpreadsheetUrl(searchResults[0].url);
          localStorage.setItem('seafood_sheets_spreadsheet_id', activeSpreadsheetId);
          localStorage.setItem('seafood_sheets_spreadsheet_url', searchResults[0].url);
        } else {
          const created = await createSeafoodSpreadsheet('Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư');
          activeSpreadsheetId = created.spreadsheetId;
          setSpreadsheetId(created.spreadsheetId);
          setSpreadsheetUrl(created.spreadsheetUrl);
          localStorage.setItem('seafood_sheets_spreadsheet_id', created.spreadsheetId);
          localStorage.setItem('seafood_sheets_spreadsheet_url', created.spreadsheetUrl);
        }
      } catch (err: any) {
        addToast('error', 'Lỗi tìm hoặc tạo Sheets', err?.message || 'Không thể tạo tệp Google Sheets');
        return false;
      }
    }

    try {
      await exportSettingsToGoogleSheets(activeSpreadsheetId, storage.getSettings());
      addToast('success', 'Đã lưu cấu hình lên Google Sheets', 'Tab "Cấu Hình Hệ Thống" đã được cập nhật thành công!');
      return true;
    } catch (err: any) {
      const isAuthErr =
        err?.message?.includes('hết hạn') ||
        err?.message?.includes('đăng nhập') ||
        err?.message?.includes('authentication credentials') ||
        err?.message?.includes('UNAUTHENTICATED');
      if (isAuthErr) setSyncStatus('UNAUTHENTICATED');
      addToast('error', 'Lỗi xuất cấu hình', err?.message || 'Không thể ghi cấu hình lên Google Sheets');
      return false;
    }
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
    addToast('success', 'Đã lưu danh mục hải sản', `${product.product_name} - Đang đồng bộ lên Google Sheets...`);
    executeAutoSync(true);
  };

  const updateProduct = (product: Product) => {
    storage.updateProduct(product);
    setProducts(storage.getProducts());
    addToast('success', 'Đã cập nhật hải sản', `${product.product_name} - Đang đồng bộ lên Google Sheets...`);
    executeAutoSync(true);
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
    addToast('success', 'Đã tạo đợt hàng mới', `${batch.batch_name} - Đang đồng bộ lên Google Sheets...`);
    // Trigger immediate push to Google Sheets
    executeAutoSync(true);
  };

  const updateBatch = (batch: Batch, cascadeToOrders: boolean = true) => {
    storage.updateBatch(batch);

    if (cascadeToOrders) {
      // Map batch stage progression to orders in this batch
      const currentOrders = storage.getOrders();
      let hasOrderChanges = false;

      const updatedOrders = currentOrders.map((o) => {
        if (o.batch_id === batch.batch_id && o.status !== 'CANCELLED') {
          let newOrderStatus: Order['status'] = o.status;
          let newDeliveryStatus: Order['delivery_status'] = o.delivery_status;

          if (batch.status === 'COLLECTING' || batch.status === 'OPEN') {
            newOrderStatus = 'COLLECTING';
          } else if (batch.status === 'CONFIRMED') {
            newOrderStatus = 'CONFIRMED';
          } else if (batch.status === 'ORDERED') {
            newOrderStatus = 'ORDERED';
          } else if (batch.status === 'RECEIVED') {
            newOrderStatus = 'RECEIVED';
          } else if (batch.status === 'DISTRIBUTING') {
            newOrderStatus = o.is_packed ? 'PACKED' : 'RECEIVED';
          } else if (batch.status === 'DELIVERING') {
            newOrderStatus = 'DELIVERING';
            newDeliveryStatus = 'DELIVERING';
          } else if (batch.status === 'COMPLETED') {
            newOrderStatus = 'DELIVERED';
            newDeliveryStatus = 'DELIVERED';
          }

          if (newOrderStatus !== o.status || newDeliveryStatus !== o.delivery_status) {
            hasOrderChanges = true;
            return {
              ...o,
              status: newOrderStatus,
              delivery_status: newDeliveryStatus,
              updated_at: new Date().toISOString(),
            };
          }
        }
        return o;
      });

      if (hasOrderChanges) {
        storage.saveOrders(updatedOrders);
        setOrders(storage.getOrders());
      }
    }

    setBatches(storage.getBatches());
    addToast('success', 'Đã cập nhật tiến trình đợt hàng', `${batch.batch_name} - Đang đẩy lên Google Sheets...`);
    // Immediately push to Google Sheets
    executeAutoSync(true);
  };

  const advanceBatchStage = async (batchId: string, newStatus: BatchStatus, cascadeToOrders: boolean = true): Promise<boolean> => {
    const currentBatches = storage.getBatches();
    const batch = currentBatches.find((b) => b.batch_id === batchId);
    if (!batch) return false;

    const updatedBatch: Batch = {
      ...batch,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    updateBatch(updatedBatch, cascadeToOrders);
    return true;
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
    setSnapshots(storage.getSnapshots());
    addToast('info', 'Khôi phục dữ liệu mẫu', 'Đã nạp lại bộ dữ liệu hải sản mẫu đầy đủ');
  };

  const createSnapshot = (trigger: SnapshotTrigger = 'MANUAL', customTitle?: string) => {
    const snap = storage.createSnapshot(trigger, customTitle);
    setSnapshots(storage.getSnapshots());
    addToast('success', 'Đã tạo bản sao lưu', `${snap.title} (${snap.summary.ordersCount} đơn, ${snap.summary.batchesCount} đợt gom)`);
    return snap;
  };

  const deleteSnapshot = (snapshotId: string) => {
    const success = storage.deleteSnapshot(snapshotId);
    if (success) {
      setSnapshots(storage.getSnapshots());
      addToast('info', 'Đã xóa bản sao lưu', 'Bản sao lưu đã được gỡ khỏi danh sách lưu trữ');
    }
  };

  const restoreFromSnapshot = (snapshot: BackupSnapshot, saveBackupFirst = true) => {
    const ok = storage.restoreFromSnapshot(snapshot, saveBackupFirst);
    if (ok) {
      refreshData();
      setSnapshots(storage.getSnapshots());
      addToast('success', 'Khôi phục thành công', `Đã khôi phục toàn bộ dữ liệu từ bản [${snapshot.title}]!`);
    } else {
      addToast('error', 'Lỗi khôi phục', 'Không thể khôi phục dữ liệu từ bản sao lưu này');
    }
    return ok;
  };

  const mergeFromSnapshot = (snapshot: BackupSnapshot) => {
    const stats = storage.mergeFromSnapshot(snapshot);
    refreshData();
    setSnapshots(storage.getSnapshots());
    addToast(
      'success',
      'Gộp dữ liệu thành công',
      `Đã bổ sung: +${stats.restoredBatches} đợt gom, +${stats.restoredOrders} đơn hàng, +${stats.restoredCustomers} cư dân!`
    );
    return stats;
  };

  const compareDataDiff = (currentData: BackupData, snapshotData: BackupData) => {
    return storage.compareDataDiff(currentData, snapshotData);
  };

  const getCurrentBackupData = () => {
    return storage.getCurrentBackupData();
  };

  // Periodic 2-Hour Auto Backup Engine Check
  useEffect(() => {
    // Run on startup
    const initialSnap = storage.checkAndTriggerAutoBackup(2);
    if (initialSnap) {
      setSnapshots(storage.getSnapshots());
    }

    // Check periodically every 5 minutes
    const interval = setInterval(() => {
      const autoSnap = storage.checkAndTriggerAutoBackup(2);
      if (autoSnap) {
        setSnapshots(storage.getSnapshots());
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

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
      setSnapshots(storage.getSnapshots());
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
        pullFromSheets,
        exportSettingsToSheets,
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
        isCompareModalOpen,
        setIsCompareModalOpen,
        selectedCompareSnapshot,
        setSelectedCompareSnapshot,
        printModalConfig,
        setPrintModalConfig,
        snapshots,
        createSnapshot,
        deleteSnapshot,
        restoreFromSnapshot,
        mergeFromSnapshot,
        compareDataDiff,
        getCurrentBackupData,
        updateSettings,
        updateStoreSettings: updateSettings,
        addProduct,
        updateProduct,
        addCustomer,
        updateCustomer,
        addBatch,
        updateBatch,
        advanceBatchStage,
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

