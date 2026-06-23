import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const DELIVERY_STATUSES = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

const STATUS_BADGE = {
  Processing: 'badge-yellow',
  Shipped: 'badge-blue',
  'Out for Delivery': 'badge-blue',
  Delivered: 'badge-green',
  Cancelled: 'badge-red',
};

const OrderManage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const { data } = await api.get(`/orders${params}`);
      setOrders(data.orders);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const handleStatusChange = async (orderId, deliveryStatus) => {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { deliveryStatus });
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, deliveryStatus } : o));
      toast.success('Order status updated', { style: { background: '#1a1a27', color: '#fff' } });
    } catch { toast.error('Failed to update status'); }
    finally { setUpdating(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-display text-2xl text-neutral-900 mb-1">Orders</h1>
          <p className="text-neutral-500 text-sm">{orders.length} orders</p>
        </div>
        <div className="relative">
          <select
            id="admin-orders-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input appearance-none pr-10 min-w-[180px] bg-white border border-neutral-200/80"
          >
            <option value="" className="bg-white text-neutral-900">All Statuses</option>
            {DELIVERY_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-white text-neutral-900">{s}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" /></div>
      ) : (
        <div className="bg-white border border-neutral-200/60 shadow-subtle rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Order</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Customer</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Date</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Total</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Payment</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-10 text-neutral-400">No orders found</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} id={`admin-order-row-${order._id}`} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <td className="p-4 font-mono text-xs text-neutral-500">#{order._id.slice(-8).toUpperCase()}</td>
                      <td className="p-4">
                        <p className="text-neutral-900 font-semibold">{order.user?.name}</p>
                        <p className="text-neutral-400 text-xs">{order.user?.email}</p>
                      </td>
                      <td className="p-4 text-neutral-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-neutral-900 font-semibold">${order.totalPrice?.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={order.paymentStatus === 'Paid' ? 'badge-green' : order.paymentStatus === 'Pending' ? 'badge-yellow' : 'badge-red'}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="relative">
                          <select
                            id={`order-status-${order._id}`}
                            value={order.deliveryStatus}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            disabled={updating === order._id}
                            className={`input text-xs py-1.5 pr-8 appearance-none cursor-pointer min-w-[150px] ${STATUS_BADGE[order.deliveryStatus] || ''}`}
                          >
                            {DELIVERY_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-white text-neutral-900">{s}</option>
                            ))}
                          </select>
                          {updating === order._id ? (
                            <Spinner size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" />
                          ) : (
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                          )}
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
    </div>
  );
};

export default OrderManage;
