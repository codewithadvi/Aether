import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const CAT_LABELS: Record<string, string> = {
  general: 'General', novel_methodology: 'Novel Methodology', surprising_result: 'Surprising!',
  contradicts_prior_work: 'Contradicts Prior Work', practical_application: 'Practical',
  future_work: 'Future Work', limitation: 'Limitation',
};

export default function InsightsPage() {
  const navigate = useNavigate();
  const [catFilter, setCatFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['insights-all', catFilter],
    queryFn: () => api.get('/insights/all', { params: { category: catFilter || undefined } }).then(r => r.data.data),
  });

  return (
    <div className="bg-transparent min-h-screen pb-20 duration-500">
      <div className="relative pt-24 pb-32 px-12 lg:px-20 overflow-hidden border-b border-[#d9c1bc]/30 shadow-lg text-white mb-20 fade-in transition-all duration-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0"></div>
        <div className="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0 mix-blend-overlay"></div>
        <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent transform -rotate-45 translate-x-1/4 pointer-events-none w-[200%] h-[200%] transition-transform duration-[3000ms]"></div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 opacity-90 mb-4">
            <span className="w-8 h-px bg-[#e3d7b8]"></span>
            <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[#e3d7b8] font-bold">Aether / Synthesis Room</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-headline font-light tracking-tight leading-tight mb-4 text-white drop-shadow-sm">
            Automated Insights
          </h1>
          <p className="font-serif italic text-xl md:text-2xl text-[#e3d7b8]/80 max-w-2xl leading-relaxed duration-300">
            The intersection of all marginalia, extracted methodologies, and contradictions synthesized vertically across your archive.
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-12 lg:px-20 -mt-10 relative z-20">
        <div className="bg-[#f8f3eb]/90 backdrop-blur-3xl rounded-2xl shadow-sm border border-[#d9c1bc]/40 p-4 flex items-center gap-2 mb-16 flex-wrap duration-500">
          <button 
            className={`px-6 py-2.5 font-label text-[10px] uppercase tracking-widest rounded-xl transition-all duration-300 ${
              catFilter === '' ? 'bg-[#713324] text-white shadow-lg shadow-[#713324]/20' : 'text-[#86736e] hover:text-[#1d1c17] hover:bg-[#d9c1bc]/30'
            }`} 
            onClick={() => setCatFilter('')}
          >
            All Dimensions
          </button>
          {Object.keys(CAT_LABELS).map(c => (
            <button 
              key={c} 
              className={`px-6 py-2.5 font-label text-[10px] uppercase tracking-widest rounded-xl transition-all duration-300 ${
                catFilter === c ? 'bg-[#713324] text-white shadow-lg shadow-[#713324]/20' : 'text-[#86736e] hover:text-[#1d1c17] hover:bg-[#d9c1bc]/30'
              }`} 
              onClick={() => setCatFilter(c)}
            >
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-16">
             <div className="w-10 h-10 border-[3px] border-[#d9c1bc] border-t-[#2a697b] rounded-full animate-spin" />
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center p-32 text-center border border-[#d9c1bc]/40 bg-[#f8f3eb] rounded-3xl shadow-sm slide-up">
             <Sparkles size={64} className="text-[#2a697b] mb-8 opacity-50" />
             <p className="font-headline font-light text-3xl text-[#1d1c17] mb-4">The margin is empty.</p>
             <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[#86736e]">Open a manuscript and extract insights to begin synthesis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.map((ins: any) => (
              <div key={ins.id} className="bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-xl p-8 shadow-sm hover:shadow-xl hover:border-[#2a697b]/50 transition-all cursor-pointer flex flex-col group relative overflow-hidden duration-500" onClick={() => navigate(`/papers/${ins.paper_id}`)}>
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="absolute top-0 left-0 w-full h-1 bg-[#2a697b] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 
                 <div className="flex items-center justify-between mb-6 relative z-10">
                    <span className="font-label text-[9px] uppercase tracking-[0.3em] bg-[#fef9f1] text-[#2a697b] border border-[#d9c1bc]/40 px-3 py-1 rounded-full font-bold">
                       {CAT_LABELS[ins.category] || ins.category}
                    </span>
                    <span className="font-label text-[9px] uppercase tracking-widest text-[#86736e]">{format(new Date(ins.created_at), 'MMM d, yyyy')}</span>
                 </div>
                 
                 <p className="font-serif text-[#1d1c17] text-lg leading-relaxed mb-8 flex-1 italic relative z-10">
                    "{ins.content}"
                 </p>
                 
                 <div className="border-t border-[#d9c1bc]/40 pt-6 mt-auto relative z-10">
                    <p className="font-label text-[8px] uppercase tracking-[0.5em] text-[#86736e] mb-2">Source Manuscript</p>
                    <p className="font-headline font-light text-sm text-[#2a697b] truncate group-hover:text-[#1d1c17] transition-colors">{ins.paper_title}</p>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
