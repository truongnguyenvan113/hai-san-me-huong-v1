import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreSettings } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
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
  FileSpreadsheet
} from 'lucide-react';

const POPULAR_BANKS = [
  'MBBANK',
  'TECHCOMBANK',
  'VIETCOMBANK',
  'ACB',
  'VPBANK',
  'TPBANK',
  'BIDV',
  'VIETINBANK',
  'VIB',
  'SACOMBANK',
];

export const SettingsView: React.FC = () => {
  const { storeSettings, updateStoreSettings, resetToSampleData, exportDataAsJSON, importDataFromJSON, addToast, setIsSheetsSyncOpen } =
    useApp();

  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings(formData);
    addToast('success', 'Đã lưu cài đặt', 'Thông tin cửa hàng và thanh toán VietQR đã được cập nhật!');
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
          addToast('success', 'Khôi phục thành công', 'Toàn bộ dữ liệu đã được nạp lại từ tệp sao lưu!');
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-teal-800" /> Cài Đặt Hệ Thống & Thanh Toán VietQR
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Thiết lập thông tin hiển thị trên phiếu in A4 dán thùng xốp và mã QR chuyển khoản.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Store & Condo Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-teal-900 font-black text-base pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-teal-800" /> Thông Tin Gom Đơn & Chung Cư
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-mono"
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
          </div>
        </div>

        {/* Section 2: VietQR & Banking */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-teal-900 font-black text-base pb-3 border-b border-slate-100">
            <CreditCard className="w-5 h-5 text-teal-800" /> Cấu Hình Tài Khoản Nhận Chuyển Khoản (VietQR)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngân hàng</label>
              <select
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-bold"
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số tài khoản</label>
              <input
                type="text"
                required
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên chủ tài khoản</label>
              <input
                type="text"
                required
                value={formData.bank_owner}
                onChange={(e) => setFormData({ ...formData, bank_owner: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Print Template options */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-teal-900 font-black text-base pb-3 border-b border-slate-100">
            <Printer className="w-5 h-5 text-teal-800" /> Tùy Chọn Phiếu In A4 Dán Thùng Hàng
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="show-vietqr-checkbox"
              checked={formData.show_vietqr}
              onChange={(e) => setFormData({ ...formData, show_vietqr: e.target.checked })}
              className="w-5 h-5 accent-teal-800 rounded cursor-pointer"
            />
            <label htmlFor="show-vietqr-checkbox" className="text-xs sm:text-sm font-semibold text-slate-900 cursor-pointer">
              Tự động in kèm mã VietQR trên phiếu A4 để cư dân quét trả tiền khi nhận hàng tại cửa phòng
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            id="save-settings-btn"
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" /> Lưu Cài Đặt Hệ Thống
          </button>
        </div>
      </form>

      {/* Section 4: Google Sheets Integration */}
      <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 rounded-2xl shadow-md border border-emerald-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Liên Kết Google Sheets Từng Hạng Mục</h2>
              <p className="text-xs text-emerald-200">
                Tự động lưu và đồng bộ toàn bộ đơn hàng, đợt gom, cư dân theo 6 Sheet Tabs chuẩn hóa
              </p>
            </div>
          </div>

          <button
            id="settings-open-sheets-modal-btn"
            type="button"
            onClick={() => setIsSheetsSyncOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" /> Mở Bảng Đồng Bộ Google Sheets
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 1: Đơn Hàng Chi Tiết</div>
            <div className="text-[11px] text-emerald-100/70">Mã đơn, Tòa/Phòng, Món đặt, Tiền, Giao hàng...</div>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 2: Đợt Gom Hàng</div>
            <div className="text-[11px] text-emerald-100/70">Mã đợt, Ngày gom, Trạng thái, Doanh thu...</div>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <div className="font-bold text-emerald-300">Tab 3: Danh Bạ Cư Dân</div>
            <div className="text-[11px] text-emerald-100/70">Tên khách, SĐT, Tòa nhà, Số phòng, Lịch sử mua...</div>
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
        </div>
      </div>

      {/* Section 5: Data Management & Backup */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
          <Database className="w-5 h-5 text-slate-700" /> Quản Lý Dữ Liệu & Sao Lưu
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            id="export-backup-btn"
            onClick={exportDataAsJSON}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Download className="w-4 h-4 text-teal-800" /> Sao Lưu Dữ Liệu (JSON)
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Tải toàn bộ đơn hàng, cư dân, đợt hàng về máy tính để lưu trữ an toàn.
            </p>
          </button>

          <label className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors flex flex-col justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Upload className="w-4 h-4 text-indigo-700" /> Khôi Phục Từ File JSON
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Nhập tệp dữ liệu đã sao lưu trước đó vào hệ thống.
            </p>
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>

          <button
            id="reset-sample-data-btn"
            onClick={() => setIsResetConfirmOpen(true)}
            className="p-4 bg-rose-50/50 hover:bg-rose-100/50 rounded-xl border border-rose-200 text-left transition-colors flex flex-col justify-between"
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

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          resetToSampleData();
          addToast('success', 'Đã nạp dữ liệu mẫu', 'Hệ thống đã được thiết lập dữ liệu mẫu đầy đủ!');
        }}
        title="Xác nhận nạp lại dữ liệu mẫu"
        message="Thao tác này sẽ ghi đè toàn bộ dữ liệu đơn hàng và khách hàng hiện tại bằng dữ liệu mẫu. Bạn có chắc chắn muốn tiếp tục?"
        isDangerous={true}
      />
    </div>
  );
};
