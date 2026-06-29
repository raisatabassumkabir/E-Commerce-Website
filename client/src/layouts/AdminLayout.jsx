import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Menu, X,
  LogOut, ChevronRight, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
  { label: 'Products', icon: Package, to: '/admin/products' },
  { label: 'Orders', icon: ShoppingCart, to: '/admin/orders' },
  { label: 'Users', icon: Users, to: '/admin/users' },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-[#F9F8F6]">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} sidebar-transition flex-shrink-0 bg-white border-r border-neutral-200/80 flex flex-col min-h-screen sticky top-0 h-screen z-20`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-neutral-200/80 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="font-display font-bold text-base gradient-text">ThreadHaus</span>
            </Link>
          )}
          <button
            id="admin-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              end={to === '/admin'}
              id={`admin-nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-900 text-white shadow-elegant'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                } ${!sidebarOpen ? 'justify-center' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className={`p-3 border-t border-neutral-200/80 ${!sidebarOpen ? 'flex justify-center' : ''}`}>
          {sidebarOpen ? (
            <div className="bg-[#F9F8F6] border border-neutral-200/60 rounded-xl p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-900 text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-neutral-500 text-xs truncate">{user?.email}</p>
                </div>
              </div>
              <button
                id="admin-logout"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-red-500 hover:bg-red-50/50 hover:text-red-700 rounded-lg transition-colors text-xs font-medium"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-neutral-200/80 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="text-neutral-900 font-semibold text-sm font-display">Admin Panel</h1>
            <p className="text-neutral-500 text-xs">ThreadHaus Management</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              id="admin-view-store"
              to="/"
              target="_blank"
              className="btn-secondary btn-sm rounded-xl text-xs"
            >
              View Store ↗
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
