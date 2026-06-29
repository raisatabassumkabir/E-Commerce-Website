import { useEffect, useState } from 'react';
import { Shield, User } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const UserManage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
        <div className="bg-white border border-neutral-200/60 shadow-subtle rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">User</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Email</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Role</th>
                  <th className="text-left p-4 text-neutral-500 text-[11px] font-bold tracking-widest uppercase">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-10 text-neutral-400">No users found</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-900/10 flex items-center justify-center text-brand-900 font-bold overflow-hidden flex-shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-neutral-900 font-semibold">{user.name}</span>
                      </td>
                      <td className="p-4 text-neutral-500">{user.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-neutral-100 text-neutral-600'}`}>
                          {user.role === 'admin' && <Shield size={10} className="mr-1" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-500">{new Date(user.createdAt).toLocaleDateString()}</td>
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

export default UserManage;
