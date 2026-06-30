import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, TrendingUp, Package,
  ArrowRight, AlertTriangle, Clock, CheckCircle, XCircle, Truck, ChevronRight
} from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

const StatCard = ({ title, value, icon: Icon, trend, color, sub }) => (
  <div className="bg-white border border-neutral-200/60 shadow-subtle rounded-2xl p-6 flex items-start justify-between hover:shadow-elegant transition-shadow">
    <div>
      <p className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-bold text-neutral-900 font-display">{value}</p>
      {sub && <p className="text-neutral-400 text-xs mt-1">{sub}</p>}
      {trend && <p className="text-emerald-600 text-xs mt-1">↑ {trend}</p>}
    </div>
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon size={22} />
    </div>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLowStockOpen, setIsLowStockOpen] = useState(false);
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(true);
  const [isOrderBreakdownOpen, setIsOrderBreakdownOpen] = useState(true);

  useEffect(() => {
    api.get('/orders/admin/stats')
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="xl" /></div>;
  }

  const { stats: metrics = {}, recentOrders = [], statusBreakdown = [], lowStockProducts = [] } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="heading-display text-2xl text-neutral-900 mb-1">Dashboard</h1>
        <p className="text-neutral-500 text-sm">ThreadHaus Store Overview</p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue || 0}`}
          icon={DollarSign}
          color="bg-emerald-50 text-emerald-600"
          trend="Paid and Pending orders"
        />
        <StatCard
          title="Total Orders"
          value={`${metrics.totalOrders || 0}`}
          icon={ShoppingCart}
          color="bg-brand-900/10 text-brand-900"
        />
        <StatCard
          title="Avg Order Value"
          value={`$${metrics.avgOrderValue || 0}`}
          icon={TrendingUp}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Low Stock Items"
          value={metrics.lowStockItems || 0}
          icon={Package}
          color={(metrics.lowStockItems || 0) > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-neutral-50 text-neutral-600'}
          sub={(metrics.lowStockItems || 0) > 0 ? 'Needs attention' : 'All stocked up'}
        />
      </div>

      {/* ── Low Stock Alert Banner ─────────────────────────────────────────── */}
      {(metrics.lowStockItems || 0) > 0 && (
        <div className="bg-white rounded-2xl border border-yellow-200 overflow-hidden shadow-subtle">
          <button 
            onClick={() => setIsLowStockOpen(!isLowStockOpen)}
            className={`w-full flex items-center gap-3 p-4 bg-yellow-50/50 hover:bg-yellow-100/50 transition-colors ${isLowStockOpen ? 'border-b border-yellow-200' : ''}`}
          >
            <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
            <h3 className="text-yellow-800 font-semibold text-sm text-left flex-1">
              Low Stock Alert — {metrics.lowStockItems} product{metrics.lowStockItems > 1 ? 's' : ''} need restocking
            </h3>
            <Link
              id="dashboard-restock-link"
              to="/admin/products?lowStock=true"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto mr-4 text-yellow-600 text-xs hover:text-yellow-800 flex items-center gap-1 flex-shrink-0"
            >
              Manage
            </Link>
            <ChevronRight 
              size={16} 
              className={`text-yellow-600 transition-transform ${isLowStockOpen ? 'rotate-90' : ''}`} 
            />
          </button>
          
          {isLowStockOpen && (
            <div className="divide-y divide-neutral-100 bg-white">
              {lowStockProducts.map((p) => (
                <div key={p._id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-neutral-900 text-sm font-medium">{p.title}</p>
                    <p className="text-neutral-400 text-xs">{p.category}</p>
                  </div>
                  <span className={`text-xs font-semibold ${p.inventoryCount === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {p.inventoryCount === 0 ? 'OUT OF STOCK' : `${p.inventoryCount} units left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* ── Recent Orders ───────────────────────────────────────────────── */}
        <div className="xl:col-span-2 bg-white border border-neutral-200/60 shadow-subtle rounded-2xl overflow-hidden self-start">
          <button 
            onClick={() => setIsRecentOrdersOpen(!isRecentOrdersOpen)}
            className={`w-full p-5 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left ${isRecentOrdersOpen ? 'border-b border-neutral-200/80' : ''}`}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-neutral-900 font-semibold">Recent Orders</h2>
              <ChevronRight size={16} className={`text-neutral-400 transition-transform ${isRecentOrdersOpen ? 'rotate-90' : ''}`} />
            </div>
            <Link
              id="dashboard-all-orders-link"
              to="/admin/orders"
              onClick={(e) => e.stopPropagation()}
              className="text-brand-900 text-sm hover:text-neutral-500 flex items-center gap-1 transition-colors font-medium"
            >
              View all
            </Link>
          </button>
          
          {isRecentOrdersOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <th className="text-left px-5 py-3 text-neutral-500 font-bold text-[11px] uppercase tracking-widest">Order</th>
                    <th className="text-left px-5 py-3 text-neutral-500 font-bold text-[11px] uppercase tracking-widest">Customer</th>
                    <th className="text-left px-5 py-3 text-neutral-500 font-bold text-[11px] uppercase tracking-widest">Total</th>
                    <th className="text-left px-5 py-3 text-neutral-500 font-bold text-[11px] uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-10 text-neutral-400">
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => {
                      return (
                        <tr key={order._id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs text-neutral-500">
                            #{order._id.slice(-8).toUpperCase()}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 text-sm font-bold flex-shrink-0">
                                {order.user?.name ? order.user.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div>
                                <p className="text-neutral-900 text-sm font-medium">{order.user?.name || '—'}</p>
                                <p className="text-neutral-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-neutral-900 font-semibold">${order.totalPrice?.toFixed(2)}</td>
                          <td className="px-5 py-4">
                            <StatusBadge status={order.orderStatus} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Order Status Breakdown ─────────────────────────────────────── */}
        <div className="bg-white border border-neutral-200/60 shadow-subtle rounded-2xl overflow-hidden self-start">
          <button 
            onClick={() => setIsOrderBreakdownOpen(!isOrderBreakdownOpen)}
            className={`w-full p-5 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left ${isOrderBreakdownOpen ? 'border-b border-neutral-200/80' : ''}`}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-neutral-900 font-semibold">Order Breakdown</h2>
              <ChevronRight size={16} className={`text-neutral-400 transition-transform ${isOrderBreakdownOpen ? 'rotate-90' : ''}`} />
            </div>
          </button>
          
          {isOrderBreakdownOpen && (
            <div className="p-5 space-y-5">
              {statusBreakdown.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-4">No data yet</p>
              ) : (
                <>
                  {/* Segmented Bar */}
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden flex">
                    {statusBreakdown.map((item) => {
                      const total = statusBreakdown.reduce((a, b) => a + b.count, 0);
                      const pct = total > 0 ? (item.count / total) * 100 : 0;
                      
                      let bgColor = 'bg-neutral-400';
                      if (item._id === 'Processing' || item._id === 'Pending') bgColor = 'bg-amber-400';
                      if (item._id === 'Shipped' || item._id === 'Out for Delivery') bgColor = 'bg-blue-400';
                      if (item._id === 'Delivered') bgColor = 'bg-emerald-400';
                      if (item._id === 'Cancelled') bgColor = 'bg-red-400';

                      return (
                        <div key={item._id} className={`h-full ${bgColor}`} style={{ width: `${pct}%` }} title={`${item._id}: ${item.count}`}></div>
                      );
                    })}
                  </div>
                  
                  {/* Legends */}
                  <div className="space-y-3">
                    {statusBreakdown.map((item) => {
                      return (
                        <div key={item._id} className="flex items-center justify-between mb-1">
                          <StatusBadge status={item._id} />
                          <span className="text-neutral-700 text-sm font-medium">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Navigation ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/admin/products', icon: Package, label: 'Manage Products', sub: 'Add, edit, restock', color: 'bg-brand-900/10 text-brand-900' },
          { to: '/admin/orders', icon: ShoppingCart, label: 'Manage Orders', sub: 'Update statuses', color: 'bg-emerald-50 text-emerald-600' },
          { to: '/admin/users', icon: TrendingUp, label: 'Manage Users', sub: 'View customer accounts', color: 'bg-blue-50 text-blue-600' },
        ].map(({ to, icon: Icon, label, sub, color }) => (
          <Link
            key={to}
            to={to}
            className="bg-white border border-neutral-200/60 shadow-subtle rounded-2xl p-5 flex items-center gap-4 hover:shadow-elegant transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-neutral-900 font-semibold text-sm">{label}</p>
              <p className="text-neutral-400 text-xs">{sub}</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-neutral-300 group-hover:text-neutral-600 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
