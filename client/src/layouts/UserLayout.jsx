import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, LogOut, Package, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import CartDrawer from '../components/CartDrawer';
import Logo from '../components/Logo';

// â”€â”€â”€ Nav link definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each entry carries the exact `category` value it maps to in ?category=<value>.
// An empty string means "no category filter" (the plain /shop landing).
const NAV_LINKS = [
  { label: 'Shop',  to: '/shop',                 category: ''       },
  { label: 'Men',   to: '/shop?category=Men',    category: 'Men'    },
  { label: 'Women', to: '/shop?category=Women',  category: 'Women'  },
  { label: 'Kids',  to: '/shop?category=Kids',   category: 'Kids'   },
  { label: 'Sale',  to: '/shop?category=Sale',   category: 'Sale'   },
];

const UserLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen,   setIsUserMenuOpen]   = useState(false);
  const [isScrolled,       setIsScrolled]       = useState(false);

  const { user, logout }   = useAuthStore();
  const isCartOpen         = useCartStore((s) => s.isCartOpen);
  const openCart           = useCartStore((s) => s.openCart);
  const closeCart          = useCartStore((s) => s.closeCart);
  const totalItemsCount    = useCartStore((s) =>
    s.items.reduce((acc, item) => acc + item.quantity, 0)
  );

  const navigate                = useNavigate();
  const [searchParams]          = useSearchParams();
  const { pathname }            = useLocation();

  // The single source of truth: what category does the current URL declare?
  const urlCategory  = (searchParams.get('category') || '').toLowerCase();
  const isOnShopPath = pathname === '/shop';

  // â”€â”€ Scroll shadow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  // â”€â”€ Category navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Navigate to a category link, setting ONLY ?category= so the Shop page
  // re-initialises its filter state cleanly (no stale subcategory/price bleed).
  const handleCategoryClick = (link) => {
    navigate(link.to);
    setIsMobileMenuOpen(false);
  };

  // â”€â”€ Active link resolver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Called by NavLink's className render prop. React Router's default isActive
  // only compares pathnames and ignores query strings, so we override it here
  // by reading the live URL category and comparing it against the link's own
  // category value.  This is the only place that decides which link is "active".
  const resolveNavActive = (link) => {
    if (!isOnShopPath) return false;
    if (link.category === '') return urlCategory === '';
    return urlCategory === link.category.toLowerCase();
  };

  // â”€â”€ Shared class builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const desktopLinkClass = (active) =>
    [
      'relative text-xs uppercase tracking-[0.15em] font-medium transition-colors duration-200',
      'pb-1',                         // room for the underline pseudo-element
      active
        ? [
            'text-[#111111]',
            // The purple underline â€” rendered via an ::after pseudo-element.
            // Tailwind's after: variants need the after:content-[""] anchor.
            'after:content-[""] after:absolute after:bottom-0 after:left-0',
            'after:w-full after:h-[2px] after:rounded-full after:bg-purple-600',
            'after:transition-all after:duration-200',
          ].join(' ')
        : 'text-brand-900/60 hover:text-[#111111]',
    ].join(' ');

  const mobileLinkClass = (active) =>
    [
      'block w-full text-left py-3 px-4 rounded-sm transition-colors text-sm uppercase tracking-wider',
      active
        ? 'text-brand-900 font-semibold bg-nude-50 border-l-[3px] border-purple-600 pl-[13px]'
        : 'text-brand-900/70 hover:text-brand-900 hover:bg-nude-50',
    ].join(' ');

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="min-h-screen flex flex-col bg-nude-50">

      {/* â”€â”€ Navbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header
        className={`sticky top-0 z-50 bg-white border-b border-neutral-100/80 transition-all duration-300 ${
          isScrolled ? 'shadow-[0_4px_20px_rgba(26,25,24,0.08)]' : 'shadow-[0_4px_20px_rgba(26,25,24,0.05)]'
        }`}
      >
        <div className="container-page">
          <nav className="flex items-center justify-between h-16 md:h-20">

            {/* Logo */}
            <Link id="nav-logo" to="/" className="flex items-center gap-2 md:gap-3 group">
              <Logo className="w-6 h-6 md:w-7 md:h-7 transition-transform duration-500 group-hover:scale-105" />
              <span className="font-display font-medium text-xl text-brand-900 tracking-tight">
                THREADHAUS
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map((link) => {
                const active = resolveNavActive(link);
                return (
                  // We use NavLink for semantics + accessibility but override its
                  // isActive logic entirely through the className render prop so the
                  // active state is driven by the URL query param, not the pathname.
                  <NavLink
                    key={link.label}
                    id={`nav-${link.label.toLowerCase()}`}
                    to={link.to}
                    // Prevent NavLink from doing its own path matching â€” we control
                    // active state via resolveNavActive() instead.
                    className={() => desktopLinkClass(active)}
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryClick(link);
                    }}
                  >
                    {link.label}
                  </NavLink>
                );
              })}
            </div>

            {/* Right action icons */}
            <div className="flex items-center gap-4">

              {/* Search */}
              <button
                id="nav-search"
                aria-label="Open shop"
                onClick={() => navigate('/shop')}
                className="text-brand-900/60 hover:text-brand-900 transition-colors"
              >
                <Search size={20} strokeWidth={1.5} />
              </button>

              {/* Cart */}
              <button
                id="nav-cart"
                aria-label="Open cart"
                onClick={openCart}
                className="relative text-brand-900/60 hover:text-brand-900 transition-colors"
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItemsCount > 9 ? '9+' : totalItemsCount}
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
                    <ChevronDown
                      size={14}
                      className={`text-brand-900/50 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    />
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
                  className="hidden sm:inline-block text-xs uppercase tracking-[0.15em] font-medium text-[#111111] hover:text-neutral-500 transition-colors duration-200"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                id="nav-mobile-menu"
                aria-label="Toggle mobile menu"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-brand-900/60 hover:text-brand-900 transition-colors ml-2"
              >
                {isMobileMenuOpen
                  ? <X    size={24} strokeWidth={1.5} />
                  : <Menu size={24} strokeWidth={1.5} />
                }
              </button>
            </div>
          </nav>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-line absolute left-0 right-0 shadow-elegant p-4 z-40 animate-slide-up">
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = resolveNavActive(link);
                  return (
                    <button
                      key={link.label}
                      onClick={() => handleCategoryClick(link)}
                      className={mobileLinkClass(active)}
                    >
                      {link.label}
                    </button>
                  );
                })}
              </div>
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

      {/* â”€â”€ Main Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="bg-nude-100 border-t border-line mt-20">
        <div className="container-page py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 md:gap-3 mb-4">
                <Logo className="w-8 h-8 md:w-10 md:h-10" />
                <span className="font-display font-medium text-xl text-brand-900 tracking-tight block">
                  THREADHAUS
                </span>
              </div>
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
            <p className="text-brand-900/40 text-xs">Â© {new Date().getFullYear()} THREADHAUS. All rights reserved.</p>
            <p className="text-brand-900/40 text-xs">Secure payments via Stripe</p>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    </div>
  );
};

export default UserLayout;
