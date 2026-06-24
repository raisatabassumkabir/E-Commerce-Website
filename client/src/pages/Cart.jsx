import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';

const SAMPLE_ADDRESS = {
  fullName: 'Jane Doe',
  street: '123 Fashion Ave',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
};

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const subtotal = totalPrice();
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    setLoading(true);
    try {
      const cartItems = items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      }));

      const { data } = await api.post('/payment/create-checkout-session', {
        cartItems,
        shippingAddress: user.addresses?.[0] || SAMPLE_ADDRESS,
      });

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed. Please try again.', {
        style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
      });
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center animate-fade-in">
        <div className="max-w-md mx-auto">
          <ShoppingBag size={80} className="mx-auto text-neutral-200 mb-6" strokeWidth={1} />
          <h1 className="heading-display text-3xl mb-4 text-neutral-900">Your Cart is Empty</h1>
          <p className="text-neutral-500 mb-8">Looks like you haven't added anything yet. Let's fix that.</p>
          <Link id="cart-empty-shop-link" to="/shop" className="btn-primary btn-lg rounded-2xl inline-flex">
            Start Shopping <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12 animate-fade-in">
      <h1 className="heading-display text-3xl md:text-4xl gradient-text mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, idx) => (
            <div
              key={`${item.product}-${item.size}-${idx}`}
              className="glass-sm rounded-2xl p-4 flex gap-4 animate-slide-up"
            >
              <Link to={`/products/${item.product}`}>
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-24 h-32 md:w-28 md:h-36 object-cover rounded-xl flex-shrink-0 bg-neutral-100 hover:opacity-90 transition-opacity"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product}`}>
                  <h3 className="text-neutral-800 font-medium hover:text-brand-600 transition-colors leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                </Link>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="text-neutral-500 text-xs">Size: {item.size}</span>
                  {item.color && <span className="text-neutral-500 text-xs">· {item.color}</span>}
                </div>
                <p className="text-neutral-900 font-bold text-lg mt-2">${item.price.toFixed(2)}</p>

                <div className="flex items-center justify-between mt-4">
                  {/* Qty */}
                  <div className="flex border border-neutral-200 h-8 w-24 items-center justify-between">
                    <button
                      id={`cart-qty-dec-${item.product}-${item.size}`}
                      type="button"
                      onClick={() => updateQuantity(item.product, item.size, item.color, item.quantity - 1)}
                      className="text-neutral-600 px-2 hover:text-neutral-900"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-neutral-900 font-semibold text-center text-sm w-8">{item.quantity}</span>
                    <button
                      id={`cart-qty-inc-${item.product}-${item.size}`}
                      type="button"
                      onClick={() => updateQuantity(item.product, item.size, item.color, item.quantity + 1)}
                      className="text-neutral-600 px-2 hover:text-neutral-900"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-neutral-600 font-medium text-sm">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      id={`cart-remove-${item.product}-${item.size}`}
                      onClick={() => removeItem(item.product, item.size, item.color)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Promo code (UI only) */}
          <div className="glass-sm rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input id="promo-code-input" type="text" placeholder="Promo code" className="input pl-9" />
              </div>
              <button id="promo-apply-btn" className="btn-secondary btn-md rounded-xl">Apply</button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="h-fit">
          <div className="glass rounded-2xl p-6 space-y-4 sticky top-24">
            <h2 className="text-neutral-900 font-semibold text-lg">Order Summary</h2>
            <div className="divider" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal ({items.length} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-emerald-500 font-medium">Free</span> : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Est. Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="divider" />
            <div className="flex justify-between text-neutral-900 font-bold text-lg">
              <span>Total</span>
              <span className="gradient-text">${total.toFixed(2)}</span>
            </div>
            {shipping > 0 && (
              <p className="text-neutral-500 text-xs text-center">Add ${(100 - subtotal).toFixed(2)} more for free shipping</p>
            )}
            <button
              id="checkout-btn"
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary btn-lg w-full rounded-2xl mt-2"
            >
              {loading ? <Spinner size="sm" /> : <><ArrowRight size={18} /> Checkout via Stripe</>}
            </button>
            <button
              id="cart-clear-all"
              onClick={clearCart}
              className="text-neutral-400 hover:text-red-600 text-xs w-full text-center transition-colors"
            >
              Clear cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
