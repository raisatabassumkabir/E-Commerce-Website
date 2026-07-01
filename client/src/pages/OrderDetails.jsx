import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, CreditCard, MapPin, Calendar, Hash
} from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data.order))
      .catch((err) => {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to load order details');
        navigate('/orders');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="container-page py-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to My Orders
        </Link>

        {/* Order Header info */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-1.5 bg-neutral-100 rounded-lg text-neutral-600">
                <Hash size={16} />
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
                Order #{order._id.toUpperCase()}
              </h1>
            </div>
            <p className="text-neutral-500 text-sm flex items-center gap-1.5 pl-9">
              <Calendar size={14} /> Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.orderStatus} />
            <span className={`${order.paymentStatus === 'Paid' ? 'badge-green' : 'badge-yellow'} px-3 py-1 text-sm font-medium rounded-full`}>
              Payment: {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Order Items column (left 2 cols) */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Package size={18} className="text-neutral-500" />
                Items Purchased
              </h2>
              <div className="divide-y divide-neutral-200">
                {order.orderItems.map((item, index) => (
                  <div key={index} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-20 h-24 object-cover rounded-xl bg-neutral-100 flex-shrink-0 border border-neutral-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 truncate text-sm md:text-base">
                        {item.title}
                      </h3>
                      <p className="text-neutral-500 text-xs mt-1">
                        Size: {item.size} {item.color && `| Color: ${item.color}`}
                      </p>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        Qty: {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-neutral-900 text-sm md:text-base">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery/Tracking updates */}
            {order.tracking && (order.tracking.carrier || order.tracking.trackingNumber) && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Truck size={18} className="text-neutral-500" />
                  Shipment Tracking
                </h2>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Carrier</p>
                      <p className="text-neutral-800 font-medium mt-0.5">{order.tracking.carrier || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Tracking Number</p>
                      <p className="text-neutral-800 font-medium mt-0.5">{order.tracking.trackingNumber || 'N/A'}</p>
                    </div>
                  </div>
                  {order.tracking.shippedAt && (
                    <p className="text-neutral-500 text-xs">
                      Shipped at: {new Date(order.tracking.shippedAt).toLocaleString()}
                    </p>
                  )}
                  {order.tracking.deliveredAt && (
                    <p className="text-neutral-500 text-xs">
                      Delivered at: {new Date(order.tracking.deliveredAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Shipping summary (right col) */}
          <div className="space-y-6">
            {/* Cost breakdown */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-neutral-500" />
                Payment Summary
              </h2>
              <div className="space-y-2.5 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900">${order.itemsPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-neutral-900">
                    {order.shippingPrice === 0 ? 'Free' : `$${order.shippingPrice.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span className="font-semibold text-neutral-900">${order.taxPrice.toFixed(2)}</span>
                </div>
                <div className="border-t border-neutral-200 pt-3 flex justify-between text-base font-bold text-neutral-900">
                  <span>Total</span>
                  <span className="gradient-text">${order.totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex flex-wrap justify-between gap-1">
                <span>Method: {order.paymentMethod}</span>
                {order.paidAt && (
                  <span>Paid on: {new Date(order.paidAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-neutral-500" />
                Delivery Address
              </h2>
              {order.shippingAddress ? (
                <div className="text-sm text-neutral-600 space-y-1">
                  <p className="font-semibold text-neutral-900">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p className="text-neutral-500 font-medium pt-1">{order.shippingAddress.country}</p>
                </div>
              ) : (
                <p className="text-neutral-400 text-sm">No shipping address recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
