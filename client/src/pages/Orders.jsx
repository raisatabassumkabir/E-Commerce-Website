import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, Truck, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';

const STATUS_ICONS = {
  Processing: <Clock size={14} className="text-yellow-400" />,
  Shipped: <Truck size={14} className="text-blue-400" />,
  'Out for Delivery': <Truck size={14} className="text-indigo-400" />,
  Delivered: <CheckCircle size={14} className="text-emerald-400" />,
  Cancelled: <XCircle size={14} className="text-red-400" />,
};

const STATUS_BADGE = {
  Processing: 'badge-yellow',
  Shipped: 'badge-blue',
  'Out for Delivery': 'badge-blue',
  Delivered: 'badge-green',
  Cancelled: 'badge-red',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/myorders')
      .then(({ data }) => setOrders(data.orders))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Spinner size="xl" /></div>;

  return (
    <div className="container-page py-12 animate-fade-in">
      <h1 className="heading-display text-3xl md:text-4xl gradient-text mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-24 glass rounded-2xl">
          <Package size={60} className="mx-auto text-white/10 mb-4" strokeWidth={1} />
          <p className="text-white/40 text-lg mb-6">You haven't placed any orders yet</p>
          <Link id="orders-empty-shop-link" to="/shop" className="btn-primary btn-md rounded-xl inline-flex">
            Start Shopping <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} id={`order-card-${order._id}`} className="glass-sm rounded-2xl p-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Order #{order._id.slice(-8).toUpperCase()}</p>
                  <p className="text-white/50 text-sm">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`${STATUS_BADGE[order.deliveryStatus] || 'badge'} flex items-center gap-1.5`}>
                    {STATUS_ICONS[order.deliveryStatus]}
                    {order.deliveryStatus}
                  </span>
                  <span className={`${order.paymentStatus === 'Paid' ? 'badge-green' : 'badge-yellow'}`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items preview */}
              <div className="flex gap-3 mb-5 overflow-x-auto pb-2">
                {order.orderItems.map((item, i) => (
                  <div key={i} className="flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-20 object-cover rounded-lg bg-dark-700"
                    />
                    <p className="text-white/40 text-[10px] text-center mt-1 w-16 truncate">{item.size}</p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-white/40 text-xs">{order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}</p>
                  <p className="text-white font-bold text-lg gradient-text">${order.totalPrice?.toFixed(2)}</p>
                </div>
                <Link
                  id={`order-detail-${order._id}`}
                  to={`/orders/${order._id}`}
                  className="btn-secondary btn-sm rounded-xl"
                >
                  View Details <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
