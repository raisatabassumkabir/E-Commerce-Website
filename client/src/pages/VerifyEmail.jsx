import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import Logo from '../components/Logo';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing. Please check the link in your email.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        // Auto-login: set user in store
        if (data.user) {
          updateUser(data.user);
          // Reload auth state so cookies are picked up
          useAuthStore.getState().fetchCurrentUser();
        }
      } catch (err) {
        setStatus('error');
        setMessage(
          err.response?.data?.message || 'Verification failed. The link may have expired.'
        );
      }
    };

    verify();
  }, [token, updateUser]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDFBF9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-[#FDFBF9] to-[#FDFBF9] relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 md:gap-3 group mb-6">
            <Logo className="w-10 h-10 transition-transform duration-500 group-hover:scale-105" />
            <span className="font-display font-bold text-2xl gradient-text">ThreadHaus</span>
          </Link>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8 sm:p-10 text-center">
          {status === 'loading' && (
            <>
              <Loader2 size={48} className="animate-spin text-neutral-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
                Verifying your email...
              </h1>
              <p className="text-neutral-500">Please wait while we confirm your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 border border-green-200/50 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
                Email Verified!
              </h1>
              <p className="text-neutral-500 mb-6">{message}</p>
              <Link
                to="/"
                id="verify-email-home-link"
                className="inline-flex items-center justify-center w-full bg-neutral-950 text-white rounded-lg py-3.5 text-sm font-medium hover:bg-neutral-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                Start Shopping
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 border border-red-200/50 flex items-center justify-center">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
                Verification Failed
              </h1>
              <p className="text-neutral-500 mb-6">{message}</p>
              <Link
                to="/login"
                id="verify-email-login-link"
                className="inline-flex items-center justify-center w-full bg-neutral-950 text-white rounded-lg py-3.5 text-sm font-medium hover:bg-neutral-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                Go to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
