import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Lightbulb, Trash2, X, Link } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  brainstorm: '💡 Brainstorm', in_progress: '⚡ In Progress', published: '🎉 Published', abandoned: '🗑 Abandoned',
};

function IdeaModal({ idea, onClose }: { idea?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(idea?.title || '');
  const [description, setDescription] = useState(idea?.description || '');
  const [status, setStatus] = useState(idea?.status || 'brainstorm');
  const isEdit = !!idea;

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? api.put(`/ideas/${idea.id}`, { title, description, status })
      : api.post('/ideas', { title, description, status }),
    onSuccess: () => {
      toast.success(isEdit ? 'Idea updated' : 'Idea created');
      qc.invalidateQueries({ queryKey: ['ideas'] });
      onClose();
    },
    onError: () => toast.error('Failed to save idea'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center fade-in p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#fef9f1] max-w-lg w-full m-4 shadow-2xl rounded-sm border border-[#d9c1bc] overflow-hidden slide-up">
        <div className="bg-[#f8f3eb] border-b border-[#d9c1bc]/40 px-8 py-6 flex justify-between items-center">
          <div className="font-headline font-light text-2xl text-[#1d1c17]">{isEdit ? 'Edit Idea' : 'Create Idea'}</div>
          <button className="text-[#86736e] hover:text-[#1d1c17] transition-colors" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-10 space-y-8 flex flex-col gap-4">
          <div className="space-y-4">
            <label className="font-label text-[10px] uppercase tracking-[0.4em] text-[#86736e] font-bold">Title</label>
            <input className="w-full bg-transparent border-b border-[#d9c1bc] focus:border-[#713324] outline-none py-3 font-serif text-xl text-[#1d1c17] placeholder:text-[#d9c1bc] transition-colors" placeholder="Idea title..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-4">
            <label className="font-label text-[10px] uppercase tracking-[0.4em] text-[#86736e] font-bold">Description</label>
            <textarea className="w-full bg-[#f8f3eb] border border-[#d9c1bc]/40 rounded-sm focus:border-[#713324] p-4 text-sm font-serif text-[#1d1c17] placeholder:text-[#86736e] transition-colors outline-none resize-none" rows={4} placeholder="Describe your idea, hypothesis, or research direction..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="space-y-4">
            <label className="font-label text-[10px] uppercase tracking-[0.4em] text-[#86736e] font-bold">Status</label>
            <select className="w-full bg-[#fef9f1] border-b border-[#d9c1bc] focus:border-[#713324] outline-none py-3 font-serif text-lg text-[#1d1c17] transition-colors" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="border-t border-[#d9c1bc]/40 p-6 bg-[#f8f3eb]/50 flex justify-end gap-6 items-center">
          <button className="text-[10px] font-label uppercase tracking-widest text-[#86736e] hover:text-[#1d1c17] transition-colors" onClick={onClose}>Cancel</button>
          <button className="bg-[#713324] text-white px-10 py-4 rounded-sm shadow-lg hover:bg-[#8e4a39] transition-all text-[10px] uppercase tracking-widest disabled:opacity-30" disabled={!title.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin inline-block mr-2" /> : null}
            {isEdit ? 'Save Changes' : 'Create Idea'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IdeasPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editIdea, setEditIdea] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ideas', statusFilter],
    queryFn: () => api.get('/ideas', { params: { status: statusFilter || undefined } }).then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ideas/${id}`),
    onSuccess: () => { toast.success('Idea deleted'); qc.invalidateQueries({ queryKey: ['ideas'] }); },
  });

  return (
    <div className="min-h-screen bg-transparent pb-20 duration-500">
      {showCreate && <IdeaModal onClose={() => setShowCreate(false)} />}
      {editIdea && <IdeaModal idea={editIdea} onClose={() => setEditIdea(null)} />}

      <div className="pt-24 pb-16 px-12 lg:px-24 max-w-[1600px] mx-auto flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-headline font-light tracking-tight text-[#1d1c17] mb-2 duration-300">Research Ideas</h1>
          <p className="font-serif italic text-lg text-[#86736e] opacity-80 duration-300">Track your ideas and connect them to papers</p>
        </div>
        <button className="bg-[#713324] text-white px-6 py-3 rounded-sm shadow-md hover:bg-[#8e4a39] hover:shadow-xl transition-all uppercase tracking-widest text-[10px] font-bold flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Idea
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto px-12 lg:px-24">
        <div className="flex items-center gap-3 mb-10 flex-wrap">
          {['', 'brainstorm', 'in_progress', 'published', 'abandoned'].map(s => (
            <button 
              key={s} 
              className={`px-5 py-2.5 font-label text-[10px] uppercase tracking-widest rounded-xl transition-all duration-300 border ${
                statusFilter === s 
                  ? 'bg-[#713324] text-white border-[#713324] shadow-lg shadow-[#713324]/20' 
                  : 'bg-[#f8f3eb] text-[#86736e] border-[#d9c1bc]/40 hover:border-[#1d1c17] hover:text-[#1d1c17]'
              }`} 
              onClick={() => setStatusFilter(s)}
            >
              {s === '' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8"><div className="w-10 h-10 border-[3px] border-[#d9c1bc] border-t-[#713324] rounded-full animate-spin" /></div>
        ) : !data?.length ? (
          <div className="p-20 border border-[#d9c1bc]/40 rounded-3xl bg-[#f8f3eb] duration-500 shadow-sm text-center flex flex-col items-center">
            <div className="flex items-center justify-center p-6 bg-[#fef9f1] rounded-full mb-8 border border-[#d9c1bc]/60 shadow-inner"><Lightbulb size={40} className="text-[#2a697b]" /></div>
            <div className="font-headline font-light text-3xl mb-4 text-[#1d1c17]">No ideas captured.</div>
            <div className="font-serif italic text-lg text-[#86736e] mb-8 max-w-md mx-auto">Aether needs your raw hypotheses to build context. Start your journey in the margins.</div>
            <button className="bg-[#713324] text-white px-10 py-3 rounded-sm uppercase tracking-[0.2em] text-[10px] shadow-lg transition-all hover:scale-105" onClick={() => setShowCreate(true)}>
               Plant a Seed
            </button>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {data.map((idea: any) => (
            <div 
              key={idea.id} 
              className="group flex flex-col cursor-pointer relative h-56 md:h-48 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] border border-white/20 shadow-md transition-all duration-700 ease-in-out hover:-translate-y-2 hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] rounded-sm overflow-hidden"
              onClick={() => setEditIdea(idea)}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-30 pointer-events-none mix-blend-overlay"></div>
              <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transform -rotate-45 translate-x-1/3 pointer-events-none w-[200%] h-[200%] transition-transform duration-1000 group-hover:translate-x-1/2"></div>
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-white/40 via-white/10 to-transparent mix-blend-overlay"></div>
              <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-white/10"></div>

              <div className="p-5 flex flex-col h-full justify-between relative z-10 text-white">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-label text-[8px] uppercase tracking-[0.2em] text-white/70 border border-white/20 px-2 py-0.5 backdrop-blur-sm rounded-sm">
                      {STATUS_LABELS[idea.status]}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 p-1 text-white/50 hover:text-red-400 transition-all hover:scale-110" onClick={(e) => { e.stopPropagation(); if (confirm('Delete idea?')) deleteMutation.mutate(idea.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  
                  <h3 className="text-lg lg:text-xl font-headline font-light leading-tight tracking-tight text-white/95 drop-shadow-sm mb-2 line-clamp-2">
                    {idea.title}
                  </h3>
                  
                  {idea.description && (
                    <p className="font-label text-[9px] text-[#e3d7b8] uppercase tracking-[0.1em] italic leading-relaxed line-clamp-2 overflow-hidden text-clip opacity-90">
                        {idea.description}
                    </p>
                  )}
                </div>

                <div className="mt-auto pt-4 flex items-end justify-between w-full border-t border-white/20">
                  {idea.referenced_papers?.length > 0 ? (
                     <div className="flex flex-col gap-1 w-full text-white/70">
                        <div className="font-label text-[8px] uppercase tracking-[0.2em] opacity-70 flex items-center gap-1"><Link size={10} /> Linked Architectures</div>
                        {idea.referenced_papers.slice(0, 1).map((p: any) => (
                           <div key={p.id} className="text-[9px] font-serif italic truncate w-full hover:text-white" onClick={(e) => { e.stopPropagation(); navigate(`/papers/${p.id}`); }}>
                              • {p.title}
                           </div>
                        ))}
                     </div>
                  ) : <div></div>}
                  <div className="font-label text-[8px] text-white/60 uppercase tracking-[0.2em] shrink-0 text-right">
                     {format(new Date(idea.created_at), 'MMM yyyy')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
