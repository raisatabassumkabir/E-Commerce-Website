import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ImagePlus, Package, AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Sale'];
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
const FOOTWEAR_SIZES = ['6', '7', '8', '9', '10', '11', '12'];
const SUBCATEGORY_MAP = {
  Men:         ['T-Shirts', 'Shirts', 'Hoodies', 'Jackets', 'Bottoms', 'Knitwear', 'Outerwear'],
  Women:       ['Tops', 'Dresses', 'Bottoms', 'Knitwear', 'Outerwear', 'Activewear'],
  Kids:        ['Tops', 'Bottoms', 'Outerwear', 'Sets'],
  Accessories: ['Bags', 'Scarves', 'Belts', 'Hats', 'Jewellery'],
  Footwear:    ['Sneakers', 'Boots', 'Sandals', 'Loafers', 'Heels'],
  Sale:        ['T-Shirts', 'Dresses', 'Outerwear', 'Accessories'],
};

const emptyVariant = () => ({
  color: '',
  hex:   '#000000',
  image: '',
  sizes: [],
});

const emptyForm = {
  title:        '',
  description:  '',
  price:        '',
  comparePrice: '',
  category:     'Men',
  subcategory:  '',
  brand:        '',
  tags:         '',
  variants:     [],
  isFeatured:   false,
  isPublished:  true,
};

// ── Helper: total stock for a product (from variants) ─────────────────────────
const totalStock = (variants) =>
  (variants || []).reduce(
    (sum, v) => sum + (v.sizes || []).reduce((s, sz) => s + Number(sz.inventoryCount || 0), 0),
    0
  );

// ── Stock badge ───────────────────────────────────────────────────────────────
const StockBadge = ({ variants }) => {
  const count = totalStock(variants);
  if (count === 0) {
    return (
      <span className="border border-red-200 bg-white text-red-600 text-xs px-2.5 py-1 font-medium rounded-full flex items-center gap-1 w-fit">
        <AlertTriangle size={10} /> OUT OF STOCK
      </span>
    );
  }
  if (count <= 10) {
    return (
      <span className="border border-yellow-200 bg-white text-yellow-600 text-xs px-2.5 py-1 font-medium rounded-full w-fit inline-block">
        {count} UNITS LEFT
      </span>
    );
  }
  return (
    <span className="border border-neutral-200 bg-white text-neutral-800 text-xs px-2.5 py-1 font-medium rounded-full w-fit inline-block">
      {count} UNITS
    </span>
  );
};

// ── VariantRow: one colour accordion ─────────────────────────────────────────
const VariantRow = ({ variant, index, category, onChange, onRemove }) => {
  const [open, setOpen] = useState(true);
  const sizes = category === 'Footwear' ? FOOTWEAR_SIZES : ALL_SIZES;

  const toggleSize = (size) => {
    const current = variant.sizes || [];
    const exists = current.find((s) => s.size === size);
    onChange(index, {
      ...variant,
      sizes: exists
        ? current.filter((s) => s.size !== size)
        : [...current, { size, inventoryCount: 0 }],
    });
  };

  const setInventory = (size, count) => {
    onChange(index, {
      ...variant,
      sizes: (variant.sizes || []).map((s) =>
        s.size === size ? { ...s, inventoryCount: Number(count) || 0 } : s
      ),
    });
  };

  const variantTotal = (variant.sizes || []).reduce((s, sz) => s + Number(sz.inventoryCount || 0), 0);

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      {/* Variant header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50">
        {/* Colour picker */}
        <input
          type="color"
          value={variant.hex || '#000000'}
          onChange={(e) => onChange(index, { ...variant, hex: e.target.value })}
          className="w-7 h-7 rounded-full border border-neutral-200 cursor-pointer p-0.5 bg-white"
          title="Pick colour swatch"
        />

        {/* Colour name */}
        <input
          type="text"
          value={variant.color}
          onChange={(e) => onChange(index, { ...variant, color: e.target.value })}
          placeholder="Colour name, e.g. Floral Pink"
          className="input flex-1 py-1.5 text-sm"
          required
        />

        {/* Total inventory badge */}
        <span className="text-[10px] font-semibold text-neutral-500 whitespace-nowrap">
          {variantTotal} units
        </span>

        {/* Expand/collapse */}
        <button type="button" onClick={() => setOpen((o) => !o)} className="p-1 text-neutral-400 hover:text-neutral-700">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {/* Remove variant */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
          title="Remove this colour"
        >
          <X size={15} />
        </button>
      </div>

      {open && (
        <div className="px-4 py-4 space-y-4">
          {/* Optional per-variant image URL */}
          <div>
            <label className="text-neutral-600 text-xs font-medium mb-1 block">
              Variant Image URL <span className="text-neutral-400">(optional — overrides gallery for this colour)</span>
            </label>
            <input
              type="url"
              value={variant.image || ''}
              onChange={(e) => onChange(index, { ...variant, image: e.target.value })}
              placeholder="https://..."
              className="input text-sm py-1.5"
            />
          </div>

          {/* Size selector */}
          <div>
            <p className="text-neutral-600 text-xs font-medium mb-2">
              Sizes & Inventory <span className="text-neutral-400">({(variant.sizes || []).length} selected)</span>
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {sizes.map((size) => {
                const active = (variant.sizes || []).find((s) => s.size === size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`h-8 px-3 text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-neutral-950 text-white border-neutral-950'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Inventory per selected size */}
            {(variant.sizes || []).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(variant.sizes || []).map((sz) => (
                  <div key={sz.size} className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                      {sz.size}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sz.inventoryCount}
                      onChange={(e) => setInventory(sz.size, e.target.value)}
                      className="input py-1.5 text-sm text-center"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ProductManage = () => {
  const [products,          setProducts]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [modalOpen,         setModalOpen]         = useState(false);
  const [restockModalOpen,  setRestockModalOpen]  = useState(false);
  const [editingProduct,    setEditingProduct]    = useState(null);
  const [restockTarget,     setRestockTarget]     = useState(null);
  const [form,              setForm]              = useState(emptyForm);
  const [images,            setImages]            = useState([]);
  const [existingImages,    setExistingImages]    = useState([]);
  const [saving,            setSaving]            = useState(false);
  const [deleting,          setDeleting]          = useState(null);
  const [filterLowStock,    setFilterLowStock]    = useState(false);
  const [searchQuery,       setSearchQuery]       = useState('');
  // Restock editing state (full variants copy)
  const [restockVariants,   setRestockVariants]   = useState([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filterLowStock) params.set('lowStock', 'true');
      if (searchQuery)    params.set('keyword', searchQuery);
      const { data } = await api.get(`/products/admin/all?${params.toString()}`);
      setProducts(data.products);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filterLowStock, searchQuery]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setImages([]);
    setExistingImages([]);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      title:        product.title,
      description:  product.description,
      price:        product.price,
      comparePrice: product.comparePrice || '',
      category:     product.category,
      subcategory:  product.subcategory || '',
      brand:        product.brand || '',
      tags:         (product.tags || []).join(', '),
      variants:     product.variants || [],
      isFeatured:   product.isFeatured,
      isPublished:  product.isPublished !== false,
    });
    setImages([]);
    setExistingImages(product.images || []);
    setModalOpen(true);
  };

  const openRestock = (product) => {
    setRestockTarget(product);
    setRestockVariants(JSON.parse(JSON.stringify(product.variants || [])));
    setRestockModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  // Variant Builder callbacks
  const handleVariantChange = (index, updated) => {
    setForm((p) => {
      const next = [...p.variants];
      next[index] = updated;
      return { ...p, variants: next };
    });
  };

  const handleVariantRemove = (index) => {
    setForm((p) => ({ ...p, variants: p.variants.filter((_, i) => i !== index) }));
  };

  const handleAddVariant = () => {
    setForm((p) => ({ ...p, variants: [emptyVariant(), ...p.variants] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.variants.length === 0) {
      toast.error('Add at least one colour variant');
      return;
    }
    // Validate each variant has a name and at least one size
    for (const v of form.variants) {
      if (!v.color.trim()) { toast.error('Each variant needs a colour name'); return; }
      if ((v.sizes || []).length === 0) {
        toast.error(`Variant "${v.color}" needs at least one size`);
        return;
      }
    }
    if (editingProduct && existingImages.length === 0 && images.length === 0) {
      toast.error('At least one image is required');
      return;
    }
    if (!editingProduct && images.length === 0) {
      toast.error('At least one image is required');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'variants') {
          fd.append(k, JSON.stringify(v));
        } else if (k === 'tags') {
          fd.append(k, JSON.stringify(v.split(',').map((t) => t.trim()).filter(Boolean)));
        } else {
          fd.append(k, v);
        }
      });

      if (editingProduct) {
        fd.append('existingImages', JSON.stringify(existingImages));
      }
      images.forEach((img) => fd.append('images', img));

      if (editingProduct) {
        const { data } = await api.put(`/products/${editingProduct._id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProducts((p) => p.map((prod) => prod._id === editingProduct._id ? data.product : prod));
        toast.success('Product updated!', { style: { background: '#1a1a27', color: '#fff' } });
      } else {
        const { data } = await api.post('/products', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProducts((p) => [data.product, ...p]);
        toast.success('Product created!', { style: { background: '#1a1a27', color: '#fff' } });
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // Restock: save the edited variants array
  const handleRestock = async () => {
    try {
      const { data } = await api.patch(`/products/${restockTarget._id}/inventory`, {
        variants: restockVariants,
      });
      setProducts((p) =>
        p.map((prod) => prod._id === restockTarget._id ? data.product : prod)
      );
      toast.success('Inventory updated!', { style: { background: '#1a1a27', color: '#fff' } });
      setRestockModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update inventory');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product permanently? This cannot be undone.')) return;
    setDeleting(productId);
    try {
      await api.delete(`/products/${productId}`);
      setProducts((p) => p.filter((prod) => prod._id !== productId));
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(null);
    }
  };

  const lowStockCount = products.filter((p) => totalStock(p.variants) <= 10 && totalStock(p.variants) > 0).length;
  const outOfStockCount = products.filter((p) => totalStock(p.variants) === 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-neutral-900 mb-1">Products</h1>
          <p className="text-neutral-500 text-sm">
            {products.length} products total
            {lowStockCount > 0 && (
              <span className="ml-2 text-yellow-600 font-semibold">· {lowStockCount} low stock</span>
            )}
            {outOfStockCount > 0 && (
              <span className="ml-2 text-red-600 font-semibold">· {outOfStockCount} out of stock</span>
            )}
          </p>
        </div>
        <button id="admin-add-product-btn" onClick={openCreate} className="btn-primary btn-md rounded-xl">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 relative min-w-[200px]">
          <input
            id="admin-product-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="input pl-4"
          />
        </div>
        <label
          className="flex items-center gap-2 cursor-pointer bg-white border border-neutral-200/60 shadow-subtle rounded-xl px-4 py-3 hover:bg-neutral-50 transition-colors"
          id="filter-low-stock"
        >
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="w-4 h-4 accent-brand-900"
          />
          <AlertTriangle size={14} className="text-yellow-600" />
          <span className="text-neutral-700 text-sm font-medium">Low Stock Only</span>
          {lowStockCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-yellow-500 text-white text-[10px] font-bold flex items-center justify-center">
              {lowStockCount}
            </span>
          )}
        </label>
        <button onClick={fetchProducts} className="btn-secondary btn-md rounded-xl p-3" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Product Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" /></div>
      ) : (
        <div className="bg-white border border-neutral-200/60 shadow-subtle rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">IMAGE</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">NAME / CATEGORY</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">PRICE</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">VARIANTS</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">STOCK</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">STATUS</th>
                  <th className="text-right p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-12 text-neutral-400">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product._id}
                      id={`product-row-${product._id}`}
                      className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                        totalStock(product.variants) === 0 ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Image */}
                      <td className="p-4">
                        <img
                          src={product.images?.[0]?.url}
                          alt={product.title}
                          className="w-10 h-12 object-cover rounded-lg bg-neutral-100 flex-shrink-0"
                        />
                      </td>

                      {/* Name / Category */}
                      <td className="p-4">
                        <p className="text-neutral-900 font-semibold text-sm line-clamp-1 max-w-[220px]">{product.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-neutral-800 font-semibold text-[10px] tracking-wider uppercase">{product.category}</span>
                          {product.subcategory && (
                            <span className="text-neutral-400 text-[10px] uppercase tracking-wider">· {product.subcategory}</span>
                          )}
                        </div>
                        {product.brand && (
                          <p className="text-neutral-400 text-[10px] mt-0.5">{product.brand}</p>
                        )}
                      </td>

                      {/* Price */}
                      <td className="p-4">
                        <p className="text-neutral-900 font-semibold">${Number(product.price).toFixed(2)}</p>
                        {product.comparePrice && (
                          <p className="text-neutral-400 text-xs line-through">${Number(product.comparePrice).toFixed(2)}</p>
                        )}
                      </td>

                      {/* Variants summary */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {(product.variants || []).slice(0, 4).map((v) => (
                            <span
                              key={v.color}
                              title={v.color}
                              className="w-4 h-4 rounded-full border border-neutral-200 flex-shrink-0"
                              style={{ backgroundColor: v.hex || '#999' }}
                            />
                          ))}
                          {(product.variants || []).length > 4 && (
                            <span className="text-[10px] text-neutral-400 self-center">+{product.variants.length - 4}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-1">{(product.variants || []).length} colour{(product.variants || []).length !== 1 ? 's' : ''}</p>
                      </td>

                      {/* Stock */}
                      <td className="p-4">
                        <StockBadge variants={product.variants} />
                      </td>

                      {/* Published / Featured */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={product.isPublished !== false ? 'badge-green text-[10px]' : 'badge-red text-[10px]'}>
                            {product.isPublished !== false ? 'Published' : 'Draft'}
                          </span>
                          {product.isFeatured && (
                            <span className="text-amber-600 text-[10px] font-medium">★ Featured</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            id={`restock-${product._id}`}
                            onClick={() => openRestock(product)}
                            title="Update inventory"
                            className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Package size={15} />
                          </button>
                          <button
                            id={`edit-product-${product._id}`}
                            onClick={() => openEdit(product)}
                            title="Edit product"
                            className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            id={`delete-product-${product._id}`}
                            onClick={() => handleDelete(product._id)}
                            disabled={deleting === product._id}
                            title="Delete product"
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            {deleting === product._id ? <Spinner size="sm" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT PRODUCT MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? `Edit: ${editingProduct.title}` : 'Add New Product'}
        size="lg"
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="text-neutral-700 text-sm font-medium mb-1 block">Product Name *</label>
              <input
                id="product-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="input"
                placeholder="Oversized Cotton Tee"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="text-neutral-700 text-sm font-medium mb-1 block">Description *</label>
              <textarea
                id="product-desc"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={3}
                className="input resize-none"
                placeholder="Product description..."
              />
            </div>

            {/* Price */}
            <div>
              <label className="text-neutral-700 text-sm font-medium mb-1 block">Price ($) *</label>
              <input
                id="product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
                className="input"
                placeholder="49.99"
              />
            </div>

            {/* Compare Price */}
            <div>
              <label className="text-neutral-700 text-sm font-medium mb-1 block">
                Compare Price ($) <span className="text-neutral-400 text-xs">(original / sale)</span>
              </label>
              <input
                id="product-compare-price"
                name="comparePrice"
                type="number"
                min="0"
                step="0.01"
                value={form.comparePrice}
                onChange={handleChange}
                className="input"
                placeholder="Optional"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-neutral-700 text-sm font-medium mb-1 block">Category *</label>
              <select
                id="product-category"
                name="category"
                value={form.category}
                onChange={(e) => {
                  handleChange(e);
                  setForm((p) => ({ ...p, subcategory: '' }));
                }}
                className="input text-neutral-900 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="text-neutral-900 bg-white">{c}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="text-neutral-700 text-sm font-medium mb-1 block">Subcategory</label>
              <select
                id="product-subcategory"
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
                className="input text-neutral-900 bg-white"
              >
                <option value="" className="text-neutral-900 bg-white">None</option>
                {(SUBCATEGORY_MAP[form.category] || []).map((sub) => (
                  <option key={sub} value={sub} className="text-neutral-900 bg-white">{sub}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="text-neutral-700 text-sm font-medium mb-1 block">Brand</label>
              <input
                id="product-brand"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                className="input"
                placeholder="Brand name (optional)"
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="text-neutral-700 text-sm font-medium mb-1 block">
                Tags <span className="text-neutral-400 text-xs">(comma separated)</span>
              </label>
              <input
                id="product-tags"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                className="input"
                placeholder="casual, cotton, summer"
              />
            </div>
          </div>

          {/* Product Images */}
          <div>
            <label className="text-neutral-700 text-sm font-medium mb-2 block">
              Product Images * <span className="text-neutral-400 text-xs">(max 6, JPG/PNG/WebP, 5 MB each)</span>
            </label>
            <div className="flex flex-wrap gap-3 items-center mb-3">
              {editingProduct && existingImages.map((img) => (
                <div key={img.publicId} className="h-20 w-20 border border-neutral-200 relative group rounded-lg overflow-hidden flex-shrink-0">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setExistingImages((prev) => prev.filter((item) => item.publicId !== img.publicId))}
                    className="absolute top-1 right-1 bg-neutral-900/80 text-white rounded-full p-1 hover:bg-neutral-900 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.map((img, i) => (
                <div key={i} className="h-20 w-20 border border-neutral-200 relative group rounded-lg overflow-hidden flex-shrink-0">
                  <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-neutral-900/80 text-white rounded-full p-1 hover:bg-neutral-900 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {(existingImages.length + images.length) < 6 && (
                <label
                  htmlFor="product-images-input"
                  className="h-20 flex-1 min-w-[150px] border-2 border-dashed border-neutral-200 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:border-neutral-900 transition-colors bg-neutral-50/50 hover:bg-neutral-50"
                >
                  <ImagePlus size={18} className="text-neutral-500" />
                  <span className="text-xs text-neutral-500 font-medium">+ Add Image or Drag & Drop</span>
                </label>
              )}
            </div>
            <input
              id="product-images-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files);
                const limit = 6 - (existingImages.length + images.length);
                setImages((prev) => [...prev, ...selectedFiles.slice(0, limit)]);
              }}
            />
          </div>

          {/* ── Variant Builder ─────────────────────────────────────────────── */}
          {/* ── Variant Builder ─────────────────────────────────────────────── */}
          <div>
            {/* Header row — always visible, anchored to the top */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-neutral-700 text-sm font-medium">
                  Colour Variants *{' '}
                  <span className="text-neutral-400 text-xs font-normal">
                    ({form.variants.length} colour{form.variants.length !== 1 ? 's' : ''},{' '}
                    {totalStock(form.variants)} total units)
                  </span>
                </p>
                <p className="text-neutral-400 text-xs mt-0.5">Each colour has its own sizes and inventory counts.</p>
              </div>
              <button
                type="button"
                id="add-variant-btn"
                onClick={handleAddVariant}
                className="btn-secondary btn-sm rounded-lg flex items-center gap-1.5 text-xs flex-shrink-0"
              >
                <Plus size={13} /> Add Colour
              </button>
            </div>

            {/* Variant list — new cards prepend to the top */}
            {form.variants.length === 0 ? (
              <button
                type="button"
                onClick={handleAddVariant}
                className="w-full border-2 border-dashed border-neutral-200 rounded-xl p-6 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors text-sm flex flex-col items-center gap-2"
              >
                <Plus size={20} />
                Click to add your first colour variant
              </button>
            ) : (
              <div className="space-y-3">
                {form.variants.map((variant, index) => (
                  <VariantRow
                    key={index}
                    variant={variant}
                    index={index}
                    category={form.category}
                    onChange={handleVariantChange}
                    onRemove={handleVariantRemove}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                id="product-featured"
                type="checkbox"
                name="isFeatured"
                checked={form.isFeatured}
                onChange={handleChange}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-neutral-700 text-sm">Featured on homepage</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                id="product-published"
                type="checkbox"
                name="isPublished"
                checked={form.isPublished}
                onChange={handleChange}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-neutral-700 text-sm">Published (visible to customers)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary btn-md flex-1 rounded-xl"
            >
              Cancel
            </button>
            <button
              id="product-save-btn"
              type="submit"
              disabled={saving}
              className="btn-primary btn-md flex-1 rounded-xl"
            >
              {saving ? <Spinner size="sm" /> : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── RESTOCK MODAL (per-variant inventory editor) ───────────────────── */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title="Update Inventory"
        size="md"
      >
        {restockTarget && (
          <div className="space-y-5">
            {/* Product header */}
            <div className="flex items-center gap-4 glass-sm rounded-xl p-4">
              <img
                src={restockTarget.images?.[0]?.url}
                alt={restockTarget.title}
                className="w-14 h-16 object-cover rounded-lg bg-neutral-100 flex-shrink-0"
              />
              <div>
                <p className="text-neutral-900 font-medium line-clamp-2 text-sm">{restockTarget.title}</p>
                <div className="mt-1">
                  <StockBadge variants={restockTarget.variants} />
                </div>
              </div>
            </div>

            {/* Per-variant editor */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {restockVariants.map((variant, vi) => (
                <div key={vi} className="border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-200 flex-shrink-0"
                      style={{ backgroundColor: variant.hex || '#999' }}
                    />
                    <p className="text-neutral-800 font-semibold text-sm">{variant.color}</p>
                    <span className="text-[10px] text-neutral-400 ml-auto">
                      {(variant.sizes || []).reduce((s, sz) => s + Number(sz.inventoryCount || 0), 0)} units total
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(variant.sizes || []).map((sz, si) => (
                      <div key={sz.size} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center">
                          {sz.size}
                        </label>
                        <input
                          id={`restock-${vi}-${sz.size}`}
                          type="number"
                          min="0"
                          value={sz.inventoryCount}
                          onChange={(e) => {
                            const next = restockVariants.map((rv, rvi) => {
                              if (rvi !== vi) return rv;
                              return {
                                ...rv,
                                sizes: rv.sizes.map((s, ssi) =>
                                  ssi === si ? { ...s, inventoryCount: Number(e.target.value) || 0 } : s
                                ),
                              };
                            });
                            setRestockVariants(next);
                          }}
                          className="input py-1.5 text-sm text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <p className="text-sm text-neutral-500 text-right font-medium">
              New total: <span className="text-neutral-900 font-bold">{totalStock(restockVariants)} units</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setRestockModalOpen(false)}
                className="btn-secondary btn-md flex-1 rounded-xl"
              >
                Cancel
              </button>
              <button
                id="restock-save-btn"
                onClick={handleRestock}
                className="btn-primary btn-md flex-1 rounded-xl"
              >
                <Package size={16} /> Save Inventory
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductManage;
