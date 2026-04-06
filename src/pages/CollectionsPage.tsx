import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';

function CreateCollectionModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/collections', { name, description }),
    onSuccess: () => { 
      toast.success('Collection created'); 
      qc.invalidateQueries({ queryKey: ['collections'] }); 
      onClose(); 
    },
    onError: () => toast.error('Failed to create collection'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center fade-in p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#fef9f1] max-w-lg w-full m-4 shadow-2xl rounded-sm border border-[#d9c1bc] overflow-hidden slide-up">
        <div className="bg-[#f8f3eb] border-b border-[#d9c1bc]/40 px-8 py-6 flex justify-between items-center">
          <h3 className="font-headline font-light text-2xl text-[#1d1c17]">New Volume</h3>
          <button onClick={onClose} className="text-[#86736e] hover:text-[#1d1c17] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-10 space-y-8">
          <div className="space-y-4">
            <label className="font-label text-[10px] uppercase tracking-[0.4em] text-[#86736e] font-bold">Volume Title <span className="text-red-400">*</span></label>
            <input 
              className="w-full bg-transparent border-b border-[#d9c1bc] focus:border-[#713324] outline-none py-3 font-serif text-xl text-[#1d1c17] placeholder:text-[#d9c1bc] transition-colors" 
              placeholder="e.g., Principles of Diffusion" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus 
            />
          </div>
          <div className="space-y-4">
            <label className="font-label text-[10px] uppercase tracking-[0.4em] text-[#86736e] font-bold">Curator's Description</label>
            <textarea 
              className="w-full bg-[#f8f3eb] border border-[#d9c1bc]/40 rounded-sm focus:border-[#713324] p-4 text-sm font-serif text-[#1d1c17] placeholder:text-[#86736e] transition-colors outline-none resize-none" 
              rows={3} 
              placeholder="Summary of theoretical focus..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </div>
        <div className="border-t border-[#d9c1bc]/40 p-6 bg-[#f8f3eb]/50 flex justify-end gap-6 items-center">
           <button className="text-[10px] font-label uppercase tracking-widest text-[#86736e] hover:text-[#1d1c17] transition-colors" onClick={onClose}>Cancel</button>
           <button 
             className="bg-[#713324] text-white px-10 py-4 rounded-sm shadow-lg hover:bg-[#8e4a39] transition-all text-[10px] uppercase tracking-widest disabled:opacity-30" 
             disabled={!name.trim() || mutation.isPending} 
             onClick={() => mutation.mutate()}
           >
             {mutation.isPending ? 'Syncing...' : 'Bind Volume'}
           </button>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections').then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/collections/${id}`),
    onSuccess: () => { 
      toast.success('Collection removed'); 
      qc.invalidateQueries({ queryKey: ['collections'] }); 
    },
  });

  return (
    <div className="min-h-screen bg-transparent p-0 max-w-full fade-in relative">
      {showCreate && <CreateCollectionModal onClose={() => setShowCreate(false)} />}

      <header className="relative pt-24 pb-28 px-12 lg:px-24 overflow-hidden border-b border-[#d9c1bc]/30 transition-all duration-700 mb-20 shadow-lg text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0"></div>
        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0 mix-blend-overlay"></div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 opacity-90">
              <span className="w-8 h-px bg-[#e3d7b8]"></span>
              <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[#e3d7b8] font-bold">Volume Management</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline font-light tracking-tight text-white mb-2 drop-shadow-sm">Archival Volumes</h1>
            <div className="flex items-center mt-4 gap-4 opacity-70">
              <span className="font-label text-[10px] uppercase tracking-widest text-[#e3d7b8]/85">{data?.length || 0} Synced Sectors</span>
            </div>
          </div>
          <button 
            onClick={() => setShowCreate(true)} 
            className="group relative px-10 py-5 bg-[#713324] text-white rounded-sm shadow-xl hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] font-bold"
          >
             <span className="relative flex items-center gap-3">
                <Plus size={18} /> Bind New Volume
             </span>
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-12 lg:px-24">

      {isLoading ? (
         <div className="flex items-center justify-center mt-20">
            <div className="w-10 h-10 border-[3px] border-[#d9c1bc] border-t-[#713324] rounded-full animate-spin" />
         </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center text-center p-32 mt-12 bg-[#f8f3eb] rounded-sm border border-[#d9c1bc]/40 shadow-sm max-w-4xl mx-auto">
           <h2 className="text-4xl font-headline font-light text-[#1d1c17] mb-6">The archive is vacant.</h2>
           <p className="font-label text-[10px] uppercase tracking-[0.4em] text-[#86736e] max-w-md leading-relaxed mb-12">Bind your first volume to begin synthesizing the neural graph.</p>
           <button 
             className="bg-[#713324] text-white px-12 py-5 rounded-sm shadow-2xl transition-all hover:scale-105 font-bold uppercase tracking-[0.2em] text-[10px]" 
             onClick={() => setShowCreate(true)}
           >
             Bind First Volume
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-16">
          {data.map((c: any, index: number) => (
             <div 
               key={c.id} 
               className="group/card flex flex-col cursor-pointer relative aspect-[1/1.6] w-full bg-[#092c45] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-700 hover:-translate-y-2 rounded-none overflow-hidden"
               onClick={() => navigate(`/collections/${c.id}`)}
             >
               {/* Fixed Spine Shadow Line */}
               <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/30 z-20"></div>

               {/* Exact Archetype Gradient - Now matching Insights Boxes */}
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0"></div>
               
               <div className="p-10 pl-14 flex flex-col h-full relative z-10 w-full overflow-hidden">
                 {/* Main Content Area */}
                 <div className="flex-1 flex flex-col justify-center pt-10">
                   <h3 className="text-2xl lg:text-3xl font-headline font-light text-white/95 leading-[1.1] tracking-tight mb-8 overflow-hidden line-clamp-3">
                     {c.name}
                   </h3>
                   
                   <p className="font-label text-[9px] text-white/50 italic uppercase tracking-[0.25em] leading-relaxed line-clamp-2 mb-8 max-w-[95%]">
                      {c.description || 'Neural archival context repository for high-fidelity research synchronization.'}
                   </p>

                   <div className="w-full h-px bg-white/10"></div>
                 </div>

                 {/* Archival Footer */}
                 <div className="mt-auto space-y-4 pb-4">
                    <div className="flex justify-between items-center w-full">
                       <span className="font-label text-[10.5px] text-white/90 tracking-[0.3em] font-bold uppercase">{c.paper_count} Manuscripts</span>
                       <span className="material-symbols-outlined text-white text-[16px] opacity-40">bookmark</span>
                    </div>
                    
                    <div className="flex justify-between items-center w-full leading-none opacity-20">
                       <span className="font-label text-[9px] text-white tracking-[0.3em] font-medium uppercase font-mono">Dec 2026</span>
                       <span className="font-label text-[9px] text-white tracking-[0.3em] font-medium uppercase font-mono">ID-{c.id.substring(0,4).toUpperCase()}</span>
                    </div>
                 </div>
               </div>

               {/* Interaction Layers */}
               <div className="absolute top-4 right-4 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button 
                    className="p-2 text-white/10 hover:text-red-400 transition-colors" 
                    onClick={e => { 
                      e.stopPropagation(); 
                      if (confirm(`Archive volume "${c.name}" permanently?`)) deleteMutation.mutate(c.id); 
                    }}
                  >
                     <X size={14} />
                  </button>
               </div>
             </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
