import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import { useAuthStore } from './store/useAuthStore';

// User pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import PaymentSuccess from './pages/PaymentSuccess';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin pages
import Dashboard from './admin/Dashboard';
import ProductManage from './admin/ProductManage';
import OrderManage from './admin/OrderManage';
import UserManage from './admin/UserManage';
import Settings from './admin/Settings';

const App = () => {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  // On app mount, check if a valid session exists
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* ── Public / User routes ─────────────────────────────────────────── */}
        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/order-complete" element={<PaymentSuccess />} />

          {/* Protected user routes */}
          <Route
            path="/orders"
            element={<ProtectedRoute><Orders /></ProtectedRoute>}
          />
          <Route
            path="/order/:id"
            element={<ProtectedRoute><OrderDetails /></ProtectedRoute>}
          />
        </Route>

        {/* ── Auth pages (no layout shell) ────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Admin routes ─────────────────────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductManage />} />
          <Route path="orders" element={<OrderManage />} />
          <Route path="users" element={<UserManage />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* ── Error pages ──────────────────────────────────────────────────── */}
        <Route
          path="/403"
          element={
            <div className="min-h-screen flex items-center justify-center text-center p-4">
              <div>
                <p className="text-8xl font-bold gradient-text font-display mb-4">403</p>
                <h1 className="text-neutral-900 text-2xl font-semibold mb-2">Access Denied</h1>
                <p className="text-neutral-500 mb-8">You don't have permission to view this page.</p>
                <a href="/" className="btn-primary btn-md rounded-xl inline-flex">Go Home</a>
              </div>
            </div>
          }
        />
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center text-center p-4">
              <div>
                <p className="text-8xl font-bold gradient-text font-display mb-4">404</p>
                <h1 className="text-neutral-900 text-2xl font-semibold mb-2">Page Not Found</h1>
                <p className="text-neutral-500 mb-8">The page you're looking for doesn't exist.</p>
                <a href="/" className="btn-primary btn-md rounded-xl inline-flex">Go Home</a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
