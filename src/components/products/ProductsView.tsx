import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, UnitType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  X,
} from 'lucide-react';

const UNITS: UnitType[] = ['kg', 'gram', 'con', 'hộp', 'túi', 'khay', 'combo'];
const CATEGORIES = ['Tất cả', 'Tôm', 'Cua', 'Ghẹ', 'Cá biển', 'Mực', 'Ốc & Ngao', 'Khác'];

const normalizeProductName = (value: string) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const ProductsView: React.FC = () => {
  const { products, addProduct, updateProduct } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states for create
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Tôm');
  const [size, setSize] = useState('');
  const [origin, setOrigin] = useState('Cà Mau');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [price, setPrice] = useState<number>(350000);
  const [description, setDescription] = useState('');

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'Tất cả' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.product_name.toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchOrigin = p.origin?.toLowerCase().includes(q) || false;
      if (!matchName && !matchSku && !matchOrigin) return false;
    }
    return true;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSku = sku.trim();
    if (!trimmedName) return;

    // Never create a second product with the same name/SKU.
    const duplicate = products.some((p) =>
      normalizeProductName(p.product_name) === normalizeProductName(trimmedName) ||
      (trimmedSku && (p.sku || '').trim().toLowerCase() === trimmedSku.toLowerCase())
    );
    if (duplicate) return;

    const timestamp = Date.now();
    const newProd: Product = {
      product_id: `PROD-${timestamp}`,
      sku: trimmedSku || `SKU-${timestamp.toString().slice(-4)}`,
      product_name: trimmedName,
      category,
      size: size.trim(),
      origin: origin.trim(),
      unit,
      default_price: price,
      description: description.trim(),
      status: 'ACTIVE',
    };

    addProduct(newProd);
    setIsCreateModalOpen(false);
    setName('');
    setSku('');
    setSize('');
    setDescription('');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.product_id) return;

    const trimmedName = editingProduct.product_name.trim();
    if (!trimmedName) return;

    // The product_id is the immutable identity. A name/category/price edit must
    // update this exact product instead of creating or matching another product.
    const duplicate = products.some((p) =>
      p.product_id !== editingProduct.product_id &&
      normalizeProductName(p.product_name) === normalizeProductName(trimmedName)
    );
    if (duplicate) return;

    updateProduct({
      ...editingProduct,
      product_name: trimmedName,
      sku: (editingProduct.sku || '').trim(),
      category: editingProduct.category || 'Hải sản',
      size: (editingProduct.size || '').trim(),
      origin: (editingProduct.origin || '').trim(),
      unit: editingProduct.unit || 'kg',
      default_price: Number(editingProduct.default_price) || 0,
      description: (editingProduct.description || '').trim(),
    });
    setEditingProduct(null);
  };

  const handleToggleStatus = (prod: Product) => {
    updateProduct({
      ...prod,
      status: prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-teal-800" /> Bảng Giá & Danh Mục Hải Sản
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Quản lý các loại hải sản tươi sống từ quê (Tôm, Cua, Ghẹ, Mực, Cá biển, Ốc cồ).
          </p>
        </div>

        <button
          id="create-product-btn"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" /> + Thêm Hải Sản Mới
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="search-products-input"
              type="text"
              placeholder="Tìm theo tên hải sản, size, nguồn gốc quê..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts.map((prod) => {
          const isActive = prod.status === 'ACTIVE';

          return (
            <div
              key={prod.product_id}
              id={`product-card-${prod.product_id}`}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {prod.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-prod-btn-${prod.product_id}`}
                      onClick={() => setEditingProduct({ ...prod })}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                      title="Sửa sản phẩm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`toggle-prod-status-${prod.product_id}`}
                      onClick={() => handleToggleStatus(prod)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Đang bán' : 'Tạm ẩn'}
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-black text-slate-900 mt-2">{prod.product_name}</h3>
                {prod.size && <div className="text-xs text-slate-500 mt-0.5 font-medium">{prod.size}</div>}
                {prod.origin && <div className="text-[11px] text-teal-800 mt-0.5">Nguồn: {prod.origin}</div>}
                {prod.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{prod.description}</p>}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Giá chuẩn:</span>
                <div className="text-right">
                  <span className="text-lg font-black text-teal-950">{formatCurrency(prod.default_price)}</span>
                  <span className="text-xs text-slate-500 font-medium ml-1">/{prod.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Thêm Món Hải Sản Mới</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên sản phẩm hải sản <span className="text-rose-500">*</span></label>
                <input type="text" required placeholder="VD: Tôm Sú Cà Mau..." value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Danh mục</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700">
                    {CATEGORIES.filter((c) => c !== 'Tất cả').map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị tính</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value as UnitType)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-bold">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quy cách / Size</label>
                  <input type="text" placeholder="VD: Size 20-25 con/kg" value={size} onChange={(e) => setSize(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn gốc quê</label>
                  <input type="text" placeholder="VD: Cà Mau, Phú Quốc..." value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá bán mặc định (₫/{unit}) <span className="text-rose-500">*</span></label>
                <input type="number" step="1000" required value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-black text-base text-teal-950" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả độ ngon / bảo quản</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 text-xs" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 rounded-xl">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl">Thêm Hải Sản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Sửa Bảng Giá & Danh Mục</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Mã sản phẩm: {editingProduct.product_id}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1.5 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-3.5 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên hải sản <span className="text-rose-500">*</span></label>
                <input type="text" required value={editingProduct.product_name} onChange={(e) => setEditingProduct({ ...editingProduct, product_name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU</label>
                  <input type="text" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Danh mục</label>
                  <select value={editingProduct.category || 'Khác'} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {CATEGORIES.filter((c) => c !== 'Tất cả').map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Size / Quy cách</label>
                  <input type="text" value={editingProduct.size || ''} onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị tính</label>
                  <select value={editingProduct.unit || 'kg'} onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value as UnitType })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn gốc quê</label>
                  <input type="text" value={editingProduct.origin || ''} onChange={(e) => setEditingProduct({ ...editingProduct, origin: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá niêm yết (₫)</label>
                  <input type="number" step="1000" required value={editingProduct.default_price} onChange={(e) => setEditingProduct({ ...editingProduct, default_price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-teal-950" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
                <textarea rows={3} value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select value={editingProduct.status} onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as Product['status'] })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="ACTIVE">Đang bán</option>
                  <option value="INACTIVE">Tạm ngưng</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-slate-600 rounded-xl">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl">Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
