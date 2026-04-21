import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, BookOpen, Zap, Compass, FileCode } from 'lucide-react';

const STOP_WORDS = new Set([
  'this', 'that', 'with', 'from', 'into', 'their', 'there', 'where', 'which', 'while', 'using', 'based', 'between',
  'study', 'paper', 'result', 'results', 'method', 'methods', 'analysis', 'approach', 'toward', 'through', 'across',
  'about', 'than', 'have', 'has', 'were', 'been', 'being', 'also', 'show', 'shows', 'used', 'over', 'under', 'into',
  'for', 'and', 'the', 'are', 'our', 'your', 'you', 'its', 'can', 'not', 'but', 'was', 'were', 'they', 'them'
]);

function pickTopKeywords(papers: any[], limit: number = 8) {
  const counts: Record<string, number> = {};
  for (const p of papers) {
    const text = `${p.title || ''} ${p.abstract || ''}`.toLowerCase();
    const words = text.match(/[a-z]{4,}/g) || [];
    for (const w of words) {
      if (STOP_WORDS.has(w)) continue;
      counts[w] = (counts[w] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function parseAuthors(authors: unknown): string[] {
  if (Array.isArray(authors)) {
    return authors.map((a) => String(a)).filter(Boolean);
  }

  if (typeof authors === 'string') {
    try {
      const parsed = JSON.parse(authors);
      if (Array.isArray(parsed)) return parsed.map((a) => String(a)).filter(Boolean);
      return authors.split(',').map((s) => s.trim()).filter(Boolean);
    } catch {
      return authors.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  return [];
}

export default function CollectionDetailPage() {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState<'editor' | 'viewer'>('editor');
  const [paperSearch, setPaperSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'papers'|'synthesis'|'export'>('papers');

  const { data, isLoading, error } = useQuery({
    queryKey: ['collection', id, token],
    queryFn: () => {
      if (token) return api.get(`/collections/shared/${token}`).then(r => r.data.data);
      return api.get(`/collections/${id}`).then(r => r.data.data);
    },
  });

  const collectionId = data?.id || id;
  const canEdit = !!data?.can_edit;
  const canManageSharing = !!data?.can_manage_sharing;

  const { data: stats } = useQuery({
    queryKey: ['collection-stats', collectionId],
    queryFn: () => api.get(`/collections/${collectionId}/stats`).then(r => r.data.data),
    enabled: !!collectionId,
  });

  const { data: collaborators } = useQuery({
    queryKey: ['collection-collaborators', collectionId],
    queryFn: () => api.get(`/collections/${collectionId}/collaborators`).then(r => r.data.data),
    enabled: !!collectionId,
  });

  const { data: contradictionSignals } = useQuery({
    queryKey: ['collection-contradictions', collectionId],
    queryFn: () => api.get(`/intel/collection/${collectionId}/contradictions`).then(r => r.data.data),
    enabled: !!collectionId && activeTab === 'synthesis',
  });

  const { data: comparisonRows } = useQuery({
    queryKey: ['collection-comparison', collectionId],
    queryFn: () => api.get(`/intel/collection/${collectionId}/method-benchmark-table`).then(r => r.data.data),
    enabled: !!collectionId && activeTab === 'synthesis',
  });

  const { data: latestProposal } = useQuery({
    queryKey: ['collection-proposal-latest', collectionId],
    queryFn: () => api.get(`/intel/collection/${collectionId}/proposal-latest`).then(r => r.data.data),
    enabled: !!collectionId && activeTab === 'synthesis',
  });

  const { data: allPapersRes } = useQuery({
    queryKey: ['papers-for-collection-picker'],
    queryFn: () => api.get('/papers', { params: { page: 1, limit: 100, sortBy: 'created_at' } }).then(r => r.data),
    enabled: canEdit,
  });

  const removePaper = useMutation({
    mutationFn: (paperId: string) => api.delete(`/collections/${collectionId}/papers/${paperId}`),
    onSuccess: () => {
      toast.success('Paper removed');
      qc.invalidateQueries({ queryKey: ['collection', id, token] });
      qc.invalidateQueries({ queryKey: ['collection-stats', collectionId] });
    },
  });

  const addPaper = useMutation({
    mutationFn: (paperId: string) => api.post(`/collections/${collectionId}/papers`, { paper_id: paperId }),
    onSuccess: () => {
      toast.success('Paper added to collection');
      qc.invalidateQueries({ queryKey: ['collection', id, token] });
      qc.invalidateQueries({ queryKey: ['collection-stats', collectionId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to add paper'),
  });

  const deleteCollection = useMutation({
    mutationFn: () => api.delete(`/collections/${collectionId}`),
    onSuccess: () => {
      toast.success('Collection deleted');
      qc.invalidateQueries({ queryKey: ['collections'] });
      navigate('/collections');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to delete collection'),
  });

  const addCollaborator = useMutation({
    mutationFn: () => api.post(`/collections/${collectionId}/collaborators`, { email: collaboratorEmail.trim(), role: collaboratorRole }),
    onSuccess: () => {
      toast.success('Collaborator added');
      setCollaboratorEmail('');
      qc.invalidateQueries({ queryKey: ['collection-collaborators', collectionId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to add collaborator'),
  });

  const removeCollaborator = useMutation({
    mutationFn: (collaboratorId: string) => api.delete(`/collections/${collectionId}/collaborators/${collaboratorId}`),
    onSuccess: () => {
      toast.success('Collaborator removed');
      qc.invalidateQueries({ queryKey: ['collection-collaborators', collectionId] });
    },
  });

  const toggleShare = useMutation({
    mutationFn: (enabled: boolean) => api.post(`/collections/${collectionId}/share-link`, { enabled }),
    onSuccess: () => {
      toast.success('Share settings updated');
      qc.invalidateQueries({ queryKey: ['collection', id, token] });
    },
  });

  const generateProposal = useMutation({
    mutationFn: () => api.post(`/intel/collection/${collectionId}/proposal`),
    onSuccess: () => {
      toast.success('Proposal draft generated');
      qc.invalidateQueries({ queryKey: ['collection-proposal-latest', collectionId] });
    },
    onError: () => toast.error('Failed to generate proposal draft'),
  });

  const exportCollection = async (format: 'json' | 'csv' | 'bibtex') => {
    try {
      const res = await api.post('/export', { collection_id: collectionId, format }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `collection_export.${format === 'bibtex' ? 'bib' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const copyShareLink = async () => {
    if (!data?.share_token) return;
    const fullUrl = `${window.location.origin}/collections/shared/${data.share_token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Share link copied');
    } catch {
      toast.error('Failed to copy share link');
    }
  };

  const papers = (Array.isArray(data?.papers) ? data.papers : []).filter((p: any) => p && typeof p === 'object');
  const allPapers = (Array.isArray(allPapersRes?.data) ? allPapersRes.data : []).filter((p: any) => p && typeof p === 'object');
  const safeContradictionSignals = (Array.isArray(contradictionSignals) ? contradictionSignals : []).filter((s: any) => s && typeof s === 'object');
  const safeComparisonRows = (Array.isArray(comparisonRows) ? comparisonRows : []).filter((r: any) => r && typeof r === 'object');
  const existingPaperIds = new Set(papers.map((p: any) => p.id).filter(Boolean));
  const candidatePapers = allPapers
    .filter((p: any) => p?.id && !existingPaperIds.has(p.id))
    .filter((p: any) => {
      if (!paperSearch.trim()) return true;
      const q = paperSearch.toLowerCase();
      const authors = parseAuthors(p.authors).join(' ').toLowerCase();
      return (p.title || '').toLowerCase().includes(q) || authors.includes(q);
    })
    .slice(0, 10);

  const synthesis = useMemo(() => {
    const fieldCounts: Record<string, number> = {};
    const venueCounts: Record<string, number> = {};
    const years: number[] = [];
    let methodArchitectureCount = 0;
    let methodDataSourceCount = 0;
    let metricEvidenceCount = 0;

    for (const p of papers) {
      const field = p.field || 'Uncategorized';
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;

      const venue = p.venue || 'Unknown Venue';
      venueCounts[venue] = (venueCounts[venue] || 0) + 1;

      if (p.publication_date) {
        const y = new Date(p.publication_date).getFullYear();
        if (!Number.isNaN(y)) years.push(y);
      }

      const methodology = p.methodology || {};
      if (methodology.architecture && String(methodology.architecture).trim()) methodArchitectureCount += 1;
      if (methodology.data_source && String(methodology.data_source).trim()) methodDataSourceCount += 1;

      const metrics = methodology.metrics || {};
      const hasMetric = Object.values(metrics).some(v => v !== null && v !== undefined && String(v).trim() !== '');
      if (hasMetric) metricEvidenceCount += 1;
    }

    const total = papers.length;
    const topFields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topVenues = Object.entries(venueCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const keywords = pickTopKeywords(papers);

    const minYear = years.length ? Math.min(...years) : null;
    const maxYear = years.length ? Math.max(...years) : null;

    const lowerCorpus = papers.map((p: any) => `${p.title || ''} ${p.abstract || ''}`.toLowerCase());
    const conflictPairs = [
      ['increase', 'decrease'],
      ['improves', 'worsens'],
      ['efficient', 'expensive'],
      ['robust', 'fragile'],
      ['generalize', 'overfit'],
    ];

    const tensions = conflictPairs
      .map(([a, b]) => {
        const countA = lowerCorpus.filter(t => t.includes(a)).length;
        const countB = lowerCorpus.filter(t => t.includes(b)).length;
        return { a, b, countA, countB, score: Math.min(countA, countB) };
      })
      .filter(t => t.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);

    return {
      total,
      topFields,
      topVenues,
      keywords,
      minYear,
      maxYear,
      methodArchitectureCount,
      methodDataSourceCount,
      metricEvidenceCount,
      tensions,
    };
  }, [papers]);

  if (isLoading) return <div className="page flex justify-center p-8"><div className="w-8 h-8 border-4 border-t-[#3b82f6] rounded-full animate-spin" /></div>;

  if (error) {
    return (
      <div className="min-h-screen bg-transparent p-12 lg:p-20 max-w-[1600px] fade-in relative">
        <button className="font-label text-[10px] uppercase tracking-widest text-[#86736e] hover:text-[#1d1c17] mb-8 flex items-center gap-2 border-none bg-transparent cursor-pointer" onClick={() => navigate('/collections')}>
          <ArrowLeft size={14} /> Back to Library
        </button>
        <div className="bg-[#f8f3eb] border border-[#d9c1bc]/40 rounded-sm p-10">
          <h2 className="font-headline text-3xl text-[#1d1c17] mb-3">Could not open this collection</h2>
          <p className="font-serif text-[#86736e] mb-6">Try refreshing once. If this keeps happening, the collection data may be malformed and needs repair.</p>
          <button
            className="px-6 py-3 rounded-sm text-[10px] font-label uppercase tracking-widest bg-[#713324] text-white hover:bg-[#8e4a39]"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-12 lg:p-20 max-w-[1600px] fade-in relative">
      <button className="font-label text-[10px] uppercase tracking-widest text-[#86736e] hover:text-[#1d1c17] mb-8 flex items-center gap-2 border-none bg-transparent cursor-pointer" onClick={() => navigate('/collections')}>
        <ArrowLeft size={14} /> Back to Library
      </button>

      <div className="relative p-12 rounded-xl mb-16 overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0 opacity-90"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply z-0 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-3 opacity-90 mb-4">
              <span className="w-8 h-px bg-[#e3d7b8]"></span>
              <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[#e3d7b8] font-bold">Volume Details</span>
            </div>
            <h1 className="text-5xl font-headline font-light tracking-tight text-white/95">{data?.name}</h1>
            {data?.description && <p className="font-serif italic text-white/70 mt-4 max-w-2xl">{data.description}</p>}
          </div>
          <div className="flex gap-2">
             {canManageSharing && (
               <button
                 onClick={() => {
                   if (confirm(`Delete collection "${data?.name}"? This cannot be undone.`)) {
                     deleteCollection.mutate();
                   }
                 }}
                 className="px-6 py-3 border border-red-300 rounded-sm text-[10px] font-label uppercase tracking-widest transition-all backdrop-blur-md text-red-100 hover:bg-red-500/20"
                 disabled={deleteCollection.isPending}
               >
                 {deleteCollection.isPending ? 'Deleting...' : 'Delete Volume'}
               </button>
             )}
             <button onClick={() => setActiveTab('papers')} className={`px-6 py-3 border border-white/20 rounded-sm text-[10px] font-label uppercase tracking-widest transition-all backdrop-blur-md ${activeTab==='papers' ? 'bg-white text-[#092c45]' : 'bg-transparent text-white/70 hover:bg-white/10'}`}>Manuscripts</button>
             <button onClick={() => setActiveTab('synthesis')} className={`px-6 py-3 border border-white/20 rounded-sm text-[10px] font-label uppercase tracking-widest transition-all backdrop-blur-md ${activeTab==='synthesis' ? 'bg-white text-[#092c45]' : 'bg-transparent text-white/70 hover:bg-white/10'}`}>Synthesis</button>
             <button onClick={() => setActiveTab('export')} className={`px-6 py-3 border border-white/20 rounded-sm text-[10px] font-label uppercase tracking-widest transition-all backdrop-blur-md ${activeTab==='export' ? 'bg-white text-[#092c45]' : 'bg-transparent text-white/70 hover:bg-white/10'}`}>Export</button>
          </div>
        </div>
      </div>

      {activeTab === 'papers' && (
        <>
          {canEdit && (
            <div className="mb-10 bg-[#f8f3eb] border border-[#d9c1bc]/40 p-6 rounded-sm">
              <h5 className="font-headline font-light text-2xl text-[#1d1c17] mb-3">Add Papers To This Collection</h5>
              <p className="font-serif text-sm text-[#86736e] mb-4">Search your archive and add papers directly from this page.</p>
              <input
                className="w-full bg-white border border-[#d9c1bc]/60 px-4 py-3 rounded-sm text-sm outline-none focus:border-[#2a697b]"
                placeholder="Search by title or author"
                value={paperSearch}
                onChange={e => setPaperSearch(e.target.value)}
              />
              <div className="mt-4 space-y-2">
                {candidatePapers.length === 0 ? (
                  <p className="text-sm font-serif text-[#86736e] italic">No matching papers available to add.</p>
                ) : (
                  candidatePapers.map((p: any) => {
                    const candidateAuthors = parseAuthors(p.authors);
                    return (
                      <div key={p.id} className="flex items-center justify-between bg-white border border-[#d9c1bc]/40 rounded-sm px-4 py-3 gap-4">
                        <div>
                          <p className="text-sm font-serif text-[#1d1c17]">{p.title}</p>
                          <p className="text-[10px] font-label uppercase tracking-widest text-[#86736e]">{candidateAuthors.join(', ') || 'Unknown author'}</p>
                        </div>
                        <button
                          className="px-4 py-2 rounded-sm text-[10px] font-label uppercase tracking-widest bg-[#713324] text-white hover:bg-[#8e4a39] disabled:opacity-40"
                          onClick={() => addPaper.mutate(p.id)}
                          disabled={addPaper.isPending}
                        >
                          Add
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-[#e3d7b8]/10 p-6 border border-[#d9c1bc]/40 rounded-sm shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/20 via-[#2a697b]/5 to-transparent z-0"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#fef9f1] border border-[#d9c1bc]/40 flex items-center justify-center text-[#2a697b] shadow-sm"><BookOpen size={20} /></div>
                  <div><p className="text-2xl font-headline text-[#1d1c17]">{stats.paper_count}</p><p className="text-[10px] font-label uppercase tracking-widest text-[#86736e]">Total Records</p></div>
                </div>
              </div>
              <div className="bg-[#e3d7b8]/10 p-6 border border-[#d9c1bc]/40 rounded-sm shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/20 via-[#2a697b]/5 to-transparent z-0"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#fef9f1] border border-[#d9c1bc]/40 flex items-center justify-center text-[#2a697b] shadow-sm"><Compass size={20} /></div>
                  <div><p className="text-2xl font-headline text-[#1d1c17]">{stats.field_count}</p><p className="text-[10px] font-label uppercase tracking-widest text-[#86736e]">Scientific Fields</p></div>
                </div>
              </div>
              <div className="bg-[#e3d7b8]/10 p-6 border border-[#d9c1bc]/40 rounded-sm shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/20 via-[#2a697b]/5 to-transparent z-0"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#fef9f1] border border-[#d9c1bc]/40 flex items-center justify-center text-[#2a697b] shadow-sm"><span className="material-symbols-outlined">group</span></div>
                  <div><p className="text-2xl font-headline text-[#1d1c17]">{stats.author_count}</p><p className="text-[10px] font-label uppercase tracking-widest text-[#86736e]">Contributors</p></div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {papers.length === 0 ? (
              <div className="p-16 border-2 border-dashed border-[#d9c1bc]/40 rounded-sm text-center bg-[#fef9f1]">
                <p className="font-serif italic text-xl text-[#86736e] mb-4">The volume is currently empty.</p>
                <button className="bg-[#713324] text-white px-6 py-4 rounded-sm text-[10px] font-label uppercase tracking-widest shadow-md hover:bg-[#8e4a39] transition-colors" onClick={() => navigate('/papers')}>Acquire Manuscripts</button>
              </div>
            ) : (
              papers.map((p: any) => {
                const authors = parseAuthors(p.authors);
                const contributorLabel = p.added_by_name || p.added_by_email || 'Unknown contributor';
                return (
                  <div key={p.id} className="group bg-[#f8f3eb] border border-[#d9c1bc]/40 p-6 rounded-sm hover:border-[#2a697b] transition-all cursor-pointer relative" onClick={() => navigate(`/papers/${p.id}`)}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-headline font-light text-[#1d1c17] group-hover:text-[#2a697b] transition-colors leading-tight mb-2">{p.title}</h4>
                        <div className="flex items-center gap-3 font-label text-[9px] text-[#86736e] uppercase tracking-widest">
                          {p.field && <span className="text-[#2a697b] font-bold tracking-[0.3em]">{p.field}</span>}
                          <span>•</span>
                          <span>{authors.join(', ') || 'Unknown author'}</span>
                          {p.venue && <span>• {p.venue}</span>}
                        </div>
                        <p className="mt-2 text-[10px] font-label uppercase tracking-widest text-[#86736e]">
                          Added by {contributorLabel}{p.added_at ? ` on ${new Date(p.added_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      {canEdit && (
                        <button className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded transition-all" onClick={e => { e.stopPropagation(); removePaper.mutate(p.id); }}>
                        <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'synthesis' && (
        <div className="space-y-10 max-w-6xl">
          <div className="p-8 border border-white/20 rounded-md relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0 opacity-90"></div>
            <div className="relative z-10">
              <h4 className="font-label text-xs uppercase tracking-[0.4em] text-[#e3d7b8] font-bold mb-4 flex items-center gap-3">
                <Zap size={16} className="text-[#e3d7b8]" /> Dynamic Collection Synthesis
              </h4>
              <p className="font-serif italic text-lg text-white/90 leading-relaxed">
                {synthesis.total > 0
                  ? `This volume currently holds ${synthesis.total} papers across ${synthesis.topFields.length} field clusters${synthesis.minYear && synthesis.maxYear ? ` (${synthesis.minYear}–${synthesis.maxYear})` : ''}.`
                  : 'Add papers to generate synthesis signals for this collection.'}
              </p>
            </div>
          </div>

          {synthesis.total === 0 ? (
            <div className="p-12 border border-dashed border-[#d9c1bc]/60 bg-[#fef9f1] rounded-sm text-center">
              <p className="font-serif text-[#86736e] italic mb-4">No synthesis available yet for an empty collection.</p>
              <button className="bg-[#713324] text-white px-6 py-3 rounded-sm text-[10px] font-label uppercase tracking-widest" onClick={() => navigate('/papers')}>
                Add Papers To Start Analysis
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e] mb-3">Field Coverage</p>
                  <div className="space-y-3">
                    {synthesis.topFields.slice(0, 3).map(([field, count]) => (
                      <div key={field}>
                        <div className="flex justify-between text-[10px] font-label uppercase tracking-widest text-[#1d1c17] mb-1">
                          <span>{field}</span>
                          <span>{count}</span>
                        </div>
                        <div className="h-1.5 bg-[#d9c1bc]/40 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2a697b] rounded-full" style={{ width: `${Math.max(8, (count / synthesis.total) * 100)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e] mb-3">Method Evidence</p>
                  <div className="space-y-2 font-serif text-sm text-[#1d1c17]">
                    <p>Architecture documented: <span className="text-[#2a697b] font-bold">{synthesis.methodArchitectureCount}/{synthesis.total}</span></p>
                    <p>Data source documented: <span className="text-[#2a697b] font-bold">{synthesis.methodDataSourceCount}/{synthesis.total}</span></p>
                    <p>Reported metrics captured: <span className="text-[#2a697b] font-bold">{synthesis.metricEvidenceCount}/{synthesis.total}</span></p>
                  </div>
                </div>

                <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e] mb-3">Venue Concentration</p>
                  <div className="space-y-2">
                    {synthesis.topVenues.length > 0 ? synthesis.topVenues.map(([venue, count]) => (
                      <div key={venue} className="flex justify-between text-[11px] font-serif text-[#1d1c17]">
                        <span className="truncate pr-2">{venue}</span>
                        <span className="font-label text-[9px] uppercase tracking-widest text-[#86736e]">{count}</span>
                      </div>
                    )) : <p className="font-serif italic text-[#86736e] text-sm">No venue metadata detected.</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e] mb-4">Recurring Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {synthesis.keywords.length > 0 ? synthesis.keywords.map(k => (
                      <button
                        key={k.word}
                        className="px-3 py-1.5 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm text-[10px] font-label uppercase tracking-widest text-[#2a697b] hover:border-[#2a697b]"
                        onClick={() => navigate(`/search?q=${encodeURIComponent(k.word)}`)}
                      >
                        {k.word} ({k.count})
                      </button>
                    )) : <p className="font-serif italic text-[#86736e] text-sm">Not enough text to extract themes.</p>}
                  </div>
                </div>

                <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e] mb-4">Tension Signals</p>
                  <div className="space-y-3">
                    {synthesis.tensions.length > 0 ? synthesis.tensions.map(t => (
                      <div key={`${t.a}-${t.b}`} className="p-3 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm">
                        <p className="font-serif text-[#1d1c17]">
                          Mixed usage detected: <span className="text-[#2a697b]">"{t.a}"</span> ({t.countA}) vs <span className="text-[#713324]">"{t.b}"</span> ({t.countB})
                        </p>
                      </div>
                    )) : (
                      <p className="font-serif italic text-[#86736e] text-sm">No explicit contradictory language signals found yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e]">Contradiction Engine Signals</p>
                  <span className="text-[9px] font-label uppercase tracking-widest text-[#2a697b]">Evidence-linked</span>
                </div>
                {safeContradictionSignals.length === 0 ? (
                  <p className="font-serif italic text-[#86736e] text-sm">No high-confidence contradiction pairs detected yet for this collection.</p>
                ) : (
                  <div className="space-y-3">
                    {safeContradictionSignals.slice(0, 6).map((sig: any, idx: number) => (
                      <div key={`${sig.paper_a?.id}-${sig.paper_b?.id}-${idx}`} className="p-4 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-label uppercase tracking-widest text-[#2a697b]">Confidence {(sig.confidence * 100).toFixed(0)}%</p>
                          <div className="flex gap-2">
                            <button className="text-[9px] font-label uppercase tracking-widest text-[#86736e] hover:text-[#2a697b]" onClick={() => navigate(`/papers/${sig.paper_a?.id}`)}>Open A</button>
                            <button className="text-[9px] font-label uppercase tracking-widest text-[#86736e] hover:text-[#2a697b]" onClick={() => navigate(`/papers/${sig.paper_b?.id}`)}>Open B</button>
                          </div>
                        </div>
                        <p className="font-serif text-sm text-[#1d1c17] mb-1">{sig.paper_a?.title}</p>
                        <p className="font-serif text-sm text-[#1d1c17] mb-2">{sig.paper_b?.title}</p>
                        <p className="text-xs text-[#86736e]">Shared terms: {(sig.shared_terms || []).join(', ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6 overflow-hidden">
                <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e] mb-4">Methods & Benchmark Comparison</p>
                {safeComparisonRows.length === 0 ? (
                  <p className="font-serif italic text-[#86736e] text-sm">No comparison rows available yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1100px] w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#d9c1bc]/60">
                          {['Paper', 'Task', 'Dataset', 'Metrics', 'Model Family', 'Compute', 'Limitations', 'Failure Modes'].map((h) => (
                            <th key={h} className="py-2 pr-4 text-[9px] font-label uppercase tracking-widest text-[#86736e]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {safeComparisonRows.slice(0, 20).map((row: any) => (
                          <tr key={row.paper_id} className="border-b border-[#d9c1bc]/30 align-top">
                            <td className="py-3 pr-4 text-sm font-serif text-[#1d1c17] max-w-[260px]">
                              <button className="text-left hover:text-[#2a697b]" onClick={() => navigate(`/papers/${row.paper_id}`)}>{row.title}</button>
                            </td>
                            <td className="py-3 pr-4 text-xs text-[#1d1c17]">{row.task}</td>
                            <td className="py-3 pr-4 text-xs text-[#1d1c17]">{row.dataset}</td>
                            <td className="py-3 pr-4 text-xs text-[#1d1c17]">{row.metrics}</td>
                            <td className="py-3 pr-4 text-xs text-[#1d1c17]">{row.model_family}</td>
                            <td className="py-3 pr-4 text-xs text-[#1d1c17]">{row.compute_budget}</td>
                            <td className="py-3 pr-4 text-xs text-[#1d1c17]">{row.limitations}</td>
                            <td className="py-3 pr-4 text-xs text-[#1d1c17]">{row.failure_modes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-[#f8f3eb] border border-[#d9c1bc]/50 rounded-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e]">Collection-to-Proposal Generator</p>
                  <button
                    className="px-4 py-2 rounded-sm text-[10px] font-label uppercase tracking-widest bg-[#713324] text-white hover:bg-[#8e4a39] disabled:opacity-40"
                    onClick={() => generateProposal.mutate()}
                    disabled={generateProposal.isPending}
                  >
                    {generateProposal.isPending ? 'Generating...' : 'Generate Proposal Draft'}
                  </button>
                </div>
                {!latestProposal ? (
                  <p className="font-serif italic text-[#86736e] text-sm">No draft generated yet for this collection.</p>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-headline font-light text-2xl text-[#1d1c17]">{latestProposal.title}</h4>
                    <div className="space-y-3 text-sm text-[#1d1c17]">
                      <div><p className="font-label text-[9px] uppercase tracking-widest text-[#86736e] mb-1">Motivation</p><p className="font-serif leading-relaxed">{latestProposal.motivation}</p></div>
                      <div><p className="font-label text-[9px] uppercase tracking-widest text-[#86736e] mb-1">Prior Work</p><p className="font-serif leading-relaxed">{latestProposal.prior_work}</p></div>
                      <div><p className="font-label text-[9px] uppercase tracking-widest text-[#86736e] mb-1">Hypotheses</p><p className="font-serif leading-relaxed">{latestProposal.hypotheses}</p></div>
                      <div><p className="font-label text-[9px] uppercase tracking-widest text-[#86736e] mb-1">Methodology Sketch</p><p className="font-serif leading-relaxed">{latestProposal.methodology_sketch}</p></div>
                      <div><p className="font-label text-[9px] uppercase tracking-widest text-[#86736e] mb-1">Expected Contributions</p><p className="font-serif leading-relaxed">{latestProposal.expected_contributions}</p></div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-10">
          <div className="bg-[#f8f3eb] border border-[#d9c1bc]/40 p-6 rounded-sm">
            <h5 className="font-headline font-light text-2xl text-[#1d1c17] mb-4">Sharing & Collaborators</h5>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className={`px-4 py-2 rounded-sm text-[10px] font-label uppercase tracking-widest border ${data?.share_enabled ? 'bg-[#2a697b] text-white border-[#2a697b]' : 'bg-white text-[#2a697b] border-[#d9c1bc]/60'}`}
                  onClick={() => toggleShare.mutate(!data?.share_enabled)}
                  disabled={!canManageSharing || toggleShare.isPending}
                >
                  {data?.share_enabled ? 'Disable Share Link' : 'Enable Share Link'}
                </button>
                {data?.share_enabled && data?.share_token && (
                  <button
                    className="px-4 py-2 rounded-sm text-[10px] font-label uppercase tracking-widest border border-[#d9c1bc]/60 bg-white text-[#1d1c17] hover:border-[#2a697b]"
                    onClick={copyShareLink}
                  >
                    Copy Share Link
                  </button>
                )}
              </div>

              {data?.share_enabled && data?.share_token && (
                <p className="font-mono text-xs text-[#86736e] break-all">{`${window.location.origin}/collections/shared/${data.share_token}`}</p>
              )}

              <div className="h-px bg-[#d9c1bc]/40 my-4"></div>

              {canManageSharing ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <input
                      className="flex-1 min-w-[220px] bg-white border border-[#d9c1bc]/60 px-4 py-3 rounded-sm text-sm outline-none focus:border-[#2a697b]"
                      placeholder="Collaborator email"
                      value={collaboratorEmail}
                      onChange={e => setCollaboratorEmail(e.target.value)}
                    />
                    <select
                      className="bg-white border border-[#d9c1bc]/60 px-3 py-3 rounded-sm text-xs font-label uppercase tracking-widest text-[#1d1c17]"
                      value={collaboratorRole}
                      onChange={e => setCollaboratorRole(e.target.value as 'editor' | 'viewer')}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      className="px-5 py-3 rounded-sm text-[10px] font-label uppercase tracking-widest bg-[#713324] text-white hover:bg-[#8e4a39]"
                      onClick={() => addCollaborator.mutate()}
                      disabled={!collaboratorEmail.trim() || addCollaborator.isPending}
                    >
                      Add Collaborator
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-serif text-[#86736e] italic">Only collection owner can manage collaborators.</p>
              )}

              <div className="space-y-2">
                {(Array.isArray(collaborators) ? collaborators : []).length === 0 ? (
                  <p className="text-sm font-serif text-[#86736e] italic">No collaborators added yet.</p>
                ) : (
                  (Array.isArray(collaborators) ? collaborators : []).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between bg-white border border-[#d9c1bc]/40 rounded-sm px-4 py-3">
                      <div>
                        <p className="text-sm font-serif text-[#1d1c17]">{c.name || c.email}</p>
                        <p className="text-[10px] font-label uppercase tracking-widest text-[#86736e]">{c.email} · {c.role}</p>
                      </div>
                      {canManageSharing && (
                        <button
                          className="text-[10px] font-label uppercase tracking-widest text-red-600"
                          onClick={() => removeCollaborator.mutate(c.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-[#f8f3eb] border border-[#d9c1bc]/40 p-8 rounded-sm text-center hover:border-[#2a697b] transition-all group cursor-pointer relative overflow-hidden" onClick={() => exportCollection('bibtex')}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                 <div className="w-16 h-16 bg-[#fef9f1] border border-[#d9c1bc]/40 rounded-full flex items-center justify-center text-[#2a697b] mx-auto mb-6 group-hover:bg-[#e3d7b8]/20 transition-colors"><FileCode size={32} /></div>
                 <h5 className="font-headline font-light text-xl text-[#1d1c17] mb-2">BibTeX Entry</h5>
                 <p className="text-[10px] font-label uppercase tracking-widest text-[#86736e] mb-6">Perfect for Overleaf & LaTeX</p>
                 <button className="w-full py-3 bg-[#1d1c17] text-white text-[9px] font-label uppercase tracking-widest rounded-sm group-hover:bg-[#2a697b] transition-all font-bold">Download .bib</button>
              </div>
           </div>
           <div className="bg-[#f8f3eb] border border-[#d9c1bc]/40 p-8 rounded-sm text-center hover:border-[#2a697b] transition-all group cursor-pointer relative overflow-hidden" onClick={() => exportCollection('csv')}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                 <div className="w-16 h-16 bg-[#fef9f1] border border-[#d9c1bc]/40 rounded-full flex items-center justify-center text-[#2a697b] mx-auto mb-6 group-hover:bg-[#e3d7b8]/20 transition-colors"><span className="material-symbols-outlined text-[32px]">table_view</span></div>
                 <h5 className="font-headline font-light text-xl text-[#1d1c17] mb-2">CSV Matrix</h5>
                 <p className="text-[10px] font-label uppercase tracking-widest text-[#86736e] mb-6">Analyze papers in Excel</p>
                 <button className="w-full py-3 bg-[#1d1c17] text-white text-[9px] font-label uppercase tracking-widest rounded-sm group-hover:bg-[#2a697b] transition-all font-bold">Download .csv</button>
              </div>
           </div>
           <div className="bg-[#f8f3eb] border border-[#d9c1bc]/40 p-8 rounded-sm text-center hover:border-[#2a697b] transition-all group cursor-pointer relative overflow-hidden" onClick={() => exportCollection('json')}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                 <div className="w-16 h-16 bg-[#fef9f1] border border-[#d9c1bc]/40 rounded-full flex items-center justify-center text-[#2a697b] mx-auto mb-6 group-hover:bg-[#e3d7b8]/20 transition-colors"><span className="material-symbols-outlined text-[32px]">data_object</span></div>
                 <h5 className="font-headline font-light text-xl text-[#1d1c17] mb-2">Digital Archive</h5>
                 <p className="text-[10px] font-label uppercase tracking-widest text-[#86736e] mb-6">Full data for local hosting</p>
                 <button className="w-full py-3 bg-[#1d1c17] text-white text-[9px] font-label uppercase tracking-widest rounded-sm group-hover:bg-[#2a697b] transition-all font-bold">Download .json</button>
              </div>
           </div>
          </div>
        </div>
      )}
    </div>
  );
}
