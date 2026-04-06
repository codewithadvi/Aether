import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      toast.error('Password must be 8+ chars with uppercase, lowercase, and a number');
      return;
    }
    try {
      await register(email, password, name);
      toast.success('Account created! Welcome to Aether 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#fef9f1]">
      {/* Background Gradient Mesh - Same as Login */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2d6f83] to-[#041d33] opacity-20"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2d6f83] blur-[120px] rounded-full opacity-10 -mr-64 -mt-64 z-0"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#e3d7b8] blur-[120px] rounded-full opacity-10 -ml-64 -mb-64 z-0"></div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-xl border border-[#e2e8f0] shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-10">
            <div className="flex flex-col items-center text-center space-y-4 mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-[#092c45] to-[#2a697b] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <Sparkles size={32} color="white" />
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl font-headline tracking-tight text-[#092c45]">
                  Join Aether
                </h1>
                <p className="text-sm font-serif italic text-[#64748b]">
                  Commence your archival journey.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-[0.2em] text-[#64748b] ml-1">Full Name</label>
                <input
                  className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6f83]/20 focus:border-[#2d6f83] transition-all"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-[0.2em] text-[#64748b] ml-1">Email</label>
                <input
                  className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6f83]/20 focus:border-[#2d6f83] transition-all"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-[0.2em] text-[#64748b] ml-1">Password</label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6f83]/20 focus:border-[#2d6f83] transition-all"
                    type={showPass ? 'text' : 'password'}
                    placeholder="8+ chars, mix of case & digits"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8] hover:text-[#2d6f83] transition-colors"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 mt-2 bg-[#092c45] hover:bg-[#1a3d56] text-white rounded-xl font-label text-xs uppercase tracking-[0.1em] shadow-lg shadow-[#092c45]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Initialize Collection
                    <span className="opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-[#f1f5f9] text-center">
              <p className="text-sm font-serif text-[#64748b]">
                Already registered?{' '}
                <Link to="/login" className="text-[#2d6f83] font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
