import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';
import { getErrorMessage } from '../utils/httpError';
import { Mail, Lock, LogIn, GraduationCap, Eye, EyeOff } from 'lucide-react';

interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'parent' | 'admin' | 'school-admin';
  schoolId?: string;
}

export default function LoginPage() {
  useSeo({
    title: 'Login',
    description: 'Sign in to your SchoolDekho account to access your dashboard, saved schools, and reviews.',
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await login(email, password);

      // Prefer latest persisted auth payload after login.
      let loggedInUser: StoredUser | null = null;
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        try {
          loggedInUser = JSON.parse(rawUser) as StoredUser;
        } catch {
          loggedInUser = null;
          localStorage.removeItem('user');
        }
      }

      if (loggedInUser?.role === 'school-admin') {
        navigate(loggedInUser.schoolId ? `/admin/dashboard/${loggedInUser.schoolId}` : '/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-14">
      <div className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 shadow-[0_16px_50px_rgba(2,6,23,0.35)]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-sky-700 rounded-xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="text-sm text-slate-300 mt-1">
            New here?{' '}
            <Link to="/register" className="text-sky-300 font-semibold hover:text-sky-200">
              Create an account
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-600 rounded-lg bg-slate-900/70 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 border border-slate-600 rounded-lg bg-slate-900/70 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-rose-300">{errorMessage}</p> : null}
      </div>
    </div>
  );
}
