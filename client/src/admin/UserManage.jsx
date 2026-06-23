import { useEffect, useState } from 'react';
import { Shield, User } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';

const UserManage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Re-use the /api/auth/me style — in production you'd have a GET /api/users admin route
    // For now we show a placeholder that can be wired up
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="heading-display text-2xl text-neutral-900 mb-1">Users</h1>
        <p className="text-neutral-500 text-sm">Manage registered users</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="xl" /></div>
      ) : (
        <div className="bg-white border border-neutral-200/60 shadow-subtle rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-900/10 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-brand-900 font-semibold" />
          </div>
          <h2 className="text-neutral-900 font-semibold text-lg mb-2">User Management</h2>
          <p className="text-neutral-500 text-sm max-w-md mx-auto">
            Add a <code className="text-brand-900 font-semibold">GET /api/users</code> admin route to your backend to list and manage users here. The pattern follows the same <code className="text-brand-900 font-semibold">protect + adminOnly</code> middleware chain used for orders and products.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserManage;
