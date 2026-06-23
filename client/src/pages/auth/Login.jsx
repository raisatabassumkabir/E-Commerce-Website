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
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-900/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-900/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center group-hover:shadow-brand transition-shadow">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">ThreadHaus</span>
          </Link>
          <h1 className="heading-display text-3xl text-white mb-2">Welcome back</h1>
          <p className="text-white/40">Sign in to continue shopping</p>
        </div>

        {/* Form */}
        <form id="login-form" onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
          <div>
            <label htmlFor="login-email" className="label">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="label">Password</label>
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
                className="input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="btn-primary btn-lg w-full rounded-xl"
          >
            {isLoading ? 'Signing in...' : (<>Sign In <ArrowRight size={18} /></>)}
          </button>
        </form>

        <p className="text-center text-white/40 mt-6 text-sm">
          Don&apos;t have an account?{' '}
          <Link id="login-register-link" to="/register" className="text-brand-400 hover:text-brand-300 transition-colors font-medium">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
