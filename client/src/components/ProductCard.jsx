import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, AlertCircle } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import toast from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const addItem = useCartStore((s) => s.addItem);
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  const isAvailable = product.isAvailable !== false;
  const stockStatus = product.stockStatus || (isAvailable ? 'In Stock' : 'Out of Stock');

  // Derive sizes and colours from variants
  const variants = product.variants || [];
  const allSizes = [...new Set(variants.flatMap((v) => (v.sizes || []).map((s) => s.size)))];
  const firstVariant = variants[0] || null;
  const firstAvailableSize = firstVariant
    ? (firstVariant.sizes || []).find((s) => s.inventoryCount > 0)?.size || allSizes[0]
    : '';

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAvailable) return;

    addItem({
      product: product._id,
      title:   product.title,
      image:   firstVariant?.image || product.images[0]?.url,
      price:   product.price,
      size:    firstAvailableSize || '',
      color:   firstVariant?.color || '',
      quantity: 1,
    });
    useCartStore.getState().openCart();
    toast.success(`${product.title} added!`, {
      style: { background: '#1A1918', color: '#fff', borderRadius: '4px' },
      iconTheme: { primary: '#fff', secondary: '#1A1918' },
    });
  };

  return (
    <Link
      to={`/products/${product._id}`}
      id={`product-card-${product._id}`}
      className={`group block bg-transparent transition-all duration-300 ${
        !isAvailable ? 'opacity-70' : ''
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-nude-100 border border-line/50 mb-3">
        <img
          src={product.images[0]?.url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'}
          alt={product.images[0]?.alt || product.title}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isAvailable ? 'group-hover:scale-105' : 'grayscale-[40%]'
          }`}
          loading="lazy"
        />

        {/* Badges — top row */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {discount && isAvailable && (
            <span className="bg-brand-900 text-white text-[10px] uppercase tracking-widest font-bold px-2 py-0.5">
              -{discount}%
            </span>
          )}
          {product.isFeatured && isAvailable && (
            <span className="bg-white border border-line text-brand-900 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5">
              Featured
            </span>
          )}
        </div>

        {/* Stock status badge — top right */}
        <div className="absolute top-2 right-2">
          {!isAvailable ? (
            <span className="bg-nude-200 text-brand-900 text-[10px] uppercase tracking-widest px-2 py-0.5 border border-line flex items-center gap-1">
              Out of Stock
            </span>
          ) : stockStatus === 'Low Stock' ? (
            <span className="bg-nude-100 text-brand-900 text-[10px] uppercase tracking-widest px-2 py-0.5 border border-line">
              Low Stock
            </span>
          ) : null}
        </div>

        {/* Quick Add button */}
        {isAvailable && (
          <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              id={`quick-add-${product._id}`}
              onClick={handleQuickAdd}
              className="w-full bg-white/90 backdrop-blur-sm border border-line text-brand-900 text-xs font-semibold uppercase tracking-widest py-2.5 hover:bg-brand-900 hover:text-white transition-colors"
            >
              + Quick Add
            </button>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="px-1">
        <p className="text-brand-900/50 text-[10px] uppercase tracking-widest mb-1.5">
          {product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}
        </p>
        <h3 className={`font-medium text-sm leading-snug mb-1 line-clamp-2 transition-colors ${
          isAvailable ? 'text-brand-900 group-hover:text-brand-900/70' : 'text-brand-900/60'
        }`}>
          {product.title}
        </h3>

        {/* Star rating */}
        {product.numReviews > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={10}
                  className={star <= Math.round(product.ratings) ? 'fill-brand-900 text-brand-900' : 'fill-transparent text-line'}
                />
              ))}
            </div>
            <span className="text-brand-900/50 text-[10px]">({product.numReviews})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`font-medium text-sm ${isAvailable ? 'text-brand-900' : 'text-brand-900/60'}`}>
            ${product.price.toFixed(2)}
          </span>
          {product.comparePrice && (
            <span className="text-brand-900/40 text-xs line-through">${product.comparePrice.toFixed(2)}</span>
          )}
        </div>

        {/* Size chips — derived from variants */}
        {isAvailable && allSizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allSizes.slice(0, 4).map((size) => (
              <span key={size} className="text-[9px] uppercase text-brand-900/50 border border-line px-1.5 py-0.5 bg-nude-50">
                {size}
              </span>
            ))}
            {allSizes.length > 4 && (
              <span className="text-[9px] uppercase text-brand-900/40 px-1 pt-0.5">+{allSizes.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default memo(ProductCard);
