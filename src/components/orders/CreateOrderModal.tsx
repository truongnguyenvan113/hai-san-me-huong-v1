import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderItem, Customer, Product, ProcessingOption, UnitType } from '../../types';
import { CreateCustomerModal } from '../customers/CreateCustomerModal';
import { formatCurrency } from '../../utils/formatters';
import {
  X,
  Plus,
  Trash2,
  UserPlus,
  ShoppingBag,
  Building,
  Phone,
  DollarSign,
  Truck,
  Sparkles,
  Scissors,
  CheckCircle2
} from 'lucide-react';

const PROCESSING_OPTIONS: ProcessingOption[] = [
  'Nguyên con',
  'Làm sạch',
  'Bỏ đầu',
  'Bóc vỏ',
  'Rút chỉ',
  'Cắt khúc',
  'Cắt lát',
  'Phi lê',
  'Giao sống oxy',
  'Ướp đá',
];

export const CreateOrderModal: React.FC = () => {
  const {
    isCreateOrderOpen,
    setIsCreateOrderOpen,
    customers,
    products,
    batches,
    currentBatch,
    addOrder,
    settings,
  } = useApp();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderItems, setOrderItems] = useState<
    Array<{
      product_id: string;
      product_name: string;
      unit: UnitType;
      size: string;
      quantity_ordered: number;
      estimated_price: number;
      processing_note: string;
      item_note: string;
    }>
  >([]);

  // Selected product state for add item form
  const [selectedProdId, setSelectedProdId] = useState('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemProcessing, setItemProcessing] = useState<string>('Nguyên con');
  const [itemNote, setItemNote] = useState<string>('');

  const [discount, setDiscount] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(settings.default_shipping_fee || 0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'QR' | 'COD'>('QR');
  const [orderNote, setOrderNote] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  const [isInlineCustomerOpen, setIsInlineCustomerOpen] = useState(false);

  useEffect(() => {
    if (isCreateOrderOpen) {
      if (currentBatch) {
        setSelectedBatchId(currentBatch.batch_id);
        setDeliveryDate(currentBatch.delivery_date);
      } else if (batches.length > 0) {
        setSelectedBatchId(batches[0].batch_id);
        setDeliveryDate(batches[0].delivery_date);
      }
      if (products.length > 0 && !selectedProdId) {
        const firstActive = products.find((p) => p.status === 'ACTIVE') || products[0];
        setSelectedProdId(firstActive.product_id);
        setItemPrice(firstActive.default_price);
      }
    }
  }, [isCreateOrderOpen, currentBatch, batches, products]);

  if (!isCreateOrderOpen) return null;

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = products.find((p) => p.product_id === prodId);
    if (prod) {
      setItemPrice(prod.default_price);
    }
  };

  const handleAddItem = () => {
    const prod = products.find((p) => p.product_id === selectedProdId);
    if (!prod || itemQty <= 0) return;

    setOrderItems((prev) => [
      ...prev,
      {
        product_id: prod.product_id,
        product_name: prod.product_name,
        unit: prod.unit,
        size: prod.size || '',
        quantity_ordered: itemQty,
        estimated_price: itemPrice || prod.default_price,
        processing_note: itemProcessing,
        item_note: itemNote,
      },
    ]);

    // reset item inputs for next
    setItemQty(1);
    setItemNote('');
    setItemProcessing('Nguyên con');
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCustomer = customers.find((c) => c.customer_id === selectedCustomerId);
  const selectedBatch = batches.find((b) => b.batch_id === selectedBatchId);

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.quantity_ordered * item.estimated_price,
    0
  );
  const total = Math.max(0, subtotal - discount + shippingFee);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng!');
      return;
    }
    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất 1 sản phẩm hải sản vào đơn hàng!');
      return;
    }

    const orderId = `ORD-${Date.now()}`;
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const orderCode = `ORD-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

    const items: OrderItem[] = orderItems.map((item, idx) => ({
      order_item_id: `ITEM-${orderId}-${idx + 1}`,
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      unit: item.unit,
      size: item.size,
      quantity_ordered: item.quantity_ordered,
      estimated_price: item.estimated_price,
      quantity_actual: undefined, // to be filled upon delivery & weighing
      actual_price: undefined,   // to be filled when batch price is confirmed
      subtotal: Math.round(item.quantity_ordered * item.estimated_price),
      processing_note: item.processing_note,
      item_note: item.item_note,
      status: 'PENDING',
    }));

    const newOrder: Order = {
      order_id: orderId,
      order_code: orderCode,
      customer_id: selectedCustomer.customer_id,
      customer_name: selectedCustomer.name,
      customer_phone: selectedCustomer.phone,
      customer_building: selectedCustomer.building,
      customer_room: selectedCustomer.room,
      batch_id: selectedBatchId || 'DEFAULT',
      batch_name: selectedBatch?.batch_name || 'Đợt gom hiện tại',
      order_date: new Date().toISOString(),
      delivery_date: deliveryDate || new Date().toISOString().slice(0, 10),
      status: 'COLLECTING',
      items,
      subtotal,
      discount,
      shipping_fee: shippingFee,
      total,
      paid_amount: paidAmount,
      debt_amount: Math.max(0, total - paidAmount),
      payment_status:
        paidAmount >= total && total > 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
      payment_method: paymentMethod,
      delivery_status: 'PENDING',
      delivery_note: deliveryNote || selectedCustomer.note || '',
      note: orderNote,
      is_weighed: false,
      is_packed: false,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addOrder(newOrder);
    setIsCreateOrderOpen(false);

    // Reset state
    setSelectedCustomerId('');
    setOrderItems([]);
    setDiscount(0);
    setPaidAmount(0);
    setOrderNote('');
    setDeliveryNote('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div
        id="create-order-modal-card"
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-lg font-bold">Tạo Đơn Gom Hải Sản Mới</h3>
              <p className="text-xs text-slate-300">Nhận đơn cư dân chung cư theo đợt hàng</p>
            </div>
          </div>
          <button
            id="close-create-order-modal-btn"
            onClick={() => setIsCreateOrderOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: BATCH & RESIDENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Đợt gom hàng <span className="text-rose-500">*</span>
              </label>
              <select
                id="order-batch-select"
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  const b = batches.find((x) => x.batch_id === e.target.value);
                  if (b) setDeliveryDate(b.delivery_date);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-medium"
              >
                {batches.map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.batch_name} ({b.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ngày dự kiến giao tận phòng
              </label>
              <input
                id="order-delivery-date-input"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-medium"
              />
            </div>

            {/* Resident selection */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cư dân đặt hàng <span className="text-rose-500">*</span>
                </label>
                <button
                  id="open-inline-customer-btn"
                  type="button"
                  onClick={() => setIsInlineCustomerOpen(true)}
                  className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Thêm cư dân mới
                </button>
              </div>

              <select
                id="order-customer-select"
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-medium"
              >
                <option value="">-- Bấm chọn cư dân trong chung cư --</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.building} - Phòng {c.room} | {c.name} ({c.phone})
                  </option>
                ))}
              </select>

              {/* Selected resident quick preview badge */}
              {selectedCustomer && (
                <div className="mt-2 p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-teal-800" />
                    <span className="font-bold text-teal-950">
                      {selectedCustomer.building} - PHÒNG {selectedCustomer.room}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-800">{selectedCustomer.name}</span>
                  </div>
                  <div className="font-mono text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {selectedCustomer.phone}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: ADD PRODUCT ITEMS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-700" /> Thêm món hải sản vào đơn:
              </h4>
              <span className="text-xs text-slate-500">Đã chọn {orderItems.length} món</span>
            </div>

            {/* Inline Item Adder Form */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sản phẩm hải sản
                  </label>
                  <select
                    id="add-item-product-select"
                    value={selectedProdId}
                    onChange={(e) => handleProductSelectChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700 font-medium"
                  >
                    {products
                      .filter((p) => p.status === 'ACTIVE')
                      .map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.product_name} ({p.unit}) - {p.default_price.toLocaleString()}đ
                        </option>
                      ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Số lượng đặt
                  </label>
                  <input
                    id="add-item-qty-input"
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700 font-bold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Giá dự kiến (₫)
                  </label>
                  <input
                    id="add-item-price-input"
                    type="number"
                    step="1000"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700 font-semibold"
                  />
                </div>
              </div>

              {/* Processing & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-amber-600" /> Sơ chế theo yêu cầu
                  </label>
                  <select
                    id="add-item-processing-select"
                    value={itemProcessing}
                    onChange={(e) => setItemProcessing(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700"
                  >
                    {PROCESSING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ghi chú chi tiết món
                  </label>
                  <input
                    id="add-item-note-input"
                    type="text"
                    placeholder="VD: lấy con nhiều gạch, bỏ đuôi..."
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    id="submit-add-item-btn"
                    type="button"
                    onClick={handleAddItem}
                    className="w-full mt-4 sm:mt-0 py-1.5 px-3 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Thêm Món
                  </button>
                </div>
              </div>
            </div>

            {/* List of items in cart */}
            {orderItems.length > 0 && (
              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Tên sản phẩm</th>
                      <th className="py-2 px-2 text-center">SL Đặt</th>
                      <th className="py-2 px-3">Yêu cầu sơ chế</th>
                      <th className="py-2 px-3 text-right">Đơn giá</th>
                      <th className="py-2 px-3 text-right">Tạm tính</th>
                      <th className="py-2 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {item.product_name}
                          {item.size && (
                            <span className="text-[10px] text-slate-500 block font-normal">
                              {item.size}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-teal-900">
                          {item.quantity_ordered} {item.unit}
                        </td>
                        <td className="py-2 px-3">
                          <span className="bg-amber-100 text-amber-900 text-[11px] font-medium px-2 py-0.5 rounded">
                            {item.processing_note}
                          </span>
                          {item.item_note && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              {item.item_note}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-600">
                          {item.estimated_price.toLocaleString()}đ
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {(item.quantity_ordered * item.estimated_price).toLocaleString()}đ
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            id={`remove-order-item-${idx}`}
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 3: TOTALS & PAYMENT & NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lưu ý khi giao tận phòng
                </label>
                <input
                  id="order-delivery-note-input"
                  type="text"
                  placeholder="Ví dụ: Giao sau 17h30, bấm chuông để ngoài cửa..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú nội bộ đơn hàng
                </label>
                <input
                  id="order-internal-note-input"
                  type="text"
                  placeholder="Ví dụ: Đã cọc 500k qua VCB..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tiền hàng dự kiến:</span>
                <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Giảm giá cư dân (₫):</span>
                <input
                  id="order-discount-input"
                  type="number"
                  step="5000"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-1 text-right text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700 font-semibold"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Phí ship lên phòng (₫):</span>
                <input
                  id="order-shipping-fee-input"
                  type="number"
                  step="5000"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-1 text-right text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700 font-semibold"
                />
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>TỔNG ĐƠN TẠM TÍNH:</span>
                <span className="text-base text-teal-900">{formatCurrency(total)}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-medium">Khách trả trước / Cọc:</span>
                <input
                  id="order-paid-amount-input"
                  type="number"
                  step="10000"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-32 px-2 py-1.5 text-right text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700 font-bold text-emerald-700"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Hình thức thanh toán:</span>
                <select
                  id="order-payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-700 font-semibold"
                >
                  <option value="QR">Quét VietQR</option>
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="COD">Thu COD khi giao</option>
                </select>
              </div>

              <div className="flex justify-between pt-1 font-bold text-xs">
                <span className="text-slate-700">Còn thu khi giao (COD):</span>
                <span className={total - paidAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  {formatCurrency(Math.max(0, total - paidAmount))}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              id="cancel-create-order-btn"
              type="button"
              onClick={() => setIsCreateOrderOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              id="submit-create-order-btn"
              type="submit"
              className="px-6 py-2.5 text-sm font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Lưu & Tạo Đơn Gom
            </button>
          </div>
        </form>
      </div>

      {/* Inline customer modal popup */}
      <CreateCustomerModal
        isOpen={isInlineCustomerOpen}
        onClose={() => setIsInlineCustomerOpen(false)}
        onCustomerCreated={(newCust) => {
          setSelectedCustomerId(newCust.customer_id);
        }}
      />
    </div>
  );
};
