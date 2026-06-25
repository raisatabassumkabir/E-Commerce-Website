import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form);
    if (result.success) {
      toast.success('Welcome back!', { style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
      navigate(from, { replace: true });
    } else {
      toast.error(result.message, { style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDFBF9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-[#FDFBF9] to-[#FDFBF9] relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center group-hover:shadow-brand transition-shadow">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">ThreadHaus</span>
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">Welcome back</h1>
          <p className="text-neutral-500">Sign in to continue shopping</p>
        </div>

        {/* Form */}
        <form id="login-form" onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8 sm:p-10 space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-neutral-700 tracking-wide uppercase mb-1.5">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-white/50 border border-neutral-200 text-neutral-900 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-neutral-900 focus:ring-0 transition-colors duration-200"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-neutral-700 tracking-wide uppercase mb-1.5">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
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

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-950 text-white rounded-lg py-3.5 text-sm font-medium hover:bg-neutral-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : (<>Sign In <ArrowRight size={18} /></>)}
          </button>
        </form>

        <p className="text-center text-neutral-500 mt-6 text-sm">
          Don&apos;t have an account?{' '}
          <Link id="login-register-link" to="/register" className="text-brand-600 hover:text-brand-500 transition-colors font-medium">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
