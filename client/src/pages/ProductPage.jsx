import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import api from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import StarRating from '../components/StarRating';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

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
        setSelectedColor(pd.product.colors[0]?.name || '');
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

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <div className="container-page py-12 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-white/40 mb-8">
        <button onClick={() => navigate('/')} className="hover:text-white transition-colors">Home</button>
        <span>/</span>
        <button onClick={() => navigate('/shop')} className="hover:text-white transition-colors">Shop</button>
        <span>/</span>
        <button onClick={() => navigate(`/shop?category=${product.category}`)} className="hover:text-white transition-colors">{product.category}</button>
        <span>/</span>
        <span className="text-white/70 truncate max-w-xs">{product.title}</span>
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
            <h1 className="heading-display text-3xl md:text-4xl text-white mb-4">{product.title}</h1>
            <div className="flex items-center gap-4">
              <StarRating rating={product.ratings} size={18} />
              <span className="text-white/50 text-sm">({product.numReviews} reviews)</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold gradient-text">${product.price.toFixed(2)}</span>
            {product.comparePrice && (
              <span className="text-white/30 text-xl line-through">${product.comparePrice.toFixed(2)}</span>
            )}
          </div>

          {/* Color selector */}
          {product.colors.length > 0 && (
            <div>
              <p className="label">Color: <span className="text-white">{selectedColor}</span></p>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    id={`color-${color.name.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSelectedColor(color.name)}
                    title={color.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color.name ? 'border-brand-500 scale-110 shadow-brand' : 'border-white/20 hover:border-white/50'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label">Size {selectedSize && <span className="text-white">· {selectedSize}</span>}</p>
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
                      ? 'bg-brand-600 border-brand-500 text-white shadow-brand scale-105'
                      : 'border-white/10 text-white/60 hover:border-brand-500 hover:text-white'
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
            <div className="flex items-center gap-3 glass-sm rounded-xl p-1 w-fit">
              <button id="qty-dec" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xl">-</button>
              <span className="text-white font-semibold w-8 text-center">{quantity}</span>
              <button id="qty-inc" onClick={() => setQuantity((q) => q + 1)} className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xl">+</button>
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
            <button id="wishlist-btn" className="btn-secondary p-4 rounded-2xl">
              <Heart size={20} />
            </button>
          </div>

          {/* Description */}
          <div className="glass-sm rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Product Details</h3>
            <p className="text-white/60 text-sm leading-relaxed">{product.description}</p>
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {product.tags.map((tag) => (
                  <span key={tag} className="badge-brand text-xs">{tag}</span>
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
            <div className="text-6xl font-bold gradient-text mb-2">{product.ratings || 0}</div>
            <StarRating rating={product.ratings} size={24} />
            <p className="text-white/40 text-sm mt-2">{product.numReviews} reviews</p>
          </div>

          {/* Review list + form */}
          <div className="lg:col-span-2 space-y-6">
            {user && (
              <form onSubmit={handleSubmitReview} className="glass-sm rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold">Write a Review</h3>
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
              <p className="text-white/30 text-center py-8">No reviews yet. Be the first!</p>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="glass-sm rounded-xl p-5 animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold">
                        {review.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{review.user?.name}</p>
                        <p className="text-white/30 text-xs">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size={14} />
                      {review.verified && <span className="badge-green text-[10px]">Verified</span>}
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{review.comment}</p>
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
