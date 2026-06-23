import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ImagePlus, Package, AlertTriangle, RefreshCw, X } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Sale'];
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
const SUBCATEGORY_MAP = {
  Men: ['T-Shirts', 'Shirts', 'Hoodies', 'Jackets', 'Bottoms', 'Knitwear', 'Outerwear'],
  Women: ['Tops', 'Dresses', 'Bottoms', 'Knitwear', 'Outerwear', 'Activewear'],
  Kids: ['Tops', 'Bottoms', 'Outerwear', 'Sets'],
  Accessories: ['Bags', 'Scarves', 'Belts', 'Hats', 'Jewellery'],
  Footwear: ['Sneakers', 'Boots', 'Sandals', 'Loafers', 'Heels'],
  Sale: ['T-Shirts', 'Dresses', 'Outerwear', 'Accessories'],
};

const emptyForm = {
  title: '', description: '', price: '', comparePrice: '', category: 'Men',
  subcategory: '', brand: '', inventoryCount: '', sizes: [], tags: '',
  colors: [{ name: 'Black', hex: '#000000' }], isFeatured: false, isPublished: true,
};

// Inventory status badge helper
const StockBadge = ({ count }) => {
  if (count === 0) return <span className="badge-red flex items-center gap-1"><AlertTriangle size={10} /> 0 units</span>;
  if (count <= 5) return <span className="badge-yellow">{count} units</span>;
  return <span className="badge-green">{count} units</span>;
};

const ProductManage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [restockTarget, setRestockTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [restockCount, setRestockCount] = useState('');
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Admin endpoint — includes inventoryCount
      const params = new URLSearchParams({ limit: 100 });
      if (filterLowStock) params.set('lowStock', 'true');
      if (searchQuery) params.set('keyword', searchQuery);
      const { data } = await api.get(`/products/admin/all?${params.toString()}`);
      setProducts(data.products);
    } catch (err) {
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
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice || '',
      category: product.category,
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      inventoryCount: product.inventoryCount,
      sizes: product.sizes,
      tags: (product.tags || []).join(', '),
      colors: product.colors,
      isFeatured: product.isFeatured,
      isPublished: product.isPublished !== false,
    });
    setImages([]);
    setModalOpen(true);
  };

  const openRestock = (product) => {
    setRestockTarget(product);
    setRestockCount(product.inventoryCount);
    setRestockModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleSize = (size) => {
    setForm((p) => ({
      ...p,
      sizes: p.sizes.includes(size)
        ? p.sizes.filter((s) => s !== size)
        : [...p.sizes, size],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.sizes.length === 0) { toast.error('Select at least one size'); return; }
    if (!editingProduct && images.length === 0) { toast.error('At least one image is required'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'sizes' || k === 'colors') {
          fd.append(k, JSON.stringify(v));
        } else if (k === 'tags') {
          fd.append(k, JSON.stringify(v.split(',').map((t) => t.trim()).filter(Boolean)));
        } else {
          fd.append(k, v);
        }
      });
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

  const handleRestock = async () => {
    if (restockCount === '' || Number(restockCount) < 0) {
      toast.error('Enter a valid inventory count');
      return;
    }
    try {
      const { data } = await api.patch(`/products/${restockTarget._id}/inventory`, {
        inventoryCount: Number(restockCount),
      });
      setProducts((p) =>
        p.map((prod) => prod._id === restockTarget._id
          ? { ...prod, inventoryCount: data.product.inventoryCount, isAvailable: data.product.isAvailable, stockStatus: data.product.stockStatus }
          : prod
        )
      );
      toast.success(`Inventory updated → ${restockCount} units`, { style: { background: '#1a1a27', color: '#fff' } });
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

  const lowStockCount = products.filter((p) => p.inventoryCount <= 5).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-white mb-1">Products</h1>
          <p className="text-white/40 text-sm">
            {products.length} products total
            {lowStockCount > 0 && (
              <span className="ml-2 text-yellow-400 font-medium">· {lowStockCount} low stock</span>
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
          className="flex items-center gap-2 cursor-pointer glass-sm rounded-xl px-4 py-3 hover:bg-white/10 transition-colors"
          id="filter-low-stock"
        >
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
          />
          <AlertTriangle size={14} className="text-yellow-400" />
          <span className="text-white/70 text-sm">Low Stock Only</span>
          {lowStockCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">
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
        <div className="glass-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/40 font-medium">Product</th>
                  <th className="text-left p-4 text-white/40 font-medium">Category</th>
                  <th className="text-left p-4 text-white/40 font-medium">Price</th>
                  <th className="text-left p-4 text-white/40 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Package size={13} /> Stock Units
                    </span>
                  </th>
                  <th className="text-left p-4 text-white/40 font-medium">Status</th>
                  <th className="text-right p-4 text-white/40 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-12 text-white/30">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product._id}
                      id={`product-row-${product._id}`}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                        product.inventoryCount === 0 ? 'bg-red-900/5' : ''
                      }`}
                    >
                      {/* Product info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.images?.[0]?.url}
                            alt={product.title}
                            className="w-10 h-12 object-cover rounded-lg bg-dark-700 flex-shrink-0"
                          />
                          <div>
                            <p className="text-white font-medium line-clamp-1 max-w-[200px]">{product.title}</p>
                            <p className="text-white/30 text-xs">
                              {product.brand && `${product.brand} · `}{product.sizes?.join(', ')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="badge-brand text-xs">{product.category}</span>
                          {product.subcategory && (
                            <span className="text-white/30 text-[10px]">{product.subcategory}</span>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="p-4">
                        <p className="text-white font-semibold">${Number(product.price).toFixed(2)}</p>
                        {product.comparePrice && (
                          <p className="text-white/30 text-xs line-through">${Number(product.comparePrice).toFixed(2)}</p>
                        )}
                      </td>

                      {/* Inventory — ADMIN sees raw number */}
                      <td className="p-4">
                        <StockBadge count={product.inventoryCount} />
                      </td>

                      {/* Published / Featured status */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={product.isPublished !== false ? 'badge-green text-[10px]' : 'badge-red text-[10px]'}>
                            {product.isPublished !== false ? 'Published' : 'Draft'}
                          </span>
                          {product.isFeatured && (
                            <span className="text-amber-400 text-[10px]">★ Featured</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Restock button */}
                          <button
                            id={`restock-${product._id}`}
                            onClick={() => openRestock(product)}
                            title="Update inventory"
                            className="p-2 text-white/40 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors"
                          >
                            <Package size={15} />
                          </button>

                          {/* Edit button */}
                          <button
                            id={`edit-product-${product._id}`}
                            onClick={() => openEdit(product)}
                            title="Edit product"
                            className="p-2 text-white/40 hover:text-brand-400 hover:bg-brand-900/20 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete button */}
                          <button
                            id={`delete-product-${product._id}`}
                            onClick={() => handleDelete(product._id)}
                            disabled={deleting === product._id}
                            title="Delete product"
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
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

      {/* ── CREATE / EDIT PRODUCT MODAL ──────────────────────────────────────── */}
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
              <label className="label">Title *</label>
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
              <label className="label">Description *</label>
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
              <label className="label">Price ($) *</label>
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
              <label className="label">Compare Price ($) <span className="text-white/30 text-xs">(original / sale)</span></label>
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
              <label className="label">Category *</label>
              <select
                id="product-category"
                name="category"
                value={form.category}
                onChange={(e) => {
                  handleChange(e);
                  setForm((p) => ({ ...p, subcategory: '' })); // reset subcategory
                }}
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-dark-800">{c}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="label">Subcategory</label>
              <select
                id="product-subcategory"
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
                className="input"
              >
                <option value="" className="bg-dark-800">None</option>
                {(SUBCATEGORY_MAP[form.category] || []).map((sub) => (
                  <option key={sub} value={sub} className="bg-dark-800">{sub}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="label">Brand</label>
              <input
                id="product-brand"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                className="input"
                placeholder="Brand name (optional)"
              />
            </div>

            {/* Inventory Count — admin only field */}
            <div>
              <label className="label flex items-center gap-2">
                <Package size={14} className="text-brand-400" />
                Inventory Count *
                <span className="text-white/30 text-xs">(admin only)</span>
              </label>
              <input
                id="product-inventory"
                name="inventoryCount"
                type="number"
                min="0"
                value={form.inventoryCount}
                onChange={handleChange}
                required
                className="input"
                placeholder="0"
              />
              {form.inventoryCount !== '' && (
                <p className={`text-xs mt-1 font-medium ${
                  Number(form.inventoryCount) === 0 ? 'text-red-400' :
                  Number(form.inventoryCount) <= 5 ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {Number(form.inventoryCount) === 0 ? '⚠ Out of Stock — product will be greyed out'
                   : Number(form.inventoryCount) <= 5 ? `⚡ Low Stock — customers will see "Low Stock" badge`
                   : '✓ In Stock'}
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="label">Tags <span className="text-white/30 text-xs">(comma separated)</span></label>
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

          {/* Sizes */}
          <div>
            <label className="label">Sizes * <span className="text-white/30 text-xs">({form.sizes.length} selected)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  id={`form-size-${size}`}
                  onClick={() => toggleSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    form.sizes.includes(size)
                      ? 'bg-brand-600 border-brand-500 text-white shadow-brand'
                      : 'border-white/10 text-white/50 hover:border-brand-500 hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
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
              <span className="text-white/70 text-sm">Featured on homepage</span>
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
              <span className="text-white/70 text-sm">Published (visible to customers)</span>
            </label>
          </div>

          {/* Image Upload */}
          {!editingProduct && (
            <div>
              <label className="label">
                Product Images * <span className="text-white/30 text-xs">(max 6, JPG/PNG/WebP, 5MB each)</span>
              </label>
              <label
                htmlFor="product-images-input"
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                  images.length > 0 ? 'border-brand-500/50 bg-brand-900/10' : 'border-white/10 hover:border-brand-500/50'
                }`}
              >
                <ImagePlus size={28} className={images.length > 0 ? 'text-brand-400' : 'text-white/30'} />
                <p className="text-sm mt-2 text-white/50">
                  {images.length > 0 ? `${images.length} image(s) selected` : 'Click or drag images here'}
                </p>
                {images.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap justify-center">
                    {images.map((img, i) => (
                      <img
                        key={i}
                        src={URL.createObjectURL(img)}
                        alt=""
                        className="w-14 h-16 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </label>
              <input
                id="product-images-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setImages(Array.from(e.target.files).slice(0, 6))}
              />
            </div>
          )}

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

      {/* ── RESTOCK MODAL ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title="Update Inventory"
        size="sm"
      >
        {restockTarget && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 glass-sm rounded-xl p-4">
              <img
                src={restockTarget.images?.[0]?.url}
                alt={restockTarget.title}
                className="w-14 h-16 object-cover rounded-lg bg-dark-700 flex-shrink-0"
              />
              <div>
                <p className="text-white font-medium line-clamp-2 text-sm">{restockTarget.title}</p>
                <div className="mt-1">
                  <StockBadge count={restockTarget.inventoryCount} />
                </div>
              </div>
            </div>

            <div>
              <label className="label">New Inventory Count</label>
              <input
                id="restock-count-input"
                type="number"
                min="0"
                value={restockCount}
                onChange={(e) => setRestockCount(e.target.value)}
                className="input text-lg font-semibold"
                placeholder="0"
                autoFocus
              />
              {restockCount !== '' && (
                <p className={`text-xs mt-2 font-medium ${
                  Number(restockCount) === 0 ? 'text-red-400' :
                  Number(restockCount) <= 5 ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {Number(restockCount) === 0 ? '⚠ This will mark product as Out of Stock'
                   : Number(restockCount) <= 5 ? `⚡ Customers will see "Low Stock" warning`
                   : `✓ ${restockCount} units — In Stock`}
                </p>
              )}
              <p className="text-white/30 text-xs mt-1">
                Current: {restockTarget.inventoryCount} units → New: {restockCount || 0} units
                {Number(restockCount) > restockTarget.inventoryCount && (
                  <span className="text-emerald-400 ml-2">
                    (+{Number(restockCount) - restockTarget.inventoryCount} added)
                  </span>
                )}
              </p>
            </div>

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
                <Package size={16} /> Update Stock
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductManage;
