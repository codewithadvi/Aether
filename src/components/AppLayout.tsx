import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/papers', label: 'Research Records' },
  { to: '/search', label: 'Deep Search' },
  { to: '/collections', label: 'Collections' },
  { to: '/ideas', label: 'Marginalia' },
  { to: '/insights', label: 'Insights & Context' },
  { to: '/gaps', label: 'Gap Tracker' },
  { to: '/datasets', label: 'Datasets' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const isDashboardRoute = location.pathname === '/dashboard';
  
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] font-body selection:bg-[var(--primary-glow)] min-h-screen transition-colors duration-500">
      {/* TopAppBar */}
      <header className="bg-[var(--bg-card)] flex justify-between items-center w-full px-12 py-8 max-w-[1600px] mx-auto border-b border-[var(--border-subtle)] lg:border-none duration-300">
        <div className="flex items-center gap-12">
          <h1 className="text-3xl font-serif italic text-[var(--text)]">Aether</h1>
          <nav className="hidden md:flex gap-8 items-center">
            <NavLink to="/papers" className={({ isActive }) => `font-label text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${isActive ? 'text-[var(--primary)] font-bold border-b-2 border-[var(--primary)] pb-1' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>Records</NavLink>
            <NavLink to="/search" className={({ isActive }) => `font-label text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${isActive ? 'text-[var(--primary)] font-bold border-b-2 border-[var(--primary)] pb-1' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>Nexus</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-label text-[10px] uppercase tracking-widest text-[var(--text-dim)]">{user?.name?.substring(0,2)?.toUpperCase() || 'AM'}</span>
          <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--primary)]" onClick={() => setIsDark(!isDark)}>
             <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                {isDark ? 'light_mode' : 'dark_mode'}
             </span>
          </button>
          <button onClick={() => navigate('/papers?add=true')} className="btn-primary px-6 py-2 rounded-xl text-[10px] font-label uppercase tracking-widest transition-all">
            New Record
          </button>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto min-h-screen">
        {/* SideNavBar */}
        <aside className="hidden lg:flex fixed left-0 top-0 h-screen flex-col py-10 px-8 bg-[var(--bg-card)] w-72 z-10 border-r border-[var(--border-subtle)] transition-colors duration-500">
          <div className="mb-14 cursor-pointer px-2" onClick={() => navigate('/dashboard')}>
            <h1 className="text-3xl font-headline font-light tracking-tight text-[var(--text)] mb-1">Aether</h1>
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[var(--text-dim)]">Archival Records</p>
          </div>
          
          <nav className="flex-1 flex flex-col gap-5">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => 
                  `pl-2 font-label text-[10px] uppercase tracking-[0.2em] transition-all duration-300 py-2 border-l-2 ${
                    isActive 
                      ? 'text-[var(--primary)] border-[var(--primary)] font-bold bg-[var(--primary-glow)]' 
                      : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text)] hover:border-[var(--border)]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          
          <div className="mt-auto border-t border-outline-variant pt-8 flex flex-col gap-4">
            <button className="flex items-center gap-3 text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left" onClick={() => navigate('/profile')}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
              <span className="font-label text-[10px] uppercase tracking-widest">Settings</span>
            </button>
            <button className="flex items-center gap-3 text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left" onClick={logout}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
              <span className="font-label text-[10px] uppercase tracking-widest">Sign out</span>
            </button>
            
            <div className="mt-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-[#ece8e0] flex items-center justify-center font-serif italic text-primary text-sm">
                {user?.name?.substring(0,2)?.toUpperCase() || 'AM'}
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-sm truncate max-w-[120px]">{user?.name || 'Chief Librarian'}</span>
                <span className="font-label text-[9px] uppercase text-outline truncate max-w-[120px]">{user?.email || 'System Access'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Canvas Context */}
        <main
          className="flex-1 lg:ml-72 bg-[var(--bg)] relative min-h-screen transition-colors duration-500"
          style={{
            backgroundImage: isDashboardRoute
              ? 'radial-gradient(ellipse at top right, rgba(227, 215, 184, 0.34) 0%, rgba(42, 105, 123, 0.1) 45%, transparent 75%), linear-gradient(180deg, #fef9f1 0%, #f8f3eb 100%)'
              : 'radial-gradient(ellipse at top right, rgba(227, 215, 184, 0.24) 0%, rgba(42, 105, 123, 0.08) 50%, rgba(9, 44, 69, 0.05) 100%), linear-gradient(180deg, #fef9f1 0%, #f8f3eb 100%)',
          }}
        >
           <Outlet />
        </main>
      </div>
    </div>
  );
}
