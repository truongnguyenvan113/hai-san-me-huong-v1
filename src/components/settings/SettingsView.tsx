import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreSettings, BackupSnapshot } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { BackupCompareModal } from './BackupCompareModal';
import {
  Settings,
  Store,
  CreditCard,
  Printer,
  Database,
  Save,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Building,
  FileSpreadsheet,
  QrCode,
  CheckCircle2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Check,
  History,
  GitCompare,
  Clock,
  ShieldCheck,
  RotateCcw,
  GitMerge,
  Trash2,
} from 'lucide-react';
import { ALL_BANKS, getBankByCodeOrName } from '../../utils/banks';

export const SettingsView: React.FC = () => {
  const {
    storeSettings,
    updateStoreSettings,
    resetToSampleData,
    exportDataAsJSON,
    importDataFromJSON,
    addToast,
    setIsSheetsSyncOpen,
    pullFromSheets,
    exportSettingsToSheets,
    spreadsheetId,
    snapshots,
    createSnapshot,
    deleteSnapshot,
    restoreFromSnapshot,
    isCompareModalOpen,
    setIsCompareModalOpen,
    selectedCompareSnapshot,
    setSelectedCompareSnapshot,
  } = useApp();

  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPullConfirmOpen, setIsPullConfirmOpen] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [isPullingSheets, setIsPullingSheets] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState<BackupSnapshot | null>(null);
  const [isQuickRestoreConfirmOpen, setIsQuickRestoreConfirmOpen] = useState(false);

  const handleBank1Change = (bankCodeOrName: string) => {
    const bank = getBankByCodeOrName(bankCodeOrName);
    setFormData((prev) => ({
      ...prev,
      bank_name: bank.code,
      bank_bin: bank.bin,
    }));
  };

  const handleBank2Change = (bankCodeOrName: string) => {
    const bank = getBankByCodeOrName(bankCodeOrName);
    setFormData((prev) => ({
      ...prev,
      bank_name_2: bank.code,
      bank_bin_2: bank.bin,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings(formData);
    addToast('success', 'Đã lưu cài đặt', 'Thông tin cửa hàng, 2 tài khoản ngân hàng và cấu hình VietQR đã cập nhật!');
  };

  const handleExportSettingsToSheets = async () => {
    setIsExportingSheets(true);
    try {
      const ok = await exportSettingsToSheets();
      if (!ok) {
        setIsSheetsSyncOpen(true);
      }
    } finally {
      setIsExportingSheets(false);
    }
  };

  const handlePullFromSheets = async () => {
    setIsPullingSheets(true);
    try {
      const stats = await pullFromSheets();
      if (stats) {
        setFormData({ ...storeSettings });
      } else {
        // If failed due to unauthenticated or missing sheet, open sync modal
        setIsSheetsSyncOpen(true);
      }
    } finally {
      setIsPullingSheets(false);
      setIsPullConfirmOpen(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const success = importDataFromJSON(jsonStr);
        if (success) {
          addToast('success', 'Khôi phục thành công', 'Toàn bộ dữ liệu đã được nạp lại từ tệp sao lưu JSON!');
          setFormData({ ...storeSettings });
        } else {
          addToast('error', 'Lỗi nhập dữ liệu', 'Định dạng tệp JSON không hợp lệ.');
        }
      } catch (err) {
        addToast('error', 'Lỗi', 'Không thể đọc tệp sao lưu.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-teal-800" /> Cài Đặt Hệ Thống & Cấu Hình VietQR Đa Ngân Hàng
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Thiết lập thông tin cửa hàng, hỗ trợ chuyển đổi linh hoạt giữa 2 tài khoản ngân hàng nhận tiền và đồng bộ tự động lên Google Sheets.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Store & Condo Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-teal-900 font-black text-base pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-teal-800" /> 1. Thông Tin Gom Đơn & Chung Cư
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên cửa hàng / Đội gom hải sản
              </label>
              <input
                type="text"
                required
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên khu chung cư / Khu đô thị
              </label>
              <input
                type="text"
                required
                value={formData.condo_name}
                onChange={(e) => setFormData({ ...formData, condo_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại liên hệ / Hotline gom
              </label>
              <input
                type="tel"
                required
                value={formData.hotline}
                onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khẩu hiệu / Cam kết tươi sống
              </label>
              <input
                type="text"
                value={formData.slogan}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ tập kết & Ghi chú chân hóa đơn in
              </label>
              <input
                type="text"
                value={formData.invoice_footer_note || ''}
                onChange={(e) => setFormData({ ...formData, invoice_footer_note: e.target.value })}
                placeholder="VD: Hải sản bảo quản tủ đông ngay sau khi nhận. Liên hệ hotline khi cần hỗ trợ."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Multi-Bank Account Config (Bank 1 & Bank 2 + Switcher) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-teal-900 font-black text-base">
              <CreditCard className="w-5 h-5 text-teal-800" /> 2. Cấu Hình Tài Khoản Nhận Chuyển Khoản (Hỗ Trợ 2 Ngân Hàng)
            </div>
            <div className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Hỗ trợ An Bình Bank, BIDV, Vietcombank...
            </div>
          </div>

          {/* ACTIVE BANK SWITCHER */}
          <div className="bg-teal-50/70 border border-teal-200 p-4 rounded-xl space-y-2">
            <label className="block text-xs font-black text-teal-950 uppercase tracking-wide">
              ⭐ Chọn Tài Khoản Nhận Tiền Mặc Định Cho Mã VietQR & Phiếu In A4:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.active_bank_account === 'BANK_1'
                    ? 'border-teal-700 bg-white shadow-xs font-bold text-teal-950 ring-2 ring-teal-600/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="active_bank_account"
                  checked={formData.active_bank_account === 'BANK_1'}
                  onChange={() => setFormData({ ...formData, active_bank_account: 'BANK_1' })}
                  className="w-4 h-4 text-teal-800 accent-teal-800"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Sử Dụng Ngân Hàng 1 (Chính): {formData.bank_name || 'ABBANK'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    STK: {formData.bank_account || '(Chưa nhập)'} - {formData.bank_owner || '(Chưa nhập)'}
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.active_bank_account === 'BANK_2'
                    ? 'border-teal-700 bg-white shadow-xs font-bold text-teal-950 ring-2 ring-teal-600/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="active_bank_account"
                  checked={formData.active_bank_account === 'BANK_2'}
                  onChange={() => setFormData({ ...formData, active_bank_account: 'BANK_2' })}
                  className="w-4 h-4 text-teal-800 accent-teal-800"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Sử Dụng Ngân Hàng 2 (Phụ): {formData.bank_name_2 || 'BIDV'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    STK: {formData.bank_account_2 || '(Chưa nhập)'} - {formData.bank_account_name_2 || formData.bank_owner || '(Chưa nhập)'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* BANK 1 CONFIGURATION */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase">
              <span className="w-5 h-5 bg-teal-800 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
              Tài Khoản Ngân Hàng 1 (Chính - VD: An Bình Bank / Vietcombank)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Chọn Ngân hàng 1</label>
                <select
                  value={formData.bank_name}
                  onChange={(e) => handleBank1Change(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-teal-700"
                >
                  {ALL_BANKS.map((b) => (
                    <option key={`b1-${b.code}`} value={b.code}>
                      {b.shortName} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Số tài khoản NH 1</label>
                <input
                  type="text"
                  required
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  placeholder="Nhập số tài khoản..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tên chủ tài khoản NH 1</label>
                <input
                  type="text"
                  required
                  value={formData.bank_owner}
                  onChange={(e) => setFormData({ ...formData, bank_owner: e.target.value.toUpperCase(), bank_account_name: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 uppercase focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>
          </div>

          {/* BANK 2 CONFIGURATION */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase">
              <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
              Tài Khoản Ngân Hàng 2 (Phụ - VD: BIDV / MBBank)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Chọn Ngân hàng 2</label>
                <select
                  value={formData.bank_name_2 || 'BIDV'}
                  onChange={(e) => handleBank2Change(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-teal-700"
                >
                  {ALL_BANKS.map((b) => (
                    <option key={`b2-${b.code}`} value={b.code}>
                      {b.shortName} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Số tài khoản NH 2</label>
                <input
                  type="text"
                  value={formData.bank_account_2 || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_2: e.target.value })}
                  placeholder="Nhập số tài khoản phụ..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tên chủ tài khoản NH 2</label>
                <input
                  type="text"
                  value={formData.bank_account_name_2 || formData.bank_owner || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_name_2: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 uppercase focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: VietQR Display & Size Customization */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-teal-900 font-black text-base pb-3 border-b border-slate-100">
            <QrCode className="w-5 h-5 text-teal-800" /> 3. Tùy Chọn Kích Thước & Hiển Thị Mã VietQR Trên Phiếu In A4
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kích thước mã QR trên phiếu in A4 dán túi
              </label>
              <select
                value={formData.qr_size || 'large'}
                onChange={(e) => setFormData({ ...formData, qr_size: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-teal-700"
              >
                <option value="large">Mã To Rõ Nét (Khuyên dùng ⭐ - Cư dân quét cực nhanh bằng app ngân hàng)</option>
                <option value="medium">Mã Vừa</option>
                <option value="compact">Mã Gọn Nhỏ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giao diện khung VietQR chuẩn Napas
              </label>
              <select
                value={formData.bank_qr_template || 'compact2'}
                onChange={(e) => setFormData({ ...formData, bank_qr_template: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-teal-700"
              >
                <option value="compact2">compact2 (Khuyên dùng: Đầy đủ logo ngân hàng, tên chủ TK & số tiền)</option>
                <option value="compact">compact (Gọn nhẹ)</option>
                <option value="qr_only">qr_only (Chỉ mã QR thuần)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="show-vietqr-checkbox"
              checked={formData.show_vietqr !== false}
              onChange={(e) => setFormData({ ...formData, show_vietqr: e.target.checked })}
              className="w-5 h-5 accent-teal-800 rounded cursor-pointer"
            />
            <label htmlFor="show-vietqr-checkbox" className="text-xs sm:text-sm font-semibold text-slate-900 cursor-pointer">
              Tự động in kèm mã VietQR trên toàn bộ phiếu A4 để cư dân quét nhận hàng chuyển khoản
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            id="save-settings-btn"
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Lưu Cài Đặt Hệ Thống
          </button>
        </div>
      </form>

      {/* Section 4: Google Sheets Integration & Tab 7 Settings Sync */}
      <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 rounded-2xl shadow-md border border-emerald-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Lưu Trữ & Đồng Bộ Google Sheets 7 Tabs</h2>
                <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30">
                  Tab Cấu Hình Tự Động
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Tự động sao lưu toàn bộ đơn hàng, đợt gom, cư dân và cả Cấu hình hệ thống (2 tài khoản ngân hàng) lên Google Sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="settings-open-sheets-modal-btn"
              type="button"
              onClick={() => setIsSheetsSyncOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Mở Bảng Đồng Bộ Google Sheets
            </button>
          </div>
        </div>

        {/* Quick Settings Sync Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/10 p-3.5 rounded-xl border border-white/10">
          <div className="text-xs text-emerald-100 font-medium">
            Sao lưu hoặc khôi phục cấu hình hệ thống trực tiếp từ Tab 7 Google Sheets:
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSettingsToSheets}
              disabled={isExportingSheets}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-lg border border-teal-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              {isExportingSheets ? 'Đang xuất...' : 'Xuất Cấu Hình Lên Sheets'}
            </button>

            <button
              type="button"
              onClick={() => setIsPullConfirmOpen(true)}
              disabled={isPullingSheets}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg border border-amber-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              {isPullingSheets ? 'Đang tải về...' : 'Đồng Bộ Ngược Từ Sheets Về App'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 1: Đơn Hàng Chi Tiết</div>
            <div className="text-[11px] text-emerald-100/70">Mã đơn, Tòa/Phòng, Món đặt, Tiền, Thu nợ...</div>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 2: Đợt Gom Hàng</div>
            <div className="text-[11px] text-emerald-100/70">Mã đợt, Ngày gom, Trạng thái, Doanh thu...</div>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 3: Danh Bạ Cư Dân</div>
            <div className="text-[11px] text-emerald-100/70">Tên khách, SĐT, Tòa nhà, Số phòng...</div>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 4: Danh Mục Hải Sản</div>
            <div className="text-[11px] text-emerald-100/70">Mã SKU, Loại hải sản, Size quy cách, Đơn giá...</div>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 5: Cân Chia Hàng</div>
            <div className="text-[11px] text-emerald-100/70">Số kg cân thực tế từng phòng & sơ chế...</div>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 6: Sổ Nợ & Doanh Thu</div>
            <div className="text-[11px] text-emerald-100/70">Đối soát thu tiền mặt, chuyển khoản & nợ tồn...</div>
          </div>
          <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30 col-span-2">
            <div className="font-bold text-emerald-300 flex items-center gap-1">
              <Check className="w-3 h-3" /> Tab 7: Cấu Hình Hệ Thống (Mới)
            </div>
            <div className="text-[11px] text-emerald-100/90">Lưu trữ 2 tài khoản ngân hàng, mã BIN, cài đặt VietQR & thông tin shop</div>
          </div>
        </div>
      </div>

      {/* Section 5: Data Management, Automatic 2h Snapshots & Google Switch Protection */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-black text-base">
              <Database className="w-5 h-5 text-slate-700" /> Quản Lý Dữ Liệu, Sao Lưu & Đối Chiếu Bản Ghi
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động sao lưu định kỳ 2 giờ/lần và giữ nguyên dữ liệu nguồn khi chuyển đổi tài khoản Google.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCompareSnapshot(snapshots.length > 0 ? snapshots[0] : null);
                setIsCompareModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <GitCompare className="w-4 h-4 text-teal-300" /> Mở Bảng So Sánh & Khôi Phục
            </button>
            <button
              type="button"
              onClick={() => createSnapshot('MANUAL', 'Sao lưu thủ công từ Cài đặt')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> + Tạo Điểm Sao Lưu
            </button>
          </div>
        </div>

        {/* Protection Assurance Banner */}
        <div className="p-4 bg-gradient-to-r from-teal-50 via-emerald-50 to-indigo-50 rounded-2xl border border-teal-200/80 space-y-2">
          <div className="flex items-center gap-2 text-teal-950 font-black text-xs sm:text-sm">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" /> Cơ Chế Bảo Toàn Dữ Liệu Nguồn Khi Đổi Tài Khoản Google
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
            <div className="p-2.5 bg-white/80 rounded-xl border border-teal-100 space-y-1">
              <div className="font-bold text-teal-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-700" /> Sao lưu 2 giờ / lần
              </div>
              <div className="text-[11px] text-slate-600">
                Tự động chụp snapshot toàn bộ đơn hàng, cư dân và cấu hình sau mỗi 2 tiếng làm việc.
              </div>
            </div>

            <div className="p-2.5 bg-white/80 rounded-xl border border-teal-100 space-y-1">
              <div className="font-bold text-teal-900 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-teal-700" /> Tạm giữ khi đăng xuất Google
              </div>
              <div className="text-[11px] text-slate-600">
                Trước khi đăng xuất để đổi tài khoản Google mới, hệ thống tự động lưu 1 bản <b>BEFORE_ACCOUNT_SWITCH</b> để không bị mất thông tin.
              </div>
            </div>

            <div className="p-2.5 bg-white/80 rounded-xl border border-teal-100 space-y-1">
              <div className="font-bold text-teal-900 flex items-center gap-1">
                <GitCompare className="w-3.5 h-3.5 text-teal-700" /> Đối chiếu & Khôi phục thông minh
              </div>
              <div className="text-[11px] text-slate-600">
                Khi kết nối tài khoản Google mới chưa có dữ liệu, bạn có thể so sánh trực tiếp và bấm khôi phục hoặc gộp vào chỉ với 1 click.
              </div>
            </div>
          </div>
        </div>

        {/* Snapshot History Table / Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-teal-800" /> Danh Sách Bản Sao Lưu Tự Động & Lịch Sử ({snapshots.length})
            </span>
            <span className="text-slate-400 font-normal text-[11px]">Lưu tối đa 30 bản gần nhất</span>
          </div>

          {snapshots.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Chưa có bản sao lưu nào. Hãy bấm nút "+ Tạo Điểm Sao Lưu" ở trên.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {snapshots.slice(0, 8).map((snap) => {
                const isAuto = snap.trigger === 'AUTO_2H';
                const isSwitch = snap.trigger === 'BEFORE_ACCOUNT_SWITCH';
                return (
                  <div
                    key={snap.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 line-clamp-1">{snap.title}</div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${
                          isAuto
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isSwitch
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {snap.trigger}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(snap.timestamp).toLocaleString('vi-VN')}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-600 font-medium">
                        {snap.summary.batchesCount} đợt • {snap.summary.ordersCount} đơn • {snap.summary.customersCount} khách
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompareSnapshot(snap);
                            setIsCompareModalOpen(true);
                          }}
                          className="px-2 py-1 bg-white hover:bg-teal-50 text-teal-800 font-bold border border-slate-300 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                          title="So sánh với dữ liệu hiện tại"
                        >
                          <GitCompare className="w-3 h-3" /> So sánh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSnapshotToRestore(snap);
                            setIsQuickRestoreConfirmOpen(true);
                          }}
                          className="px-2 py-1 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1"
                          title="Khôi phục ngay"
                        >
                          <RotateCcw className="w-3 h-3" /> Khôi phục
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* JSON Import/Export & Reset Buttons */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 mb-2">Thao tác dữ liệu tệp tin bổ sung:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              id="export-backup-btn"
              type="button"
              onClick={exportDataAsJSON}
              className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Download className="w-4 h-4 text-teal-800" /> Tải Toàn Bộ Tệp JSON
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Tải toàn bộ đơn hàng, cư dân, đợt hàng và cấu hình về máy tính dạng tệp tin .json.
              </p>
            </button>

            <label className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors flex flex-col justify-between cursor-pointer">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Upload className="w-4 h-4 text-indigo-700" /> Khôi Phục Từ File JSON Ngoài
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Chọn tệp .json từ máy tính để nạp lại vào phần mềm.
              </p>
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>

            <button
              id="reset-sample-data-btn"
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="p-4 bg-rose-50/50 hover:bg-rose-100/50 rounded-xl border border-rose-200 text-left transition-colors flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <RefreshCw className="w-4 h-4" /> Nạp Lại Dữ Liệu Mẫu
              </div>
              <p className="text-[11px] text-rose-700/80 mt-2">
                Xóa sạch và tạo lại đợt hàng mẫu, danh sách phòng cư dân và hải sản.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Diff & Compare Modal */}
      <BackupCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        initialSnapshot={selectedCompareSnapshot}
      />

      {/* Quick Restore Snapshot Confirmation */}
      <ConfirmModal
        isOpen={isQuickRestoreConfirmOpen}
        onClose={() => setIsQuickRestoreConfirmOpen(false)}
        onConfirm={() => {
          if (snapshotToRestore) {
            restoreFromSnapshot(snapshotToRestore, true);
            setFormData({ ...storeSettings });
            setIsQuickRestoreConfirmOpen(false);
          }
        }}
        title="Xác nhận khôi phục từ bản sao lưu"
        message={`Hệ thống sẽ tự động lưu dự phòng dữ liệu hiện tại, sau đó khôi phục toàn bộ ${snapshotToRestore?.summary.ordersCount} đơn hàng và ${snapshotToRestore?.summary.batchesCount} đợt gom từ bản "${snapshotToRestore?.title}". Bạn có muốn tiếp tục?`}
        confirmText="Khôi phục ngay"
      />

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          resetToSampleData();
          setFormData({ ...storeSettings });
          addToast('success', 'Đã nạp dữ liệu mẫu', 'Hệ thống đã được thiết lập dữ liệu mẫu đầy đủ!');
        }}
        title="Xác nhận nạp lại dữ liệu mẫu"
        message="Thao tác này sẽ ghi đè toàn bộ dữ liệu đơn hàng và khách hàng hiện tại bằng dữ liệu mẫu. Bạn có chắc chắn muốn tiếp tục?"
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={isPullConfirmOpen}
        onClose={() => setIsPullConfirmOpen(false)}
        onConfirm={handlePullFromSheets}
        title="Xác nhận đồng bộ ngược từ Google Sheets"
        message="Dữ liệu từ tệp Google Sheets (Đơn hàng, đợt gom, danh bạ cư dân, hải sản và Cấu hình hệ thống) sẽ được nạp đè vào ứng dụng để bảo toàn dữ liệu. Bạn có muốn tiếp tục?"
        confirmText="Đồng bộ ngược ngay"
      />
    </div>
  );
};
