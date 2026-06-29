import React, { useEffect, useState, useCallback } from 'react';
import { Search, Eye, X, Mail, Phone, Package, Truck, Info, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const ORDER_STATUSES = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest_total', label: 'Highest Total' },
  { value: 'lowest_total', label: 'Lowest Total' },
];

const STATUS_COLORS = {
  Pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  Processing: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  Shipped: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  Delivered: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  Cancelled: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const OrderManage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [drawerFulfillment, setDrawerFulfillment] = useState({ orderStatus: '', carrier: '', trackingNumber: '' });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // reset to page 1 on search change
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('orderStatus', filterStatus);
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      params.append('sort', sortBy);
      params.append('page', page);
      params.append('limit', limit);

      const { data } = await api.get(`/orders?${params.toString()}`);
      setOrders(data.orders);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch { 
      toast.error('Failed to load orders'); 
    } finally { 
      setLoading(false); 
    }
  }, [filterStatus, debouncedSearchQuery, sortBy, page, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openDrawer = (order) => {
    setSelectedOrder(order);
    setDrawerFulfillment({
      orderStatus: order.orderStatus,
      carrier: order.tracking?.carrier || '',
      trackingNumber: order.tracking?.trackingNumber || '',
    });
  };

  const closeDrawer = () => {
    setSelectedOrder(null);
  };

  const handleUpdateFulfillment = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      const { data } = await api.put(`/orders/${selectedOrder._id}/fulfillment`, drawerFulfillment);
      setOrders(prev => prev.map(o => o._id === selectedOrder._id ? data.order : o));
      setSelectedOrder(data.order);
      toast.success('Fulfillment updated successfully', { style: { background: '#1a1a27', color: '#fff' } });
    } catch (err) {
      toast.error('Failed to update fulfillment');
    } finally {
      setUpdating(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative min-h-screen pb-12">
      {/* HEADER & CONTROLS */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Order Management</h1>
            <p className="text-neutral-500 text-sm mt-0.5">Showing {orders.length} of {total} orders</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search name, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20 text-sm w-full md:w-64 transition-all"
              />
            </div>
            
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="appearance-none pl-4 pr-10 py-2 bg-white/50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20 text-sm text-neutral-700 font-medium cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {ORDER_STATUSES.map(status => (
            <button
              key={status}
              onClick={() => { setFilterStatus(status); setPage(1); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterStatus === status 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'bg-white/50 text-neutral-600 hover:bg-neutral-100 border border-transparent hover:border-neutral-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* DATA GRID */}
      <div className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-neutral-50/50 text-neutral-500 font-semibold border-b border-neutral-200/60">
              <tr>
                <th className="p-4 w-12"><input type="checkbox" className="rounded border-neutral-300" /></th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Order ID</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Customer</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Status</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Total</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Date</th>
                <th className="p-4 uppercase tracking-wider text-[11px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="h-64 text-center">
                    <div className="flex justify-center"><Spinner size="lg" /></div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-64 text-center text-neutral-500">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="p-4"><input type="checkbox" className="rounded border-neutral-300" /></td>
                    <td className="p-4 font-mono text-xs text-neutral-600">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {order.user?.avatarUrl ? (
                            <img src={order.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-neutral-500 font-bold text-xs">{order.user?.name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{order.user?.name}</p>
                          <p className="text-xs text-neutral-500">{order.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${STATUS_COLORS[order.orderStatus] || STATUS_COLORS.Pending}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-neutral-900">
                      ${order.totalPrice?.toFixed(2)}
                    </td>
                    <td className="p-4 text-neutral-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => openDrawer(order)}
                        className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200/60 bg-neutral-50/30 flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handlePageChange(page - 1)} 
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                  // Logic to show a window of pages
                  let pageNum = page - 2 + idx;
                  if (page <= 3) pageNum = idx + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + idx;
                  
                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => handlePageChange(page + 1)} 
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SLIDE-OUT DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-[420px] h-full bg-white/90 backdrop-blur-xl shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 border-l border-white/50">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-200/50">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Order #{selectedOrder._id.slice(-8).toUpperCase()}</h2>
                <p className="text-xs text-neutral-500 mt-1">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={closeDrawer} className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              
              {/* Customer Block */}
              <div className="bg-white/50 border border-neutral-200/60 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                    {selectedOrder.user?.avatarUrl ? (
                      <img src={selectedOrder.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-neutral-500 font-bold text-xl">{selectedOrder.user?.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">{selectedOrder.user?.name}</h3>
                    <p className="text-sm text-neutral-500">Customer</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`mailto:${selectedOrder.user?.email}`} className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-700 transition-colors">
                    <Mail size={14} /> Email
                  </a>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-700 transition-colors">
                    <Phone size={14} /> Call
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package size={14} /> Order Items
                </h4>
                <div className="space-y-3">
                  {selectedOrder.orderItems?.map((item, idx) => (
                    <div key={item._id || idx} className="flex gap-3 bg-white/50 border border-neutral-200/60 p-3 rounded-xl shadow-sm">
                      <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200 flex-shrink-0">
                        <img src={item.image || item.product?.images?.[0]?.url} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 text-sm truncate">{item.title || item.product?.title}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[10px] bg-neutral-200/60 text-neutral-700 px-1.5 py-0.5 rounded font-medium border border-neutral-300/50">Size: {item.size}</span>
                          {item.color && item.color !== 'N/A' && (
                            <span className="text-[10px] bg-neutral-200/60 text-neutral-700 px-1.5 py-0.5 rounded font-medium border border-neutral-300/50">Color: {item.color}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-neutral-900 text-sm">${(item.price || item.product?.price)?.toFixed(2)}</p>
                        <p className="text-xs text-neutral-500 mt-1">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fulfillment Data */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Truck size={14} /> Fulfillment
                </h4>
                <div className="bg-white/50 border border-neutral-200/60 rounded-xl p-4 shadow-sm space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Order Status</label>
                    <div className="relative">
                      <select
                        value={drawerFulfillment.orderStatus}
                        onChange={(e) => setDrawerFulfillment({ ...drawerFulfillment, orderStatus: e.target.value })}
                        className="w-full appearance-none pl-3 pr-10 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20 text-sm font-medium"
                      >
                        {ORDER_STATUSES.filter(s => s !== 'All').map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Carrier</label>
                    <input
                      type="text"
                      placeholder="e.g. FedEx"
                      value={drawerFulfillment.carrier}
                      onChange={(e) => setDrawerFulfillment({ ...drawerFulfillment, carrier: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Tracking Number</label>
                    <input
                      type="text"
                      placeholder="Tracking #"
                      value={drawerFulfillment.trackingNumber}
                      onChange={(e) => setDrawerFulfillment({ ...drawerFulfillment, trackingNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/20 text-sm font-mono"
                    />
                  </div>
                  
                  {selectedOrder.tracking?.shippedAt && (
                    <div className="flex items-start gap-2 text-xs bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                      <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-800 font-medium">Tracking Timeline</p>
                        <p className="text-blue-600/80 mt-1">Shipped: {new Date(selectedOrder.tracking.shippedAt).toLocaleString()}</p>
                        {selectedOrder.tracking?.deliveredAt && (
                          <p className="text-blue-600/80 mt-0.5">Delivered: {new Date(selectedOrder.tracking.deliveredAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-neutral-200/50 bg-neutral-50/80 backdrop-blur-md">
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUpdateFulfillment}
                  disabled={updating}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {updating ? <Spinner size="sm" color="white" /> : 'Save Changes'}
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setDrawerFulfillment({ ...drawerFulfillment, orderStatus: 'Shipped' });
                    }}
                    className="flex-1 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg font-medium text-xs text-neutral-700 transition-colors shadow-sm"
                  >
                    Mark as Shipped
                  </button>
                  <button 
                    onClick={() => {
                      toast.error('Refund action currently not hooked up to a payment provider gateway.');
                    }}
                    className="flex-1 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium text-xs transition-colors shadow-sm"
                  >
                    Refund Order
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManage;
