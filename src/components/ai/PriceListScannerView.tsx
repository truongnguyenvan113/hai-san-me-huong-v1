import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, UnitType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ScannedPriceItem, ruleBasedPriceListParser } from '../../utils/priceListParser';
import {
  Sparkles,
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  Edit2,
  Tag,
  Check,
  CheckSquare,
  Square,
  Scale,
  TrendingUp,
  DollarSign,
  ArrowRight
} from 'lucide-react';

interface PriceListScannerViewProps {
  onClose: () => void;
}

// Sample text illustrating exact requested patterns: 155k/lít, 210/2hộp, etc.
const SAMPLE_PRICE_LIST = `BẢNG GIÁ HẢI SẢN VÀ THỰC PHẨM HÔM NAY:
- Nước mắm sá sùng cốt nhĩ: 155k/lít
- Chả mực Hạ Long giã tay: 210/2hộp
- Tôm he biển tươi sống: 380k/kg (size 25-30c)
- Chả tôm chiên xù: 210k/2 hộp
- Nõn bề bề bóc sẵn loại 1: 185k/hộp
- Mực ống nhỏ tươi ngon: 160k/kg
- Dầu hào cá thu truyền thống: 45k/chai
- Ruột hàu sữa tươi béo: 55k/túi
- Cua gạch Cà Mau dây nhỏ: 450k/kg
- Ghẹ xanh bơi lưới: 360k/kg
- Nem hải sản đặc biệt: 90k/khay`;

export const PriceListScannerView: React.FC<PriceListScannerViewProps> = ({ onClose }) => {
  const {
    products,
    units,
    addUnit,
    categories,
    addCategory,
    addProduct,
    updateProduct,
    setActiveTab,
    addToast,
  } = useApp();

  const [inputMode, setInputMode] = useState<'IMAGE' | 'TEXT'>('IMAGE');
  const [priceImage, setPriceImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [rawText, setRawText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('');
  const [scannedItems, setScannedItems] = useState<ScannedPriceItem[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual row addition state
  const [isAddingManualRow, setIsAddingManualRow] = useState<boolean>(false);
  const [manualItem, setManualItem] = useState<{
    product_name: string;
    category: string;
    unit: string;
    unit_price: number;
    size: string;
  }>({
    product_name: '',
    category: categories[0] || 'Hải sản',
    unit: units[0] || 'kg',
    unit_price: 200000,
    size: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clipboard paste support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (scannedItems) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setPriceImage(event.target?.result as string);
              setImageMimeType(file.type || 'image/jpeg');
              setInputMode('IMAGE');
              setErrorMsg(null);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [scannedItems]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPriceImage(event.target?.result as string);
      setImageMimeType(file.type || 'image/jpeg');
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async (imgParam?: string, textParam?: string) => {
    const imgToUse = imgParam !== undefined ? imgParam : priceImage;
    const textToUse = textParam !== undefined ? textParam : rawText;

    if (!imgToUse && !textToUse.trim()) {
      setErrorMsg('Vui lòng tải ảnh bảng giá lên hoặc dán nội dung văn bản');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalyzingStep('Đang đọc hình ảnh & bóc tách dữ liệu...');

    try {
      const stepTimer1 = setTimeout(() => {
        setAnalyzingStep('Đang phân tích định dạng giá 155k/lít, 210/2hộp, quy cách...');
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setAnalyzingStep('So khớp tên hải sản với danh mục hiện có...');
      }, 2800);

      const response = await fetch('/api/ai/parse-pricelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imgToUse || undefined,
          imageMimeType: imageMimeType,
          rawText: textToUse || undefined,
          existingProducts: products.map((p) => ({
            product_id: p.product_id,
            product_name: p.product_name,
            category: p.category,
            unit: p.unit,
            default_price: p.default_price,
            size: p.size,
          })),
          knownCategories: categories,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        // Fallback to client-side rule-based parser if text was provided
        if (textToUse.trim()) {
          const fallback = ruleBasedPriceListParser(textToUse, products, categories);
          if (fallback.length > 0) {
            setScannedItems(fallback);
            addToast('info', 'Phân tích cục bộ', 'Đã bóc tách thành công bằng bộ phân tích thông minh!');
            return;
          }
        }
        throw new Error(resJson.error || 'Không thể phân tích dữ liệu bảng giá');
      }

      const items: ScannedPriceItem[] = resJson.data?.items || [];
      if (items.length === 0 && textToUse.trim()) {
        const fallback = ruleBasedPriceListParser(textToUse, products, categories);
        setScannedItems(fallback);
      } else {
        setScannedItems(items);
      }

      const updatedCount = items.filter((it) => it.status === 'UPDATE').length;
      const newCount = items.filter((it) => it.status === 'NEW').length;

      addToast(
        'success',
        'Quét bảng giá thành công!',
        `Nhận diện được ${items.length} món (${updatedCount} cập nhật giá, ${newCount} thêm mới).`
      );
    } catch (err: any) {
      console.error('Error analyzing price list:', err);
      // Fallback to client-side parser if text was entered
      if (textToUse.trim()) {
        const fallback = ruleBasedPriceListParser(textToUse, products, categories);
        if (fallback.length > 0) {
          setScannedItems(fallback);
          addToast('warning', 'Phân tích cục bộ', 'Đã chuyển sang phân tích thông minh cục bộ thành công!');
          return;
        }
      }
      setErrorMsg(err.message || 'Lỗi khi phân tích bảng giá. Vui lòng thử lại.');
      addToast('error', 'Lỗi phân tích', err.message || 'Không thể phân tích bảng giá');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep('');
    }
  };

  const handleUseSample = () => {
    setInputMode('TEXT');
    setRawText(SAMPLE_PRICE_LIST);
    setPriceImage(null);
    handleStartAnalysis(undefined, SAMPLE_PRICE_LIST);
  };

  const handleUpdateItem = (index: number, field: keyof ScannedPriceItem, value: any) => {
    if (!scannedItems) return;
    const next = [...scannedItems];
    next[index] = { ...next[index], [field]: value };
    setScannedItems(next);
  };

  const handleToggleSelect = (index: number) => {
    if (!scannedItems) return;
    const next = [...scannedItems];
    next[index] = { ...next[index], selected: !next[index].selected };
    setScannedItems(next);
  };

  const handleToggleSelectAll = (select: boolean) => {
    if (!scannedItems) return;
    setScannedItems(scannedItems.map((it) => ({ ...it, selected: select })));
  };

  const handleDeleteItem = (index: number) => {
    if (!scannedItems) return;
    setScannedItems(scannedItems.filter((_, idx) => idx !== index));
  };

  const handleAddManualRow = () => {
    if (!manualItem.product_name.trim()) {
      addToast('warning', 'Thiếu tên sản phẩm', 'Vui lòng nhập tên hải sản để thêm');
      return;
    }

    const newItem: ScannedPriceItem = {
      id: `manual-item-${Date.now()}`,
      product_name: manualItem.product_name.trim(),
      category: manualItem.category || 'Hải sản',
      unit: manualItem.unit || 'kg',
      unit_price: Number(manualItem.unit_price) || 200000,
      total_price: Number(manualItem.unit_price) || 200000,
      package_qty: 1,
      raw_price_str: `${(Number(manualItem.unit_price) || 200000).toLocaleString()}đ/${manualItem.unit || 'kg'}`,
      size: manualItem.size || '',
      note: 'Thêm thủ công',
      selected: true,
      status: 'NEW',
    };

    setScannedItems([newItem, ...(scannedItems || [])]);
    setManualItem({
      product_name: '',
      category: categories[0] || 'Hải sản',
      unit: units[0] || 'kg',
      unit_price: 200000,
      size: '',
    });
    setIsAddingManualRow(false);
  };

  const handleApplyUpdates = () => {
    if (!scannedItems) return;
    const selected = scannedItems.filter((it) => it.selected);

    if (selected.length === 0) {
      addToast('warning', 'Chưa chọn mặt hàng', 'Vui lòng chọn ít nhất 1 mặt hàng để cập nhật');
      return;
    }

    let updatedCount = 0;
    let newCount = 0;

    // 1. Auto add any missing units to units state (e.g. "lít", "hộp", "chai")
    const existingUnitsLower = units.map((u) => u.toLowerCase().trim());
    const unitsToAdd = new Set<string>();

    selected.forEach((it) => {
      const u = (it.unit || '').trim();
      if (u && !existingUnitsLower.includes(u.toLowerCase())) {
        unitsToAdd.add(u);
      }
    });

    unitsToAdd.forEach((u) => {
      addUnit(u);
    });

    // 2. Auto add any missing categories to categories state
    const existingCatsLower = categories.map((c) => c.toLowerCase().trim());
    const catsToAdd = new Set<string>();

    selected.forEach((it) => {
      const c = (it.category || '').trim();
      if (c && !existingCatsLower.includes(c.toLowerCase()) && c !== 'Tất cả') {
        catsToAdd.add(c);
      }
    });

    catsToAdd.forEach((c) => {
      addCategory(c);
    });

    // 3. Update or Add products
    selected.forEach((it, idx) => {
      if (it.existingProductId) {
        const existing = products.find((p) => p.product_id === it.existingProductId);
        if (existing) {
          updateProduct({
            ...existing,
            product_name: it.product_name.trim(),
            category: it.category || existing.category,
            unit: (it.unit as UnitType) || existing.unit,
            default_price: it.unit_price,
            size: it.size || existing.size,
          });
          updatedCount++;
        }
      } else {
        // Fallback match by product name in current product catalog
        const norm = it.product_name.toLowerCase().trim();
        const existing = products.find(
          (p) => p.product_name.toLowerCase().trim() === norm
        );

        if (existing) {
          updateProduct({
            ...existing,
            product_name: it.product_name.trim(),
            category: it.category || existing.category,
            unit: (it.unit as UnitType) || existing.unit,
            default_price: it.unit_price,
            size: it.size || existing.size,
          });
          updatedCount++;
        } else {
          const newProduct: Product = {
            product_id: `PROD-${Date.now()}-${idx}`,
            sku: `HS-${Date.now().toString().slice(-4)}${idx}`,
            product_name: it.product_name.trim(),
            category: it.category || 'Hải sản',
            unit: (it.unit as UnitType) || 'kg',
            size: it.size || '',
            default_price: it.unit_price,
            status: 'ACTIVE',
          };
          addProduct(newProduct);
          newCount++;
        }
      }
    });

    addToast(
      'success',
      'Đã cập nhật bảng giá vào hệ thống!',
      `Đã cập nhật giá cho ${updatedCount} mặt hàng và thêm mới ${newCount} mặt hàng vào danh mục.`
    );

    setActiveTab('PRODUCTS');
    onClose();
  };

  const selectedCount = scannedItems ? scannedItems.filter((it) => it.selected).length : 0;
  const newItemsCount = scannedItems ? scannedItems.filter((it) => it.status === 'NEW').length : 0;
  const updateItemsCount = scannedItems ? scannedItems.filter((it) => it.status === 'UPDATE').length : 0;
  const unchangedItemsCount = scannedItems ? scannedItems.filter((it) => it.status === 'UNCHANGED').length : 0;

  return (
    <div className="space-y-5">
      {/* Error message */}
      {errorMsg && (
        <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-900">Thông báo xử lý bảng giá</div>
              <div className="font-medium text-amber-900/90 leading-relaxed">{errorMsg}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleStartAnalysis()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-xs text-xs shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Thử Lại
          </button>
        </div>
      )}

      {!scannedItems ? (
        /* Input & Upload Panel */
        <div className="space-y-4">
          {/* Smart Features Introduction Card */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl text-xs space-y-2.5 text-slate-800 shadow-xs">
            <div className="font-black text-teal-950 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Quét Bảng Giá & Tự Động Cập Nhật Danh Mục Hải Sản</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống tự động nhận diện thông minh mọi biểu thức giá đặc thù, tự chia đơn giá và cập nhật vào danh mục hải sản:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                <span className="font-black text-emerald-700 shrink-0">✓</span>
                <div>
                  <strong className="text-slate-900">Dạng 155k/lít:</strong> Tự hiểu đơn vị là <code>lít</code>, đơn giá <code>155.000đ/lít</code>.
                </div>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                <span className="font-black text-emerald-700 shrink-0">✓</span>
                <div>
                  <strong className="text-slate-900">Dạng 210/2hộp (hoặc 210k/2 hộp):</strong> Tự tính đơn giá 1 hộp = <code>105.000đ/hộp</code>, lưu quy cách 2 hộp 210k.
                </div>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                <span className="font-black text-emerald-700 shrink-0">✓</span>
                <div>
                  <strong className="text-slate-900">Đầy đủ đơn vị tính:</strong> Kg, Khay, Con, Chai, Lon, Bịch, Thùng, Túi, Suất...
                </div>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                <span className="font-black text-emerald-700 shrink-0">✓</span>
                <div>
                  <strong className="text-slate-900">So khớp & phân loại:</strong> Nhận diện món đã có để cập nhật giá hoặc tự thêm món mới.
                </div>
              </div>
            </div>
          </div>

          {/* Sub Input Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setInputMode('IMAGE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                inputMode === 'IMAGE'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Quét / Tải Ảnh Bảng Giá
            </button>
            <button
              type="button"
              onClick={() => setInputMode('TEXT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                inputMode === 'TEXT'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Dán Bảng Giá Văn Bản
            </button>
          </div>

          {inputMode === 'IMAGE' ? (
            /* Image Upload Area */
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                priceImage
                  ? 'border-emerald-600 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-emerald-600 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {priceImage ? (
                <div className="space-y-4">
                  <div className="max-h-72 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden p-2">
                    <img
                      src={priceImage}
                      alt="Bảng giá hải sản"
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
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                    >
                      Đổi ảnh khác
                    </button>
                    <span className="text-xs text-slate-500 font-medium">
                      Hoặc bấm <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">Ctrl+V</kbd> để dán ảnh
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-800">
                      Kéo thả ảnh bảng giá hoặc bấm để tải ảnh lên
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Hỗ trợ ảnh chụp bảng viết tay, bảng menu in, bảng giá Zalo / Facebook...
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-full text-[11px] font-bold">
                    <span>💡 Có thể nhấn <strong>Ctrl + V</strong> để dán ảnh bảng giá ngay lập tức!</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Text Input Area */
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Dán nội dung bảng giá từ Zalo, Facebook hoặc tin nhắn:
              </label>
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Ví dụ:\nNước mắm sá sùng: 155k/lít\nChả mực: 210/2hộp\nTôm he tươi: 380k/kg (size 25-30c)\nChả tôm: 210k/2 hộp\nNõn bề bề: 185k/hộp...`}
                className="w-full p-4 bg-white border border-slate-300 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-emerald-700 outline-none leading-relaxed text-slate-800"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleUseSample}
                  className="text-xs text-emerald-800 hover:underline font-bold cursor-pointer"
                >
                  + Điền bảng giá mẫu (155k/lít, 210/2hộp...)
                </button>
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Xóa trắng
                </button>
              </div>
            </div>
          )}

          {/* Sample trigger banner for image mode */}
          {inputMode === 'IMAGE' && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
              <div className="text-xs text-emerald-950 font-medium">
                Chưa có ảnh sẵn? Muốn kiểm tra ngay với dữ liệu bảng giá mẫu?
              </div>
              <button
                type="button"
                onClick={handleUseSample}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                👉 Thử Mẫu Bảng Giá (155k/lít, 210/2hộp)
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Đóng
            </button>
            <button
              id="start-ai-pricelist-btn"
              type="button"
              disabled={isAnalyzing || (!priceImage && !rawText.trim())}
              onClick={() => handleStartAnalysis()}
              className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                isAnalyzing || (!priceImage && !rawText.trim())
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>{analyzingStep || 'Đang phân tích bảng giá...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Bắt Đầu Phân Tích Bảng Giá</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Result Review & Confirmation Screen */
        <div className="space-y-4">
          {/* Header Summary Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-700" />
                  <span>Kết Quả Nhận Diện Bảng Giá Hải Sản</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kiểm tra lại tên, đơn vị, giá bán. Hệ thống sẽ tự động cập nhật hoặc thêm mới các món được chọn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setScannedItems(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Quét Bảng Giá Khác
              </button>
            </div>

            {/* Badges stat overview */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200">
                Tổng cộng: <strong>{scannedItems.length}</strong> món
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-bold border border-emerald-200">
                🟢 Thêm mới: <strong>{newItemsCount}</strong> món
              </span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg font-bold border border-blue-200">
                🔵 Cập nhật giá: <strong>{updateItemsCount}</strong> món
              </span>
              {unchangedItemsCount > 0 && (
                <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg font-medium border border-slate-200">
                  ⚪ Giá không đổi: {unchangedItemsCount} món
                </span>
              )}
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleSelectAll(true)}
                className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingManualRow(!isAddingManualRow)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingManualRow ? 'Đóng Thêm Món' : '+ Thêm Món Thủ Công'}</span>
            </button>
          </div>

          {/* Inline Add Manual Row Form */}
          {isAddingManualRow && (
            <div className="bg-white p-3.5 rounded-2xl border border-teal-300 shadow-sm space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Thêm món mới vào danh sách quét:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Tên hải sản *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tôm sú bơi, Nước mắm..."
                    value={manualItem.product_name}
                    onChange={(e) => setManualItem({ ...manualItem, product_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Danh mục</label>
                  <select
                    value={manualItem.category}
                    onChange={(e) => setManualItem({ ...manualItem, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  >
                    {categories.filter((c) => c !== 'Tất cả').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Đơn vị</label>
                  <select
                    value={manualItem.unit}
                    onChange={(e) => setManualItem({ ...manualItem, unit: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Đơn giá (đ)</label>
                  <input
                    type="number"
                    value={manualItem.unit_price}
                    onChange={(e) => setManualItem({ ...manualItem, unit_price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingManualRow(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Thêm Vào Bảng
                </button>
              </div>
            </div>
          )}

          {/* Scanned Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={scannedItems.length > 0 && scannedItems.every((it) => it.selected)}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-teal-800 focus:ring-teal-700 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 w-28">Trạng Thái</th>
                    <th className="p-3 min-w-[180px]">Tên Hải Sản</th>
                    <th className="p-3 w-28">Danh Mục</th>
                    <th className="p-3 w-24">Đơn Vị</th>
                    <th className="p-3 w-32">Giá Bán Đơn Vị</th>
                    <th className="p-3 min-w-[150px]">Quy Cách / Ghi Chú</th>
                    <th className="p-3 w-28">Size / Kích Cỡ</th>
                    <th className="p-3 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scannedItems.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={`transition-colors ${
                        !item.selected
                          ? 'opacity-40 bg-slate-50/50'
                          : item.status === 'NEW'
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : item.status === 'UPDATE'
                          ? 'bg-blue-50/20 hover:bg-blue-50/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelect(idx)}
                          className="rounded border-slate-300 text-teal-800 focus:ring-teal-700 cursor-pointer"
                        />
                      </td>

                      {/* Status Badge */}
                      <td className="p-3">
                        {item.status === 'NEW' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px] border border-emerald-200">
                            Thêm Mới
                          </span>
                        )}
                        {item.status === 'UPDATE' && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[10px] border border-blue-200">
                              Đổi Giá
                            </span>
                            {item.existingProductOldPrice !== undefined && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                <span className="line-through text-slate-400">
                                  {(item.existingProductOldPrice / 1000).toLocaleString()}k
                                </span>{' '}
                                ➔{' '}
                                <strong className="text-blue-700">
                                  {(item.unit_price / 1000).toLocaleString()}k
                                </strong>
                              </div>
                            )}
                          </div>
                        )}
                        {item.status === 'UNCHANGED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium text-[10px]">
                            Giá Chuẩn
                          </span>
                        )}
                      </td>

                      {/* Product Name */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => handleUpdateItem(idx, 'product_name', e.target.value)}
                          className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-700 focus:bg-white outline-none px-1 py-0.5 rounded"
                        />
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none text-xs"
                        >
                          {categories.filter((c) => c !== 'Tất cả').map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>

                      {/* Unit */}
                      <td className="p-3">
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none text-xs"
                        >
                          {units.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                          {!units.includes(item.unit) && (
                            <option value={item.unit}>{item.unit} (Mới)</option>
                          )}
                        </select>
                      </td>

                      {/* Unit Price */}
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={1000}
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(idx, 'unit_price', Number(e.target.value) || 0)}
                            className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 outline-none text-xs"
                          />
                          <span className="text-[11px] text-slate-500 font-medium">đ</span>
                        </div>
                      </td>

                      {/* Raw price / note */}
                      <td className="p-3">
                        <span className="font-mono text-[11px] text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/80">
                          {item.note || item.raw_price_str || '---'}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Kích cỡ nếu có"
                          value={item.size || ''}
                          onChange={(e) => handleUpdateItem(idx, 'size', e.target.value)}
                          className="w-full text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-700 focus:bg-white outline-none px-1 py-0.5 rounded text-xs"
                        />
                      </td>

                      {/* Delete */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Confirmation Footer */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="text-xs">
              <div className="font-black text-amber-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sẵn sàng cập nhật {selectedCount} / {scannedItems.length} mặt hàng vào hệ thống
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Hệ thống sẽ tự động thêm các đơn vị mới (lít, hộp...) và danh mục mới nếu chưa có.
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setScannedItems(null)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                id="apply-price-updates-btn"
                type="button"
                disabled={selectedCount === 0}
                onClick={handleApplyUpdates}
                className={`flex items-center gap-2 px-5 py-2.5 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                  selectedCount === 0
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 active:scale-95'
                }`}
              >
                <span>⚡ Cập Nhật Ngay Vào Hệ Thống ({selectedCount} món)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
