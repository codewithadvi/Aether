import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';


const CATEGORIES = ['general','novel_methodology','surprising_result','contradicts_prior_work','practical_application','future_work','limitation'];
const CAT_LABELS: Record<string, string> = {
  general: 'General', novel_methodology: 'Novel Methodology', surprising_result: 'Surprising!',
  contradicts_prior_work: 'Contradicts Prior Work', practical_application: 'Practical',
  future_work: 'Future Work', limitation: 'Limitation',
};

function VisualCitationGraph({ snowball, onOpenPaper }: { snowball: any; onOpenPaper: (p: any) => void }) {
  if (!snowball) return null;
  const citations = (snowball.citations || []).slice(0, 5);
  const references = (snowball.references || []).slice(0, 5);

  return (
    <div className="relative w-full h-[400px] bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-2xl overflow-hidden mb-12 shadow-sm group duration-500">
       <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `radial-gradient(#2a697b 1px, transparent 1px)`, backgroundSize: '30px 30px' }}></div>
       
       <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Lines to citations */}
          {citations.map((_: any, i: number) => (
             <line key={`c-${i}`} x1="50%" y1="50%" x2={`${75 + Math.cos(i) * 15}%`} y2={`${50 + Math.sin(i) * 30}%`} stroke="#2a697b" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          ))}
          {/* Lines to references */}
          {references.map((_: any, i: number) => (
             <line key={`r-${i}`} x1="50%" y1="50%" x2={`${25 + Math.cos(i) * 15}%`} y2={`${50 + Math.sin(i) * 30}%`} stroke="#86736e" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          ))}
       </svg>

       {/* Central Paper Node */}
       <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-16 h-16 bg-[#1d1c17] text-[#fef9f1] rounded-full flex items-center justify-center shadow-lg border border-[#d9c1bc] animate-pulse">
             <span className="material-symbols-outlined">auto_stories</span>
          </div>
          <div className="absolute top-18 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-label font-bold uppercase tracking-widest text-[#1d1c17] bg-[#fef9f1] px-2 py-1 rounded-sm shadow-sm border border-[#d9c1bc]/40">
             Source Node
          </div>
       </div>

       {/* Citations (Forward) */}
       {citations.map((c: any, i: number) => (
          <div
            key={c.paperId}
            className="absolute z-10 cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${75 + Math.cos(i) * 15}%`, top: `${50 + Math.sin(i) * 30}%` }}
            onClick={() => onOpenPaper(c)}
          >
             <div className="w-8 h-8 bg-[#fef9f1] border border-[#2a697b] rounded-full flex items-center justify-center shadow-sm" title={c.title}>
                <span className="material-symbols-outlined text-xs text-[#2a697b]">arrow_upward</span>
             </div>
             <div className="hidden group-hover:block absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 p-2 bg-[#fef9f1] border border-[#d9c1bc]/60 text-[#1d1c17] text-[9px] font-serif leading-tight rounded-sm shadow-lg max-h-24 overflow-hidden z-50">
                {c.title}
             </div>
          </div>
       ))}

       {/* References (Backward) */}
       {references.map((r: any, i: number) => (
          <div
            key={r.paperId}
            className="absolute z-10 cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${25 + Math.cos(i) * 15}%`, top: `${50 + Math.sin(i) * 30}%` }}
            onClick={() => onOpenPaper(r)}
          >
             <div className="w-8 h-8 bg-[#fef9f1] border border-[#86736e] rounded-full flex items-center justify-center shadow-sm" title={r.title}>
                <span className="material-symbols-outlined text-xs text-[#86736e]">history</span>
             </div>
             <div className="hidden group-hover:block absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 p-2 bg-[#fef9f1] border border-[#d9c1bc]/60 text-[#1d1c17] text-[9px] font-serif leading-tight rounded-sm shadow-lg max-h-24 overflow-hidden z-50">
                {r.title}
             </div>
          </div>
       ))}

       <div className="absolute bottom-6 left-6 flex gap-4 bg-[#fef9f1]/80 p-3 rounded-sm backdrop-blur-sm border border-[#d9c1bc]/40">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-[#2a697b]"></div>
             <span className="text-[9px] font-label uppercase tracking-widest text-[#1d1c17] font-bold">Citations</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-[#86736e]"></div>
             <span className="text-[9px] font-label uppercase tracking-widest text-[#1d1c17] font-bold">References</span>
          </div>
       </div>

       <div className="absolute top-6 right-6">
          <div className="p-3 bg-[#fef9f1]/90 backdrop-blur-sm border border-[#d9c1bc]/60 rounded-sm text-center min-w-[80px] shadow-sm">
             <p className="text-xl font-headline text-[#1d1c17]">{snowball.citations?.length || 0}</p>
             <p className="text-[8px] font-label uppercase font-bold text-[#86736e] tracking-widest">Network Degree</p>
          </div>
       </div>
    </div>
  );
}

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview'|'notes'|'annotations'|'insights'|'connections'|'citations'|'snowball'|'recommended'|'methodology'>('overview');
  const [noteText, setNoteText] = useState('');
  const [insightText, setInsightText] = useState('');
  const [insightCat, setInsightCat] = useState('general');
  const [editMethodology, setEditMethodology] = useState(false);
  const [methodologyForm, setMethodologyForm] = useState<any>(null);
  const [annotationQuote, setAnnotationQuote] = useState('');
  const [annotationNote, setAnnotationNote] = useState('');
  const [annotationPage, setAnnotationPage] = useState('');

   const normalizeDoi = (rawDoi?: string) => {
      if (!rawDoi) return '';
      return rawDoi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim();
   };

   const getExternalPaperLink = (entry: any) => {
      const rawDoi = entry?.externalIds?.DOI || entry?.doi;
      const cleanDoi = normalizeDoi(rawDoi);
      if (cleanDoi) return `https://doi.org/${cleanDoi}`;
      if (entry?.url) return entry.url;
      if (entry?.paperId) return `https://www.semanticscholar.org/paper/${entry.paperId}`;
      return null;
   };

   const openExternalPaper = (entry: any) => {
      const link = getExternalPaperLink(entry);
      if (link) {
         window.open(link, '_blank', 'noopener,noreferrer');
         return;
      }
      if (entry?.title) {
         navigate(`/search?q=${encodeURIComponent(entry.title)}`);
         return;
      }
      toast.error('No external source link found for this paper.');
   };

  const { data: paper, isLoading } = useQuery({
    queryKey: ['paper', id],
    queryFn: () => api.get(`/papers/${id}`).then(r => r.data.data),
  });

  const { data: connections } = useQuery({
    queryKey: ['connections', id],
    queryFn: () => api.get(`/papers/${id}/connections`).then(r => r.data.data),
    enabled: activeTab === 'connections',
  });

  const { data: citations } = useQuery({
    queryKey: ['citations', id],
    queryFn: () => api.get(`/papers/${id}/citations`).then(r => r.data.data),
    enabled: activeTab === 'citations',
  });

  const { data: snowball } = useQuery({
    queryKey: ['snowball', paper?.id],
    queryFn: () => {
       const cleanDoi = paper.doi ? paper.doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim() : null;
       const ssId = paper.external_id || (cleanDoi ? `DOI:${cleanDoi}` : null);
       if (!ssId) throw new Error('No S2 ID available');
       return api.get(`/semantic-scholar/citations/${encodeURIComponent(ssId)}`).then(r => r.data.data);
    },
    enabled: activeTab === 'snowball' && !!paper && (!!paper.external_id || !!paper.doi),
  });

  const { data: recommended } = useQuery({
    queryKey: ['recommended', paper?.id],
    queryFn: () => {
       const cleanDoi = paper.doi ? paper.doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim() : null;
       const ssId = paper.external_id || (cleanDoi ? `DOI:${cleanDoi}` : null);
       if (!ssId) return [];
       return api.post(`/semantic-scholar/recommendations`, { paperIds: [ssId], limit: 8 }).then(r => r.data.data);
    },
    enabled: activeTab === 'recommended' && !!paper && (!!paper.external_id || !!paper.doi),
  });

  const { data: annotationsData } = useQuery({
    queryKey: ['paper-annotations', id],
    queryFn: () => api.get(`/intel/paper/${id}/annotations`).then(r => r.data.data),
    enabled: activeTab === 'annotations',
  });

  const { data: reproducibility } = useQuery({
    queryKey: ['paper-reproducibility', id],
    queryFn: () => api.get(`/intel/paper/${id}/reproducibility`).then(r => r.data.data),
    enabled: !!id,
  });

  const addNote = useMutation({
    mutationFn: () => api.post(`/notes/papers/${id}/notes`, { content: noteText }),
    onSuccess: () => { toast.success('Note saved'); setNoteText(''); qc.invalidateQueries({ queryKey: ['paper', id] }); },
    onError: () => toast.error('Failed to save note'),
  });

  const deleteNote = useMutation({
    mutationFn: (nid: string) => api.delete(`/notes/${nid}`),
    onSuccess: () => { toast.success('Note deleted'); qc.invalidateQueries({ queryKey: ['paper', id] }); },
  });

  const addInsight = useMutation({
    mutationFn: () => api.post(`/insights/papers/${id}/insights`, { content: insightText, category: insightCat }),
    onSuccess: () => { toast.success('Insight captured! ✨'); setInsightText(''); qc.invalidateQueries({ queryKey: ['paper', id] }); },
    onError: () => toast.error('Failed to save insight'),
  });

  const deleteInsight = useMutation({
    mutationFn: (insId: string) => api.delete(`/insights/${insId}`),
    onSuccess: () => { toast.success('Insight deleted'); qc.invalidateQueries({ queryKey: ['paper', id] }); },
  });

  const addAnnotation = useMutation({
    mutationFn: () => api.post(`/intel/paper/${id}/annotations`, {
      annotation_type: 'highlight',
      page_number: annotationPage ? Number(annotationPage) : null,
      quote_text: annotationQuote,
      note: annotationNote || null,
    }),
    onSuccess: () => {
      toast.success('Annotation saved');
      setAnnotationQuote('');
      setAnnotationNote('');
      setAnnotationPage('');
      qc.invalidateQueries({ queryKey: ['paper-annotations', id] });
    },
    onError: () => toast.error('Failed to save annotation'),
  });

  const deleteAnnotation = useMutation({
    mutationFn: (annotationId: string) => api.delete(`/intel/annotations/${annotationId}`),
    onSuccess: () => {
      toast.success('Annotation removed');
      qc.invalidateQueries({ queryKey: ['paper-annotations', id] });
    },
    onError: () => toast.error('Failed to remove annotation'),
  });

  const updateMethodology = useMutation({
    mutationFn: (methodology: any) => api.patch(`/papers/${id}`, { methodology }),
    onSuccess: () => { 
      toast.success('Archival Matrix Updated'); 
      setEditMethodology(false); 
      qc.invalidateQueries({ queryKey: ['paper', id] }); 
    },
    onError: () => toast.error('Failed to update archival matrix'),
  });

  const importMutation = useMutation({
    mutationFn: (r: any) => api.post('/papers', {
      doi: r.externalIds?.DOI || '',
      title: r.title,
      authors: r.authors ? r.authors.map((a: any) => a.name) : [],
      abstract: r.abstract || '',
      venue: r.venue || '',
      publication_date: r.year ? `${r.year}-01-01` : null,
      external_id: r.paperId,
    }),
    onSuccess: (res) => {
      toast.success('Manuscript successfully acquired!');
      qc.invalidateQueries({ queryKey: ['papers'] });
      navigate(`/papers/${res.data.data.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Archival sync failed.';
      if (err.response?.data?.error?.code === 'DUPLICATE_RESOURCE') {
        toast.error('This manuscript is already in your archive.');
      } else {
        toast.error(msg);
      }
    }
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-[3px] border-outline-variant border-t-[#3b82f6] rounded-full animate-spin" /></div>;
  if (!paper) return <div className="flex justify-center mt-20 font-serif italic text-outline">Journal entry not found.</div>;

  const authors = Array.isArray(paper.authors) ? paper.authors : JSON.parse(paper.authors || '[]');
  const notes = paper.notes || [];
  const insights = paper.insights || [];
  const annotations = annotationsData || [];
   const paperExternalLink = getExternalPaperLink(paper);
   const reportedMetrics = Object.entries(paper.methodology?.metrics || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');

   return (
      <div className="min-h-screen bg-transparent">
      <article className="max-w-7xl mx-auto px-8 md:px-12 py-16 relative fade-in">
      
      {/* Top Meta actions */}
      <button onClick={() => navigate('/papers')} className="font-label text-[10px] uppercase tracking-widest text-[#64748b] hover:text-[#3b82f6] transition-colors mb-12 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm" data-icon="arrow_left">arrow_left</span>
        Return to Archive
      </button>

      {/* Metadata Header */}
      <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-outline-variant/30 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-[#3b82f6] font-bold">
              {paper.field || 'Uncategorized'}
            </span>
            <span className="w-1 h-1 bg-[#cbd5e1] rounded-full"></span>
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary">
              {paper.publication_date ? format(new Date(paper.publication_date), 'yyyy') : 'Unknown Date'}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-light leading-tight tracking-tight text-[#1d1c17] transition-all duration-300">
            {paper.title}
          </h1>
          {authors.length > 0 && <p className="text-lg italic font-serif text-[#86736e] mt-4">by {authors.join(', ')}</p>}
        </div>
        <div className="flex flex-row items-center gap-6 shrink-0 pb-1">
          <div className="flex flex-col items-end">
            <span className="font-label text-[8px] uppercase tracking-widest opacity-60 text-[#86736e]">Citations</span>
            <span className="font-label text-xs tracking-tighter font-bold text-[#1d1c17]">{paper.citation_count || 0}</span>
          </div>
          <div className="h-8 w-px bg-[#d9c1bc]/40"></div>
          <div className="flex flex-col items-end">
            <span className="font-label text-[8px] uppercase tracking-widest opacity-60 text-[#86736e]">DOI</span>
            <span className="font-label text-xs tracking-tighter font-mono text-[#1d1c17]">{paper.doi || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-12">
            <div>
               {/* Horizontal Tabs */}
               <div className="flex gap-8 overflow-x-auto border-b border-[#d9c1bc]/40 pb-0 mb-10 no-scrollbar">
                 {(['overview','notes','annotations','insights','connections','citations','snowball','recommended','methodology'] as const).map(tab => (
                   <button 
                     key={tab} 
                     onClick={() => setActiveTab(tab)}
                     className={`pb-4 font-label text-[10px] uppercase tracking-[0.2em] transition-all relative ${
                       activeTab === tab ? 'text-[#2a697b] font-bold' : 'text-[#86736e] hover:text-[#1d1c17]'
                     }`}
                   >
                     {tab}
                     {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2a697b] rounded-full"></div>}
                   </button>
                 ))}
               </div>

               {/* Dynamic Tab Content */}
               <div className="min-h-[500px]">
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-[#e3d7b8]/20 border border-[#d9c1bc]/40 rounded-xl p-8 shadow-sm">
                          <h5 className="font-label text-[10px] uppercase tracking-widest text-[#2a697b] font-bold mb-4">Abstract Overview</h5>
                          <p className="text-sm font-serif leading-[1.9] text-[#1d1c17] italic">
                            {paper.abstract || 'The system was unable to localize a digitized abstract from external sources. Manual entry or PDF upload is recommended.'}
                          </p>
                        </div>

                        <div className="border border-[#d9c1bc]/40 p-8 rounded-xl bg-[#f8f3eb]">
                          <h6 className="font-label text-[10px] uppercase tracking-[0.3em] mb-4 text-[#86736e]">Reproducibility Card</h6>
                          {!reproducibility ? (
                            <p className="font-serif italic text-[#86736e] text-sm">Computing reproducibility signals...</p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-label text-[10px] uppercase tracking-widest text-[#1d1c17]">Score</span>
                                <span className="font-headline text-2xl text-[#2a697b]">{reproducibility.score}/100</span>
                              </div>
                              <div className="space-y-2 text-sm text-[#1d1c17] font-serif">
                                <p>Code available: <span className="text-[#2a697b] font-bold">{reproducibility.code_available ? 'Yes' : 'No'}</span></p>
                                <p>Dataset available: <span className="text-[#2a697b] font-bold">{reproducibility.data_available ? 'Yes' : 'No'}</span></p>
                                <p>Environment documented: <span className="text-[#2a697b] font-bold">{reproducibility.environment_documented ? 'Yes' : 'No'}</span></p>
                                <p>Checkpoints available: <span className="text-[#2a697b] font-bold">{reproducibility.checkpoints_available ? 'Yes' : 'No'}</span></p>
                              </div>
                              <div className="pt-3 border-t border-[#d9c1bc]/40">
                                <p className="font-label text-[9px] uppercase tracking-widest text-[#86736e] mb-2">Missing items</p>
                                {Array.isArray(reproducibility.missing_items) && reproducibility.missing_items.length > 0 ? (
                                  <ul className="space-y-1 text-sm text-[#86736e]">
                                    {reproducibility.missing_items.map((item: string) => <li key={item}>- {item}</li>)}
                                  </ul>
                                ) : <p className="text-sm text-[#2a697b] font-serif">No major missing reproducibility artifacts detected.</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="border border-[#d9c1bc]/40 p-8 rounded-xl pt-6 bg-[#f8f3eb]">
                          <h6 className="font-label text-[10px] uppercase tracking-[0.3em] mb-4 text-[#86736e]">Manuscript Log</h6>
                          <ul className="space-y-4 list-none text-[11px] font-label">
                            <div className="flex flex-col gap-1">
                              <span className="opacity-40 text-[9px] uppercase tracking-widest font-bold text-[#1d1c17]">Date Cataloged</span>
                              <span className="text-[#1d1c17] font-mono tracking-tight">{format(new Date(paper.created_at), 'MM/dd/yyyy HH:mm')}</span>
                            </div>
                            <div className="flex flex-col gap-1 pt-2">
                              <span className="opacity-40 text-[9px] uppercase tracking-widest font-bold text-[#1d1c17]">Status</span>
                              <span className="text-[#2a697b] font-bold uppercase tracking-widest">{paper.read_at ? `READ ${format(new Date(paper.read_at), 'MM/dd/yy')}` : 'UNREAD ARCHIVE'}</span>
                            </div>
                            {paper.venue && (
                              <div className="flex flex-col gap-1 pt-2">
                                <span className="opacity-40 text-[9px] uppercase tracking-widest font-bold text-[#1d1c17]">Published In</span>
                                <span className="text-[#1d1c17] leading-tight italic">{paper.venue}</span>
                              </div>
                            )}
                            {paper.doi && (
                              <div className="flex flex-col gap-1 pt-2">
                                <span className="opacity-40 text-[9px] uppercase tracking-widest font-bold text-[#1d1c17]">DOI</span>
                                <span className="text-[#1d1c17] font-mono break-all">{paper.doi}</span>
                              </div>
                            )}
                          </ul>
                        </div>

                        <div className="border border-[#d9c1bc]/40 p-8 rounded-xl bg-[#f8f3eb]">
                          <h6 className="font-label text-[10px] uppercase tracking-[0.3em] mb-4 text-[#86736e]">Quick Actions</h6>
                          <div className="space-y-3">
                            <button disabled={!paperExternalLink} onClick={() => paperExternalLink ? window.open(paperExternalLink, '_blank', 'noopener,noreferrer') : null} className={`w-full border ${paperExternalLink ? 'border-[#2a697b] text-[#2a697b] hover:bg-[#2a697b] hover:text-[#fef9f1]' : 'border-[#d9c1bc]/40 text-[#d9c1bc]'} p-4 text-[10px] font-label uppercase tracking-widest transition-all flex items-center justify-center gap-2 rounded bg-white shadow-sm font-bold`}>
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              Source Material
                            </button>
                            {paper.doi && (
                              <button onClick={() => window.open(`https://doi.org/${normalizeDoi(paper.doi)}`, '_blank', 'noopener,noreferrer')} className="w-full border border-[#d9c1bc]/40 hover:border-[#2a697b] p-4 text-[10px] font-label uppercase tracking-widest hover:text-[#2a697b] text-[#86736e] transition-all flex items-center justify-center gap-2 rounded bg-white shadow-sm font-bold">
                                <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                                Digital Record
                              </button>
                            )}
                            <button onClick={() => navigate(`/search?q=${encodeURIComponent(paper.title || '')}`)} className="w-full border border-[#d9c1bc]/40 hover:border-[#2a697b] p-4 text-[10px] font-label uppercase tracking-widest hover:text-[#2a697b] text-[#86736e] transition-all flex items-center justify-center gap-2 rounded bg-white shadow-sm font-bold">
                              <span className="material-symbols-outlined text-[16px]">manage_search</span>
                              Search Related Work
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'notes' && (
                     <div className="space-y-10">
                        <div className="flex flex-col gap-4">
                          <textarea
                            className="w-full bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-sm p-8 text-xl font-serif text-[#1d1c17] placeholder:text-[#86736e] focus:border-[#713324] outline-none shadow-sm transition-all min-h-[300px]"
                            placeholder="Expand your thoughts here..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                          />
                          <div className="flex justify-between items-center px-2">
                            <span className="font-label text-[9px] uppercase tracking-widest text-[#86736e] font-bold">Manual save required to commit to archive.</span>
                            <button className="bg-[#713324] text-white hover:bg-[#8e4a39] px-10 py-4 rounded-sm uppercase tracking-widest text-[10px] font-bold shadow-md transition-all disabled:opacity-30" disabled={!noteText.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
                              {addNote.isPending ? 'Syncing...' : 'Save Record'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-8 pt-8">
                          <h4 className="font-label text-[10px] uppercase tracking-[0.3em] font-bold text-[#2a697b]">Archived Marginalia ({notes.length})</h4>
                          <div className="grid grid-cols-1 gap-6">
                            {notes.map((note: any) => (
                              <div key={note.id} className="relative group bg-[#fef9f1] border border-[#d9c1bc]/60 p-6 rounded-sm transition-all hover:-translate-y-1 hover:shadow-sm">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2a697b] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="font-serif text-[#1d1c17] text-base leading-[1.8] whitespace-pre-wrap">
                                  {note.content}
                                </p>
                                <div className="mt-4 flex items-center justify-between pt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                  <span className="font-label text-[9px] uppercase tracking-[0.2em] text-[#86736e] font-bold">
                                    Recorded on {format(new Date(note.created_at), 'MMMM d, yyyy')}
                                  </span>
                                  <button onClick={() => deleteNote.mutate(note.id)} className="text-[#86736e] transition-colors hover:text-[#713324]">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'insights' && (
                     <div className="space-y-10">
                        <div className="flex flex-col gap-6 border border-[#d9c1bc]/40 bg-[#e3d7b8]/10 p-8 rounded-sm text-sm shadow-sm relative overflow-hidden">
                          <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_right,_#e3d7b8_0%,_transparent_60%)] opacity-30 pointer-events-none"></div>
                          <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 border border-[#d9c1bc]/60 rounded-full bg-[#fef9f1] flex items-center justify-center text-[#2a697b] shadow-sm">
                               <span className="material-symbols-outlined text-[18px]">psychology</span>
                            </div>
                            <h3 className="font-headline font-light text-2xl text-[#1d1c17] tracking-tight">Extract Critical Insight</h3>
                          </div>
                          
                          <textarea className="w-full bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm p-6 font-serif text-lg text-[#1d1c17] placeholder:text-[#86736e] focus:border-[#713324] outline-none transition-all relative z-10" rows={4} placeholder="Identify a surprising finding or methodology shift..." value={insightText} onChange={e => setInsightText(e.target.value)} />
                          
                          <div className="flex justify-between items-center gap-4 relative z-10">
                             <div className="flex items-center gap-4">
                                <span className="font-label text-[10px] uppercase text-[#86736e] font-bold tracking-widest">Category</span>
                                <select className="bg-[#fef9f1] border-b border-[#d9c1bc] text-[10px] font-label py-2 text-[#1d1c17] uppercase tracking-widest font-bold focus:outline-none focus:border-[#713324] cursor-pointer" value={insightCat} onChange={e => setInsightCat(e.target.value)}>
                                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                                </select>
                             </div>
                             <button className="bg-[#713324] text-white hover:bg-[#8e4a39] px-10 py-4 text-[10px] uppercase font-bold tracking-[0.2em] rounded-sm transition-all shadow-sm disabled:opacity-30" disabled={!insightText.trim() || addInsight.isPending} onClick={() => addInsight.mutate()}>
                               Capture Insight
                             </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                          {insights.map((ins: any) => (
                            <div key={ins.id} className="relative group p-8 bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-sm hover:shadow-sm transition-all hover:-translate-y-1">
                              <div className="flex justify-between items-start mb-6">
                                <span className="px-3 py-1 bg-[#fef9f1] border border-[#d9c1bc]/60 text-[9px] font-label uppercase tracking-[0.2em] text-[#2a697b] font-bold rounded-sm shadow-sm opacity-80">{CAT_LABELS[ins.category]}</span>
                                <button onClick={() => deleteInsight.mutate(ins.id)} className="opacity-50 group-hover:opacity-100 text-[#86736e] hover:text-[#713324] transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                              </div>
                              <p className="font-serif text-[#1d1c17] text-lg leading-[1.7] whitespace-pre-wrap">{ins.content}</p>
                            </div>
                          ))}
                        </div>
                     </div>
                  )}

                  {activeTab === 'annotations' && (
                    <div className="space-y-10">
                      <div className="border border-[#d9c1bc]/40 bg-[#e3d7b8]/10 p-8 rounded-sm shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_right,_#e3d7b8_0%,_transparent_60%)] opacity-30 pointer-events-none"></div>
                        <div className="relative z-10 space-y-5">
                          <div>
                            <h3 className="font-headline font-light text-2xl text-[#1d1c17] tracking-tight">PDF-grounded Annotations</h3>
                            <p className="font-serif text-sm text-[#86736e] mt-1">Capture exact quotes with page references for stronger evidence tracking.</p>
                          </div>
                          <textarea
                            className="w-full bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm p-5 font-serif text-base text-[#1d1c17] placeholder:text-[#86736e] focus:border-[#713324] outline-none"
                            rows={4}
                            placeholder="Paste exact quote from the paper..."
                            value={annotationQuote}
                            onChange={(e) => setAnnotationQuote(e.target.value)}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 items-center">
                            <input
                              className="bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm px-3 py-3 text-sm outline-none focus:border-[#2a697b]"
                              type="number"
                              min={1}
                              placeholder="Page #"
                              value={annotationPage}
                              onChange={(e) => setAnnotationPage(e.target.value)}
                            />
                            <input
                              className="bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm px-4 py-3 text-sm outline-none focus:border-[#2a697b]"
                              placeholder="Optional context note"
                              value={annotationNote}
                              onChange={(e) => setAnnotationNote(e.target.value)}
                            />
                            <button
                              className="bg-[#713324] text-white px-6 py-3 rounded-sm text-[10px] font-label uppercase tracking-widest disabled:opacity-40"
                              disabled={!annotationQuote.trim() || addAnnotation.isPending}
                              onClick={() => addAnnotation.mutate()}
                            >
                              {addAnnotation.isPending ? 'Saving...' : 'Save Annotation'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-label text-[10px] uppercase tracking-[0.3em] font-bold text-[#2a697b]">Saved Anchors ({annotations.length})</h4>
                        {annotations.length === 0 ? (
                          <p className="font-serif italic text-[#86736e]">No annotations yet. Add your first grounded quote above.</p>
                        ) : (
                          annotations.map((a: any) => (
                            <div key={a.id} className="bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-sm p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                  <p className="font-serif text-[#1d1c17] leading-relaxed">"{a.quote_text}"</p>
                                  {a.note ? <p className="text-sm text-[#86736e]">{a.note}</p> : null}
                                  <p className="font-label text-[9px] uppercase tracking-widest text-[#2a697b]">Page {a.page_number || 'N/A'}</p>
                                </div>
                                <button className="text-[#86736e] hover:text-[#713324]" onClick={() => deleteAnnotation.mutate(a.id)}>
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'connections' && (
                     <div className="space-y-8">
                        <div className="flex items-center gap-6 mb-8">
                           <div className="w-14 h-14 rounded-full bg-[#f8f3eb] border border-[#d9c1bc] flex items-center justify-center text-[#2a697b] shadow-sm">
                             <span className="material-symbols-outlined text-[24px]">hub</span>
                           </div>
                           <div>
                              <h3 className="font-headline font-light text-3xl text-[#1d1c17] tracking-tight">Semantic Threads</h3>
                              <p className="font-label text-[10px] uppercase tracking-[0.3em] font-bold text-[#86736e]">Discovered similarities across your archive</p>
                           </div>
                        </div>
                        
                        {!connections ? <div className="flex justify-center p-20"><div className="w-6 h-6 border-[3px] border-[#d9c1bc]/40 border-t-[#2a697b] rounded-full animate-spin"></div></div> : connections.length === 0 ? <p className="font-serif italic text-lg text-[#86736e] text-center p-20 border border-dashed border-[#d9c1bc]/60 rounded-sm">No connections found in local database.</p> : (
                          <div className="grid grid-cols-1 gap-4">
                            {connections.map((c: any) => (
                              <div key={c.id} className="flex items-center gap-6 group cursor-pointer bg-[#f8f3eb] p-6 border border-[#d9c1bc]/60 rounded-sm hover:-translate-y-1 hover:shadow-sm hover:border-[#2a697b]/50 transition-all" onClick={() => navigate(`/papers/${c.id}`)}>
                                <div className="p-3 bg-[#fef9f1] rounded-full text-[#86736e] group-hover:bg-[#2a697b] group-hover:text-white transition-all shadow-sm border border-[#d9c1bc]/40">
                                  <span className="material-symbols-outlined text-[18px]">link</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-xl font-serif leading-relaxed text-[#1d1c17] group-hover:text-[#2a697b] transition-colors">
                                    {c.title}
                                  </p>
                                  <div className="flex items-center gap-4 mt-4">
                                    <div className="flex-1 h-[2px] bg-[#d9c1bc]/40 rounded-full overflow-hidden">
                                       <div className="h-full bg-[#2a697b] rounded-full" style={{ width: `${c.confidence_score}%` }}></div>
                                    </div>
                                    <p className="font-label text-[9px] text-[#2a697b] shrink-0 uppercase tracking-widest font-bold">{Math.round(c.confidence_score)}% Alignment</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                  )}

                  {activeTab === 'citations' && (
                     <div className="space-y-8">
                        <div className="flex items-center justify-between border-b border-[#d9c1bc]/40 pb-4">
                          <h4 className="font-serif text-2xl text-[#1d1c17]">External Synchronizations</h4>
                          <button 
                            className="bg-[#2a697b]/10 text-[#2a697b] px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded-sm flex items-center gap-2 hover:bg-[#2a697b]/20 transition-colors border border-[#2a697b]/20"
                            onClick={() => {
                              toast.success('Syncing with Semantic Scholar...');
                              api.post(`/papers/${id}/sync`).then(() => qc.invalidateQueries({ queryKey: ['citations', id] }));
                            }}
                          >
                            <span className="material-symbols-outlined text-[16px]">sync</span>
                            Sync Now
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {!citations ? <div className="flex justify-center p-20"><div className="w-8 h-8 border-[3px] border-[#d9c1bc]/40 border-t-[#2a697b] rounded-full animate-spin"></div></div> : citations.length === 0 ? <p className="font-serif italic text-lg text-[#86736e] text-center p-20 border border-dashed border-[#d9c1bc]/40 rounded-sm bg-[#f8f3eb]">No citation data synced yet. Click "Sync Now" to pull from the global graph.</p> : citations.map((c: any) => (
                            <div key={c.id} className="p-8 border-l-4 border-[#2a697b] bg-[#f8f3eb] shadow-sm rounded-r-sm border border-[#d9c1bc]/60 hover:shadow-md transition-all flex justify-between items-center group">
                               <div>
                                 <div className="flex items-center gap-4 mb-3">
                                   <span className={`px-2 py-1 rounded-sm text-[8px] font-bold font-label uppercase tracking-widest ${c.type === 'citation' ? 'bg-[#2a697b]/10 text-[#2a697b] border border-[#2a697b]/20' : 'bg-[#86736e]/10 text-[#86736e] border border-[#86736e]/20'}`}>
                                     {c.type || 'Connection'}
                                   </span>
                                   <span className="text-[10px] font-mono text-[#86736e] tracking-tight">{c.cited_doi || 'No DOI Record'}</span>
                                 </div>
                                 <p className="text-lg font-serif leading-[1.6] text-[#1d1c17] group-hover:text-[#2a697b] transition-colors">{c.cited_title || c.external_title || 'Unknown record'}</p>
                               </div>
                               {c.cited_doi && (
                                  <div className="flex items-center pl-6">
                                     <a href={`https://doi.org/${c.cited_doi}`} target="_blank" className="p-3 text-[#86736e] hover:text-[#2a697b] hover:bg-[#2a697b]/10 rounded-full transition-all">
                                        <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                     </a>
                                  </div>
                               )}
                            </div>
                          ))}
                        </div>
                     </div>
                  )}

                  {activeTab === 'snowball' && (
                    <div className="space-y-12 bg-[#f8f3eb] p-8 rounded-sm border border-[#d9c1bc]/60 shadow-sm">
                       <div className="flex items-center justify-between border-b border-[#d9c1bc]/40 pb-6">
                          <h4 className="font-serif text-2xl text-[#1d1c17]">Analysis Graph</h4>
                          <span className="px-3 py-1 bg-[#2a697b]/10 text-[#2a697b] border border-[#2a697b]/20 text-[8px] font-label uppercase tracking-widest rounded-sm font-bold">Semantic Scholar API</span>
                       </div>

                       <VisualCitationGraph snowball={snowball} onOpenPaper={openExternalPaper} />

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#d9c1bc]/40 pb-2">
                               <div className="w-2 h-2 rounded-full bg-[#2a697b]"></div>
                               <h4 className="font-label text-[11px] uppercase tracking-[0.2em] text-[#2a697b] font-bold">Forward Linkage (Cited By)</h4>
                            </div>
                            {!snowball ? <div className="flex justify-center p-10"><div className="w-6 h-6 border-[3px] border-[#d9c1bc]/40 border-t-[#2a697b] rounded-full animate-spin"></div></div> : (snowball.citations || []).length === 0 ? <p className="text-sm italic text-[#86736e] font-serif">No forward linkages discovered.</p> : (
                              <div className="space-y-4">
                                                {snowball.citations.slice(0, 8).map((c: any) => (
                                                   <div key={c.paperId} className="p-6 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm group hover:border-[#2a697b]/50 hover:shadow-sm transition-all">
                                    <p className="text-[15px] font-serif text-[#1d1c17] group-hover:text-[#2a697b] leading-[1.6] transition-colors">{c.title || 'Untitled manuscript'}</p>
                                                      <div className="mt-4 flex justify-between items-center border-t border-[#d9c1bc]/30 pt-3 gap-3">
                                       <span className="text-[9px] font-label text-[#86736e] uppercase tracking-widest">{c.year || 'N/A'} • {c.venue || 'ArXiv'}</span>
                                                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             <button
                                                                className="text-[9px] font-label uppercase tracking-widest text-[#2a697b] font-bold flex items-center gap-1"
                                                                onClick={() => openExternalPaper(c)}
                                                             >
                                                                Trace <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                                             </button>
                                                             <button
                                                                className="text-[9px] font-label uppercase tracking-widest text-[#713324] font-bold"
                                                                onClick={() => importMutation.mutate(c)}
                                                                disabled={importMutation.isPending}
                                                             >
                                                                Add
                                                             </button>
                                                          </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#d9c1bc]/40 pb-2">
                               <div className="w-2 h-2 rounded-full bg-[#86736e]"></div>
                               <h4 className="font-label text-[11px] uppercase tracking-[0.2em] text-[#86736e] font-bold">Backward Linkage (References)</h4>
                            </div>
                            {!snowball ? <div className="flex justify-center p-10"><div className="w-6 h-6 border-[3px] border-[#d9c1bc]/40 border-t-[#86736e] rounded-full animate-spin"></div></div> : (snowball.references || []).length === 0 ? <p className="text-sm italic text-[#86736e] font-serif">No references found.</p> : (
                              <div className="space-y-4">
                                                {snowball.references.slice(0, 8).map((r: any) => (
                                                   <div key={r.paperId} className="p-6 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm group hover:border-[#2a697b]/50 hover:shadow-sm transition-all">
                                    <p className="text-[15px] font-serif text-[#1d1c17] group-hover:text-[#2a697b] leading-[1.6] transition-colors">{r.title || 'Untitled manuscript'}</p>
                                                      <div className="mt-4 flex justify-between items-center border-t border-[#d9c1bc]/30 pt-3 gap-3">
                                       <span className="text-[9px] font-label text-[#86736e] uppercase tracking-widest">{r.year || 'N/A'} • {r.venue || 'Publication'}</span>
                                                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             <button
                                                                className="text-[9px] font-label uppercase tracking-widest text-[#2a697b] font-bold flex items-center gap-1"
                                                                onClick={() => openExternalPaper(r)}
                                                             >
                                                                Locate <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                                             </button>
                                                             <button
                                                                className="text-[9px] font-label uppercase tracking-widest text-[#713324] font-bold"
                                                                onClick={() => importMutation.mutate(r)}
                                                                disabled={importMutation.isPending}
                                                             >
                                                                Add
                                                             </button>
                                                          </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'recommended' && (
                    <div className="space-y-8">
                      <div className="flex items-baseline justify-between">
                                     <h4 className="font-serif text-2xl text-[#1d1c17]">Semantic Discovery</h4>
                                     <p className="font-label text-[10px] uppercase text-[#2a697b] font-bold tracking-widest">AI Prescribed Matches</p>
                      </div>
                                 {!recommended ? <div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-[#d9c1bc]/40 border-t-[#2a697b] rounded-full animate-spin"></div></div> : recommended.length === 0 ? <p className="text-sm italic text-[#86736e]">No paper-based recommendations found. Add more details to this record.</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {recommended.map((r: any) => (
                                             <div key={r.paperId} className="p-6 bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-xl hover:shadow-sm transition-all group flex flex-col justify-between">
                                 <div>
                                                    <p className="text-lg font-serif font-medium text-[#1d1c17] leading-snug mb-3">{r.title}</p>
                                                    <p className="text-[10px] font-label text-[#86736e] uppercase tracking-[0.2em]">{r.venue || 'Global Database'} • {r.year || 'N/A'}</p>
                                 </div>
                                 <button 
                                                    className="mt-6 w-full py-2 bg-[#713324] text-white text-[10px] font-label uppercase tracking-widest rounded-md opacity-90 group-hover:opacity-100 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50" 
                                   onClick={() => importMutation.mutate(r)}
                                   disabled={importMutation.isPending}
                                 >
                                   {importMutation.isPending ? (
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                   ) : 'Incorporate into Library'}
                                 </button>
                              </div>
                           ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'methodology' && (
                    <div className="space-y-12 slide-up">
                       <div className="p-10 bg-[#f8f3eb] border border-[#d9c1bc]/60 rounded-sm shadow-sm relative overflow-hidden group/matrix duration-500 hover:shadow-md">
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#e3d7b8_0%,_transparent_60%)] z-0 opacity-40"></div>
                          
                          <div className="flex justify-between items-center mb-12 relative z-10 border-b border-[#d9c1bc]/40 pb-6">
                            <div className="flex items-center gap-4">
                               <div className="p-3 bg-[#fef9f1] border border-[#d9c1bc] text-[#2a697b] rounded-sm shadow-sm">
                                  <span className="material-symbols-outlined text-xl">account_tree</span>
                               </div>
                               <h5 className="font-label text-xs uppercase tracking-[0.4em] text-[#1d1c17] font-bold">Methodology Summary</h5>
                            </div>
                            <div className="flex items-center gap-6">
                               <span className="p-2 px-4 bg-[#fef9f1] border border-[#d9c1bc]/60 text-[#86736e] rounded-sm text-[9px] font-mono uppercase tracking-widest shadow-sm">Structured Notes</span>
                               <button 
                                 onClick={() => {
                                   if (editMethodology) {
                                      updateMethodology.mutate(methodologyForm);
                                   } else {
                                      setMethodologyForm({
                                        architecture: paper.methodology?.architecture || '',
                                        data_source: paper.methodology?.data_source || '',
                                        metrics: paper.methodology?.metrics || {},
                                      });
                                      setEditMethodology(true);
                                   }
                                 }}
                                 className="text-[#86736e] hover:text-[#2a697b] transition-colors p-2 bg-[#fef9f1] rounded-sm border border-[#d9c1bc]/40 shadow-sm"
                               >
                                  <span className="material-symbols-outlined text-[18px]">{editMethodology ? 'save' : 'edit_note'}</span>
                               </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                             <div className="space-y-4">
                                <span className="font-label text-[10px] uppercase text-[#86736e] tracking-[0.3em] font-bold">Core Architecture</span>
                                {editMethodology ? (
                                   <input className="w-full bg-[#fef9f1] border border-[#d9c1bc] focus:border-[#713324] rounded-sm p-5 text-lg font-serif text-[#1d1c17] outline-none transition-colors shadow-sm" value={methodologyForm.architecture} onChange={e => setMethodologyForm({...methodologyForm, architecture: e.target.value})} placeholder="e.g., Transformer-based Latent Space mapping" />
                                ) : (
                                   <div className="p-6 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm shadow-sm backdrop-blur-sm">
                                      <p className="font-serif text-xl text-[#1d1c17] leading-relaxed">{paper.methodology?.architecture || 'No explicit method architecture captured yet.'}</p>
                                   </div>
                                )}
                             </div>
                             <div className="space-y-4">
                                <span className="font-label text-[10px] uppercase text-[#86736e] tracking-[0.3em] font-bold">Primary Data Source</span>
                                {editMethodology ? (
                                   <input className="w-full bg-[#fef9f1] border border-[#d9c1bc] focus:border-[#713324] rounded-sm p-5 text-lg font-serif text-[#1d1c17] outline-none transition-colors shadow-sm" value={methodologyForm.data_source} onChange={e => setMethodologyForm({...methodologyForm, data_source: e.target.value})} placeholder="e.g., Open Research Repositories" />
                                ) : (
                                   <div className="p-6 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm shadow-sm backdrop-blur-sm">
                                      <p className="font-serif text-xl text-[#1d1c17] leading-relaxed">{paper.methodology?.data_source || paper.venue || 'No clear data source documented.'}</p>
                                   </div>
                                )}
                             </div>
                             
                             <div className="md:col-span-2 space-y-8">
                                <div className="flex items-center gap-4">
                                   <div className="h-px flex-1 bg-[#d9c1bc]/60"></div>
                                   <span className="font-label text-[10px] uppercase text-[#86736e] tracking-[0.3em] font-bold">Reported Quantitative Signals</span>
                                   <div className="h-px flex-1 bg-[#d9c1bc]/60"></div>
                                </div>
                                {editMethodology ? (
                                  <div className="space-y-4">
                                    {['accuracy', 'latency', 'recall'].map((key) => (
                                      <div key={key} className="flex items-center gap-4 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm p-4">
                                        <span className="w-36 text-[10px] font-label uppercase tracking-widest text-[#86736e]">{key}</span>
                                        <input
                                          className="flex-1 bg-transparent border-b border-[#d9c1bc] text-[#1d1c17] outline-none py-2"
                                          value={methodologyForm.metrics?.[key] || ''}
                                          onChange={e => setMethodologyForm({ ...methodologyForm, metrics: { ...(methodologyForm.metrics || {}), [key]: e.target.value } })}
                                          placeholder="Optional value from the paper"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : reportedMetrics.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {reportedMetrics.map(([key, value]) => (
                                      <div key={key} className="p-6 bg-[#fef9f1] border border-[#d9c1bc]/60 rounded-sm shadow-sm">
                                        <p className="text-[10px] font-label uppercase tracking-widest text-[#86736e] mb-2">{key}</p>
                                        <p className="text-2xl font-headline text-[#1d1c17]">{String(value)}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-6 bg-[#fef9f1] border border-dashed border-[#d9c1bc]/70 rounded-sm">
                                    <p className="font-serif italic text-[#86736e]">No structured metrics were captured for this paper. Add only values explicitly reported by the source.</p>
                                  </div>
                                )}
                             </div>
                          </div>
                          
                          {editMethodology && (
                             <div className="mt-12 flex justify-end gap-6 relative z-10 pt-8 border-t border-[#d9c1bc]/40">
                                <button onClick={() => setEditMethodology(false)} className="text-[10px] font-label uppercase tracking-widest text-[#86736e] hover:text-[#1d1c17] transition-colors font-bold">Cancel</button>
                                <button 
                                  onClick={() => updateMethodology.mutate(methodologyForm)}
                                  className="bg-[#713324] text-white px-10 py-4 rounded-sm shadow-md hover:bg-[#8e4a39] transition-all text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                                  disabled={updateMethodology.isPending}
                                >
                                   {updateMethodology.isPending ? 'Syncing...' : 'Sync Archival Record'}
                                </button>
                             </div>
                          )}
                       </div>
                       
                       <p className="text-[10px] font-label text-[#86736e] italic uppercase tracking-[0.4em] text-center opacity-70">Archival Synthesis engine v.2.4 powered by Aether Neural Graph.</p>
                    </div>
                  )}
               </div>
            </div>
        </div>
    </article>
    </div>
  );
}
