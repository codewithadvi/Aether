import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

const STATUS_ORDER = ['idea', 'validating', 'running', 'done'] as const;

const STATUS_META: Record<string, { label: string; accent: string; chip: string }> = {
  idea: { label: 'Idea', accent: 'border-[#d9c1bc]', chip: 'text-[#86736e] bg-[#fef9f1] border-[#d9c1bc]/70' },
  validating: { label: 'Validating', accent: 'border-[#2a697b]/40', chip: 'text-[#2a697b] bg-[#e3d7b8]/20 border-[#2a697b]/40' },
  running: { label: 'Running', accent: 'border-[#713324]/40', chip: 'text-[#713324] bg-[#e3d7b8]/30 border-[#713324]/40' },
  done: { label: 'Done', accent: 'border-[#2e5d34]/40', chip: 'text-[#2e5d34] bg-[#e2f3e5] border-[#2e5d34]/30' },
};

export default function GapTrackerPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');

  const { data: gaps = [], isLoading } = useQuery({
    queryKey: ['gap-cards'],
    queryFn: () => api.get('/intel/gaps').then((r) => r.data.data || []),
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['insights-for-gaps'],
    queryFn: () => api.get('/insights/all').then((r) => r.data.data || []),
  });

  const createGap = useMutation({
    mutationFn: (payload: { title: string; hypothesis: string }) => api.post('/intel/gaps', payload),
    onSuccess: () => {
      toast.success('Gap card created');
      setTitle('');
      setHypothesis('');
      qc.invalidateQueries({ queryKey: ['gap-cards'] });
    },
    onError: () => toast.error('Failed to create gap card'),
  });

  const moveGap = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/intel/gaps/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gap-cards'] }),
    onError: () => toast.error('Failed to update status'),
  });

  const deleteGap = useMutation({
    mutationFn: (id: string) => api.delete(`/intel/gaps/${id}`),
    onSuccess: () => {
      toast.success('Gap card removed');
      qc.invalidateQueries({ queryKey: ['gap-cards'] });
    },
    onError: () => toast.error('Failed to delete gap card'),
  });

  const runNovelty = useMutation({
    mutationFn: (id: string) => api.post(`/intel/gaps/${id}/novelty-check`),
    onSuccess: () => {
      toast.success('Novelty check completed');
      qc.invalidateQueries({ queryKey: ['gap-cards'] });
    },
    onError: () => toast.error('Novelty check failed'),
  });

  const generateDraft = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/intel/gaps/${id}/draft`);
      return api.get(`/intel/gaps/${id}/draft-latest`).then((r) => r.data.data);
    },
    onSuccess: (draft) => {
      if (!draft) {
        toast.error('Draft generation failed');
        return;
      }
      toast.success('Paper draft generated');
      qc.invalidateQueries({ queryKey: ['gap-cards'] });
      const preview = `${draft.title}\n\n${draft.abstract}`;
      window.alert(preview);
    },
    onError: () => toast.error('Failed to generate draft'),
  });

  const convertInsight = useMutation({
    mutationFn: (insightId: string) => api.post(`/intel/gaps/from-insight/${insightId}`),
    onSuccess: () => {
      toast.success('Insight converted to gap card');
      qc.invalidateQueries({ queryKey: ['gap-cards'] });
    },
    onError: () => toast.error('Failed to convert insight'),
  });

  const grouped = useMemo(() => {
    const seed: Record<string, any[]> = { idea: [], validating: [], running: [], done: [] };
    for (const gap of gaps) {
      const status = STATUS_ORDER.includes(gap.status) ? gap.status : 'idea';
      seed[status].push(gap);
    }
    return seed;
  }, [gaps]);

  return (
    <div className="bg-transparent min-h-screen pb-16">
      <div className="relative pt-20 pb-20 px-12 lg:px-20 overflow-hidden border-b border-[#d9c1bc]/30 shadow-lg text-white mb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e3d7b8] via-[#2a697b] to-[#092c45] z-0" />
        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0 mix-blend-overlay" />
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <p className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e3d7b8] mb-3">Aether / Research Intelligence</p>
          <h1 className="text-5xl lg:text-6xl font-headline font-light tracking-tight">Gap Tracker Board</h1>
          <p className="font-serif italic text-xl text-[#e3d7b8]/85 mt-4 max-w-3xl">
            Convert insights into testable gaps, score novelty against your archive, and generate draft paper skeletons from active hypotheses.
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-12 lg:px-20">
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2 bg-[#f8f3eb]/95 border border-[#d9c1bc]/60 rounded-2xl p-6">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-[#86736e] mb-3">Create Gap Card</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Gap title"
                className="bg-[#fef9f1] border border-[#d9c1bc]/80 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2a697b]"
              />
              <button
                onClick={() => createGap.mutate({ title, hypothesis })}
                disabled={!title.trim() || !hypothesis.trim() || createGap.isPending}
                className="bg-[#713324] text-white rounded-lg px-4 py-3 text-[10px] uppercase tracking-[0.2em] font-bold disabled:opacity-50"
              >
                {createGap.isPending ? 'Creating...' : 'Add Gap Card'}
              </button>
            </div>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Write a testable hypothesis"
              rows={4}
              className="mt-4 w-full bg-[#fef9f1] border border-[#d9c1bc]/80 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2a697b]"
            />
          </div>

          <div className="bg-[#f8f3eb]/95 border border-[#d9c1bc]/60 rounded-2xl p-6">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-[#86736e] mb-3">Convert From Insights</p>
            <div className="space-y-3 max-h-[280px] overflow-auto pr-2">
              {insights.slice(0, 8).map((ins: any) => (
                <div key={ins.id} className="border border-[#d9c1bc]/60 rounded-lg bg-[#fef9f1] p-3">
                  <p className="text-sm font-serif text-[#1d1c17] line-clamp-2">{ins.content}</p>
                  <button
                    onClick={() => convertInsight.mutate(ins.id)}
                    className="mt-2 text-[10px] uppercase tracking-[0.2em] font-label text-[#2a697b] hover:text-[#092c45]"
                  >
                    Create Gap Card
                  </button>
                </div>
              ))}
              {!insights.length && (
                <p className="text-sm font-serif italic text-[#86736e]">No insights found yet. Extract insights from papers to accelerate gap creation.</p>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-[#d9c1bc] border-t-[#2a697b] rounded-full animate-spin" />
          </div>
        ) : (
          <section className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {STATUS_ORDER.map((status) => (
              <div key={status} className={`bg-[#f8f3eb] border ${STATUS_META[status].accent} rounded-xl p-4 min-h-[420px]`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline font-light text-2xl text-[#1d1c17]">{STATUS_META[status].label}</h3>
                  <span className={`text-[9px] uppercase tracking-[0.2em] border px-2 py-1 rounded-full ${STATUS_META[status].chip}`}>
                    {grouped[status].length}
                  </span>
                </div>

                <div className="space-y-3">
                  {grouped[status].map((gap: any) => (
                    <article key={gap.id} className="bg-[#fef9f1] border border-[#d9c1bc]/70 rounded-lg p-4 shadow-sm">
                      <h4 className="font-headline text-lg text-[#1d1c17] leading-tight">{gap.title}</h4>
                      <p className="mt-2 text-sm font-serif text-[#475569] line-clamp-3">{gap.hypothesis}</p>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => runNovelty.mutate(gap.id)}
                          className="text-[9px] uppercase tracking-[0.2em] px-2 py-1 border border-[#2a697b]/40 text-[#2a697b] rounded"
                        >
                          Novelty
                        </button>
                        <button
                          onClick={() => generateDraft.mutate(gap.id)}
                          className="text-[9px] uppercase tracking-[0.2em] px-2 py-1 border border-[#713324]/40 text-[#713324] rounded"
                        >
                          Draft
                        </button>
                        <button
                          onClick={() => deleteGap.mutate(gap.id)}
                          className="text-[9px] uppercase tracking-[0.2em] px-2 py-1 border border-[#b4534b]/40 text-[#b4534b] rounded"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        {STATUS_ORDER.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => moveGap.mutate({ id: gap.id, status: nextStatus })}
                            disabled={gap.status === nextStatus}
                            className="text-[8px] uppercase tracking-[0.2em] px-2 py-1 border border-[#d9c1bc]/80 text-[#86736e] rounded disabled:opacity-40"
                          >
                            {STATUS_META[nextStatus].label}
                          </button>
                        ))}
                      </div>

                      {(gap.novelty_score || gap.feasibility_score || gap.potential_score) && (
                        <div className="mt-3 pt-3 border-t border-[#d9c1bc]/60 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[8px] uppercase tracking-[0.2em] text-[#86736e]">Novelty</p>
                            <p className="font-mono text-sm text-[#1d1c17]">{gap.novelty_score ?? '-'}</p>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase tracking-[0.2em] text-[#86736e]">Feasibility</p>
                            <p className="font-mono text-sm text-[#1d1c17]">{gap.feasibility_score ?? '-'}</p>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase tracking-[0.2em] text-[#86736e]">Potential</p>
                            <p className="font-mono text-sm text-[#1d1c17]">{gap.potential_score ?? '-'}</p>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}

                  {!grouped[status].length && (
                    <div className="border border-dashed border-[#d9c1bc]/80 rounded-lg p-4 text-center text-[#86736e] font-serif italic text-sm">
                      No cards in {STATUS_META[status].label.toLowerCase()}.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
