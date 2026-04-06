import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      const isNetwork = err?.code === 'ERR_NETWORK' || !err?.response;
      if (isNetwork) {
        toast.error('Login service is offline. Start backend server on port 3001.');
      } else {
        toast.error(err.response?.data?.error?.message || 'Login failed');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#092c45]">
      {/* Immersive Background Mesh - Matching Synthesis Room Style */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2d6f83] to-[#041d33] opacity-60"></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.1)_0%,_transparent_40%)]"></div>
      <div className="absolute inset-0 z-0 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/90 backdrop-blur-2xl border border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden">
          <div className="p-12">
            <div className="flex flex-col items-center text-center space-y-2 mb-12">
              <h1 className="text-5xl font-headline tracking-tighter text-[#092c45] drop-shadow-sm">
                Aether
              </h1>
              <p className="text-sm font-serif italic text-[#64748b] tracking-wide">
                Retrieving archival records.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-label uppercase tracking-[0.3em] text-[#64748b] ml-1 group-focus-within:text-[#2d6f83] transition-colors">Access Key (Email)</label>
                <input
                  className="w-full px-5 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#2d6f83]/10 focus:border-[#2d6f83] focus:bg-white transition-all shadow-sm"
                  type="email"
                  placeholder="librarian@aether.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-label uppercase tracking-[0.3em] text-[#64748b] ml-1 group-focus-within:text-[#2d6f83] transition-colors">Credential (Password)</label>
                <div className="relative">
                  <input
                    className="w-full px-5 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#2d6f83]/10 focus:border-[#2d6f83] focus:bg-white transition-all shadow-sm"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[#94a3b8] hover:text-[#2d6f83] transition-colors"
                  >
                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-4.5 bg-[#092c45] hover:bg-[#1a3d56] text-[#e3d7b8] rounded-2xl font-label text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#092c45]/30 active:scale-[0.97] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                  disabled={isLoading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#e3d7b8]/30 border-t-[#e3d7b8] rounded-full animate-spin" />
                  ) : (
                    <>
                      Enter Archive
                      <span className="opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-500 ease-out">→</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-[#f1f5f9] text-center">
              <p className="text-xs font-serif text-[#64748b] tracking-wide">
                Unauthorized access?{' '}
                <Link to="/register" className="text-[#2d6f83] font-bold hover:underline decoration-1 underline-offset-4">
                  Register new record
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
