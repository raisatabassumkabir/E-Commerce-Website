import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Sparkles, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const BENEFITS = ['Free shipping on orders $100+', 'Exclusive member discounts', 'Early access to new collections'];

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    const result = await register(form);
    if (result.success) {
      toast.success('Account created! Welcome to ThreadHaus.', {
        style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
      });
      navigate('/');
    } else {
      toast.error(result.message, {
        style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-900/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-900/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center group-hover:shadow-brand transition-shadow">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">ThreadHaus</span>
          </Link>
          <h1 className="heading-display text-3xl text-white mb-2">Create your account</h1>
          <p className="text-white/40">Join thousands of style-conscious shoppers</p>
        </div>

        {/* Benefits */}
        <div className="flex flex-col gap-2 mb-6">
          {BENEFITS.map((b) => (
            <div key={b} className="flex items-center gap-2 text-sm text-white/50">
              <Check size={14} className="text-brand-400 flex-shrink-0" /> {b}
            </div>
          ))}
        </div>

        <form id="register-form" onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
          <div>
            <label htmlFor="register-name" className="label">Full name</label>
            <input id="register-name" type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Jane Doe" className="input" />
          </div>
          <div>
            <label htmlFor="register-email" className="label">Email address</label>
            <input id="register-email" type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" placeholder="you@example.com" className="input" />
          </div>
          <div>
            <label htmlFor="register-password" className="label">Password</label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="input pr-12"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.password && (
              <div className="mt-2 flex gap-1">
                {[4, 6, 8, 12].map((n) => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${form.password.length >= n ? 'bg-brand-500' : 'bg-dark-600'}`} />
                ))}
              </div>
            )}
          </div>

          <button id="register-submit-btn" type="submit" disabled={isLoading} className="btn-primary btn-lg w-full rounded-xl">
            {isLoading ? 'Creating account...' : (<>Create Account <ArrowRight size={18} /></>)}
          </button>

          <p className="text-xs text-white/30 text-center">
            By creating an account you agree to our Terms & Privacy Policy.
          </p>
        </form>

        <p className="text-center text-white/40 mt-6 text-sm">
          Already have an account?{' '}
          <Link id="register-login-link" to="/login" className="text-brand-400 hover:text-brand-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
