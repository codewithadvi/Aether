import axios from 'axios';

interface CrossrefWork {
  title?: string[];
  author?: { given?: string; family?: string }[];
  abstract?: string;
  published?: { 'date-parts'?: number[][] };
  publisher?: string;
  'container-title'?: string[];
  'is-referenced-by-count'?: number;
  DOI?: string;
  URL?: string;
}

export async function fetchFromCrossref(doi: string): Promise<Partial<{
  title: string; authors: string[]; abstract: string; publication_date: string;
  venue: string; citation_count: number; doi: string; url: string;
}> | null> {
  try {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'ResearchPaperTracker/1.0 (mailto:admin@rpt.app)' }
    });
    const work: CrossrefWork = data.message;
    const dateParts = work.published?.['date-parts']?.[0];
    let publication_date: string | undefined;
    if (dateParts) {
      publication_date = dateParts.join('-').padEnd(10, '-01').substring(0, 10);
    }
    return {
      title: work.title?.[0] || undefined,
      authors: work.author?.map(a => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean) || [],
      abstract: work.abstract?.replace(/<[^>]+>/g, '') || undefined,
      publication_date,
      venue: work['container-title']?.[0] || work.publisher || undefined,
      citation_count: work['is-referenced-by-count'] || 0,
      doi: work.DOI || doi,
      url: work.URL || undefined,
    };
  } catch { return null; }
}

export async function fetchFromSemanticScholar(doi?: string, title?: string): Promise<{
  external_id?: string;
  citations?: any[]; references?: any[]; title?: string; abstract?: string; authors?: string[];
  venue?: string; year?: number; citationCount?: number; url?: string; doi?: string | null;
} | null> {
  try {
    let url: string;
    const headers: any = { 'User-Agent': 'ResearchPaperTracker/1.0 (mailto:admin@rpt.app)' };
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
    }
    
    if (doi) {
      const cleanDoi = doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim();
      url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(cleanDoi)}?fields=title,abstract,authors,venue,year,citationCount,externalIds,citations.title,citations.externalIds,references.title,references.externalIds`;
    } else if (title) {
      const search = await axios.get(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&fields=title,abstract,authors,venue,year,citationCount&limit=1`, { timeout: 10000, headers });
      const paper = search.data.data?.[0];
      if (!paper) return null;
      url = `https://api.semanticscholar.org/graph/v1/paper/${paper.paperId}?fields=title,abstract,authors,venue,year,citationCount,citations.title,citations.externalIds,references.title,references.externalIds`;
    } else {
      return null;
    }
    const { data } = await axios.get(url, { timeout: 15000, headers });
    return {
      external_id: data.paperId,
      title: data.title,
      abstract: data.abstract,
      authors: data.authors?.map((a: any) => a.name) || [],
      venue: data.venue,
      year: data.year,
      citationCount: data.citationCount,
      citations: data.citations || [],
      references: data.references || [],
      doi: data.externalIds?.DOI || null,
      url: data.url,
    };
  } catch { return null; }
}
