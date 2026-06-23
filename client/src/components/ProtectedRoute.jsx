import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import Spinner from './Spinner';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isInitialized } = useAuthStore();
  const location = useLocation();

  // Wait for the initial /me check to complete before making routing decisions
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default ProtectedRoute;
