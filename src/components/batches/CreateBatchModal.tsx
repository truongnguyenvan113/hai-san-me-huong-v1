import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch } from '../../types';
import { PackagePlus, X, Calendar, User, Phone, MapPin } from 'lucide-react';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({ isOpen, onClose }) => {
  const { addBatch } = useApp();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [batchName, setBatchName] = useState(`Đợt Hải Sản Quê Ngày ${new Date().toLocaleDateString('vi-VN')}`);
  const [batchDate, setBatchDate] = useState(todayStr);
  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierLocation, setSupplierLocation] = useState('Cà Mau & Phan Thiết');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) return;

    const dateCode = batchDate.replace(/-/g, '');
    const batchId = `BATCH-${dateCode}-${Math.floor(100 + Math.random() * 900)}`;

    const newBatch: Batch = {
      batch_id: batchId,
      batch_code: batchId,
      batch_name: batchName.trim(),
      batch_date: batchDate,
      delivery_date: deliveryDate,
      status: 'COLLECTING',
      notes: notes.trim(),
      supplier_info: {
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        location: supplierLocation.trim(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addBatch(newBatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="create-batch-modal"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-teal-800">
            <PackagePlus className="w-5 h-5" />
            <h3 className="text-lg font-bold text-slate-900">Tạo Đợt Gom Hàng Mới</h3>
          </div>
          <button
            id="close-create-batch-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đợt hàng <span className="text-rose-500">*</span>
            </label>
            <input
              id="batch-name-input"
              type="text"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày mở đợt gom <span className="text-rose-500">*</span>
              </label>
              <input
                id="batch-date-input"
                type="date"
                required
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày hàng về & giao phòng <span className="text-rose-500">*</span>
              </label>
              <input
                id="batch-delivery-date-input"
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-bold"
              />
            </div>
          </div>

          {/* Supplier Info */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Thông tin nguồn hàng ở quê
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Tên người gửi / Chủ ghe
                </label>
                <input
                  id="supplier-name-input"
                  type="text"
                  placeholder="Chú Ba Ghe Cà Mau..."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  SĐT người ở quê
                </label>
                <input
                  id="supplier-phone-input"
                  type="tel"
                  placeholder="0912..."
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Khu vực xuất xứ
              </label>
              <input
                id="supplier-location-input"
                type="text"
                value={supplierLocation}
                onChange={(e) => setSupplierLocation(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú đợt hàng
            </label>
            <textarea
              id="batch-notes-input"
              rows={2}
              placeholder="VD: Hàng gửi xe lạnh về lúc 14h chiều, giao sau 17h30..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              id="cancel-create-batch-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              id="submit-create-batch-btn"
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-sm transition-colors"
            >
              Tạo Đợt Hàng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
