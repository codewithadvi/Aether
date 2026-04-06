import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BookOpen } from 'lucide-react';
import { format } from 'date-fns';

const BADGE_META: Record<string, { icon: string; name: string }> = {
  first_paper: { icon: '📄', name: 'First Paper' },
  ten_papers: { icon: '📚', name: 'Avid Reader' },
  fifty_papers: { icon: '🎓', name: 'Scholar' },
  hundred_papers: { icon: '🏛️', name: 'Professor' },
  five_fields: { icon: '🌐', name: 'Explorer' },
  ten_fields: { icon: '🗺️', name: 'Polymath' },
  ten_insights: { icon: '💡', name: 'Insightful' },
  fifty_insights: { icon: '🔮', name: 'Oracle' },
  hundred_insights: { icon: '⭐', name: 'Sage' },
};

export default function ProfilePage() {
  const { user, logout } = useAuthStore();

  const { data: badges } = useQuery({
    queryKey: ['badges'],
    queryFn: () => api.get('/stats/badges').then(r => r.data.data),
  });

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await api.post('/export', { format }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? 'papers.csv' : 'research_tracker_export.json';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 duration-500">
      <div className="pt-24 pb-16 px-12 lg:px-24 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-5xl font-headline font-light tracking-tight text-[#1d1c17] mb-2 duration-300">Curator Profile</h1>
          <p className="font-serif italic text-lg text-[#86736e] opacity-80 duration-300">Account details and data archival</p>
        </div>
      </div>

      <div className="grid max-w-[1600px] mx-auto px-12 lg:px-24" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
        {/* Profile card */}
        <div className="bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-xl shadow-sm flex flex-col overflow-hidden duration-500">
          <div className="bg-[#fef9f1] font-headline font-light text-xl text-[#1d1c17] p-6 border-b border-[#d9c1bc]/40 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a697b] text-[20px]">manage_accounts</span> Account Details
          </div>
          <div className="p-8 flex flex-col gap-6">
            <div className="flex items-center gap-6">
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #e3d7b8, #2a697b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)' }}>
                {user?.avatar_url ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '📚'}
              </div>
              <div className="flex flex-col gap-1">
                <div className="font-headline font-light text-3xl text-[#1d1c17]">{user?.name}</div>
                <div className="font-serif text-[#86736e]">{user?.email}</div>
                <div className="flex items-center gap-2 mt-2 font-label text-[10px] uppercase tracking-widest text-[#2a697b]">
                  <BookOpen size={14} /> {user?.total_papers_read || 0} Manuscripts in Archive
                </div>
              </div>
            </div>
            <div className="h-px bg-[#d9c1bc]/40 w-full" />
            <button className="bg-[#fef9f1] text-[#86736e] border border-[#d9c1bc]/60 hover:text-[#1d1c17] px-6 py-3 rounded-sm uppercase tracking-[0.2em] text-[10px] shadow-sm transition-all hover:bg-[#d9c1bc]/20 font-bold" onClick={logout}>Sign Out & Seal Archive</button>
          </div>
        </div>

        {/* Data export */}
        <div className="bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-xl shadow-sm flex flex-col overflow-hidden duration-500">
          <div className="bg-[#fef9f1] font-headline font-light text-xl text-[#1d1c17] p-6 border-b border-[#d9c1bc]/40 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a697b] text-[20px]">archive</span> Data Export
          </div>
          <div className="p-8 flex flex-col gap-6">
            <p className="font-serif italic text-[#86736e] text-lg leading-relaxed">
              Export all your manuscripts, notes, insights, ideas, and curated volumes. Your intellectual property is always yours.
            </p>
            <button className="bg-[#713324] text-white hover:bg-[#8e4a39] px-6 py-4 rounded-sm uppercase tracking-[0.2em] text-[10px] shadow-md transition-all flex items-center justify-center gap-3 font-bold" onClick={() => handleExport('json')}>
              <span className="material-symbols-outlined text-[16px]">data_object</span> Export Full Archive (JSON)
            </button>
            <button className="bg-[#fef9f1] text-[#2a697b] border border-[#d9c1bc]/60 hover:bg-[#2a697b] hover:text-white px-6 py-4 rounded-sm uppercase tracking-[0.2em] text-[10px] shadow-sm transition-all flex items-center justify-center gap-3 font-bold" onClick={() => handleExport('csv')}>
              <span className="material-symbols-outlined text-[16px]">table_rows</span> Export Manuscripts Log (CSV)
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-xl shadow-sm flex flex-col overflow-hidden duration-500 col-span-2">
          <div className="bg-[#fef9f1] font-headline font-light text-xl text-[#1d1c17] p-6 border-b border-[#d9c1bc]/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2a697b] text-[20px]">emoji_events</span> Honors & Achievements
            </div>
            <span className="bg-[#2a697b]/10 text-[#2a697b] px-3 py-1 rounded-sm font-label text-[10px] uppercase tracking-widest font-bold border border-[#2a697b]/20">
              {badges?.length || 0} earned
            </span>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(BADGE_META).map(([key, meta]) => {
                const earned = (badges || []).find((b: any) => b.badge_type === key);
                return (
                  <div key={key} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${earned ? 'bg-[#fef9f1] border-[#d9c1bc]/80 shadow-sm' : 'bg-transparent border-[#d9c1bc]/30 opacity-50 grayscale'}`}>
                    <div className={`w-12 h-12 flex items-center justify-center rounded-lg text-2xl ${earned ? 'bg-[#f8f3eb] shadow-inner border border-[#d9c1bc]' : 'bg-transparent'}`} style={{ opacity: earned ? 1 : 0.4 }}>
                      {meta.icon}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className={`font-headline font-light text-lg ${earned ? 'text-[#1d1c17]' : 'text-[#86736e]'}`}>{meta.name}</div>
                      {earned ? (
                        <div className="font-mono text-[9px] uppercase tracking-widest text-[#2a697b]">Earned {format(new Date(earned.earned_at), 'MMM d, yy')}</div>
                      ) : (
                        <div className="font-mono text-[9px] uppercase tracking-widest text-[#86736e]">Locked</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
