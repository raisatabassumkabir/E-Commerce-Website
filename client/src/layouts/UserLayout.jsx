import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, LogOut, Package, ChevronDown } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import CartDrawer from '../components/CartDrawer';

const UserLayout = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuthStore();
  const totalItems = useCartStore((s) => s.totalItems);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { label: 'Shop', to: '/shop' },
    { label: 'Men', to: '/shop?category=Men' },
    { label: 'Women', to: '/shop?category=Women' },
    { label: 'Kids', to: '/shop?category=Kids' },
    { label: 'Sale', to: '/shop?category=Sale' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-nude-50">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 bg-white border-b border-neutral-100/80 shadow-[0_4px_20px_rgba(26,25,24,0.05)] transition-all duration-300"
      >
        <div className="container-page">
          <nav className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link id="nav-logo" to="/" className="flex items-center gap-2 group">
              <span className="font-display font-medium text-xl text-brand-900 tracking-tight">
                THREADHAUS
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  id={`nav-${link.label.toLowerCase()}`}
                  className={({ isActive }) =>
                    `text-xs uppercase tracking-[0.15em] font-medium transition-colors duration-200 relative dynamic-underline ${
                      isActive ? 'text-[#111111]' : 'text-[#111111] hover:text-neutral-500'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-4">
              <button
                id="nav-search"
                onClick={() => navigate('/shop')}
                className="text-brand-900/60 hover:text-brand-900 transition-colors"
              >
                <Search size={20} strokeWidth={1.5} />
              </button>

              {/* Cart */}
              <button
                id="nav-cart"
                onClick={() => setIsCartOpen(true)}
                className="relative text-brand-900/60 hover:text-brand-900 transition-colors"
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {totalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems() > 9 ? '9+' : totalItems()}
                  </span>
                )}
              </button>

              {/* User menu */}
              {user ? (
                <div className="relative">
                  <button
                    id="nav-user-menu"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-6 h-6 rounded-full bg-nude-200 flex items-center justify-center text-brand-900 text-xs font-bold border border-line">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <ChevronDown size={14} className={`text-brand-900/50 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-sm shadow-elegant border border-line z-20 overflow-hidden">
                        <div className="p-4 border-b border-line">
                          <p className="text-brand-900 font-medium text-sm truncate">{user.name}</p>
                          <p className="text-brand-900/50 text-xs truncate">{user.email}</p>
                        </div>
                        <div className="p-2">
                          <Link
                            id="nav-my-orders"
                            to="/orders"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-brand-900/70 hover:text-brand-900 hover:bg-nude-50 rounded-sm transition-colors text-sm"
                          >
                            <Package size={14} /> My Orders
                          </Link>
                          {user.role === 'admin' && (
                            <Link
                              id="nav-admin"
                              to="/admin"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-accent-500 hover:bg-nude-50 rounded-sm transition-colors text-sm"
                            >
                              <User size={14} /> Admin Panel
                            </Link>
                          )}
                          <button
                            id="nav-logout"
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-3 py-2 text-brand-900/70 hover:text-[#800020] hover:bg-nude-50 rounded-sm transition-colors text-sm"
                          >
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  id="nav-login"
                  to="/login"
                  className="hidden sm:inline-block text-xs uppercase tracking-[0.15em] font-medium text-[#111111] hover:text-neutral-500 transition-colors duration-200 relative dynamic-underline"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                id="nav-mobile-menu"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-brand-900/60 hover:text-brand-900 transition-colors ml-2"
              >
                {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
              </button>
            </div>
          </nav>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-line absolute left-0 right-0 top-16 shadow-elegant p-4 z-40 animate-slide-up">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-3 px-4 text-brand-900/70 hover:text-brand-900 hover:bg-nude-50 rounded-sm transition-colors text-sm uppercase tracking-wider"
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block mt-4 btn-primary btn-md w-full text-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-nude-100 border-t border-line mt-20">
        <div className="container-page py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <span className="font-display font-medium text-xl text-brand-900 tracking-tight block mb-4">
                THREADHAUS
              </span>
              <p className="text-brand-900/60 text-sm leading-relaxed max-w-xs">
                Premium clothing for every occasion. Curated collections, sustainable materials, timeless style.
              </p>
            </div>
            <div>
              <h4 className="text-brand-900 font-medium mb-4 text-xs uppercase tracking-widest">Shop</h4>
              <ul className="space-y-3">
                {['Men', 'Women', 'Kids', 'Accessories', 'Sale'].map((cat) => (
                  <li key={cat}>
                    <Link to={`/shop?category=${cat}`} className="text-brand-900/60 hover:text-brand-900 text-sm transition-colors">
                      {cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-brand-900 font-medium mb-4 text-xs uppercase tracking-widest">Help</h4>
              <ul className="space-y-3">
                {['Size Guide', 'Shipping Info', 'Returns', 'Contact Us', 'FAQ'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-brand-900/60 hover:text-brand-900 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-line mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-brand-900/40 text-xs">© {new Date().getFullYear()} THREADHAUS. All rights reserved.</p>
            <p className="text-brand-900/40 text-xs">Secure payments via Stripe</p>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default UserLayout;
