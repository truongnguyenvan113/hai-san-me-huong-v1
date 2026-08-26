import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, Order, OrderItem, Customer, Product, UnitType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Sparkles,
  Camera,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  RefreshCw,
  Building,
  Home,
  Layers,
  Image as ImageIcon,
  Edit2,
  PackageCheck
} from 'lucide-react';

interface AIScanBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedItem {
  product_name: string;
  quantity: number;
  unit: UnitType;
  size?: string;
  estimated_price: number;
  processing_note?: string;
  item_note?: string;
}

interface ParsedOrder {
  id: string;
  customer_name: string;
  building: string;
  room: string;
  phone?: string;
  items: ParsedItem[];
}

interface ParsedBatchData {
  batch_name: string;
  delivery_date: string;
  note?: string;
  orders: ParsedOrder[];
}

// Sample text matching the user's exact uploaded image
const SAMPLE_NOTE_TEXT = `Hsan trước lễ:
1903A: 0.5kg cá bơn + 1 rế
1006B: 1kg mực trứng đổi mực nhỏ + 1kg cá bạc má
2206B: 0,5kg chả mực loại 1, 0.5kg chả cá thu cá nhồng, 0.5kg nõn sắt nhỏ nấu canh
1203A: 1 kg mực sz 20-22, 1 kg tôm he sz 30-32 nhé ạ
0806B: 1 rế 1 xù
904B: 0,5kg tôm he vẫn size 14-16 + 1 kg cá thu 1 nắng + 1 khay nõn bộp
C Phô Mai: 1kg tuộc sữa + 1kg chả cá
1501A: 1 rế
2303A: 1 xù
1005B: 1 rế
1605B: 1kg cá mối
2503B: 1 rế
1006B: 5 rế + 1 xù + 1kg tôm
1606A: 1kg cá hố
1707B: 0.5kg nõn sắt`;

export const AIScanBatchModal: React.FC<AIScanBatchModalProps> = ({ isOpen, onClose }) => {
  const {
    products,
    customers,
    storeSettings,
    addBatch,
    addOrder,
    addCustomer,
    addProduct,
    setSelectedBatchId,
    setActiveTab,
    addToast,
  } = useApp();

  const [activeTab, setActiveTabMode] = useState<'IMAGE' | 'TEXT'>('IMAGE');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [rawText, setRawText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedBatchData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle paste image from clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (parsedData) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setSelectedImage(event.target?.result as string);
              setImageMimeType(file.type || 'image/jpeg');
              setActiveTabMode('IMAGE');
              setErrorMsg(null);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, parsedData]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setImageMimeType(file.type || 'image/jpeg');
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async (imgOverride?: string, textOverride?: string) => {
    const imgToUse = imgOverride || selectedImage;
    const textToUse = textOverride || rawText;

    if (!imgToUse && !textToUse) {
      setErrorMsg('Vui lòng chọn hoặc chụp ảnh ghi chú, hoặc nhập nội dung văn bản đơn hàng.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalyzingStep('Đang khởi tạo kết nối AI Gemini...');

    try {
      setTimeout(() => setAnalyzingStep('Đang đọc ảnh ghi chú & nhận diện số phòng...'), 600);
      setTimeout(() => setAnalyzingStep('Đang phân loại các món hải sản & quy cách size...'), 1400);
      setTimeout(() => setAnalyzingStep('Đang tổng hợp thành đợt hàng và đơn chi tiết...'), 2200);

      let response: Response;
      try {
        response = await fetch('/api/ai/parse-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imgToUse || undefined,
            imageMimeType: imageMimeType,
            rawText: textToUse || undefined,
            existingProducts: products.map((p) => ({
              product_name: p.product_name,
              unit: p.unit,
              default_price: p.default_price,
            })),
            condoName: storeSettings.condo_name,
          }),
        });
      } catch (netErr: any) {
        console.error('Fetch error to /api/ai/parse-orders:', netErr);
        throw new Error('Không thể kết nối đến máy chủ AI (Lỗi mạng). Vui lòng kiểm tra kết nối mạng và thử lại.');
      }

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Không thể phân tích dữ liệu hình ảnh ghi chú');
      }

      const data = resJson.data;
      const today = new Date().toISOString().slice(0, 10);

      const formattedOrders: ParsedOrder[] = (data.orders || []).map((o: any, idx: number) => ({
        id: `temp-${Date.now()}-${idx}`,
        customer_name: o.customer_name || `Căn ${o.room || 'Khách'}`,
        building: o.building || 'Tòa A',
        room: o.room || '---',
        phone: o.phone || '',
        items: (o.items || []).map((it: any) => ({
          product_name: it.product_name || 'Hải sản',
          quantity: typeof it.quantity === 'number' ? it.quantity : parseFloat(it.quantity) || 1,
          unit: it.unit || 'kg',
          size: it.size || '',
          estimated_price: it.estimated_price || 200000,
          processing_note: it.processing_note || '',
          item_note: it.item_note || '',
        })),
      }));

      setParsedData({
        batch_name: data.batch_name || 'Đợt Hải Sản Mới',
        delivery_date: today,
        note: data.note || 'Tạo tự động bằng AI từ ảnh ghi chú',
        orders: formattedOrders,
      });

      if (resJson.warning) {
        addToast('info', 'Thông báo xử lý', resJson.warning);
      } else {
        addToast('success', 'Phân tích thành công!', `AI đã nhận diện được ${formattedOrders.length} đơn hàng của cư dân.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi phân tích. Vui lòng kiểm tra lại ảnh hoặc nhập trực tiếp văn bản.');
      addToast('error', 'Lỗi phân tích', err.message || 'Không thể phân tích ảnh ghi chú');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep('');
    }
  };

  const handleUseSample = () => {
    setActiveTabMode('TEXT');
    setRawText(SAMPLE_NOTE_TEXT);
    setSelectedImage(null);
    handleStartAnalysis(undefined, SAMPLE_NOTE_TEXT);
  };

  const handleUpdateItem = (
    orderIndex: number,
    itemIndex: number,
    field: keyof ParsedItem,
    value: any
  ) => {
    if (!parsedData) return;
    const newOrders = [...parsedData.orders];
    const order = { ...newOrders[orderIndex] };
    const items = [...order.items];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    order.items = items;
    newOrders[orderIndex] = order;
    setParsedData({ ...parsedData, orders: newOrders });
  };

  const handleDeleteItem = (orderIndex: number, itemIndex: number) => {
    if (!parsedData) return;
    const newOrders = [...parsedData.orders];
    const order = { ...newOrders[orderIndex] };
    order.items = order.items.filter((_, i) => i !== itemIndex);
    if (order.items.length === 0) {
      // Remove entire order if no items left
      newOrders.splice(orderIndex, 1);
    } else {
      newOrders[orderIndex] = order;
    }
    setParsedData({ ...parsedData, orders: newOrders });
  };

  const handleDeleteOrder = (orderIndex: number) => {
    if (!parsedData) return;
    const newOrders = parsedData.orders.filter((_, i) => i !== orderIndex);
    setParsedData({ ...parsedData, orders: newOrders });
  };

  const handleAddItemToOrder = (orderIndex: number) => {
    if (!parsedData) return;
    const newOrders = [...parsedData.orders];
    const order = { ...newOrders[orderIndex] };
    order.items = [
      ...order.items,
      {
        product_name: 'Mực ống tươi',
        quantity: 1,
        unit: 'kg',
        estimated_price: 260000,
      },
    ];
    newOrders[orderIndex] = order;
    setParsedData({ ...parsedData, orders: newOrders });
  };

  // Final Action: Batch create batch, orders, customers & products
  const handleConfirmCreateAll = () => {
    if (!parsedData || parsedData.orders.length === 0) {
      setErrorMsg('Không có đơn hàng nào để tạo.');
      return;
    }

    const batchCode = `DOT-${Date.now().toString().slice(-6)}`;
    const batchId = `BATCH-${Date.now()}`;

    // 1. Create Batch
    const newBatch: Batch = {
      batch_id: batchId,
      batch_code: batchCode,
      batch_name: parsedData.batch_name || 'Đợt Gom Hải Sản',
      batch_date: new Date().toISOString().slice(0, 10),
      delivery_date: parsedData.delivery_date || new Date().toISOString().slice(0, 10),
      status: 'OPEN',
      notes: parsedData.note || 'Tạo tự động từ ảnh ghi chú AI',
      supplier_info: {
        location: 'Quảng Ninh & Cà Mau',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addBatch(newBatch);

    // 2. Process Orders & Customers
    let orderCount = 0;

    // Track products and customers in local map during the loop to prevent duplicates
    const knownProductsMap = new Map<string, Product>();
    (products || []).forEach((p) => {
      if (p?.product_name) {
        knownProductsMap.set(p.product_name.toLowerCase().trim().replace(/\s+/g, ' '), p);
      }
    });

    const knownCustomersMap = new Map<string, Customer>();
    (customers || []).forEach((c) => {
      const key = `${(c.building || '').toLowerCase().trim()}_${(c.room || '').toLowerCase().trim()}`;
      knownCustomersMap.set(key, c);
    });

    parsedData.orders.forEach((pOrder, oIdx) => {
      if (pOrder.items.length === 0) return;

      // Find or create customer
      const custKey = `${(pOrder.building || '').toLowerCase().trim()}_${(pOrder.room || '').toLowerCase().trim()}`;
      let customer = knownCustomersMap.get(custKey);

      if (!customer) {
        customer = customers.find(
          (c) =>
            c.room.trim().toLowerCase() === pOrder.room.trim().toLowerCase() &&
            c.building.trim().toLowerCase() === pOrder.building.trim().toLowerCase()
        );
      }

      if (!customer) {
        const newCustomerId = `CUST-${Date.now()}-${oIdx}`;
        customer = {
          customer_id: newCustomerId,
          customer_code: `KH-${pOrder.room}${pOrder.building.replace(/\D/g, '') || 'A'}`,
          name: pOrder.customer_name || `Căn ${pOrder.room} ${pOrder.building}`,
          phone: pOrder.phone || '',
          building: pOrder.building || 'Tòa A',
          room: pOrder.room || '---',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        knownCustomersMap.set(custKey, customer);
        addCustomer(customer);
      }

      // Create Order Items
      const orderId = `ORD-${Date.now()}-${oIdx}`;
      const orderCode = `DH-${pOrder.building.replace(/\s+/g, '').slice(-1)}${pOrder.room}-${Date.now().toString().slice(-4)}`;

      let subtotal = 0;
      const orderItems: OrderItem[] = pOrder.items.map((it, itIdx) => {
        // Find existing product or create new one in local map
        const normItemName = (it.product_name || 'Hải sản').toLowerCase().trim().replace(/\s+/g, ' ');
        let product = knownProductsMap.get(normItemName);

        if (!product) {
          product = products.find(
            (p) => p.product_name.toLowerCase().trim().replace(/\s+/g, ' ') === normItemName
          );
        }

        if (!product) {
          const newProdId = `PROD-${Date.now()}-${itIdx}`;
          product = {
            product_id: newProdId,
            sku: `HS-${Date.now().toString().slice(-4)}`,
            product_name: it.product_name.trim(),
            category: 'Hải sản',
            unit: it.unit,
            size: it.size,
            default_price: it.estimated_price || 200000,
            status: 'ACTIVE',
          };
          knownProductsMap.set(normItemName, product);
          addProduct(product);
        }

        const itemSubtotal = Math.round(it.quantity * (it.estimated_price || product.default_price || 200000));
        subtotal += itemSubtotal;

        return {
          order_item_id: `ITEM-${Date.now()}-${itIdx}`,
          order_id: orderId,
          product_id: product.product_id,
          product_name: it.product_name.trim(),
          unit: it.unit,
          size: it.size,
          quantity_ordered: it.quantity,
          estimated_price: it.estimated_price || product.default_price || 200000,
          subtotal: itemSubtotal,
          processing_note: it.processing_note,
          item_note: it.item_note,
          status: 'PENDING',
        };
      });

      const newOrder: Order = {
        order_id: orderId,
        order_code: orderCode,
        customer_id: customer.customer_id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_building: customer.building,
        customer_room: customer.room,
        batch_id: batchId,
        batch_name: newBatch.batch_name,
        order_date: new Date().toISOString().slice(0, 10),
        delivery_date: newBatch.delivery_date,
        status: 'COLLECTING',
        items: orderItems,
        subtotal: subtotal,
        discount: 0,
        shipping_fee: 0,
        total: subtotal,
        paid_amount: 0,
        debt_amount: subtotal,
        payment_status: 'UNPAID',
        delivery_status: 'PENDING',
        is_weighed: false,
        is_packed: false,
        is_verified: true,
        note: 'Tạo bằng AI từ ghi chú gom đơn',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addOrder(newOrder);
      orderCount++;
    });

    addToast(
      'success',
      'Đã tạo đợt gom hàng thành công!',
      `Đã tạo đợt "${newBatch.batch_name}" cùng toàn bộ ${orderCount} đơn hàng cho cư dân.`
    );

    setSelectedBatchId(batchId);
    setActiveTab('BATCH_DETAIL');
    onClose();
  };

  // Calculate totals from parsedData
  const totalOrdersCount = parsedData?.orders.length || 0;
  const totalItemsCount = parsedData?.orders.reduce((sum, o) => sum + o.items.length, 0) || 0;
  const totalKg = parsedData?.orders.reduce((sum, o) => {
    return sum + o.items.reduce((s, it) => (it.unit === 'kg' ? s + (it.quantity || 0) : s), 0);
  }, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-teal-300">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Quét Ảnh / Ghi Chú Tạo Đợt Gom Bằng AI</span>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Gemini 3.7 AI
                </span>
              </h2>
              <p className="text-xs text-teal-100/90 font-medium">
                Tự động nhận diện số phòng, tên cư dân, loại hải sản, định lượng kg/khay & quy cách
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {errorMsg && (
            <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-900">Thông báo xử lý</div>
                  <div className="font-medium text-amber-900/90 leading-relaxed">{errorMsg}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartAnalysis()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-xs text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Thử Lại Ngay
                </button>
              </div>
            </div>
          )}

          {!parsedData ? (
            /* Upload & Input Mode */
            <div className="space-y-5">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('IMAGE')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'IMAGE'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4" /> Quét / Tải Ảnh Lên
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabMode('TEXT')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'TEXT'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Dán Ghi Chú / Zalo
                </button>
              </div>

              {activeTab === 'IMAGE' ? (
                /* Image Upload Area */
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                      selectedImage
                        ? 'border-teal-600 bg-teal-50/30'
                        : 'border-slate-300 hover:border-teal-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedImage ? (
                      <div className="space-y-4">
                        <div className="max-h-72 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden p-2">
                          <img
                            src={selectedImage}
                            alt="Ghi chú hải sản"
                            className="max-h-64 object-contain rounded-lg"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Đổi ảnh khác
                          </button>
                          <span className="text-xs text-slate-500 font-medium">
                            Hoặc bấm <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">Ctrl+V</kbd> để dán ảnh trực tiếp
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 py-4">
                        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto border border-teal-100 shadow-xs">
                          <Upload className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-bold text-slate-800">
                            Kéo thả ảnh hoặc bấm để chọn ảnh ghi chú
                          </div>
                          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            Hỗ trợ ảnh chụp màn hình ứng dụng Ghi chú (Notes), tin nhắn gom đơn Zalo, danh sách viết tay hoặc bảng kê phòng.
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-full text-[11px] font-bold">
                          <span>💡 Mẹo: Bạn có thể nhấn <strong>Ctrl + V</strong> (hoặc Command + V) để dán ảnh ngay lập tức!</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sample Trigger */}
                  <div className="flex items-center justify-between p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl">
                    <div className="text-xs text-teal-950 font-medium">
                      Chưa có ảnh sẵn? Muốn kiểm tra thử tính năng với ảnh mẫu?
                    </div>
                    <button
                      type="button"
                      onClick={handleUseSample}
                      className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0"
                    >
                      👉 Thử Ngay Với Dữ Liệu Mẫu
                    </button>
                  </div>
                </div>
              ) : (
                /* Text Input Area */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Dán nội dung tin nhắn Zalo hoặc ghi chú đơn gom:
                    </label>
                    <textarea
                      rows={10}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={`Ví dụ:\nHsan trước lễ:\n1903A: 0.5kg cá bơn + 1 rế\n1006B: 1kg mực trứng + 1kg cá bạc má\nC Phô Mai: 1kg tuộc sữa + 1kg chả cá...`}
                      className="w-full p-4 bg-white border border-slate-300 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-teal-700 outline-none leading-relaxed text-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setRawText(SAMPLE_NOTE_TEXT)}
                      className="text-xs text-teal-800 hover:underline font-bold"
                    >
                      + Điền văn bản mẫu (Hsan trước lễ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRawText('')}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Xóa trắng
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  id="start-ai-parse-btn"
                  type="button"
                  disabled={isAnalyzing || (!selectedImage && !rawText.trim())}
                  onClick={() => handleStartAnalysis()}
                  className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all ${
                    isAnalyzing || (!selectedImage && !rawText.trim())
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-teal-800 hover:bg-teal-900 text-white active:scale-95'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                      <span>{analyzingStep || 'Đang quét & xử lý...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Bắt Đầu Quét Bằng AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Parsed Result Review & Confirmation Screen */
            <div className="space-y-6">
              {/* Batch Info Bar */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-teal-800" />
                    <span className="font-black text-slate-900 text-sm">
                      Thông Tin Đợt Gom Hàng Mới
                    </span>
                  </div>
                  <button
                    onClick={() => setParsedData(null)}
                    className="text-xs text-slate-600 hover:text-teal-800 font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Quét ảnh khác
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tên đợt hàng</label>
                    <input
                      type="text"
                      value={parsedData.batch_name}
                      onChange={(e) => setParsedData({ ...parsedData, batch_name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Ngày giao hàng dự kiến</label>
                    <input
                      type="date"
                      value={parsedData.delivery_date}
                      onChange={(e) => setParsedData({ ...parsedData, delivery_date: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                </div>

                {/* Summary Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="px-3 py-1 bg-teal-50 text-teal-900 font-black rounded-lg border border-teal-200">
                    🏢 {totalOrdersCount} Căn Hộ
                  </span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-900 font-black rounded-lg border border-amber-200">
                    📦 {totalItemsCount} Món Hải Sản
                  </span>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-900 font-black rounded-lg border border-indigo-200">
                    ⚖️ Ước tính ~{totalKg.toFixed(1)} kg hải sản
                  </span>
                </div>
              </div>

              {/* List of Parsed Orders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase tracking-wider px-1">
                  <span>Danh Sách Đơn Hàng Cư Dân ({parsedData.orders.length} đơn)</span>
                  <span className="text-[11px] text-slate-500 font-normal lowercase">
                    (bạn có thể chỉnh sửa số lượng, giá hoặc xóa món trước khi tạo)
                  </span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {parsedData.orders.map((order, oIdx) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-teal-300 transition-all space-y-3"
                    >
                      {/* Order Room Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="px-2.5 py-1 bg-teal-800 text-white font-black text-xs rounded-lg flex items-center gap-1">
                            <Home className="w-3.5 h-3.5" />
                            <span>{order.building} - P.{order.room}</span>
                          </div>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {order.customer_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddItemToOrder(oIdx)}
                            className="p-1.5 text-teal-800 hover:bg-teal-50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Thêm món cho phòng này"
                          >
                            <Plus className="w-3.5 h-3.5" /> Thêm món
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(oIdx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs transition-colors"
                            title="Xóa đơn của phòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="space-y-2">
                        {order.items.map((item, itIdx) => (
                          <div
                            key={itIdx}
                            className="grid grid-cols-12 gap-2 items-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                          >
                            {/* Product Name */}
                            <div className="col-span-5 sm:col-span-4">
                              <input
                                type="text"
                                value={item.product_name}
                                onChange={(e) =>
                                  handleUpdateItem(oIdx, itIdx, 'product_name', e.target.value)
                                }
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-teal-700"
                                placeholder="Tên hải sản"
                              />
                            </div>

                            {/* Quantity & Unit */}
                            <div className="col-span-4 sm:col-span-3 flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    oIdx,
                                    itIdx,
                                    'quantity',
                                    parseFloat(e.target.value) || 1
                                  )
                                }
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-center focus:ring-1 focus:ring-teal-700 font-mono"
                              />
                              <select
                                value={item.unit}
                                onChange={(e) =>
                                  handleUpdateItem(oIdx, itIdx, 'unit', e.target.value as UnitType)
                                }
                                className="px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold"
                              >
                                <option value="kg">kg</option>
                                <option value="gram">gram</option>
                                <option value="khay">khay</option>
                                <option value="hộp">hộp</option>
                                <option value="con">con</option>
                                <option value="túi">túi</option>
                              </select>
                            </div>

                            {/* Size / Note */}
                            <div className="col-span-3 sm:col-span-3">
                              <input
                                type="text"
                                value={item.size || item.processing_note || ''}
                                onChange={(e) =>
                                  handleUpdateItem(oIdx, itIdx, 'size', e.target.value)
                                }
                                placeholder="Size/Sơ chế"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:ring-1 focus:ring-teal-700"
                              />
                            </div>

                            {/* Delete Item */}
                            <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-1.5 pt-1 sm:pt-0">
                              <span className="font-bold text-teal-900 font-mono text-[11px]">
                                {formatCurrency(item.quantity * item.estimated_price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(oIdx, itIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Final Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-teal-950 text-white rounded-2xl shadow-lg">
                <div className="text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sẵn sàng tạo {totalOrdersCount} đơn hàng cho cư dân
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Hệ thống sẽ tự động cập nhật danh bạ căn hộ, danh mục hải sản và đợt gom mới.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParsedData(null)}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    id="confirm-create-ai-batch-btn"
                    type="button"
                    onClick={handleConfirmCreateAll}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <span>🚀 Tạo Đợt & Tạo {totalOrdersCount} Đơn Hàng Ngay</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
