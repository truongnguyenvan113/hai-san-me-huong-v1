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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  initAuth,
} from '../../services/googleAuth';
import {
  createSeafoodSpreadsheet,
  syncAllToGoogleSheets,
  SyncStats,
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
    addToast,
    syncStatus,
    autoSyncEnabled,
    setAutoSyncEnabled,
    spreadsheetId,
    spreadsheetUrl,
    lastSyncStats,
    setSpreadsheetInfo,
    triggerSyncNow,
  } = useApp();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [manualInputId, setManualInputId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showConfirmSync, setShowConfirmSync] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, _token) => {
        setCurrentUser(user);
        setIsAuthLoading(false);
      },
      () => {
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // Handle Google Sign In
  const handleSignIn = async () => {
    setIsAuthLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        addToast({
          type: 'SUCCESS',
          title: 'Đăng nhập thành công',
          message: `Đã kết nối tài khoản Google: ${res.user.email}`,
        });

        // Trigger first automatic sync / creation
        triggerSyncNow();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Đăng nhập Google thất bại');
      addToast({
        type: 'ERROR',
        title: 'Đăng nhập thất bại',
        message: err?.message || 'Không thể đăng nhập Google',
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Google Sign Out
  const handleSignOut = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      addToast({
        type: 'INFO',
        title: 'Đã đăng xuất Google',
        message: 'Đã ngắt kết nối tài khoản Google Workspace.',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Create new spreadsheet
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
        message: 'Bảng tính quản lý gom đơn với 6 tab chuyên biệt đã sẵn sàng.',
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
  const handleLinkExistingSpreadsheet = () => {
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
      message: `ID Bảng tính: ${cleanId.slice(0, 10)}...`,
    });
  };

  // Perform sync execution
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
        products
      );

      localStorage.setItem('seafood_sheets_last_sync', JSON.stringify(stats));

      addToast({
        type: 'SUCCESS',
        title: 'Đồng bộ Google Sheets thành công!',
        message: `Đã cập nhật ${stats.ordersCount} đơn hàng, ${stats.batchesCount} đợt gom, ${stats.customersCount} cư dân và ${stats.weighingCount} mục phân bổ cân chia.`,
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
                  Đồng Bộ Google Sheets
                </h2>
                <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-400/30">
                  Tự Động Thời Gian Thực
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium">
                Tự động tạo & lưu trữ dữ liệu theo 6 sheet tabs chuẩn nghiệp vụ hải sản
              </p>
            </div>
          </div>

          <button
            id="close-sheets-sync-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-900">Lỗi thao tác Google Sheets</div>
                <div className="font-medium">{errorMessage}</div>
              </div>
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
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    syncStatus === 'SYNCING'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      : syncStatus === 'SYNCED'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {syncStatus === 'SYNCING'
                      ? '🔄 Đang lưu ngầm...'
                      : syncStatus === 'SYNCED'
                      ? '🟢 Đã đồng bộ mới nhất'
                      : 'Sẵn sàng'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Hệ thống tự động tạo và cập nhật ngay lập tức lên 6 sheet tabs mỗi khi bạn tạo đợt mới, thêm đơn hàng, điều chỉnh cân thực tế hoặc thu tiền.
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
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

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 font-semibold bg-white border border-slate-200 rounded-lg hover:bg-rose-50 transition-colors self-start sm:self-center"
                >
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Đăng nhập tài khoản Google để cấp quyền tạo và cập nhật các trang tính cho ứng dụng quản lý gom đơn hải sản.
                </p>
                {/* Official Material Google Sign In Button per Workspace skill guideline */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50"
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
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
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

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="text-slate-500 hover:text-slate-800 font-medium underline"
                  >
                    Đổi liên kết sang bảng tính khác
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isCreatingSheet}
                    className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo lại bảng tính mới
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isCreatingSheet || isAuthLoading}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-dashed border-emerald-300 rounded-2xl text-center group transition-all"
                  >
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      Tự động Tạo Bảng Tính Mới (Khuyên Dùng)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Tự động tạo sẵn 6 tab chuẩn hóa và format màu sắc
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-center transition-all"
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
                    className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Liên kết
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Structure of 6 Sheet Tabs */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> 3. Danh Sách 6 Sheet Tabs Được Đồng Bộ
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
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-center font-medium">
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
                  <div className="text-[10px] text-slate-500">Hải sản</div>
                  <div className="font-black text-teal-800">{lastSyncStats.productsCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <div className="text-[10px] text-slate-500">Cân chia</div>
                  <div className="font-black text-teal-800">{lastSyncStats.weighingCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-teal-100">
                  <div className="text-[10px] text-slate-500">Sổ nợ</div>
                  <div className="font-black text-teal-800">{lastSyncStats.financeCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Dialog before mutating Workspace data (MANDATORY per Workspace skill) */}
        {showConfirmSync && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 space-y-3 animate-fadeIn">
            <div className="flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Xác nhận cập nhật dữ liệu Google Sheets:</div>
                <div>
                  Thao tác này sẽ ghi đè và làm mới toàn bộ 6 sheet tabs trên bảng tính Google Sheet của bạn với {orders.length} đơn hàng, {batches.length} đợt gom và {customers.length} cư dân hiện tại.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSync(false)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => executeSync()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                <Check className="w-3.5 h-3.5" /> Đồng ý ghi đè & Đồng bộ
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
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
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
              disabled={isSyncing || isCreatingSheet || isAuthLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing || isCreatingSheet ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'Đang đồng bộ dữ liệu...'
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
