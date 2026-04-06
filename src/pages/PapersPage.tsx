import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, X, UploadCloud, CheckCircle2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

function AddPaperModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ doi: '', url: '', title: '', authors: '', abstract: '', venue: '', field: '', publication_date: '', external_id: '' });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'doi_entry' | 'manual_entry' | 'search'>('doi_entry');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/semantic-scholar/search?query=${encodeURIComponent(searchQuery)}&limit=5`);
      setSearchResults(res.data.data);
    } catch (err) {
      toast.error('Search failed');
    } finally { setSearching(false); }
  };

  const selectPaperFromSearch = (paper: any) => {
    setForm({
      ...form,
      doi: paper.externalIds?.DOI || '',
      title: paper.title,
      authors: (paper.authors || []).map((a: any) => a.name).join(', '),
      abstract: paper.abstract || '',
      venue: paper.venue || '',
      url: paper.url || '',
      publication_date: paper.year ? `${paper.year}-01-01` : '',
      external_id: paper.paperId || ''
    });
    setView('manual_entry');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/papers', {
        ...form,
        authors: form.authors ? form.authors.split(',').map(s => s.trim()).filter(Boolean) : [],
        external_id: form.external_id || null,
      });
      toast.success('Paper cataloged! Metadata syncing in background...');
      qc.invalidateQueries({ queryKey: ['papers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to add paper';
      if (err.response?.data?.error?.code === 'DUPLICATE_RESOURCE') {
        toast.error('This manuscript already exists in your archives.');
      } else if (msg === 'Title is required') {
        toast.error('Unable to auto-resolve DOI. Please use Manual Entry to provide a title.');
      } else {
        toast.error(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-[#f8fafc]/90 backdrop-blur-md z-[100] flex items-center justify-center fade-in overflow-y-auto pt-10 pb-10" onClick={e => e.target === e.currentTarget && onClose()}>
      
      {/* Stitch Design System - Add Paper Card */}
      <div className="relative w-full max-w-[600px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] border border-white/40 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] rounded-md overflow-hidden p-1 sm:p-2.5 mx-4" onClick={(e) => e.stopPropagation()}>
        
        {/* Diagonal aesthetic slashes (Glassmorphism effect) */}
        <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transform -rotate-45 translate-x-1/4 pointer-events-none w-[200%] h-[200%]"></div>
        <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-[#2a697b]/30 to-transparent transform -rotate-45 -translate-x-1/4 pointer-events-none w-[200%] h-[200%]"></div>

        <div className="relative bg-white/70 backdrop-blur-3xl w-full h-full p-10 md:p-16 flex flex-col items-center text-center shadow-inner rounded border border-white/60">
           <span className="font-label text-[9px] uppercase tracking-[0.3em] text-[#2a697b] absolute top-8 left-8">New Entry</span>
           
           <div className="mt-8 mb-12 flex flex-col items-center">
             <h3 className="text-5xl font-headline text-[#0f172a] tracking-tight mb-6">Catalog Paper</h3>
             <div className="w-16 h-px bg-[#2a697b]/50 mb-6"></div>
             <p className="font-serif italic text-[#475569] max-w-sm leading-relaxed">
               Provide a DOI or identifier to auto-pull library metadata, or enter details manually.
             </p>
           </div>

           <form onSubmit={handleSubmit} className="w-full flex-1 flex flex-col items-center space-y-8">
             
              {view === 'doi_entry' ? (
                 <div className="w-full max-w-sm space-y-8">
                   <div className="group relative">
                     <label className="absolute -top-3 left-3 bg-transparent font-label text-[8px] uppercase tracking-widest text-[#3b82f6] px-1 z-10 hidden">Enter Master DOI</label>
                     <input 
                       className="w-full bg-transparent border-b-2 border-[#cbd5e1] focus:border-[#3b82f6] outline-none text-center py-4 font-serif text-xl tracking-wide placeholder:text-[#94a3b8] transition-colors"
                       placeholder="10.xxxx/xxxx"
                       value={form.doi}
                       onChange={e => setForm({ ...form, doi: e.target.value })}
                       autoFocus
                     />
                   </div>
                   
                   <div className="flex flex-col gap-3 items-start justify-center text-left w-full mx-auto font-label text-[10px] uppercase tracking-widest text-[#64748b]">
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <div className="w-3 h-3 border border-[#3b82f6] rounded-sm bg-[#3b82f6] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[10px] text-white">check</span>
                         </div>
                         <span className="group-hover:text-[#0f172a] transition-colors">Generate Metadata Sync</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <div className="w-3 h-3 border border-[#3b82f6] rounded-sm bg-[#3b82f6] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[10px] text-white">check</span>
                         </div>
                         <span className="group-hover:text-[#0f172a] transition-colors">Citation Network Fetch</span>
                      </label>
                   </div>
                 </div>
              ) : view === 'search' ? (
                <div className="w-full max-w-sm space-y-4">
                  <div className="relative group">
                     <input className="w-full bg-transparent border-b border-[#cbd5e1] focus:border-[#3b82f6] outline-none py-2 font-serif text-lg placeholder:text-[#94a3b8]" placeholder="Search by title or author..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch(e)} />
                     <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#94a3b8] hover:text-[#3b82f6]" onClick={handleSearch}><Search size={18} /></button>
                  </div>
                  <div className="space-y-3 pt-4 text-left max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {searching ? <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div> : searchResults.map(p => (
                      <div key={p.paperId} className="p-3 bg-white border border-[#e2e8f0] rounded hover:border-[#3b82f6] cursor-pointer group" onClick={() => selectPaperFromSearch(p)}>
                        <h5 className="text-sm font-headline text-[#0f172a] leading-tight mb-1 group-hover:text-[#3b82f6]">{p.title}</h5>
                        <p className="text-[10px] font-label text-[#64748b] uppercase tracking-widest">{p.year || 'N/A'} • {p.authors?.[0]?.name || 'Unknown Author'}</p>
                      </div>
                    ))}
                    {searchResults.length === 0 && !searching && searchQuery && <p className="text-xs italic text-[#94a3b8] text-center">No matching records found.</p>}
                  </div>
                </div>
              ) : (
                 <div className="w-full max-w-sm space-y-4 text-left fade-in">
                   <div className="flex justify-center mb-6">
                      <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={(e) => {
                         if (e.target.files && e.target.files[0]) {
                            setForm({ ...form, title: e.target.files[0].name.replace('.pdf', '') });
                            toast.success('PDF parsed. You may edit the auto-filled title.');
                         }
                      }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-sm text-[10px] font-label uppercase tracking-widest hover:bg-emerald-100 transition-all cursor-pointer">
                        <UploadCloud size={14} /> Upload Manuscript (PDF)
                      </button>
                   </div>
                   <div className="w-full h-px bg-[#cbd5e1]/30 my-4"></div>
                   <input className="w-full bg-transparent border-b border-[#cbd5e1] focus:border-[#3b82f6] outline-none py-2 font-serif text-lg placeholder:text-[#94a3b8]" placeholder="Title of manuscript" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                   <input className="w-full bg-transparent border-b border-[#cbd5e1] focus:border-[#3b82f6] outline-none py-2 font-serif text-lg placeholder:text-[#94a3b8]" placeholder="Authors (comma separated)" value={form.authors} onChange={e => setForm({ ...form, authors: e.target.value })} />
                   <div className="flex gap-4">
                      <input className="w-1/2 bg-transparent border-b border-[#cbd5e1] focus:border-[#3b82f6] outline-none py-2 font-serif text-lg placeholder:text-[#94a3b8]" placeholder="Journal/Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
                      <input className="w-1/2 bg-transparent border-b border-[#cbd5e1] focus:border-[#3b82f6] outline-none py-2 font-serif text-lg text-[#94a3b8]" type="date" value={form.publication_date} onChange={e => setForm({ ...form, publication_date: e.target.value })} />
                   </div>
                   <textarea className="w-full bg-transparent border-b border-[#cbd5e1] focus:border-[#3b82f6] outline-none py-2 font-serif text-lg placeholder:text-[#94a3b8] resize-none" rows={2} placeholder="Abstract or Notes" value={form.abstract} onChange={e => setForm({ ...form, abstract: e.target.value })} />
                 </div>
              )}

             <div className="w-full pt-6 border-t border-[#cbd5e1]/30 flex flex-col gap-3">
               <div className="flex justify-center gap-6">
                 <button type="button" onClick={() => setView('doi_entry')} className={`font-label text-[9px] uppercase tracking-widest transition-colors ${view === 'doi_entry' ? 'text-[#3b82f6] font-bold' : 'text-[#94a3b8] hover:text-[#3b82f6]'}`}>DOI Entry</button>
                 <button type="button" onClick={() => setView('search')} className={`font-label text-[9px] uppercase tracking-widest transition-colors ${view === 'search' ? 'text-[#3b82f6] font-bold' : 'text-[#94a3b8] hover:text-[#3b82f6]'}`}>Global Search</button>
                 <button type="button" onClick={() => setView('manual_entry')} className={`font-label text-[9px] uppercase tracking-widest transition-colors ${view === 'manual_entry' ? 'text-[#3b82f6] font-bold' : 'text-[#94a3b8] hover:text-[#3b82f6]'}`}>Manual & PDF</button>
               </div>
             </div>

             <div className="flex w-full gap-4">
                <button type="button" onClick={onClose} className="flex-1 py-4 border border-[#cbd5e1] text-[#64748b] bg-white/50 rounded text-[10px] font-label uppercase tracking-widest hover:bg-white transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-[#1e293b] text-white rounded text-[10px] font-label uppercase tracking-widest hover:bg-[#3b82f6] transition-all shadow-md flex items-center justify-center gap-2">
                  {loading && <div className="w-3 h-3 border-2 border-t-[#3b82f6] rounded-full animate-spin" />}
                  Finalize Record
                </button>
             </div>
           </form>
           
        </div>
      </div>
    </div>
  );
}

function AddToCollectionModal({ paperIds, onClose, onSuccess }: { paperIds: string[], onClose: () => void, onSuccess: () => void }) {
  const { data: collections, isLoading } = useQuery({ queryKey: ['collections'], queryFn: () => api.get('/collections').then(r => r.data.data) });
  const [collId, setCollId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!collId) return;
    setSaving(true);
    try {
      await Promise.all(paperIds.map(id => api.post(`/collections/${collId}/papers`, { paper_id: id })));
      toast.success(`Successfully bound ${paperIds.length} manuscript(s) to volume.`);
      onSuccess();
    } catch(err) { toast.error('Failed to bind papers'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center fade-in p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
       <div className="bg-[#f8f3eb] rounded-sm shadow-2xl w-full max-w-sm overflow-hidden flex flex-col slide-up border border-[#d9c1bc]/60">
         <div className="p-8 border-b border-[#d9c1bc]/40 flex justify-between items-center bg-[#fef9f1]">
            <h2 className="text-2xl font-headline font-light text-[#1d1c17]">Bind to Volume</h2>
            <button className="text-[#86736e] hover:text-[#1d1c17] transition-colors" onClick={onClose}><X size={20} /></button>
         </div>
         <div className="p-8 space-y-4">
            {isLoading ? <div className="text-sm italic font-serif opacity-70 text-[#86736e]">Localizing volumes...</div> : (
               <select className="w-full bg-[#fef9f1] border border-[#d9c1bc]/40 p-4 rounded-sm text-xs font-label uppercase tracking-widest text-[#1d1c17] outline-none focus:border-[#2a697b] transition-all" value={collId} onChange={e => setCollId(e.target.value)}>
                 <option value="" disabled>Select Target Volume</option>
                 {(collections || []).map((c: any) => <option key={c.id} value={c.id} className="bg-[#f8f3eb]">{c.name}</option>)}
               </select>
            )}
         </div>
         <div className="p-6 bg-[#f8f3eb]/50 border-t border-[#d9c1bc]/40 flex justify-end gap-4">
           <button className="px-6 py-3 text-[10px] font-label uppercase tracking-widest text-[#86736e] hover:text-[#1d1c17] transition-colors" onClick={onClose}>Cancel</button>
           <button className="bg-[#713324] text-white px-8 py-3 rounded-sm shadow-md hover:bg-[#8e4a39] transition-all text-[10px] uppercase font-bold tracking-widest" onClick={handleSubmit} disabled={!collId || saving}>
             {saving ? 'Binding...' : 'Incorporate Records'}
           </button>
         </div>
       </div>
    </div>
  );
}

export default function PapersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAdd, setShowAdd] = useState(searchParams.get('add') === 'true');
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCollModal, setShowCollModal] = useState(false);
  const qc = useQueryClient();

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAdd(true);
    }
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['papers', page, fieldFilter, sortBy],
    queryFn: () => api.get('/papers', { params: { page, limit: 20, field: fieldFilter || undefined, sortBy } }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/papers/${id}`),
    onSuccess: () => { toast.success('Paper deleted'); qc.invalidateQueries({ queryKey: ['papers'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const papers = data?.data || [];
  const pagination = data?.pagination;

  const filtered = searchTerm
    ? papers.filter((p: any) =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(p.authors) ? p.authors : JSON.parse(p.authors || '[]')).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : papers;

  return (
    <div className="page-container p-0 max-w-full fade-in min-h-screen bg-transparent relative pb-32">
      {showAdd && <AddPaperModal onClose={() => setShowAdd(false)} />}
      {showCollModal && <AddToCollectionModal paperIds={Array.from(selected)} onClose={() => setShowCollModal(false)} onSuccess={() => { setShowCollModal(false); setSelected(new Set()); }} />}

      {/* Floating Selection Bar */}
      {selected.size > 0 && (
         <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#f8f3eb]/95 backdrop-blur-2xl text-[#1d1c17] px-10 py-6 rounded-sm shadow-[0_30px_70px_rgba(0,0,0,0.2)] flex items-center gap-10 z-[1000] border border-[#d9c1bc]/60 slide-up group">
            <div className="flex items-center gap-4">
               <span className="font-headline text-5xl leading-none text-[#2a697b] font-light">{selected.size}</span>
               <div className="flex flex-col">
                 <span className="font-label text-[9px] uppercase tracking-[0.3em] font-bold text-[#1d1c17]">Records</span>
                 <span className="font-label text-[8px] uppercase tracking-[0.2em] opacity-40">Selected</span>
               </div>
            </div>
            <div className="h-10 w-px bg-[#d9c1bc]/40"></div>
            <button className="font-label text-[10px] uppercase tracking-[0.3em] text-[#2a697b] hover:text-[#1d1c17] transition-all flex items-center gap-3 group/btn font-bold" onClick={() => setShowCollModal(true)}>
               <span className="material-symbols-outlined text-2xl group-hover/btn:scale-110 transition-transform">inventory_2</span>
               Bind to Volume
            </button>
            <button className="font-label text-[9px] uppercase tracking-[0.2em] text-[#86736e] hover:text-[#1d1c17] transition-all" onClick={() => setSelected(new Set())}>
               Dismiss
            </button>
         </div>
      )}

      {/* Refined Aether Header with Subtle Stitch Glow */}
      <header className="relative pt-24 pb-28 px-12 lg:px-20 overflow-hidden border-b border-[#d9c1bc]/30 mb-20 fade-in transition-all duration-700 shadow-lg text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0"></div>
        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0 mix-blend-overlay"></div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 opacity-90">
              <span className="w-8 h-px bg-[#e3d7b8]"></span>
              <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[#e3d7b8] font-bold">Research Library</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline font-light tracking-tight text-white mb-2 drop-shadow-sm">Aether Archive</h1>
            <p className="font-serif text-[#e3d7b8]/85 italic text-lg max-w-xl duration-300">
              Synthesizing {pagination?.total ?? 0} archival manuscripts through a high-fidelity semantic graph.
            </p>
          </div>
          
          <button 
            className="group relative px-10 py-5 bg-[#fef9f1] text-[#2a697b] rounded-sm shadow-xl active:scale-95 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-white transition-all border border-[#d9c1bc]/60"
            onClick={() => setShowAdd(true)}
          >
            <span className="relative flex items-center gap-3">
              <Plus size={18} /> Catalog New Entry
            </span>
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-12 lg:px-20 -mt-20 relative z-20">
        {/* Refined Search & Filter Bar */}
        <div className="bg-[#f8f3eb] border border-[#d9c1bc]/60 shadow-sm rounded-sm p-4 mb-20 flex flex-wrap items-center gap-6 duration-300">
          <div className="flex-1 min-w-[300px] relative group">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#86736e] group-focus-within:text-[#2a697b] transition-colors" />
            <input 
              className="w-full bg-[#fef9f1] border border-[#d9c1bc]/40 focus:border-[#2a697b]/50 focus:bg-[#fef9f1] rounded-sm pl-16 pr-6 py-4 outline-none font-serif text-lg placeholder:text-[#d9c1bc] transition-all text-[#1d1c17]" 
              placeholder="Search current volume..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <div className="flex items-center gap-4 bg-[#fef9f1] p-2 rounded-sm border border-[#d9c1bc]/40">
            <div className="flex flex-col gap-1 px-4 border-r border-[#d9c1bc]/60">
              <span className="font-label text-[8px] uppercase tracking-widest text-[#86736e]">Domain filter</span>
              <select className="bg-transparent text-[#1d1c17] outline-none font-label text-[10px] uppercase tracking-widest cursor-pointer focus:text-[#2a697b] transition-colors" value={fieldFilter} onChange={e => { setFieldFilter(e.target.value); setPage(1); }}>
                <option value="" className="bg-[#f8f3eb]">All Disciplines</option>
                {['Machine Learning','Computer Vision','NLP','Systems','Biology','Physics','Economics','Mathematics','Medicine','Computer Science'].map(f => (
                  <option key={f} value={f} className="bg-[#f8f3eb]">{f}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="font-label text-[8px] uppercase tracking-widest text-[#86736e]">Order by</span>
              <select className="bg-transparent text-[#1d1c17] outline-none font-label text-[10px] uppercase tracking-widest cursor-pointer focus:text-[#2a697b] transition-colors" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="created_at" className="bg-[#f8f3eb]">Acquisition Date</option>
                <option value="read_at" className="bg-[#f8f3eb]">Reading History</option>
                <option value="citation_count" className="bg-[#f8f3eb]">Impact Rank</option>
                <option value="title" className="bg-[#f8f3eb]">Lexical Order</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="w-12 h-12 border-2 border-t-[#2a697b] border-[#cbd5e1] rounded-full animate-spin"></div>
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[#94a3b8]">Initializing Archival Sync</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="max-w-xl mx-auto py-32 text-center space-y-8">
            <div className="w-24 h-24 bg-[#fef9f1] border border-[#d9c1bc]/40 rounded-full flex items-center justify-center mx-auto text-[#2a697b]">
              <span className="material-symbols-outlined text-4xl">inventory</span>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-headline font-light text-[#1d1c17]">The vault is currently empty.</h3>
              <p className="font-serif italic text-lg text-[#86736e]">No manuscripts matching your criteria were found in this sector.</p>
            </div>
            <button className="px-8 py-3 bg-[#092c45] text-[#e3d7b8] rounded-xl font-label text-[10px] uppercase tracking-[0.2em] hover:bg-[#1a3d56] transition-all" onClick={() => {setSearchTerm(''); setFieldFilter('');}}>
              Reset Filter Pipeline
            </button>
          </div>
        ) : (
          <div className="space-y-6 mb-24">
            <div className="grid grid-cols-1 gap-6">
              {filtered.map((paper: any) => {
                const authors = Array.isArray(paper.authors) ? paper.authors : JSON.parse(paper.authors || '[]');
                const isSelected = selected.has(paper.id);
                return (
                  <div 
                    key={paper.id} 
                    className={`group relative overflow-hidden bg-[#f8f3eb] border ${isSelected ? 'border-[#2a697b] ring-1 ring-[#2a697b]' : 'border-[#d9c1bc]/40'} rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 hover:border-[#2a697b]/50 transition-all flex gap-8 items-start cursor-pointer duration-300`}
                    onClick={() => navigate(`/papers/${paper.id}`)}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-8 left-0 w-1 h-12 bg-[#2a697b] rounded-r-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top z-10"></div>
                    
                    {/* Checkbox */}
                    <div className="pt-2 relative z-10" onClick={(e) => toggleSelection(e, paper.id)}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${isSelected ? 'bg-[#2a697b] border-[#2a697b] text-[#fef9f1] shadow-lg shadow-[#2a697b]/20' : 'bg-[#fef9f1] border-[#d9c1bc] group-hover:border-[#2a697b]/50'}`}>
                        {isSelected && <CheckCircle2 size={16} />}
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 relative z-10">
                      <div className="flex justify-between items-start gap-8">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                             {paper.field && <span className="font-label text-[9px] uppercase tracking-[0.2em] text-[#2a697b] font-bold">{paper.field}</span>}
                             <span className="w-1 h-1 bg-[#d9c1bc] rounded-full"></span>
                             <span className="font-label text-[9px] uppercase tracking-[0.2em] text-[#86736e]">{paper.venue || 'ArXiv Record'}</span>
                          </div>
                          <h2 className="text-3xl font-headline font-light text-[#1d1c17] leading-tight group-hover:text-[#2a697b] transition-colors">
                            {paper.title}
                          </h2>
                          <p className="font-serif italic text-[#86736e] text-lg">by {authors.join(', ') || 'Unknown Author'}</p>
                        </div>
                        
                        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                             onClick={e => { e.stopPropagation(); if (confirm('Purge this record from the Aether archive?')) deleteMutation.mutate(paper.id); }}
                           >
                             <Trash2 size={18} />
                           </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-[#d9c1bc]/30">
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-lg text-[#86736e]">bookmark_manager</span>
                           <span className="font-label text-[10px] uppercase tracking-widest text-[#86736e]">{paper.note_count || 0} Notes</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-lg text-[#2a697b] shadow-sm">tips_and_updates</span>
                           <span className="font-label text-[10px] uppercase tracking-widest text-[#86736e] font-bold">{paper.insight_count || 0} Insights</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-lg text-[#86736e]">history</span>
                           <span className="font-label text-[10px] uppercase tracking-widest text-[#86736e]">{format(new Date(paper.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        {paper.citation_count > 0 && (
                          <div className="flex items-center gap-2 bg-[#fef9f1] px-4 py-1.5 rounded-full border border-[#d9c1bc]/40 shadow-sm">
                             <span className="material-symbols-outlined text-lg text-[#2a697b]">social_leaderboard</span>
                             <span className="font-label text-[10px] uppercase tracking-widest text-[#2a697b] font-bold">{paper.citation_count} Citations</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-6 mt-16">
                <button className={`px-6 py-3 border border-[#cbd5e1] rounded-2xl font-label text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:border-[#2a697b] hover:text-[#2a697b] transition-all disabled:opacity-30`} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev Archive</button>
                <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[#94a3b8]">Vol {page} / {pagination.pages}</span>
                <button className={`px-6 py-3 border border-[#cbd5e1] rounded-2xl font-label text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:border-[#2a697b] hover:text-[#2a697b] transition-all disabled:opacity-30`} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next Archive</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
