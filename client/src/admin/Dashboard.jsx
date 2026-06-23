import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, TrendingUp, Package,
  ArrowRight, AlertTriangle, Clock, CheckCircle, XCircle, Truck,
} from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';

const StatCard = ({ title, value, icon: Icon, trend, color, sub }) => (
  <div className="glass-sm rounded-2xl p-6 flex items-start justify-between hover:shadow-brand transition-shadow">
    <div>
      <p className="text-white/40 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-white font-display">{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
      {trend && <p className="text-emerald-400 text-xs mt-1">↑ {trend}</p>}
    </div>
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon size={22} className="text-white" />
    </div>
  </div>
);

const STATUS_CONFIG = {
  Processing: { badge: 'badge-yellow', icon: Clock },
  Shipped: { badge: 'badge-blue', icon: Truck },
  'Out for Delivery': { badge: 'badge-blue', icon: Truck },
  Delivered: { badge: 'badge-green', icon: CheckCircle },
  Cancelled: { badge: 'badge-red', icon: XCircle },
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/admin/stats')
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="xl" /></div>;
  }

  const { stats = {}, recentOrders = [], statusBreakdown = [], lowStockProducts = [] } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="heading-display text-2xl text-white mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm">ThreadHaus Store Overview</p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${(stats.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-emerald-900/50"
          trend="Paid orders only"
        />
        <StatCard
          title="Total Orders"
          value={(stats.totalOrders || 0).toLocaleString()}
          icon={ShoppingCart}
          color="bg-brand-900/50"
        />
        <StatCard
          title="Avg Order Value"
          value={`$${(stats.avgOrderValue || 0).toFixed(2)}`}
          icon={TrendingUp}
          color="bg-blue-900/50"
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockProducts.length}
          icon={Package}
          color={lowStockProducts.length > 0 ? 'bg-yellow-900/50' : 'bg-slate-900/50'}
          sub={lowStockProducts.length > 0 ? 'Needs attention' : 'All stocked up'}
        />
      </div>

      {/* ── Low Stock Alert Banner ─────────────────────────────────────────── */}
      {lowStockProducts.length > 0 && (
        <div className="glass-sm rounded-2xl border border-yellow-500/20 overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-yellow-900/20 border-b border-yellow-500/20">
            <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
            <h3 className="text-yellow-300 font-semibold text-sm">
              Low Stock Alert — {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} need restocking
            </h3>
            <Link
              id="dashboard-restock-link"
              to="/admin/products?lowStock=true"
              className="ml-auto text-yellow-400 text-xs hover:text-yellow-300 flex items-center gap-1 flex-shrink-0"
            >
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {lowStockProducts.map((p) => (
              <div key={p._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{p.title}</p>
                  <p className="text-white/40 text-xs">{p.category}</p>
                </div>
                <span className={`text-xs font-semibold ${p.inventoryCount === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {p.inventoryCount === 0 ? 'OUT OF STOCK' : `${p.inventoryCount} units left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Recent Orders ───────────────────────────────────────────────── */}
        <div className="xl:col-span-2 glass-sm rounded-2xl overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <h2 className="text-white font-semibold">Recent Orders</h2>
            <Link
              id="dashboard-all-orders-link"
              to="/admin/orders"
              className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-white/30 font-medium text-xs uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-white/30 font-medium text-xs uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-white/30 font-medium text-xs uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-white/30 font-medium text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-10 text-white/30">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const cfg = STATUS_CONFIG[order.deliveryStatus] || {};
                    return (
                      <tr key={order._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-white/50">
                          #{order._id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-white text-sm">{order.user?.name || '—'}</p>
                          <p className="text-white/30 text-xs">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-5 py-4 text-white font-semibold">${order.totalPrice?.toFixed(2)}</td>
                        <td className="px-5 py-4">
                          <span className={`${cfg.badge || 'badge'} flex items-center gap-1 w-fit`}>
                            {cfg.icon && <cfg.icon size={10} />}
                            {order.deliveryStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Order Status Breakdown ─────────────────────────────────────── */}
        <div className="glass-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-white font-semibold">Order Breakdown</h2>
          </div>
          <div className="p-5 space-y-3">
            {statusBreakdown.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No data yet</p>
            ) : (
              statusBreakdown.map((item) => {
                const cfg = STATUS_CONFIG[item._id] || {};
                const total = statusBreakdown.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item._id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`${cfg.badge || 'badge'} flex items-center gap-1 text-xs`}>
                        {cfg.icon && <cfg.icon size={10} />}
                        {item._id}
                      </span>
                      <span className="text-white/60 text-sm font-medium">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-brand rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Navigation ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/admin/products', icon: Package, label: 'Manage Products', sub: 'Add, edit, restock', color: 'bg-brand-900/40 text-brand-400' },
          { to: '/admin/orders', icon: ShoppingCart, label: 'Manage Orders', sub: 'Update statuses', color: 'bg-emerald-900/40 text-emerald-400' },
          { to: '/admin/users', icon: TrendingUp, label: 'Manage Users', sub: 'View customer accounts', color: 'bg-blue-900/40 text-blue-400' },
        ].map(({ to, icon: Icon, label, sub, color }) => (
          <Link
            key={to}
            to={to}
            className="glass-sm rounded-2xl p-5 flex items-center gap-4 hover:shadow-brand transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium text-sm">{label}</p>
              <p className="text-white/40 text-xs">{sub}</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
