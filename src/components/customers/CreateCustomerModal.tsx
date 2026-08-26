import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { UserPlus, X, Building, Home, Phone, User, FileText } from 'lucide-react';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const { addCustomer, customers } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [building, setBuilding] = useState('Tòa A1');
  const [room, setRoom] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !room.trim()) return;

    const newCustomer: Customer = {
      customer_id: `CUST-${Date.now()}`,
      customer_code: `KH-${room.trim()}-${building.replace(/[^A-Za-z0-9]/g, '')}`,
      name: name.trim(),
      phone: phone.trim(),
      building: building.trim(),
      room: room.trim(),
      address: `Phòng ${room.trim()}, ${building.trim()}`,
      note: note.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addCustomer(newCustomer);
    if (onCustomerCreated) {
      onCustomerCreated(newCustomer);
    }
    onClose();
    setName('');
    setPhone('');
    setRoom('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="create-customer-modal"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-teal-800">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-lg font-bold text-slate-900">Thêm Cư Dân Mới</h3>
          </div>
          <button
            id="close-create-customer-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên cư dân <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="customer-name-input"
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn An"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại (Zalo) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="customer-phone-input"
                type="tel"
                required
                placeholder="0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tòa nhà <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="customer-building-input"
                  type="text"
                  required
                  placeholder="Tòa A1, CT1..."
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số phòng <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="customer-room-input"
                  type="text"
                  required
                  placeholder="1205, 802..."
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú thói quen / Nhận hàng
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="customer-note-input"
                type="text"
                placeholder="Ví dụ: Giao sau 17h, thích tôm còn bơi sống..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              id="cancel-create-customer-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              id="submit-create-customer-btn"
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-sm transition-colors"
            >
              Lưu Cư Dân
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
