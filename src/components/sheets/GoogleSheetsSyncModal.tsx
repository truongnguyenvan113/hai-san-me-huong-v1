import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Link2,
  Plus,
  LogOut,
  Sparkles,
  Layers,
  Database,
  Calendar,
  Check,
  Copy,
  Clock,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  Globe,
  Key,
  HelpCircle,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  setAccessTokenInMemory,
  initAuth,
} from '../../services/googleAuth';
import {
  createSeafoodSpreadsheet,
  syncAllToGoogleSheets,
  pullAndRestoreFromGoogleSheets,
  searchSpreadsheetsOnDrive,
  SyncStats,
  RestoreStats,
  SHEET_NAMES,
} from '../../services/googleSheets';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    orders,
    batches,
    customers,
    products,
    settings,
    addToast,
    syncStatus,
    autoSyncEnabled,
    setAutoSyncEnabled,
    spreadsheetId,
    spreadsheetUrl,
    lastSyncStats,
    setSpreadsheetInfo,
    triggerSyncNow,
    pullFromSheets,
    refreshData,
  } = useApp();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [manualInputId, setManualInputId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const [showConfirmPull, setShowConfirmPull] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  // Drive search state
  const [driveSheets, setDriveSheets] = useState<Array<{ id: string; name: string; url: string; modifiedTime?: string }>>([]);
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);

  // Unauthorized Domain specific state & fallback
  const [showUnauthorizedGuide, setShowUnauthorizedGuide] = useState(false);
  const [showPopupBlockedGuide, setShowPopupBlockedGuide] = useState(false);
  const [currentHostname, setCurrentHostname] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showManualToken, setShowManualToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // Function to search sheets on Drive
  const handleSearchDrive = async () => {
    setIsSearchingDrive(true);
    try {
      const results = await searchSpreadsheetsOnDrive('Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư');
      setDriveSheets(results);
    } catch (err) {
      console.warn('Drive search error:', err);
    } finally {
      setIsSearchingDrive(false);
    }
  };

  // Initialize auth listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHostname(window.location.hostname || 'ais-dev-mjrtsn6o2rldozpv2p6b5r-147582393384.asia-southeast1.run.app');
    }
    const unsubscribe = initAuth(
      (user, _token) => {
        setCurrentUser(user);
        setIsAuthLoading(false);
        handleSearchDrive();
      },
      () => {
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // Handle Google Sign In & Auto-Reverse Sync check
  const handleSignIn = async () => {
    setIsAuthLoading(true);
    setErrorMessage(null);
    setShowUnauthorizedGuide(false);
    setShowPopupBlockedGuide(false);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        addToast({
          type: 'SUCCESS',
          title: 'Đăng nhập thành công',
          message: `Đã kết nối tài khoản Google: ${res.user.email}`,
        });

        await handleSearchDrive();
        triggerSyncNow();
      }
    } catch (err: any) {
      console.error(err);
      const isPopupBlocked =
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup-blocked') ||
        err?.message?.includes('cửa sổ đăng nhập đã bị trình duyệt chặn');

      const isDomainError =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('auth/unauthorized-domain');

      if (isPopupBlocked) {
        setShowPopupBlockedGuide(true);
        setErrorMessage(
          'Trình duyệt hoặc khung hiển thị đã chặn cửa sổ Popup đăng nhập. Vui lòng mở ứng dụng trong Tab mới hoặc nhấn Cho phép Popup.'
        );
        addToast({
          type: 'WARNING',
          title: 'Cửa sổ popup bị chặn',
          message: 'Vui lòng bấm "Mở ứng dụng ở Tab mới" để đăng nhập Google thuận tiện nhất.',
        });
      } else if (isDomainError) {
        setShowUnauthorizedGuide(true);
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
        setCurrentHostname(domain);
        setErrorMessage(
          `Firebase Authentication chưa ủy quyền tên miền "${domain}". Vui lòng thêm tên miền này vào danh sách Authorized Domains trên Firebase Console.`
        );
        addToast({
          type: 'WARNING',
          title: 'Cần ủy quyền tên miền Firebase',
          message: `Tên miền ${domain} cần được thêm vào Firebase Console > Authentication > Settings > Authorized domains.`,
        });
      } else {
        setErrorMessage(err?.message || 'Đăng nhập Google thất bại');
        addToast({
          type: 'ERROR',
          title: 'Đăng nhập thất bại',
          message: err?.message || 'Không thể đăng nhập Google',
        });
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleApplyManualToken = async () => {
    if (!tokenInput.trim()) {
      addToast({
        type: 'ERROR',
        title: 'Thiếu Token',
        message: 'Vui lòng dán mã Access Token hợp lệ từ Google OAuth.',
      });
      return;
    }
    setAccessTokenInMemory(tokenInput.trim());
    setCurrentUser({
      uid: 'manual-token-user',
      email: 'connected-via-token@google.com',
      displayName: 'Tài khoản Google (Token trực tiếp)',
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
      providerId: 'google.com',
    } as any);

    setShowManualToken(false);
    setShowUnauthorizedGuide(false);
    setErrorMessage(null);
    addToast({
      type: 'SUCCESS',
      title: 'Đã nạp Access Token',
      message: 'Đã thiết lập mã xác thực Google Sheets thành công. Sẵn sàng đồng bộ!',
    });
    await handleSearchDrive();
    triggerSyncNow();
  };

  const handleSelectDriveSheet = async (sheet: { id: string; url: string; name: string }) => {
    setSpreadsheetInfo(sheet.id, sheet.url);
    addToast({
      type: 'SUCCESS',
      title: 'Đã kết nối bảng tính',
      message: `Đang tự động nạp dữ liệu từ "${sheet.name}" về ứng dụng...`,
    });
    setIsPulling(true);
    try {
      await pullFromSheets(sheet.id);
    } catch (err: any) {
      console.warn('Lỗi tự động nạp dữ liệu từ Drive Sheet:', err);
    } finally {
      setIsPulling(false);
    }
  };

  const copyDomainToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
    addToast({
      type: 'INFO',
      title: 'Đã sao chép',
      message: `Đã sao chép "${textToCopy}" vào bộ nhớ tạm.`,
    });
  };

  // Handle Google Sign Out with automatic reverse-sync protection to prevent data loss
  const handleSignOutWithAutoSync = async (pullBeforeLogout = true) => {
    setShowDisconnectDialog(false);
    try {
      if (pullBeforeLogout && spreadsheetId) {
        setIsPulling(true);
        try {
          await pullAndRestoreFromGoogleSheets(spreadsheetId);
          refreshData();
          addToast({
            type: 'SUCCESS',
            title: 'Đã bảo toàn dữ liệu',
            message: 'Đã đồng bộ dữ liệu mới nhất từ Google Sheets về máy trước khi ngắt kết nối!',
          });
        } catch (pullErr) {
          console.warn('Không thể kéo dữ liệu trước khi ngắt kết nối:', pullErr);
        } finally {
          setIsPulling(false);
        }
      }

      await googleLogout();
      setCurrentUser(null);
      addToast({
        type: 'INFO',
        title: 'Đã ngắt kết nối Google',
        message: 'Tài khoản Google Workspace đã được ngắt kết nối an toàn.',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Create new spreadsheet with all 7 tabs
  const handleCreateNewSpreadsheet = async () => {
    if (!currentUser) {
      await handleSignIn();
      return;
    }

    setIsCreatingSheet(true);
    setErrorMessage(null);
    try {
      const { spreadsheetId: newId, spreadsheetUrl: newUrl } = await createSeafoodSpreadsheet(
        'Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư'
      );
      setSpreadsheetInfo(newId, newUrl);

      addToast({
        type: 'SUCCESS',
        title: 'Đã tạo Google Sheet mới',
        message: 'Bảng tính quản lý gom đơn với 7 tab chuyên biệt (kèm Cấu hình hệ thống) đã sẵn sàng.',
      });

      // Automatically run first sync
      await executeSync(newId);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Lỗi khi tạo Google Sheet mới');
      addToast({
        type: 'ERROR',
        title: 'Không thể tạo Sheet',
        message: err?.message || 'Vui lòng kiểm tra quyền truy cập Google Sheets',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Link existing spreadsheet
  const handleLinkExistingSpreadsheet = async () => {
    if (!manualInputId.trim()) return;

    let cleanId = manualInputId.trim();
    // Extract ID if full URL pasted
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }

    const fullUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
    setSpreadsheetInfo(cleanId, fullUrl);
    setShowManualInput(false);
    setManualInputId('');

    addToast({
      type: 'SUCCESS',
      title: 'Đã liên kết Google Sheet',
      message: 'Đang tự động nạp dữ liệu từ bảng tính về ứng dụng...',
    });

    setIsPulling(true);
    try {
      await pullFromSheets(cleanId);
    } catch (err: any) {
      console.warn('Lỗi tự động nạp dữ liệu từ Sheet URL:', err);
    } finally {
      setIsPulling(false);
    }
  };

  // Perform sync execution (App -> Sheets)
  const executeSync = async (targetId = spreadsheetId) => {
    if (!targetId) {
      setErrorMessage('Chưa chọn hoặc chưa tạo Google Sheet để đồng bộ.');
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    setShowConfirmSync(false);

    try {
      const stats = await syncAllToGoogleSheets(
        targetId,
        orders,
        batches,
        customers,
        products,
        settings
      );

      localStorage.setItem('seafood_sheets_last_sync', JSON.stringify(stats));

      addToast({
        type: 'SUCCESS',
        title: 'Đồng bộ Google Sheets 7 Tabs thành công!',
        message: `Đã cập nhật ${stats.ordersCount} đơn hàng, ${stats.batchesCount} đợt gom, ${stats.customersCount} cư dân & Cấu hình hệ thống.`,
      });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Đồng bộ thất bại';
      setErrorMessage(msg);
      addToast({
        type: 'ERROR',
        title: 'Đồng bộ thất bại',
        message: msg,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Perform reverse sync execution (Sheets -> App)
  const executePull = async () => {
    if (!spreadsheetId) {
      setErrorMessage('Chưa có Google Sheet để tải dữ liệu.');
      return;
    }

    setIsPulling(true);
    setErrorMessage(null);
    setShowConfirmPull(false);

    try {
      await pullFromSheets();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Không thể đồng bộ ngược từ Google Sheets');
    } finally {
      setIsPulling(false);
    }
  };

  const copySheetUrl = () => {
    if (!spreadsheetUrl) return;
    navigator.clipboard.writeText(spreadsheetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    addToast({
      type: 'INFO',
      title: 'Đã sao chép link',
      message: 'Đã copy đường dẫn Google Sheets vào bộ nhớ tạm.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xs border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Đồng Bộ Google Sheets 7 Tabs
                </h2>
                <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-400/30">
                  2 Chiều & Cấu Hình
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium">
                Tự động lưu trữ & phục hồi toàn bộ dữ liệu đơn hàng và cấu hình hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Mở ứng dụng trong Tab trình duyệt mới (Khắc phục triệt để lỗi chặn popup)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở Tab Mới</span>
            </a>

            <button
              id="close-sheets-sync-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-900">Lỗi thao tác Google Sheets</div>
                  <div className="font-medium leading-relaxed">{errorMessage}</div>
                </div>
              </div>
              {(errorMessage.includes('hết hạn') ||
                errorMessage.includes('xác thực') ||
                errorMessage.includes('authentication') ||
                errorMessage.includes('đăng nhập')) && (
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isAuthLoading}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs shrink-0 self-start sm:self-center transition-colors cursor-pointer shadow-xs"
                >
                  {isAuthLoading ? 'Đang xác thực...' : '🔑 Đăng nhập lại ngay'}
                </button>
              )}
            </div>
          )}

          {/* Auto-Sync Realtime Status Card */}
          <div className="bg-gradient-to-r from-emerald-900/5 via-teal-900/5 to-cyan-900/5 rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                    Tự Động Đồng Bộ Khi Có Thay Đổi
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      syncStatus === 'SYNCING'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : syncStatus === 'SYNCED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {syncStatus === 'SYNCING'
                      ? '🔄 Đang lưu ngầm...'
                      : syncStatus === 'SYNCED'
                      ? '🟢 Đã đồng bộ mới nhất'
                      : 'Sẵn sàng'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Hệ thống tự động cập nhật ngay lập tức lên 7 sheet tabs (Đơn hàng, Đợt gom, Cư dân, Hải sản, Cân chia, Sổ nợ & Cấu hình 2 tài khoản ngân hàng) mỗi khi có thay đổi.
                </p>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
              </label>
            </div>
          </div>

          {/* Section 1: Google Account Connection */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-600" /> 1. Tài Khoản Google Workspace
              </span>
              {currentUser ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết nối
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                  Chưa đăng nhập
                </span>
              )}
            </div>

            {currentUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-sm">
                      {currentUser.email?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {currentUser.displayName || 'Người dùng Google'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{currentUser.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={isAuthLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-teal-800 hover:text-teal-900 font-bold bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer"
                    title="Làm mới lại quyền và phiên xác thực Google Workspace"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAuthLoading ? 'animate-spin' : ''}`} />
                    {isAuthLoading ? 'Đang xác thực...' : 'Làm mới phiên / Đăng nhập lại'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDisconnectDialog(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 font-semibold bg-white border border-slate-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Ngắt kết nối
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Đăng nhập tài khoản Google để cấp quyền tạo và cập nhật các trang tính cho ứng dụng quản lý gom đơn hải sản.
                </p>

                {typeof window !== 'undefined' && window.self !== window.top && (
                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Đang xem trước trong iFrame: Bạn nên mở ở Tab mới để tránh trình duyệt chặn Popup Google.</span>
                    </div>
                    <a
                      href={`${window.location.origin}${window.location.pathname}?sync=true#sync`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shrink-0 transition-colors"
                    >
                      Mở Tab Mới
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isAuthLoading ? 'Đang xác thực Google...' : 'Đăng nhập với Google (Sign in with Google)'}</span>
                </button>

                {/* Popup Blocked Rescue Card */}
                {(showPopupBlockedGuide || errorMessage?.includes('popup-blocked') || errorMessage?.includes('chặn')) && (
                  <div className="mt-3 p-4 bg-sky-50/95 border border-sky-300 rounded-2xl text-xs text-sky-950 space-y-3 animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-black text-sky-950 text-sm">
                          Cửa sổ đăng nhập bị trình duyệt chặn (Popup Blocked)
                        </div>
                        <p className="text-sky-800 leading-relaxed">
                          Do ứng dụng đang chạy trong khung iFrame của công cụ lập trình, trình duyệt có thể tự động chặn cửa sổ đăng nhập Google. Bạn có các giải pháp xử lý cực kỳ đơn giản sau:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <a
                        href={typeof window !== 'undefined' ? window.location.href : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 p-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer text-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>1. Mở trong Tab mới (Khuyên dùng)</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleSignIn}
                        disabled={isAuthLoading}
                        className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 text-sky-900 border border-sky-300 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer text-center"
                      >
                        <RefreshCw className={`w-4 h-4 ${isAuthLoading ? 'animate-spin' : ''}`} />
                        <span>2. Thử mở lại cửa sổ Popup</span>
                      </button>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-sky-200 text-[11px] text-sky-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-sky-950">
                        <span>💡 Cách cho phép Popup vĩnh viễn trên trình duyệt:</span>
                      </div>
                      <p className="text-slate-600">
                        Nhìn lên góc phải thanh địa chỉ (URL), bấm vào biểu tượng <b>Cửa sổ bị chặn (🚫)</b> &rarr; Chọn <b>"Luôn cho phép cửa sổ bật lên từ trang này"</b> &rarr; Bấm <b>Xong</b> và thử lại.
                      </p>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowManualToken(!showManualToken)}
                        className="text-xs text-sky-800 hover:text-sky-950 font-bold underline cursor-pointer"
                      >
                        {showManualToken ? 'Ẩn nạp Token thủ công' : 'Hoặc nạp Access Token thủ công &rarr;'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Unauthorized Domain Guide Card */}
                {(showUnauthorizedGuide || errorMessage?.includes('unauthorized-domain')) && (
                  <div className="mt-3 p-4 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-3 animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <Globe className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-black text-amber-950 text-sm">
                          Cách khắc phục lỗi "auth/unauthorized-domain":
                        </div>
                        <p className="text-amber-800 mt-0.5 leading-relaxed">
                          Firebase yêu cầu thêm tên miền máy chủ hiện tại vào danh sách <b>Authorized Domains</b> trước khi đăng nhập Google.
                        </p>
                      </div>
                    </div>

                    {/* Step 1: Copy Hostname */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>1. Tên miền cần thêm vào Firebase:</span>
                        {copiedDomain && (
                          <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đã sao chép
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2.5 py-1.5 bg-slate-100 rounded-lg text-slate-800 font-mono text-[11px] select-all break-all">
                          {currentHostname || 'ais-dev-mjrtsn6o2rldozpv2p6b5r-147582393384.asia-southeast1.run.app'}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyDomainToClipboard(currentHostname || 'ais-dev-mjrtsn6o2rldozpv2p6b5r-147582393384.asia-southeast1.run.app')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" /> Sao chép
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        (Mẹo: Bạn cũng có thể thêm miền gốc <b>run.app</b> để tự động cho phép mọi bản preview)
                      </div>
                    </div>

                    {/* Step 2: Open Firebase Console */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0135903613/authentication/settings"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Mở Firebase Console &gt; Authorized domains
                      </a>

                      <button
                        type="button"
                        onClick={() => setShowManualToken(!showManualToken)}
                        className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                      >
                        {showManualToken ? 'Ẩn nạp Token thủ công' : 'Hoặc nạp Token thủ công (Tùy chọn)'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Token Input Box */}
                {showManualToken && (
                  <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-teal-700" /> Nhập Google OAuth Access Token
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowManualToken(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Dán Access Token (lấy từ Google OAuth Playground hoặc gcloud CLI có quyền Sheets/Drive) để đồng bộ ngay mà không cần đợi cập nhật domain:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="ya29.a0AfH6SM..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyManualToken}
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Spreadsheet Selection */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> 2. Bảng Tính Google Sheets
            </span>

            {spreadsheetId ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        Hải Sản Mẹ Hường - Quản Lý Gom Đơn Chung Cư
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs sm:max-w-md">
                        ID: {spreadsheetId}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={copySheetUrl}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Sao chép link Google Sheets"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-transform active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Mở Sheet
                      </a>
                    </div>
                  </div>
                </div>

                {/* 2-Way Sync Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmSync(true)}
                      disabled={isSyncing || isPulling}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ArrowUpFromLine className="w-3.5 h-3.5" />
                      {isSyncing ? 'Đang lưu...' : 'Ghi Lên Sheets (Xuất)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowConfirmPull(true)}
                      disabled={isSyncing || isPulling}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      {isPulling ? 'Đang nạp...' : 'Đồng Bộ Ngược Về App (Nhập)'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                    >
                      Đổi bảng tính
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewSpreadsheet}
                      disabled={isCreatingSheet}
                      className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tạo lại
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Found Existing Sheets on Google Drive */}
                {currentUser && driveSheets.length > 0 && (
                  <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-700" /> Tìm Thấy {driveSheets.length} Bảng Tính Có Sẵn Trên Google Drive
                      </span>
                      <button
                        type="button"
                        onClick={handleSearchDrive}
                        disabled={isSearchingDrive}
                        className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSearchingDrive ? 'animate-spin' : ''}`} /> Làm mới
                      </button>
                    </div>
                    <p className="text-[11px] text-teal-800 leading-relaxed">
                      Nhấn <b>"Kết Nối Ngay"</b> để sử dụng tiếp dữ liệu từ bảng tính cũ mà không cần tạo mới:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {driveSheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className="p-2.5 bg-white rounded-xl border border-teal-100 flex items-center justify-between gap-2 shadow-2xs hover:border-teal-300 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {sheet.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              ID: {sheet.id}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectDriveSheet(sheet)}
                            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg shrink-0 transition-colors cursor-pointer"
                          >
                            🔗 Kết Nối Ngay
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isCreatingSheet || isAuthLoading}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-dashed border-emerald-300 rounded-2xl text-center group transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      Tự động Tạo Bảng Tính Mới (Khuyên Dùng)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Tự động tạo sẵn 7 tab chuẩn hóa và format màu sắc
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-center transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center mb-2">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      Liên Kết Bảng Tính Đã Có
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Dán link Google Sheet có sẵn của bạn
                    </span>
                  </button>
                </div>
              </div>
            )}

            {showManualInput && (
              <div className="mt-3 p-3.5 bg-slate-100 rounded-xl border border-slate-300 space-y-2">
                <label className="text-xs font-bold text-slate-800">
                  Dán link hoặc ID Google Spreadsheet:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInputId}
                    onChange={(e) => setManualInputId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1A2B3C.../edit"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="button"
                    onClick={handleLinkExistingSpreadsheet}
                    className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Liên kết
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Structure of 7 Sheet Tabs */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> 3. Danh Sách 7 Sheet Tabs Được Đồng Bộ
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
                <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div>
                  <div className="font-bold text-slate-900">Đơn Hàng Chi Tiết</div>
                  <div className="text-[11px] text-slate-500">Mã đơn, Tòa/Phòng, Món đặt, Tiền, Thu nợ... ({orders.length} đơn)</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
                <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div>
                  <div className="font-bold text-slate-900">Đợt Gom Hàng</div>
                  <div className="text-[11px] text-slate-500">Mã đợt, Ngày gom, Trạng thái, Tổng kg, Doanh thu ({batches.length} đợt)</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
                <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <div>
                  <div className="font-bold text-slate-900">Danh Bạ Cư Dân</div>
                  <div className="text-[11px] text-slate-500">Tên khách, SĐT, Tòa, Số phòng, Tổng đã mua ({customers.length} cư dân)</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
                <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <div>
                  <div className="font-bold text-slate-900">Danh Mục Hải Sản</div>
                  <div className="text-[11px] text-slate-500">Mã SKU, Tên hải sản, Quy cách size, Giá niêm yết ({products.length} món)</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
                <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md font-bold flex items-center justify-center shrink-0 text-[10px]">
                  5
                </span>
                <div>
                  <div className="font-bold text-slate-900">Cân Chia Hàng Thực Tế</div>
                  <div className="text-[11px] text-slate-500">Phân bổ cân kg thực tế từng phòng & sơ chế</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
                <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md font-bold flex items-center justify-center shrink-0 text-[10px]">
                  6
                </span>
                <div>
                  <div className="font-bold text-slate-900">Sổ Nợ & Doanh Thu</div>
                  <div className="text-[11px] text-slate-500">Theo dõi nợ tồn, thanh toán chuyển khoản / tiền mặt</div>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-300 col-span-1 sm:col-span-2 flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-700 text-white rounded-md font-bold flex items-center justify-center shrink-0 text-[10px]">
                  7
                </span>
                <div>
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    Cấu Hình Hệ Thống (Mới)
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1.5 rounded">Tự động</span>
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Lưu trữ & đồng bộ cấu hình 2 tài khoản ngân hàng, mã VietQR, hotline & thông tin shop
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Last Sync Stats */}
          {lastSyncStats && (
            <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-teal-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-700" /> Lần đồng bộ gần nhất:
                </span>
                <span className="font-mono text-slate-600">
                  {new Date(lastSyncStats.syncedAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-medium">
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <div className="text-[10px] text-slate-500">Đơn hàng</div>
                  <div className="font-black text-teal-800">{lastSyncStats.ordersCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <div className="text-[10px] text-slate-500">Đợt gom</div>
                  <div className="font-black text-teal-800">{lastSyncStats.batchesCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <div className="text-[10px] text-slate-500">Cư dân</div>
                  <div className="font-black text-teal-800">{lastSyncStats.customersCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <div className="text-[10px] text-slate-500">Cấu hình hệ thống</div>
                  <div className="font-black text-emerald-700">Đã lưu</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Dialog before mutating Workspace data */}
        {showConfirmSync && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 space-y-3 animate-fadeIn">
            <div className="flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Xác nhận cập nhật dữ liệu lên Google Sheets:</div>
                <div>
                  Thao tác này sẽ ghi đè và làm mới toàn bộ 7 sheet tabs trên bảng tính Google Sheet của bạn với {orders.length} đơn hàng, {batches.length} đợt gom, {customers.length} cư dân và Cấu hình hệ thống hiện tại.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSync(false)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => executeSync()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Đồng ý ghi đè & Đồng bộ
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Dialog for Reverse Sync (Sheets -> App) */}
        {showConfirmPull && (
          <div className="p-4 bg-blue-50 border-t border-blue-200 space-y-3 animate-fadeIn">
            <div className="flex items-start gap-2.5 text-xs text-blue-900">
              <ArrowDownToLine className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Xác nhận đồng bộ ngược từ Google Sheets về App:</div>
                <div>
                  Hệ thống sẽ tải toàn bộ đơn hàng, đợt gom, cư dân, hải sản và Cấu hình hệ thống từ Google Sheets về lưu trữ vào ứng dụng.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmPull(false)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={executePull}
                disabled={isPulling}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Nạp dữ liệu từ Sheets
              </button>
            </div>
          </div>
        )}

        {/* Disconnect dialog with data loss protection */}
        {showDisconnectDialog && (
          <div className="p-4 bg-rose-50 border-t border-rose-200 space-y-3 animate-fadeIn">
            <div className="flex items-start gap-2.5 text-xs text-rose-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Ngắt kết nối tài khoản Google:</div>
                <div>
                  Để tránh mất dữ liệu, hệ thống khuyên bạn nên đồng bộ ngược dữ liệu từ Google Sheets về ứng dụng trước khi ngắt kết nối.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDisconnectDialog(false)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSignOutWithAutoSync(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Ngắt kết nối ngay
              </button>
              <button
                type="button"
                onClick={() => handleSignOutWithAutoSync(true)}
                className="flex items-center gap-1 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Đồng bộ về máy & Ngắt kết nối
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Đồng bộ 2 chiều bảo mật thông qua Google Sheets API
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              id="start-google-sheets-sync-btn"
              type="button"
              onClick={() => {
                if (!currentUser) {
                  handleSignIn();
                } else if (!spreadsheetId) {
                  handleCreateNewSpreadsheet();
                } else {
                  setShowConfirmSync(true);
                }
              }}
              disabled={isSyncing || isCreatingSheet || isAuthLoading || isPulling}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing || isCreatingSheet || isPulling ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'Đang đồng bộ dữ liệu...'
                  : isPulling
                  ? 'Đang kéo dữ liệu...'
                  : isCreatingSheet
                  ? 'Đang tạo bảng tính...'
                  : !currentUser
                  ? 'Đăng nhập Google để đồng bộ'
                  : !spreadsheetId
                  ? 'Tạo Bảng Tính & Đồng Bộ'
                  : '⚡ Đồng Bộ Lên Google Sheets'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
