import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, ChevronLeft, ChevronRight, Check, Star } from 'lucide-react';
import api from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import StarRating from '../components/StarRating';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const colorMap = {
  black: '#111111',
  white: '#FFFFFF',
  ivory: '#FFFFF0',
  navy: '#1B2A4A',
  'midnight blue': '#191970',
  maroon: '#7A1C31',
  burgundy: '#800020',
  terracotta: '#CC4E2A',
  green: '#4CAF50',
  sage: '#7DAA92',
  camel: '#C19A6B',
  tan: '#D2B48C',
  olive: '#556B2F',
  khaki: '#C3B091',
  cream: '#FFFDD0',
  mocha: '#6B4226',
  indigo: '#4B0082',
  'light wash': '#A8C5DA',
  champagne: '#F7E7CE',
  blush: '#FFB6C1',
  'dusty rose': '#DCAE96',
  red: '#FF0000',
  blue: '#2196F3',
  'floral multi': '#FF69B4',
  // patched DB colors
  'blue striped': '#5B8DB8',
  'red floral': '#C0392B',
  'floral pink': '#FF69B4',
};

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const { user } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [hoveredColor, setHoveredColor] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: pd }, { data: rv }] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/reviews/${id}`),
        ]);
        setProduct(pd.product);
        setReviews(rv.reviews);
        const colorsArr = Array.isArray(pd.product.colors) 
          ? pd.product.colors 
          : pd.product.colors 
            ? [pd.product.colors] 
            : [];
        const firstColor = colorsArr[0];
        const firstColorName = typeof firstColor === 'string' ? firstColor : (firstColor?.name || '');
        setSelectedColor(firstColorName);
      } catch {
        navigate('/shop');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size', { style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
      return;
    }
    setAddingToCart(true);
    addItem({
      product: product._id,
      title: product.title,
      image: product.images[0]?.url,
      price: product.price,
      size: selectedSize,
      color: selectedColor,
      quantity,
    });
    setTimeout(() => setAddingToCart(false), 1000);
    toast.success('Added to cart!', { style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewRating) {
      toast.error('Please select a rating');
      return;
    }
    setSubmittingReview(true);
    try {
      const { data } = await api.post(`/reviews/${id}`, { rating: reviewRating, comment: reviewComment });
      setReviews((p) => [data.review, ...p]);
      setReviewRating(0);
      setReviewComment('');
      toast.success('Review submitted!', { style: { background: '#1a1a27', color: '#fff' } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="flex justify-center py-40"><Spinner size="xl" /></div>;
  if (!product) return null;

  const availableColors = Array.isArray(product.colors) 
    ? product.colors 
    : product.colors 
      ? [product.colors] 
      : [];

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="container-page py-12 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-8">
        <button onClick={() => navigate('/')} className="hover:text-neutral-900 transition-colors">Home</button>
        <span>/</span>
        <button onClick={() => navigate('/shop')} className="hover:text-neutral-900 transition-colors">Shop</button>
        <span>/</span>
        <button onClick={() => navigate(`/shop?category=${product.category}`)} className="hover:text-neutral-900 transition-colors">{product.category}</button>
        <span>/</span>
        <span className="text-neutral-800 truncate max-w-xs">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass-sm">
            <img
              src={product.images[selectedImage]?.url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {product.images.length > 1 && (
              <>
                <button
                  id="img-prev"
                  onClick={() => setSelectedImage((p) => (p === 0 ? product.images.length - 1 : p - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 glass rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  id="img-next"
                  onClick={() => setSelectedImage((p) => (p === product.images.length - 1 ? 0 : p + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 glass rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            {discount && (
              <div className="absolute top-4 left-4 badge-brand text-sm font-bold px-3 py-1 rounded-full">-{discount}%</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  id={`thumb-${i}`}
                  onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === i ? 'border-brand-500 shadow-brand' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <p className="text-brand-400 text-sm font-medium uppercase tracking-wider mb-2">{product.category} · {product.brand}</p>
            {/* Elegant star rating layout directly between category tag and product title */}
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: 5 }, (_, i) => {
                const filled = i < Math.floor(Number(averageRating));
                const partial = !filled && i < Number(averageRating);
                return (
                  <Star
                    key={i}
                    size={16}
                    className={
                      filled
                        ? 'fill-amber-500 text-amber-500'
                        : partial
                        ? 'fill-amber-500/50 text-amber-500'
                        : 'text-neutral-300'
                    }
                  />
                );
              })}
              <span className="text-xs text-neutral-500 font-medium ml-2">
                ({averageRating} / {reviews.length} reviews)
              </span>
            </div>
            <h1 className="text-neutral-900 font-bold text-3xl tracking-tight mt-1 mb-2">{product.title}</h1>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold gradient-text">${product.price.toFixed(2)}</span>
            {product.comparePrice && (
              <span className="text-neutral-400 text-xl line-through">${product.comparePrice.toFixed(2)}</span>
            )}
          </div>

          {/* Color selector */}
          {availableColors.length > 0 && (
            <div>
              <p className="label">
                Color:{' '}
                <span className="text-neutral-900 font-semibold uppercase text-xs tracking-wider">
                  {hoveredColor || selectedColor}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableColors.map((color, index) => {
                  const colorName = typeof color === 'string' ? color : (color.name || '');
                  const colorHex = typeof color === 'string' ? (colorMap[color.toLowerCase()] || color) : (color.hex || colorMap[colorName.toLowerCase()] || colorName);
                  const isWhite = colorHex.toUpperCase() === '#FFFFFF';
                  const isActive = selectedColor === colorName;

                  return (
                    <button
                      key={colorName}
                      id={`color-${colorName.replace(/\s+/g, '-').toLowerCase()}`}
                      onMouseEnter={() => setHoveredColor(colorName)}
                      onMouseLeave={() => setHoveredColor('')}
                      onClick={() => {
                        setSelectedColor(colorName);
                        if (product.images && product.images.length > 0) {
                          const matchIdx = product.images.findIndex(img => 
                            img.alt && img.alt.toLowerCase().trim() === colorName.toLowerCase().trim()
                          );
                          if (matchIdx !== -1) {
                            setSelectedImage(matchIdx);
                          } else {
                            const matchUrlIdx = product.images.findIndex(img => 
                              (img.url && img.url.toLowerCase().includes(colorName.toLowerCase())) ||
                              (img.publicId && img.publicId.toLowerCase().includes(colorName.toLowerCase()))
                            );
                            if (matchUrlIdx !== -1) {
                              setSelectedImage(matchUrlIdx);
                            } else if (product.images[index]) {
                              setSelectedImage(index);
                            }
                          }
                        }
                      }}
                      title={colorName}
                      className={`h-5 w-5 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer ${
                        isActive
                          ? 'ring-2 ring-neutral-950 ring-offset-2 scale-105 border-transparent'
                          : isWhite
                            ? 'border border-neutral-200'
                            : 'border-transparent'
                      }`}
                      style={{ backgroundColor: colorMap[colorName.toLowerCase()] || colorHex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label">Size {selectedSize && <span className="text-neutral-900">· {selectedSize}</span>}</p>
              <button className="text-brand-400 text-xs hover:underline">Size Guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  id={`size-${size}`}
                  onClick={() => setSelectedSize(size)}
                  className={`h-11 px-4 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    selectedSize === size
                      ? 'bg-neutral-950 text-white border-neutral-950 font-semibold'
                      : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-900'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <p className="label mb-2">Quantity</p>
            <div className="flex border border-neutral-200 h-11 w-32 items-center justify-between">
              <button
                id="qty-dec"
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="text-neutral-600 px-3 hover:text-neutral-900 text-xl font-medium"
              >
                -
              </button>
              <span className="text-neutral-950 font-semibold text-center">{quantity}</span>
              <button
                id="qty-inc"
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="text-neutral-600 px-3 hover:text-neutral-900 text-xl font-medium"
              >
                +
              </button>
            </div>
            {/* Show availability status — never raw stock numbers */}
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${product.isAvailable !== false ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <p className={`text-xs font-medium ${product.isAvailable !== false ? 'text-emerald-400' : 'text-red-400'}`}>
                {product.stockStatus || (product.isAvailable !== false ? 'In Stock' : 'Out of Stock')}
              </p>
            </div>
          </div>

          {/* Add to cart */}
          <div className="flex gap-3">
            <button
              id="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={product.isAvailable === false || addingToCart}
              className="btn-primary btn-lg flex-1 rounded-2xl"
            >
              {addingToCart ? (
                <><Check size={18} /> Added!</>
              ) : product.isAvailable === false ? (
                'Out of Stock'
              ) : (
                <><ShoppingBag size={18} /> Add to Cart</>
              )}
            </button>
            <button
              id="wishlist-btn"
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                if (!isWishlisted) {
                  toast.success('Added to wishlist!', {
                    style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                  });
                } else {
                  toast.success('Removed from wishlist!', {
                    style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                  });
                }
              }}
              className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-center cursor-pointer ${
                isWishlisted
                  ? 'border-rose-200 bg-rose-50/50'
                  : 'border-neutral-200 bg-white hover:border-rose-100 hover:bg-rose-50/30'
              }`}
            >
              <Heart
                size={20}
                className={`transition-all duration-200 ${
                  isWishlisted
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-neutral-500 hover:text-rose-500 hover:scale-105'
                }`}
              />
            </button>
          </div>

          {/* Description */}
          <div className="glass-sm rounded-xl p-5">
            <h3 className="text-neutral-900 font-semibold mb-3">Product Details</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">{product.description}</p>
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10px] font-bold tracking-widest uppercase py-1 px-3 rounded-none"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 pt-12">
        <h2 className="heading-display text-2xl mb-8">Customer Reviews ({reviews.length})</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary */}
          <div className="glass-sm rounded-2xl p-6 text-center h-fit">
            <div className="text-6xl font-bold gradient-text mb-2">{averageRating}</div>
            <StarRating rating={Number(averageRating)} size={24} emptyColor="text-neutral-200" />
            <p className="text-neutral-500 text-sm mt-2">{reviews.length} reviews</p>
          </div>

          {/* Review list + form */}
          <div className="lg:col-span-2 space-y-6">
            {user && (
              <form onSubmit={handleSubmitReview} className="glass-sm rounded-2xl p-6 space-y-4">
                <h3 className="text-neutral-900 font-semibold">Write a Review</h3>
                <div>
                  <label className="label">Your Rating</label>
                  <StarRating rating={reviewRating} size={28} interactive onRate={setReviewRating} />
                </div>
                <div>
                  <label className="label">Comment</label>
                  <textarea
                    id="review-comment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                    rows={3}
                    placeholder="Share your experience..."
                    className="input resize-none"
                  />
                </div>
                <button id="submit-review-btn" type="submit" disabled={submittingReview} className="btn-primary btn-md rounded-xl">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-neutral-400 text-center py-8">No reviews yet. Be the first!</p>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="glass-sm rounded-xl p-5 animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold">
                        {review.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-neutral-900 font-medium text-sm">{review.user?.name}</p>
                        <p className="text-neutral-400 text-xs">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size={14} />
                      {review.verified && <span className="badge-green text-[10px]">Verified</span>}
                    </div>
                  </div>
                  <p className="text-neutral-600 text-sm leading-relaxed">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductPage;
