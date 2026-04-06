import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BADGE_META: Record<string, { icon: string; name: string; desc: string }> = {
  first_paper: { icon: '📄', name: 'First Paper', desc: 'Added your first paper' },
  ten_papers: { icon: '📚', name: 'Avid Reader', desc: 'Read 10 papers' },
  fifty_papers: { icon: '🎓', name: 'Scholar', desc: 'Read 50 papers' },
  hundred_papers: { icon: '🏛️', name: 'Professor', desc: 'Read 100 papers' },
  five_fields: { icon: '🌐', name: 'Explorer', desc: 'Papers in 5 fields' },
  ten_fields: { icon: '🗺️', name: 'Polymath', desc: 'Papers in 10 fields' },
  ten_insights: { icon: '💡', name: 'Insightful', desc: '10 insights captured' },
  fifty_insights: { icon: '🔮', name: 'Oracle', desc: '50 insights captured' },
  hundred_insights: { icon: '⭐', name: 'Sage', desc: '100 insights captured' },
};

const FALLBACK_TREND_DATA = [
  { week: 'Mon', papers: 0 },
  { week: 'Tue', papers: 1 },
  { week: 'Wed', papers: 2 },
  { week: 'Thu', papers: 1 },
  { week: 'Fri', papers: 3 },
  { week: 'Sat', papers: 2 },
  { week: 'Sun', papers: 4 },
];

// Dashboard standard colors

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/stats/dashboard').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const recentPapers = dashboardData?.recentPapers || [];

  const todayDateStr = new Date().toDateString();

  const { data: radarPapers } = useQuery({
    queryKey: ['academic_radar', recentPapers?.map((p: any) => p.external_id).join(','), todayDateStr],
    queryFn: async () => {
       const userPaperIds = recentPapers?.map((p: any) => {
         if (p.external_id) return p.external_id;
         if (p.doi) {
            const cleanDoi = p.doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim();
            return `DOI:${cleanDoi}`;
         }
         return null;
       }).filter(Boolean).slice(0, 5) || []; // Base on up to 5 recent papers
       
       let papers = [];
       if (userPaperIds.length > 0) {
         try {
           // Request more recommendations and pick randomly based on current time to make it dynamic
           const res = await api.post('/semantic-scholar/recommendations', { paperIds: userPaperIds.slice(0, 2), limit: 20 });
           const allRecs = res.data.data || [];
           if (allRecs.length > 0) {
             const maxIdx = Math.max(0, allRecs.length - 2);
             const startIndex = Math.floor(Math.random() * (maxIdx + 1));
             papers = allRecs.slice(startIndex, startIndex + 2);
             if (papers.length === 1 && allRecs.length > 1) papers.push(allRecs[0]);
           }
         } catch (err) { }
       }
       
       // Fallback: If no papers found, random queries
       if (!papers || papers.length === 0) {
         try {
            const queries = ["world models LLM cognitive", "geometry deep learning", "generative AI logic", "graph neural networks", "attention mechanisms", "reinforcement learning robotics"];
            const currentQuery = queries[Math.floor(Math.random() * queries.length)];
            const res = await api.get(`/semantic-scholar/search?query=${encodeURIComponent(currentQuery)}&limit=10`);
            const allRecs = res.data.data || [];
            if (allRecs.length > 0) {
              const startIndex = Math.floor(Math.random() * Math.max(1, allRecs.length - 2));
              papers = allRecs.slice(startIndex, startIndex + 2);
            }
         } catch (e) {}
       }
       return papers;
    },
    enabled: true
  });

  const importMutation = useMutation({
    mutationFn: (paper: any) => api.post('/papers', {
      doi: paper.externalIds?.DOI || '',
      title: paper.title,
      authors: paper.authors ? paper.authors.map((a: any) => a.name) : [],
      abstract: paper.abstract || '',
      venue: paper.venue || '',
      publication_date: paper.year ? `${paper.year}-01-01` : null,
      external_id: paper.paperId
    }),
    onSuccess: (data) => {
      toast.success('Manuscript automatically imported!');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['papers'] });
      navigate(`/papers/${data.data.data.id}`);
    },
    onError: (err: any) => {
      if (err.response?.data?.error?.code === 'DUPLICATE_RESOURCE') {
        toast.error('Already in your archives.');
      } else {
        toast.error('Failed to import paper.');
      }
    }
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-[3px] border-outline-variant border-t-[#3b82f6] rounded-full animate-spin" />
    </div>
  );

  const { weekly, streak, trends, badges } = dashboardData || {};

  const trendData = (trends || []).map((t: any) => ({
    week: t.week ? format(parseISO(t.week), 'MMM d') : '',
    papers: t.count || 0,
  }));

  const hasTrendData = trendData.some((d: any) => d.papers > 0);
  const chartData = trendData.length > 0 ? trendData : FALLBACK_TREND_DATA;
  const chartTotal = chartData.reduce((acc: number, d: any) => acc + d.papers, 0);

  const fieldData = (weekly?.byField || []).map((f: any) => ({ name: f.field, value: f.count }));

  return (
    <div className="px-12 pt-14 pb-10 fade-in bg-transparent min-h-screen">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Hero Header */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-12 mb-12 border-b border-[#d9c1bc]/30">
          <div className="space-y-4 lg:pr-12 flex flex-col justify-center">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-[#86736e] block">Workspace / Dashboard</span>
            <h1 className="text-6xl xl:text-[6.5rem] font-headline font-light tracking-tight text-[#1d1c17] mb-2 duration-300">
               Aether
            </h1>
            <h2 className="text-2xl xl:text-3xl font-serif italic text-[#86736e] leading-tight pt-2 duration-300">
              Mapping the <span className="font-light">research graph.</span>
            </h2>
            <p className="text-lg xl:text-xl text-[#475569] font-serif max-w-md leading-relaxed pt-2">
              A structured engine to track literature, visualize citations, and synthesize context from the margins.
            </p>
          </div>
          
          {/* Trend Card (styled with Add Insights gradient language) */}
          <div className="w-full h-full min-h-[280px] relative rounded-md overflow-hidden shadow-sm border border-[#d9c1bc]/40 flex flex-col justify-between group bg-[#e3d7b8]/10">
            <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_right,_#e3d7b8_0%,_transparent_60%)] opacity-30 pointer-events-none"></div>
            
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-30">
              <div className="space-y-1">
                <h3 className="font-headline font-light text-2xl text-[#1d1c17] tracking-tight">System Observatory</h3>
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-[#86736e]">Reading Trends Over Time</span>
              </div>
              <div className="font-mono text-xl text-[#2a697b] font-bold">{chartTotal}</div>
            </div>

            <div className="absolute inset-0 pt-24 pb-2 px-2 opacity-90 z-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPapers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2a697b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2a697b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9c1bc" opacity={0.3} vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#86736e', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#86736e', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#fef9f1', borderColor: '#d9c1bc', borderRadius: '8px', color: '#1d1c17', fontFamily: 'serif' }}
                     itemStyle={{ color: '#2a697b', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="papers" stroke="#2a697b" strokeWidth={2} fillOpacity={1} fill="url(#colorPapers)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {!hasTrendData && (
              <div className="absolute bottom-3 left-6 right-6 z-30">
                <button
                  onClick={() => navigate('/papers?add=true')}
                  className="text-left w-full bg-[#fef9f1]/80 backdrop-blur-sm border border-[#d9c1bc]/70 rounded-sm px-4 py-2 hover:border-[#2a697b]/60 transition-colors"
                >
                  <span className="font-label text-[9px] uppercase tracking-[0.2em] text-[#86736e]">No trend data yet. Add your next paper to start this graph.</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Elegant Stats Row (Archival Tones) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <div className="flex flex-col gap-2 p-6 bg-[#f8f3eb] border border-[#d9c1bc]/60 shadow-sm rounded-xl transition-all hover:border-[#2a697b] cursor-default group hover:shadow-md hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#86736e] text-xl group-hover:text-[#2a697b] transition-colors" style={{ fontVariationSettings: "'FILL' 0" }}>menu_book</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-[#86736e] group-hover:text-[#2a697b] transition-colors">Papers Read</span>
            </div>
            <div className="text-4xl font-serif text-[#1d1c17]">{weekly?.total ?? 0}</div>
          </div>
          <div className="flex flex-col gap-2 p-6 bg-[#f8f3eb] border border-[#d9c1bc]/60 shadow-sm rounded-xl transition-all hover:border-[#2a697b] cursor-default group hover:shadow-md hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#86736e] text-xl group-hover:text-[#2a697b] transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>{streak?.isActive ? 'local_fire_department' : 'history'}</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-[#86736e] group-hover:text-[#2a697b] transition-colors">{streak?.isActive ? 'Active Streak' : 'Day Streak'}</span>
            </div>
            <div className="text-4xl font-serif text-[#1d1c17]">{streak?.length ?? 0}</div>
          </div>
          <div className="flex flex-col gap-2 p-6 bg-[#f8f3eb] border border-[#d9c1bc]/60 shadow-sm rounded-xl transition-all hover:border-[#2a697b] cursor-default group hover:shadow-md hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#86736e] text-xl group-hover:text-[#2a697b] transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-[#86736e] group-hover:text-[#2a697b] transition-colors">Badges Earned</span>
            </div>
            <div className="text-4xl font-serif text-[#1d1c17]">{badges?.length ?? 0}</div>
          </div>
          <div className="flex flex-col gap-2 p-6 bg-[#f8f3eb] border border-[#d9c1bc]/60 shadow-sm rounded-xl transition-all hover:border-[#2a697b] cursor-default group hover:shadow-md hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#86736e] text-xl group-hover:text-[#2a697b] transition-colors" style={{ fontVariationSettings: "'FILL' 0" }}>category</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-[#86736e] group-hover:text-[#2a697b] transition-colors">Fields Explored</span>
            </div>
            <div className="text-4xl font-serif text-[#1d1c17]">{weekly?.byField?.length ?? 0}</div>
          </div>
        </div>

        <section className="mb-12 border border-[#d9c1bc]/40 bg-[#e3d7b8]/10 rounded-xl p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_right,_#e3d7b8_0%,_transparent_60%)] opacity-30 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[#86736e] mb-2">Research Sprint</p>
              <h3 className="font-headline font-light text-3xl text-[#1d1c17] tracking-tight">Useful next steps for this workspace</h3>
              <p className="font-serif text-[#86736e] mt-3">{weekly?.total ? `You logged ${weekly.total} papers this cycle. Keep momentum by capturing one insight and one new source.` : 'Seed the archive: add one paper, save one insight, and run one targeted search.'}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/papers?add=true')} className="bg-[#713324] text-white hover:bg-[#8e4a39] px-5 py-3 text-[10px] uppercase tracking-[0.2em] font-bold rounded-sm transition-colors">Add Paper</button>
              <button onClick={() => navigate('/search')} className="bg-[#fef9f1] text-[#2a697b] border border-[#d9c1bc]/70 hover:border-[#2a697b]/60 px-5 py-3 text-[10px] uppercase tracking-[0.2em] font-bold rounded-sm transition-colors">Deep Search</button>
              <button onClick={() => navigate('/insights')} className="bg-[#fef9f1] text-[#2a697b] border border-[#d9c1bc]/70 hover:border-[#2a697b]/60 px-5 py-3 text-[10px] uppercase tracking-[0.2em] font-bold rounded-sm transition-colors">Review Insights</button>
              <button onClick={() => navigate('/gaps')} className="bg-[#fef9f1] text-[#2a697b] border border-[#d9c1bc]/70 hover:border-[#2a697b]/60 px-5 py-3 text-[10px] uppercase tracking-[0.2em] font-bold rounded-sm transition-colors">Gap Tracker</button>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-20">
            
            {/* Academic Radar (Personalized Alerts) */}
            <section className="bg-[#f8f3eb] border border-[#d9c1bc]/60 p-10 rounded-xl relative overflow-hidden group shadow-sm">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-80"></div>
               <div className="absolute top-0 right-0 p-8 opacity-5 text-[#2a697b] group-hover:scale-110 transition-transform"><Sparkles size={120} /></div>
               <div className="relative z-10">
                  <span className="font-label text-[10px] uppercase tracking-[0.3em] text-[#86736e] mb-2 block">System Alert / Academic Radar</span>
                  <h3 className="text-4xl font-headline font-light tracking-tight text-[#1d1c17] mb-6">Trending in your fields</h3>
                  
                  <div className="space-y-6">
                     {(!radarPapers || radarPapers.length === 0) ? (
                        <div className="p-4 bg-[#fef9f1] border border-[#d9c1bc]/40 rounded-lg shadow-sm">
                           <p className="text-sm font-serif text-[#86736e] italic">Not enough catalog data to generate unique recommendations yet. Keep adding papers!</p>
                        </div>
                     ) : radarPapers.map((paper: any, idx: number) => (
                        <div key={paper.paperId} className={`relative p-6 rounded-xl transition-all border ${idx === 0 ? 'bg-[#fef9f1] border-[#d9c1bc]/80 shadow-md group-hover:border-[#2a697b]/50' : 'bg-[#fef9f1]/60 border-[#d9c1bc]/30 hover:border-[#d9c1bc]/80'}`}>
                           {/* Small gradient accent for the top item */}
                           {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-[#2a697b] rounded-l-xl"></div>}
                           <div className="flex justify-between items-start mb-2">
                              <span className={`text-[9px] font-label px-2 py-0.5 rounded-sm uppercase tracking-widest ${idx === 0 ? 'bg-[#e3d7b8]/30 text-[#2a697b] border border-[#2a697b]/20 font-bold' : 'bg-transparent text-[#86736e] border border-[#d9c1bc]/40'}`}>
                                 {idx === 0 ? 'Priority Discovery' : 'Contextual Signal'}
                              </span>
                              <span className="text-[10px] font-mono text-[#86736e] border border-[#d9c1bc]/40 px-2 py-0.5 rounded-sm">{paper.year || 'N/A'}</span>
                           </div>
                           <h4 className={`text-xl font-headline font-light leading-snug mt-3 ${idx === 0 ? 'text-[#1d1c17]' : 'text-[#1d1c17]/80'}`}>{paper.title}</h4>
                           {idx === 0 && <p className="text-sm font-serif text-[#86736e] mt-3 italic">"Recommended based on your recent archival tracking network."</p>}
                           <button 
                             className={`mt-4 text-[10px] font-label uppercase tracking-widest transition-colors flex items-center gap-1 ${idx === 0 ? 'text-[#2a697b] hover:text-[#092c45] font-bold' : 'text-[#86736e] hover:text-[#2a697b]'}`} 
                             onClick={() => importMutation.mutate(paper)}
                             disabled={importMutation.isPending}
                           >
                             {importMutation.isPending ? 'Connecting...' : 'Sync to Archival Volume →'}
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            </section>

            {/* Recent Papers */}
            <section>
               <div className="flex justify-between items-baseline mb-10 pt-10">
                <h3 className="font-headline font-light text-3xl text-[#1d1c17] tracking-tight">Recent Inquisitions</h3>
                <button onClick={() => navigate('/papers')} className="font-label text-[10px] uppercase tracking-widest text-[#86736e] hover:text-[#2a697b] transition-all duration-300">
                  View Archive →
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                {(recentPapers || []).length === 0 ? (
                  <div className="md:col-span-2 border-t border-[#d9c1bc]/40 pt-6 flex flex-col justify-center items-center text-center p-8 bg-[#f8f3eb] rounded-xl border border-[#d9c1bc]/30">
                    <p className="font-serif italic text-outline mb-4 text-[#86736e]">"The next insight is waiting for its ink."</p>
                    <button onClick={() => navigate('/papers?add=true')} className="bg-[#fef9f1] border border-[#d9c1bc]/60 text-[#2a697b] px-6 py-2 rounded-sm text-[10px] font-label uppercase tracking-widest hover:bg-[#2a697b] hover:text-white transition-all">
                      Make it interesting
                    </button>
                  </div>
                ) : (
                  recentPapers.map((p: any) => (
                    <article key={p.id} className="space-y-4 border-t border-[#e2e8f0] pt-6 group cursor-pointer" onClick={() => navigate(`/papers/${p.id}`)}>
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[#3b82f6] break-all pr-2 max-w-[70%]">DOI: {p.doi?.substring(10, 25) || 'LOCAL'}</span>
                        <span className="font-label text-[9px] uppercase text-[#64748b] shrink-0 bg-[#f1f5f9] border border-[#e2e8f0] px-2 py-0.5 rounded shadow-sm">
                          {p.read_at ? format(new Date(p.read_at), 'MMM d, yyyy') : 'UNREAD'}
                        </span>
                      </div>
                      <h4 className="text-2xl font-headline leading-snug group-hover:text-[#2563eb] transition-colors text-[#0f172a]">{p.title}</h4>
                      <p className="text-sm text-[#475569] font-serif leading-relaxed line-clamp-3 italic opacity-90 group-hover:text-[#0f172a] transition-colors">
                        {p.abstract || 'No abstract provided for this manuscript...'}
                      </p>
                      <div className="pt-4 flex gap-2 flex-wrap">
                        {p.field && (
                          <span className="px-2 py-0.5 bg-[#eff6ff] text-[#1d4ed8] text-[9px] font-label uppercase tracking-widest rounded-sm border border-[#bfdbfe] shadow-sm">
                            {p.field}
                          </span>
                        )}
                        {p.authors?.[0] && (
                           <span className="px-2 py-0.5 border border-[#e2e8f0] bg-white text-[#475569] text-[9px] font-label uppercase tracking-widest shadow-sm rounded-sm">
                             {Array.isArray(p.authors) ? p.authors[0] : JSON.parse(p.authors)[0]}
                           </span>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar / Badges / Fields */}
          <aside className="lg:col-span-4 space-y-12">
            <div className="sticky top-12 bg-[#f8f3eb] p-8 border border-[#d9c1bc]/40 rounded-xl shadow-sm space-y-8">
              
              <div>
                <h3 className="font-serif text-xl mb-2 text-[#1d1c17] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2a697b]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                  Curator's Note
                </h3>
                <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e] border-b border-[#d9c1bc]/30 pb-4 mb-4">
                  Archive Composition
                </p>
              </div>

              {/* Badges mapped as achievements */}
              <div className="space-y-4">
                {badges?.length > 0 ? Object.entries(BADGE_META).map(([key, meta]) => {
                  const earned = (badges || []).find((b: any) => b.badge_type === key);
                  if (!earned) return null;
                  return (
                    <div key={key} className="group cursor-default bg-[#fef9f1] p-4 border border-[#d9c1bc]/40 rounded-xl transition-all hover:border-[#2a697b]/50 hover:shadow-md">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 flex items-center justify-center bg-[#f8f3eb] rounded-lg text-[#2a697b] text-xl shadow-sm border border-[#d9c1bc]/80">
                           {meta.icon}
                        </div>
                        <div>
                           <p className="font-mono text-[9px] uppercase tracking-wider text-[#86736e] mb-0.5 group-hover:text-[#2a697b] transition-colors">Achievement Unlocked</p>
                           <h4 className="font-headline font-light text-base text-[#1d1c17] leading-none">{meta.name}</h4>
                        </div>
                      </div>
                      <p className="text-xs text-[#86736e] font-serif leading-relaxed mt-2 pl-11">
                        {meta.desc}
                      </p>
                    </div>
                  );
                }) : (
                   <div className="bg-[#fef9f1] p-6 border border-[#d9c1bc]/40 rounded-xl text-center">
                     <span className="material-symbols-outlined text-[#86736e]/50 text-3xl mb-2">emoji_events</span>
                     <p className="font-serif italic text-sm text-[#86736e]">
                       No achievements recorded yet.
                     </p>
                   </div>
                )}
              </div>

              <div className="pt-8 space-y-4">
                <p className="font-label text-[9px] uppercase tracking-widest text-[#86736e]">Dominant Fields</p>
                <ul className="space-y-3 font-serif text-sm">
                  {fieldData.length > 0 ? fieldData.slice(0, 4).map((f: any, i: number) => (
                    <li key={f.name} className="flex items-center gap-3 text-[#1d1c17] p-2 hover:bg-[#fef9f1] rounded-md transition-colors group">
                      <span className="w-2 h-2 rounded-full bg-[#2a697b] group-hover:scale-125 transition-transform" style={{ opacity: Math.max(0.3, 1 - (i * 0.2))}}></span>
                      <span className="flex-1 font-medium">{f.name}</span>
                      <span className="font-mono text-[10px] text-[#2a697b] bg-[#f8f3eb] border border-[#d9c1bc]/60 px-2 py-0.5 rounded-sm shadow-sm font-bold">{f.value}</span>
                    </li>
                  )) : (
                    <li className="italic text-[#86736e] p-2">Unclassified</li>
                  )}
                </ul>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
