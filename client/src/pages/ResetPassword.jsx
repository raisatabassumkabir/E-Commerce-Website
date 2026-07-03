import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success('Password reset successful! Logging you in.', { style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
      navigate('/', { replace: true });
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to reset password.';
      setError(errMsg);
      toast.error(errMsg, { style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDFBF9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-[#FDFBF9] to-[#FDFBF9] relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 md:gap-3 group mb-6">
            <Logo className="w-10 h-10 transition-transform duration-500 group-hover:scale-105" />
            <span className="font-display font-bold text-2xl gradient-text">ThreadHaus</span>
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">Reset Password</h1>
          <p className="text-neutral-500">Enter a new secure password for your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8 sm:p-10 space-y-5">
          {error && (
            <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50/80 border border-red-200/50 backdrop-blur-sm" role="alert">
              <span className="font-semibold">Error: </span> {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-neutral-700 tracking-wide uppercase mb-1.5">New Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => {
                  setError('');
                  setPassword(e.target.value);
                }}
                required
                placeholder="••••••••"
                className="w-full bg-white/50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-neutral-900 focus:ring-0 transition-colors duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-neutral-700 tracking-wide uppercase mb-1.5">Confirm Password</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setError('');
                setConfirmPassword(e.target.value);
              }}
              required
              placeholder="••••••••"
              className="w-full bg-white/50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-neutral-900 focus:ring-0 transition-colors duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-950 text-white rounded-lg py-3.5 text-sm font-medium hover:bg-neutral-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resetting password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
