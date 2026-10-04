import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, UnitType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Sparkles,
  Plus,
  Search,
  Scale,
  ListPlus,
  X,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Tag,
  CheckCircle2,
  Layers,
  ShoppingBag,
  FolderPlus,
  Settings2,
} from 'lucide-react';

const normalizeProductName = (value: string) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const ProductsView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkAddProducts,
    units,
    addUnit,
    updateUnit,
    deleteUnit,
    resetUnitsToDefault,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategoriesToDefault,
    openAIScanModal,
    addToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isUnitManagerOpen, setIsUnitManagerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);

  // Form states for create product
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Tôm');
  const [size, setSize] = useState('');
  const [origin, setOrigin] = useState('Cà Mau');
  const [unit, setUnit] = useState<UnitType>(units[0] || 'kg');
  const [price, setPrice] = useState<number>(350000);
  const [description, setDescription] = useState('');

  // Inline unit & category creation states inside create/edit modals
  const [inlineNewUnit, setInlineNewUnit] = useState('');
  const [showInlineAddUnit, setShowInlineAddUnit] = useState(false);
  const [inlineNewCategory, setInlineNewCategory] = useState('');
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);

  // Unit Manager Modal state
  const [newUnitInput, setNewUnitInput] = useState('');
  const [editingUnitItem, setEditingUnitItem] = useState<{ oldName: string; newName: string } | null>(null);
  const [deletingUnitItem, setDeletingUnitItem] = useState<string | null>(null);

  // Category Manager Modal state
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryItem, setEditingCategoryItem] = useState<{ oldName: string; newName: string } | null>(null);
  const [deletingCategoryItem, setDeletingCategoryItem] = useState<string | null>(null);

  // Bulk add seafood names state
  const [bulkNamesText, setBulkNamesText] = useState('');
  const [bulkCategory, setBulkCategory] = useState(categories[0] || 'Cá biển');
  const [bulkUnit, setBulkUnit] = useState(units[0] || 'kg');
  const [bulkPrice, setBulkPrice] = useState<number>(200000);

  // Filter products by search and category
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'Tất cả' && p.category !== selectedCategory) {
      return false;
    }
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

    // Never create duplicate products
    const duplicate = products.some(
      (p) =>
        normalizeProductName(p.product_name) === normalizeProductName(trimmedName) ||
        (trimmedSku && (p.sku || '').trim().toLowerCase() === trimmedSku.toLowerCase())
    );
    if (duplicate) {
      addToast('warning', 'Trùng tên hải sản', `Hải sản "${trimmedName}" đã có trong danh mục!`);
      return;
    }

    const timestamp = Date.now();
    const newProd: Product = {
      product_id: `PROD-${timestamp}`,
      sku: trimmedSku || `HS-${timestamp.toString().slice(-4)}`,
      product_name: trimmedName,
      category: category || categories[0] || 'Khác',
      size: size.trim(),
      origin: origin.trim(),
      unit: unit || 'kg',
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
    setShowInlineAddUnit(false);
    setShowInlineAddCategory(false);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.product_id) return;

    const trimmedName = editingProduct.product_name.trim();
    if (!trimmedName) return;

    const duplicate = products.some(
      (p) =>
        p.product_id !== editingProduct.product_id &&
        normalizeProductName(p.product_name) === normalizeProductName(trimmedName)
    );
    if (duplicate) {
      addToast('warning', 'Trùng tên hải sản', `Tên "${trimmedName}" đã được dùng cho sản phẩm khác!`);
      return;
    }

    updateProduct({
      ...editingProduct,
      product_name: trimmedName,
      sku: (editingProduct.sku || '').trim(),
      category: editingProduct.category || categories[0] || 'Khác',
      size: (editingProduct.size || '').trim(),
      origin: (editingProduct.origin || '').trim(),
      unit: editingProduct.unit || 'kg',
      default_price: Number(editingProduct.default_price) || 0,
      description: (editingProduct.description || '').trim(),
    });
    setEditingProduct(null);
    setShowInlineAddUnit(false);
    setShowInlineAddCategory(false);
  };

  const handleToggleStatus = (prod: Product) => {
    updateProduct({
      ...prod,
      status: prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  };

  const handleConfirmDeleteProduct = () => {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.product_id);
    setDeletingProduct(null);
  };

  // Inline Unit addition
  const handleAddInlineUnit = () => {
    const clean = inlineNewUnit.trim();
    if (!clean) return;
    addUnit(clean);
    setUnit(clean);
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, unit: clean });
    }
    setInlineNewUnit('');
    setShowInlineAddUnit(false);
  };

  // Inline Category addition
  const handleAddInlineCategory = () => {
    const clean = inlineNewCategory.trim();
    if (!clean) return;
    addCategory(clean);
    setCategory(clean);
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, category: clean });
    }
    setInlineNewCategory('');
    setShowInlineAddCategory(false);
  };

  // Unit Manager handlers
  const handleAddNewUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUnitInput.trim();
    if (!clean) return;
    addUnit(clean);
    setNewUnitInput('');
  };

  const handleSaveEditUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnitItem) return;
    const cleanNew = editingUnitItem.newName.trim();
    if (cleanNew && cleanNew !== editingUnitItem.oldName) {
      updateUnit(editingUnitItem.oldName, cleanNew);
    }
    setEditingUnitItem(null);
  };

  const handleConfirmDeleteUnit = () => {
    if (!deletingUnitItem) return;
    deleteUnit(deletingUnitItem);
    setDeletingUnitItem(null);
  };

  // Category Manager handlers
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryInput.trim();
    if (!clean) return;
    addCategory(clean);
    setNewCategoryInput('');
  };

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoryItem) return;
    const cleanNew = editingCategoryItem.newName.trim();
    if (cleanNew && cleanNew !== editingCategoryItem.oldName) {
      updateCategory(editingCategoryItem.oldName, cleanNew);
    }
    setEditingCategoryItem(null);
  };

  const handleConfirmDeleteCategory = () => {
    if (!deletingCategoryItem) return;
    deleteCategory(deletingCategoryItem);
    setDeletingCategoryItem(null);
  };

  // Bulk add seafood names handler
  const handleBulkAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNamesText.trim()) return;

    // Parse lines or comma-separated names
    const rawNames = bulkNamesText
      .split(/[\n,;]+/)
      .map((s) => s.trim().replace(/^[\-\*\•\d\.\)]\s*/, ''))
      .filter((s) => s.length > 0);

    if (rawNames.length === 0) return;

    const itemsToAdd = rawNames.map((nameStr) => ({
      product_name: nameStr,
      category: bulkCategory,
      unit: bulkUnit || 'kg',
      default_price: bulkPrice || 200000,
      origin: '',
      size: '',
      description: '',
      status: 'ACTIVE' as const,
    }));

    bulkAddProducts(itemsToAdd);
    setBulkNamesText('');
    setIsBulkAddOpen(false);
  };

  const allCategoryTabs = ['Tất cả', ...categories];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-teal-800" /> Bảng Giá & Danh Mục Hải Sản
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Quản lý tên hải sản, danh mục (Tôm, Cua, Ghẹ, Cá...) và đơn vị tính (Kg, Hộp, Khay, Con, Chai, Lon...).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Management Button */}
          <button
            id="manage-categories-btn"
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-300 transition-all text-xs sm:text-sm shadow-xs"
            title="Thêm hoặc sửa danh mục hải sản: Tôm, Cua, Ghẹ, Cá biển, Mực, Đồ khô..."
          >
            <Layers className="w-4 h-4 text-indigo-700" />
            <span>Danh Mục ({categories.length})</span>
          </button>

          {/* Unit Management Button */}
          <button
            id="manage-units-btn"
            onClick={() => setIsUnitManagerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-300 transition-all text-xs sm:text-sm shadow-xs"
            title="Thêm hoặc sửa các dạng đơn vị tính: Kg, Hộp, Khay, Con, Chai, Lon, Thùng..."
          >
            <Scale className="w-4 h-4 text-teal-700" />
            <span>Đơn Vị Tính ({units.length})</span>
          </button>

          {/* Bulk Add Seafood Names Button */}
          <button
            id="bulk-add-products-btn"
            onClick={() => setIsBulkAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold rounded-xl border border-teal-300 transition-all text-xs sm:text-sm shadow-xs"
            title="Thêm nhanh một danh sách nhiều tên hải sản"
          >
            <ListPlus className="w-4 h-4 text-teal-800" />
            <span>+ Thêm Nhanh DS Tên</span>
          </button>

          {/* Quick AI Scan Price Button */}
          <button
            id="scan-pricelist-btn"
            onClick={() => openAIScanModal('PRICE_SCAN')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-xs transition-all text-xs sm:text-sm cursor-pointer"
            title="Quét ảnh hoặc dán bảng giá (tự động nhận diện 155k/lít, 210/2hộp, v.v.) và cập nhật vào danh mục"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>📸 Quét Bảng Giá</span>
          </button>

          {/* Create Product Button */}
          <button
            id="create-product-btn"
            onClick={() => {
              if (units.length > 0 && !units.includes(unit)) {
                setUnit(units[0]);
              }
              if (categories.length > 0 && !categories.includes(category)) {
                setCategory(categories[0]);
              }
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" /> + Thêm Hải Sản Mới
          </button>
        </div>
      </div>

      {/* Overview Quick Bar: Units & Categories info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Units Strip */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Scale className="w-4 h-4 text-teal-800 shrink-0" />
            <span className="font-bold text-slate-800 shrink-0">Đơn vị tính ({units.length}):</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {units.map((u) => (
                <span
                  key={u}
                  className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono font-bold text-[11px] border border-slate-200 shrink-0"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setIsUnitManagerOpen(true)}
            className="text-xs text-teal-800 hover:underline font-bold shrink-0"
          >
            + Quản lý ĐVT →
          </button>
        </div>

        {/* Categories Strip */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Layers className="w-4 h-4 text-indigo-800 shrink-0" />
            <span className="font-bold text-slate-800 shrink-0">Danh mục ({categories.length}):</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {categories.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[11px] border border-indigo-200 shrink-0"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="text-xs text-indigo-800 hover:underline font-bold shrink-0"
          >
            + Quản lý Danh Mục →
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="search-products-input"
              type="text"
              placeholder="Tìm theo tên hải sản, quy cách, xuất xứ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {allCategoryTabs.map((cat) => (
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

            <button
              onClick={() => setIsCategoryManagerOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl text-xs border border-indigo-200 whitespace-nowrap flex items-center gap-1"
              title="Thêm danh mục hải sản mới"
            >
              <Plus className="w-3 h-3" /> Thêm DM
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-slate-600 font-bold text-sm">Chưa có sản phẩm hải sản nào phù hợp.</div>
            <div className="text-slate-400 text-xs">
              Bạn có thể bấm <strong>"+ Thêm Hải Sản Mới"</strong> hoặc <strong>"+ Thêm Nhanh DS Tên"</strong> để thêm sản phẩm.
            </div>
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const isActive = prod.status === 'ACTIVE';

            return (
              <div
                key={prod.product_id}
                id={`product-card-${prod.product_id}`}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                        {prod.sku || prod.product_id}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-0.5 line-clamp-2">
                        {prod.product_name}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(prod)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isActive ? 'Đang bán' : 'Tạm ngưng'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-[11px] border border-indigo-100">
                      {prod.category}
                    </span>
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md font-bold font-mono text-[11px] border border-teal-200">
                      ĐVT: {prod.unit || 'kg'}
                    </span>
                    {prod.size && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px]">
                        {prod.size}
                      </span>
                    )}
                  </div>

                  {prod.origin && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span>Nguồn:</span>
                      <span className="font-medium text-slate-700">{prod.origin}</span>
                    </div>
                  )}

                  {prod.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 italic">
                      "{prod.description}"
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-600 font-semibold uppercase">Giá niêm yết</div>
                    <div className="text-base font-black text-teal-900 font-mono">
                      {formatCurrency(prod.default_price)}
                      <span className="text-xs font-normal text-slate-600">/{prod.unit || 'kg'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingProduct(prod)}
                      className="p-2 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-colors"
                      title="Sửa thông tin hoặc giá"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingProduct(prod)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Xóa khỏi danh mục"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE PRODUCT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">+ Thêm Hải Sản Mới Vào Danh Mục</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên hải sản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mực trứng, Ghẹ lưới, Tôm sú..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category select + Inline Add button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Danh mục</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                      className="text-[11px] text-indigo-700 hover:underline font-bold"
                    >
                      + Thêm DM
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit select + Inline Add button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Đơn vị tính</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddUnit(!showInlineAddUnit)}
                      className="text-[11px] text-teal-800 hover:underline font-bold"
                    >
                      + Thêm ĐVT
                    </button>
                  </div>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-bold"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    {!units.includes(unit) && <option value={unit}>{unit}</option>}
                  </select>
                </div>
              </div>

              {/* Inline Add Category Box if clicked */}
              {showInlineAddCategory && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                  <input
                    type="text"
                    value={inlineNewCategory}
                    onChange={(e) => setInlineNewCategory(e.target.value)}
                    placeholder="Tên danh mục mới (VD: Chả cá, Nước mắm, Hàng khô...)"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddInlineCategory}
                    className="px-3 py-1.5 bg-indigo-800 text-white font-bold text-xs rounded-lg hover:bg-indigo-900 shrink-0"
                  >
                    Lưu DM
                  </button>
                </div>
              )}

              {/* Inline Add Unit Box if clicked */}
              {showInlineAddUnit && (
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2">
                  <input
                    type="text"
                    value={inlineNewUnit}
                    onChange={(e) => setInlineNewUnit(e.target.value)}
                    placeholder="Tên đơn vị mới (VD: chai, lon, bịch, thùng...)"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-teal-300 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddInlineUnit}
                    className="px-3 py-1.5 bg-teal-800 text-white font-bold text-xs rounded-lg hover:bg-teal-900 shrink-0"
                  >
                    Lưu ĐVT
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quy cách / Size</label>
                  <input
                    type="text"
                    placeholder="VD: Size 20-25 con/kg"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn gốc quê</label>
                  <input
                    type="text"
                    placeholder="VD: Cà Mau, Phú Quốc, Phan Thiết..."
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá bán mặc định (₫/{unit}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 font-black text-base text-teal-950 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả độ ngon / bảo quản</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-700 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl"
                >
                  Thêm Hải Sản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Sửa Bảng Giá & Danh Mục Hải Sản</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Mã sản phẩm: {editingProduct.product_id}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-3.5 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên hải sản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.product_name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, product_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category select + Inline Add */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Danh mục</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                      className="text-[11px] text-indigo-700 hover:underline font-bold"
                    >
                      + Thêm DM
                    </button>
                  </div>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit select + Inline Add */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Đơn vị tính</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddUnit(!showInlineAddUnit)}
                      className="text-[11px] text-teal-800 hover:underline font-bold"
                    >
                      + Thêm ĐVT
                    </button>
                  </div>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    {!units.includes(editingProduct.unit) && (
                      <option value={editingProduct.unit}>{editingProduct.unit}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Inline Add Category Box */}
              {showInlineAddCategory && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                  <input
                    type="text"
                    value={inlineNewCategory}
                    onChange={(e) => setInlineNewCategory(e.target.value)}
                    placeholder="Tên danh mục mới (VD: Chả cá, Nước mắm, Hàng khô...)"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddInlineCategory}
                    className="px-3 py-1.5 bg-indigo-800 text-white font-bold text-xs rounded-lg hover:bg-indigo-900 shrink-0"
                  >
                    Lưu DM
                  </button>
                </div>
              )}

              {/* Inline Add Unit Box */}
              {showInlineAddUnit && (
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2">
                  <input
                    type="text"
                    value={inlineNewUnit}
                    onChange={(e) => setInlineNewUnit(e.target.value)}
                    placeholder="Tên đơn vị mới (VD: chai, lon, bịch, thùng...)"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-teal-300 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddInlineUnit}
                    className="px-3 py-1.5 bg-teal-800 text-white font-bold text-xs rounded-lg hover:bg-teal-900 shrink-0"
                  >
                    Lưu ĐVT
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quy cách / Size</label>
                  <input
                    type="text"
                    value={editingProduct.size || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá niêm yết (₫)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={editingProduct.default_price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        default_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-teal-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={editingProduct.status}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      status: e.target.value as Product['status'],
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="ACTIVE">Đang bán</option>
                  <option value="INACTIVE">Tạm ngưng</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-slate-600 rounded-xl hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-700" />
                <div>
                  <h3 className="text-base font-black text-slate-900">Quản Lý Danh Mục Hải Sản</h3>
                  <p className="text-xs text-slate-500">Thêm, đổi tên hoặc xóa các danh mục sản phẩm của cửa hàng</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCategoryItem(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add new category form */}
            <form onSubmit={handleAddNewCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Nhập tên danh mục mới (VD: Chả cá, Nước mắm, Đồ khô...)"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-700 outline-none"
              />
              <button
                type="submit"
                disabled={!newCategoryInput.trim()}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
              >
                + Thêm Danh Mục
              </button>
            </form>

            {/* Editing single category inline */}
            {editingCategoryItem && (
              <form onSubmit={handleSaveEditCategory} className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-900">
                  Đổi tên danh mục: <span className="font-semibold">{editingCategoryItem.oldName}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingCategoryItem.newName}
                    onChange={(e) =>
                      setEditingCategoryItem({ ...editingCategoryItem, newName: e.target.value })
                    }
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-bold outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-700 text-white font-bold text-xs rounded-lg hover:bg-amber-800"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategoryItem(null)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {/* List of active categories */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách {categories.length} danh mục đang có:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {categories.map((c) => {
                  const count = products.filter((p) => p.category === c).length;
                  return (
                    <div
                      key={c}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-bold text-slate-900">{c}</span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">({count})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingCategoryItem({ oldName: c, newName: c })}
                          className="p-1 text-slate-400 hover:text-indigo-800 rounded"
                          title="Đổi tên danh mục"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategoryItem(c)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Khôi phục danh sách danh mục mặc định (Tôm, Cua, Ghẹ, Cá biển, Mực, Ốc & Ngao...)?')) {
                    resetCategoriesToDefault();
                  }
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
              </button>
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNIT MANAGER MODAL (Kg, Hộp, Khay, Con, Chai, Lon, Bịch, Thùng...) */}
      {isUnitManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-800" />
                <div>
                  <h3 className="text-base font-black text-slate-900">Quản Lý Đơn Vị Tính (ĐVT)</h3>
                  <p className="text-xs text-slate-500">Thêm, sửa hoặc xóa các dạng Kg, Hộp, Khay, Con, Chai, Lon, Thùng...</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUnitManagerOpen(false);
                  setEditingUnitItem(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add new unit form */}
            <form onSubmit={handleAddNewUnit} className="flex gap-2">
              <input
                type="text"
                value={newUnitInput}
                onChange={(e) => setNewUnitInput(e.target.value)}
                placeholder="Nhập tên đơn vị mới (VD: chai, lon, bịch, thùng, phần...)"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-teal-700 outline-none"
              />
              <button
                type="submit"
                disabled={!newUnitInput.trim()}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
              >
                + Thêm ĐVT
              </button>
            </form>

            {/* Editing single unit inline */}
            {editingUnitItem && (
              <form onSubmit={handleSaveEditUnit} className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-900">
                  Đổi tên đơn vị tính: <span className="font-mono">{editingUnitItem.oldName}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingUnitItem.newName}
                    onChange={(e) =>
                      setEditingUnitItem({ ...editingUnitItem, newName: e.target.value })
                    }
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-bold outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-700 text-white font-bold text-xs rounded-lg hover:bg-amber-800"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUnitItem(null)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {/* List of active units */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách {units.length} đơn vị tính đang dùng:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {units.map((u) => (
                  <div
                    key={u}
                    className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-teal-300 transition-colors"
                  >
                    <span className="font-bold text-slate-900 font-mono">{u}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingUnitItem({ oldName: u, newName: u })}
                        className="p-1 text-slate-400 hover:text-teal-800 rounded"
                        title="Đổi tên đơn vị này"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUnitItem(u)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Xóa đơn vị này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Khôi phục danh sách đơn vị tính mặc định (kg, hộp, khay, con, chai...)?')) {
                    resetUnitsToDefault();
                  }
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
              </button>
              <button
                type="button"
                onClick={() => setIsUnitManagerOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ADD SEAFOOD NAMES MODAL */}
      {isBulkAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-teal-800" />
                <div>
                  <h3 className="text-base font-black text-slate-900">Thêm Nhanh Danh Sách Tên Hải Sản</h3>
                  <p className="text-xs text-slate-500">Dán hoặc nhập nhiều tên hải sản cùng lúc vào danh mục</p>
                </div>
              </div>
              <button onClick={() => setIsBulkAddOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAddSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Danh sách tên hải sản (mỗi tên trên 1 dòng hoặc cách nhau bằng dấu phẩy):
                </label>
                <textarea
                  rows={6}
                  required
                  value={bulkNamesText}
                  onChange={(e) => setBulkNamesText(e.target.value)}
                  placeholder={`Ví dụ:\nMực trứng\nGhẹ lưới\nCá bơn\nCá bạc má\nChả mực\nChả cá thu\nTôm he\nTuộc sữa\nCá mối\nNõn sắt\nRế\nXù\nCá hố`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-teal-700 outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Danh mục chung</label>
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Đơn vị tính</label>
                  <select
                    value={bulkUnit}
                    onChange={(e) => setBulkUnit(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giá mặc định (₫)</label>
                  <input
                    type="number"
                    step="5000"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-teal-950 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkAddOpen(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl hover:bg-slate-100 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!bulkNamesText.trim()}
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  + Thêm Tất Cả Vào Danh Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PRODUCT MODAL */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDeleteProduct}
        title="Xóa Hải Sản Khỏi Danh Mục"
        message={`Bạn có chắc chắn muốn xóa "${deletingProduct?.product_name}" khỏi danh mục sản phẩm của cửa hàng? Các đơn hàng cũ đã tạo vẫn sẽ được giữ nguyên.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        isDangerous={true}
      />

      {/* CONFIRM DELETE UNIT MODAL */}
      <ConfirmModal
        isOpen={!!deletingUnitItem}
        onClose={() => setDeletingUnitItem(null)}
        onConfirm={handleConfirmDeleteUnit}
        title="Xóa Đơn Vị Tính"
        message={`Bạn có chắc chắn muốn xóa đơn vị tính "${deletingUnitItem}"?`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        isDangerous={true}
      />

      {/* CONFIRM DELETE CATEGORY MODAL */}
      <ConfirmModal
        isOpen={!!deletingCategoryItem}
        onClose={() => setDeletingCategoryItem(null)}
        onConfirm={handleConfirmDeleteCategory}
        title="Xóa Danh Mục Hải Sản"
        message={`Bạn có chắc chắn muốn xóa danh mục "${deletingCategoryItem}"?`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        isDangerous={true}
      />
    </div>
  );
};
