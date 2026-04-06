import { useState } from 'react';
import { Database, FileText } from 'lucide-react';
import api from '../lib/api';

export default function DatasetsPage() {
  const [doi, setDoi] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const extractDatasets = (abstract: string, title: string) => {
    // Simple mock heuristic for identifying open dataset references.
    const potentialKeywords = ['MNIST', 'ImageNet', 'CIFAR', 'COCO', 'GLUE', 'SQuAD', 'WMT', 'IMDB', 'Kinetics', 'MIMIC'];
    const text = (abstract + ' ' + title).toUpperCase();
    const found = potentialKeywords.filter(k => text.includes(k));
    return found;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doi) return;
    setLoading(true);
    try {
      // Find paper details via Semantic Scholar Graph
      const cleanDoi = doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim();
      const res = await api.get(`/semantic-scholar/paper/DOI:${encodeURIComponent(cleanDoi)}`);
      const paper = res.data.data;
      if (paper) {
         setResult({
           ...paper,
           extractedDatasets: extractDatasets(paper.abstract || '', paper.title || '')
         });
      }
    } catch (err) {
      setResult({ error: 'Paper not found or no datasets could be extracted.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent fade-in pb-24">
      {/* Refined Aether Header with Subtle Stitch Glow */}
      <header className="relative pt-24 pb-32 px-12 lg:px-20 overflow-hidden border-b border-[#d9c1bc]/30 mb-16 shadow-lg text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0"></div>
        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0 mix-blend-overlay"></div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 opacity-90">
              <span className="w-8 h-px bg-[#e3d7b8]"></span>
              <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[#e3d7b8] font-bold">Metadata Extraction</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline font-light tracking-tight text-white mb-2 flex items-center gap-6">
               Dataset Analyzer
            </h1>
            <p className="font-serif text-[#e3d7b8]/85 italic text-lg max-w-xl leading-relaxed">
               Enter a paper's DOI to scan its abstract and internal metadata for associated datasets. Understand exactly what data powers the research.
            </p>
          </div>
          <div className="opacity-10 pointer-events-none absolute -right-10 -bottom-10 rotate-12">
             <Database size={240} className="text-[#2a697b]" />
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-12 lg:px-20">

      <div className="bg-[#f8f3eb] border border-[#d9c1bc]/40 p-6 rounded-xl shadow-sm mb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 pointer-events-none"></div>
        <form onSubmit={handleSearch} className="flex gap-4 relative z-10">
          <input 
            type="text" 
            placeholder="e.g. 10.1145/12345.67890" 
            className="flex-1 bg-[#fef9f1] border border-[#d9c1bc]/60 p-4 rounded-lg font-mono text-sm focus:border-[#2a697b] transition-colors outline-none text-[#1d1c17] placeholder:text-[#86736e]"
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
          />
          <button type="submit" disabled={loading || !doi} className="btn-primary px-8 rounded-xl font-label uppercase tracking-widest text-[10px] shadow-lg transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2 border border-white/20">
            {loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>}
            Analyze
          </button>
        </form>
      </div>

      {result && !result.error && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-[#f8f3eb] p-6 rounded-xl border border-[#d9c1bc]/40 relative overflow-hidden group">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8]/40 via-transparent to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="relative z-10">
               <h3 className="font-serif text-2xl text-[#1d1c17] mb-2">{result.title}</h3>
               <p className="font-label text-[10px] uppercase tracking-widest text-[#86736e]">{result.authors?.[0]?.name} et al. • {result.year}</p>
               <p className="mt-4 font-serif text-[#1d1c17] text-sm leading-relaxed border-l-2 border-[#2a697b]/30 pl-4 italic">
                 "{result.abstract ? (result.abstract.length > 300 ? result.abstract.substring(0, 300) + '...' : result.abstract) : 'No abstract available.'}"
               </p>
             </div>
           </div>
           
           <div>
             <h4 className="font-label text-xs uppercase tracking-[0.2em] text-[#1d1c17] font-bold mb-6 flex items-center gap-2">
               <FileText size={16} className="text-[#2a697b]" /> Extracted Datasets
             </h4>
             
             {result.extractedDatasets.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-[#d9c1bc]/60 rounded-xl text-center">
                  <p className="font-serif italic text-[#86736e]">No standard datasets were automatically detected in the paper's available metadata.</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.extractedDatasets.map((ds: string) => (
                    <div key={ds} className="p-5 border border-[#d9c1bc]/40 bg-[#fef9f1] rounded-xl flex items-center justify-between group hover:border-[#2a697b]/50 transition-colors">
                       <span className="font-mono text-[#2a697b] font-bold">{ds} Dataset</span>
                       <a href={`https://huggingface.co/datasets?search=${ds}`} target="_blank" className="opacity-0 group-hover:opacity-100 bg-[#f8f3eb] text-[#2a697b] border border-[#d9c1bc]/60 px-3 py-1 font-label text-[9px] uppercase tracking-widest rounded transition-all hover:bg-[#2a697b] hover:text-white">Find Data →</a>
                    </div>
                  ))}
                </div>
             )}
           </div>
        </div>
      )}

      {result?.error && (
         <div className="p-6 bg-red-50 border border-red-100 text-red-600 rounded-xl font-serif text-center">
            {result.error}
         </div>
        )}
      </div>
    </div>
  );
}
