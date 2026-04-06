import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Search, Clock } from 'lucide-react';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [field, setField] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', submitted, field, sortBy, yearFrom, yearTo],
    queryFn: () => api.get('/search', { params: { q: submitted, field: field || undefined, sortBy, year_from: yearFrom || undefined, year_to: yearTo || undefined } }).then(r => r.data),
    enabled: !!submitted,
  });

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(query); };

  const papers = data?.data?.papers || [];
  const notes = data?.data?.notes || [];

  return (
    <div className="page-container p-0 max-w-full fade-in min-h-screen bg-transparent relative pb-32">
      {/* Refined Aether Header with Subtle Stitch Glow */}
      <header className="relative pt-24 pb-32 px-12 lg:px-20 overflow-hidden border-b border-[#d9c1bc]/30 transition-all duration-700 shadow-lg text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0"></div>
        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0 mix-blend-overlay"></div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 opacity-90">
              <span className="w-8 h-px bg-[#e3d7b8]"></span>
              <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[#e3d7b8] font-bold">The Oracle</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline font-light tracking-tight text-white mb-2 drop-shadow-sm">
              Deep Search
            </h1>
            <p className="font-serif text-[#e3d7b8]/85 italic text-lg max-w-xl leading-relaxed">
              Traversing the neural archive for titles, abstracts, and personal marginalia.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-12 lg:px-20 -mt-20 relative z-20">
        {/* Immersive Search Form */}
        <form onSubmit={handleSearch} className="space-y-6 mb-16">
          <div className="bg-[#f8f3eb] border border-[#d9c1bc]/60 shadow-sm rounded-sm p-4 flex flex-wrap items-center gap-6 duration-300">
            <div className="flex-1 min-w-[300px] relative group">
              <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-[#86736e] group-focus-within:text-[#2a697b] transition-colors" />
              <input 
                className="w-full bg-[#fef9f1] border border-[#d9c1bc]/40 focus:border-[#2a697b]/50 rounded-sm pl-20 pr-6 py-6 outline-none font-serif text-2xl placeholder:text-[#d9c1bc] transition-all text-[#1d1c17]" 
                placeholder="Query the research graph..." 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              className="px-10 py-6 bg-[#713324] text-white hover:bg-[#8e4a39] rounded-sm font-label text-[12px] uppercase tracking-[0.3em] transition-all shadow-md active:scale-95 disabled:opacity-50"
              disabled={!query.trim() || isFetching}
            >
              {isFetching ? 'Scanning...' : 'Execute search'}
            </button>
          </div>

          {/* Search Context Controls */}
          {submitted && (
            <div className="flex flex-wrap items-center gap-8 animate-in slide-in-from-top-4 duration-500 bg-[#f8f3eb] p-6 rounded-sm border border-[#d9c1bc]/40">
              <div className="flex items-center gap-4">
                <span className="font-label text-[9px] uppercase tracking-[0.3em] text-[#86736e] font-bold">Domain Filter</span>
                <select className="bg-transparent border-b border-[#d9c1bc]/60 text-[#1d1c17] outline-none px-4 py-2 font-label text-[10px] uppercase tracking-widest cursor-pointer focus:border-[#2a697b] transition-colors" value={field} onChange={e => setField(e.target.value)}>
                  <option value="" className="bg-[#f8f3eb]">All Disciplines</option>
                  {['Machine Learning','Computer Vision','NLP','Systems','Biology','Physics','Economics','Mathematics','Medicine','Computer Science'].map(f => (
                    <option key={f} value={f} className="bg-[#f8f3eb]">{f}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-label text-[9px] uppercase tracking-[0.3em] text-[#86736e] font-bold">Sort Strategy</span>
                <select className="bg-transparent border-b border-[#d9c1bc]/60 text-[#1d1c17] outline-none px-4 py-2 font-label text-[10px] uppercase tracking-widest cursor-pointer focus:border-[#2a697b] transition-colors" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="relevance" className="bg-[#f8f3eb]">Neural Relevance</option>
                  <option value="date_added" className="bg-[#f8f3eb]">Acquisition Date</option>
                  <option value="publication_date" className="bg-[#f8f3eb]">Publication Era</option>
                  <option value="citation_count" className="bg-[#f8f3eb]">Impact Rank</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-label text-[9px] uppercase tracking-[0.3em] text-[#86736e] font-bold">Chronology</span>
                <div className="flex items-center gap-3">
                  <input className="bg-transparent border-b border-[#d9c1bc]/60 w-20 text-center py-2 font-mono text-xs outline-none text-[#1d1c17] focus:border-[#2a697b] transition-colors placeholder:text-[#d9c1bc]" type="number" placeholder="From" value={yearFrom} onChange={e => setYearFrom(e.target.value)} />
                  <span className="text-[#86736e] opacity-40">—</span>
                  <input className="bg-transparent border-b border-[#d9c1bc]/60 w-20 text-center py-2 font-mono text-xs outline-none text-[#1d1c17] focus:border-[#2a697b] transition-colors placeholder:text-[#d9c1bc]" type="number" placeholder="To" value={yearTo} onChange={e => setYearTo(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </form>

        {!submitted && (
          <div className="max-w-2xl mx-auto py-32 text-center space-y-12">
            <div className="grid grid-cols-2 gap-12 text-left">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#fef9f1] rounded-xl shadow-sm flex items-center justify-center text-[#2a697b] border border-[#d9c1bc]/40">
                  <Search size={20} />
                </div>
                <h4 className="font-headline text-xl text-[#1d1c17]">Semantic Retrieval</h4>
                <p className="font-serif text-[#86736e] leading-relaxed">Execute full-text searches across title and abstract metadata from your entire acquired collection.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#fef9f1] rounded-xl shadow-sm flex items-center justify-center text-[#2a697b] border border-[#d9c1bc]/40">
                  <Clock size={20} />
                </div>
                <h4 className="font-headline text-xl text-[#1d1c17]">Marginalia Mapping</h4>
                <p className="font-serif text-[#86736e] leading-relaxed">Recall your personal insights and notes by searching through every recorded thought in the Aether graph.</p>
              </div>
            </div>
          </div>
        )}

        {isLoading || isFetching ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="w-12 h-12 border-2 border-t-[#2a697b] border-[#cbd5e1] rounded-full animate-spin"></div>
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[#94a3b8]">Scanning Neural Archives</p>
          </div>
        ) : submitted && papers.length === 0 && notes.length === 0 ? (
          <div className="max-w-xl mx-auto py-32 text-center space-y-8">
            <div className="w-24 h-24 bg-[#f1f5f9] rounded-full flex items-center justify-center mx-auto opacity-50">
               <span className="material-symbols-outlined text-4xl text-[#cbd5e1]">search_off</span>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-headline text-[#0f172a]">Zero correlations found.</h3>
              <p className="font-serif italic text-lg text-[#64748b]">The archive found no matches for "{submitted}" in this sector.</p>
            </div>
          </div>
        ) : submitted && (
          <div className="space-y-20 animate-in fade-in duration-700">
            {/* Paper Results */}
            {papers.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="font-label text-[11px] uppercase tracking-[0.3em] text-[#2a697b] font-bold">Manuscript Matches</h3>
                  <div className="h-px flex-1 bg-[#2a697b]/10"></div>
                  <span className="font-serif italic text-[#64748b]">{papers.length} records</span>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {papers.map((p: any) => {
                    const authors = Array.isArray(p.authors) ? p.authors : JSON.parse(p.authors || '[]');
                    return (
                      <div key={p.id} className="group relative bg-[#f8f3eb] border border-[#d9c1bc]/40 overflow-hidden rounded-sm p-8 hover:shadow-md hover:border-[#2a697b]/50 transition-all cursor-pointer" onClick={() => navigate(`/papers/${p.id}`)}>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-start gap-8 mb-4">
                            <h2 className="text-3xl font-headline font-light text-[#1d1c17] group-hover:text-[#2a697b] transition-colors leading-tight">{p.title}</h2>
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#fef9f1] rounded-full border border-[#d9c1bc]/40">
                               <span className="font-label text-[9px] uppercase tracking-widest text-[#2a697b] font-bold">{p.field || 'General'}</span>
                            </div>
                          </div>
                        <div className="flex items-center gap-6 font-label text-[10px] uppercase tracking-widest text-[#86736e] mb-6">
                          <span>{authors[0]}{authors.length > 1 ? ` et al.` : ''}</span>
                          <span className="opacity-30">•</span>
                          <span>{p.venue || 'ArXiv Record'}</span>
                          {p.citation_count > 0 && (
                            <>
                              <span className="opacity-30">•</span>
                              <span className="text-[#2a697b] font-bold">{p.citation_count} Citations</span>
                            </>
                          )}
                        </div>
                        {p.abstract && <p className="font-serif text-[#1d1c17] text-base line-clamp-3 leading-relaxed italic">{p.abstract}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note Results */}
            {notes.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="font-label text-[11px] uppercase tracking-[0.3em] text-[#7c3aed] font-bold">Marginalia Matches</h3>
                  <div className="h-px flex-1 bg-[#7c3aed]/10"></div>
                  <span className="font-serif italic text-[#64748b]">{notes.length} thoughts</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {notes.map((n: any) => (
                    <div key={n.id} className="group bg-[#f8f3eb] border border-[#d9c1bc]/40 rounded-sm p-8 hover:shadow-md hover:border-[#2a697b]/50 transition-all cursor-pointer flex flex-col h-full relative overflow-hidden" onClick={() => navigate(`/papers/${n.paper_id}`)}>
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-6 flex flex-col gap-2">
                          <span className="font-label text-[9px] uppercase tracking-[0.2em] text-[#86736e]">Found in manuscript:</span>
                          <h4 className="font-headline font-light text-xl text-[#1d1c17] line-clamp-2">{n.paper_title}</h4>
                        </div>
                        <div className="relative pl-6 border-l-2 border-[#2a697b]/30 flex-1 group-hover:border-[#2a697b] transition-colors">
                          <p className="font-serif text-[#1d1c17] leading-relaxed italic pr-4">"{n.content.substring(0, 300)}{n.content.length > 300 ? '...' : ''}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
