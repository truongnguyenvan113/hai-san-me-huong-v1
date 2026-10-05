import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, BatchStatus } from '../../types';
import { BATCH_STATUS_CONFIG } from '../../utils/formatters';
import { Edit3, X, Calendar, User, Phone, MapPin, Check, Save } from 'lucide-react';

interface EditBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({ isOpen, onClose, batch }) => {
  const { updateBatch, addToast } = useApp();

  const [batchName, setBatchName] = useState('');
  const [batchDate, setBatchDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState<BatchStatus>('COLLECTING');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierLocation, setSupplierLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (batch) {
      setBatchName(batch.batch_name || '');
      setBatchDate(batch.batch_date ? batch.batch_date.slice(0, 10) : '');
      setDeliveryDate(batch.delivery_date ? batch.delivery_date.slice(0, 10) : '');
      setStatus(batch.status || 'COLLECTING');
      setSupplierName(batch.supplier_info?.name || '');
      setSupplierPhone(batch.supplier_info?.phone || '');
      setSupplierLocation(batch.supplier_info?.location || '');
      setNotes(batch.notes || '');
    }
  }, [batch, isOpen]);

  if (!isOpen || !batch) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) {
      addToast('error', 'Lỗi nhập liệu', 'Tên đợt hàng không được để trống.');
      return;
    }

    const updatedBatch: Batch = {
      ...batch,
      batch_name: batchName.trim(),
      batch_date: batchDate || batch.batch_date,
      delivery_date: deliveryDate || batch.delivery_date,
      status: status,
      notes: notes.trim(),
      supplier_info: {
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        location: supplierLocation.trim(),
      },
      updated_at: new Date().toISOString(),
    };

    updateBatch(updatedBatch, true);
    addToast('success', 'Đã đổi tên đợt gom', `Đợt gom đã đổi thành: "${batchName.trim()}"`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="edit-batch-modal"
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Chỉnh Sửa Thông Tin Đợt Gom</h3>
              <p className="text-xs text-slate-500 font-mono">{batch.batch_code}</p>
            </div>
          </div>
          <button
            id="close-edit-batch-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên đợt gom */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên đợt hàng <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-batch-name-input"
              type="text"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="VD: Đợt Hải Sản Tươi Sống Cà Mau Thứ 6"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-bold text-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Tên mới sẽ tự động đồng bộ sang tất cả đơn hàng thuộc đợt này và đẩy lên Google Sheets.
            </p>
          </div>

          {/* Ngày mở & Ngày giao */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Ngày mở đợt
              </label>
              <input
                type="date"
                required
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-700" /> Ngày giao dự kiến
              </label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          {/* Trạng thái đợt gom */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Trạng thái đợt gom
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BatchStatus)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold"
            >
              {(Object.keys(BATCH_STATUS_CONFIG) as BatchStatus[]).map((st) => (
                <option key={st} value={st}>
                  {BATCH_STATUS_CONFIG[st].label} ({st})
                </option>
              ))}
            </select>
          </div>

          {/* Nguồn hàng quê */}
          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs font-bold text-slate-700 mb-2">Thông tin nguồn quê / vựa cung cấp (Tùy chọn)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-500 mb-0.5">Tên chủ vựa / nguồn</label>
                <input
                  type="text"
                  placeholder="VD: Chú Bảy Cà Mau"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5">Khu vực / cảng biển</label>
                <input
                  type="text"
                  placeholder="VD: Năm Căn, Cà Mau"
                  value={supplierLocation}
                  onChange={(e) => setSupplierLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú đợt hàng
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Hàng tươi về lúc 14h, ưu tiên giao sớm căn có trẻ nhỏ..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
