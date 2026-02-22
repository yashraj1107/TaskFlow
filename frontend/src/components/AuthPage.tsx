import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services';
import { useAuthStore } from '../store/authStore';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await authService.login(form.email, form.password);
      } else {
        result = await authService.register(form.email, form.username, form.password);
      }
      login(result.access_token, result.user);
      toast.success(`Welcome${result.user.username ? ', ' + result.user.username : ''}!`);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Something went wrong';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
            <Layers size={20} className="text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">TaskFlow</span>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-surface-400 text-sm mb-6">
            {mode === 'login'
              ? 'Sign in to your workspace'
              : 'Start managing your projects'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Username</label>
                <input
                  type="text"
                  className="input"
                  placeholder="yourname"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-6">
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : mode === 'login' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              className="text-sm text-surface-400 hover:text-surface-200 transition-colors"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-accent font-medium">
                {mode === 'login' ? 'Register' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
