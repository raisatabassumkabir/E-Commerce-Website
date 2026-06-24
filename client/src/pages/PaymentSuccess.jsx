import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Loader } from 'lucide-react';
import api from '../services/api';
import { useCartStore } from '../store/useCartStore';
import Spinner from '../components/Spinner';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const clearCart = useCartStore((s) => s.clearCart);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyAndClear = async () => {
      if (!sessionId) { setLoading(false); return; }
      try {
        const { data } = await api.get(`/payment/verify/${sessionId}`);
        setOrder(data.order);
        clearCart(); // Clear cart only after confirmed payment
      } catch {
        // Order may still be processing
      } finally {
        setLoading(false);
      }
    };
    verifyAndClear();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" className="mx-auto mb-4" />
          <p className="text-neutral-500">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-20 animate-fade-in">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-emerald-900/40 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle size={48} className="text-emerald-400" />
          </div>
        </div>

        <h1 className="heading-display text-4xl md:text-5xl mb-4">
          Payment <span className="gradient-text">Successful!</span>
        </h1>
        <p className="text-neutral-500 text-lg mb-12">
          Thank you for your order. We've sent a confirmation to your email.
        </p>

        {/* Order details */}
        {order && (
          <div className="glass rounded-2xl p-8 text-left mb-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-neutral-900 font-semibold text-lg">Order Details</h2>
              <span className="badge-green">Paid</span>
            </div>
            <div className="divider" />

            {/* Items */}
            <div className="space-y-4">
              {order.orderItems?.map((item, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-20 object-cover rounded-xl bg-neutral-100 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-neutral-800 font-medium text-sm">{item.title}</p>
                    <p className="text-neutral-500 text-xs">Size: {item.size} · Qty: {item.quantity}</p>
                    <p className="text-neutral-900 font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Items</span><span>${order.itemsPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span>{order.shippingPrice === 0 ? 'Free' : `$${order.shippingPrice?.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Tax</span><span>${order.taxPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-900 font-bold text-base pt-2 border-t border-neutral-200">
                <span>Total</span><span className="gradient-text">${order.totalPrice?.toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping address */}
            {order.shippingAddress && (
              <div className="glass-sm rounded-xl p-4">
                <p className="text-neutral-500 text-xs uppercase tracking-wider mb-2">Shipping To</p>
                <p className="text-neutral-800 text-sm">{order.shippingAddress.fullName}</p>
                <p className="text-neutral-600 text-sm">
                  {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link id="success-view-orders" to="/orders" className="btn-primary btn-lg rounded-2xl">
            <Package size={18} /> View My Orders
          </Link>
          <Link id="success-continue-shopping" to="/shop" className="btn-secondary btn-lg rounded-2xl">
            Continue Shopping <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
