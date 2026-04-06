import axios from 'axios';

const BASE_URL_GRAPH = 'https://api.semanticscholar.org/graph/v1';
const BASE_URL_RECOMMENDATIONS = 'https://api.semanticscholar.org/recommendations/v1';
const BASE_URL_DATASETS = 'https://api.semanticscholar.org/datasets/v1';

const getHeaders = () => {
  const headers: any = {
    'User-Agent': 'ResearchPaperTracker/1.0 (mailto:admin@rpt.app)',
  };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }
  return headers;
};

// --- Graph API ---

export async function searchPapers(query: string, limit: number = 10) {
  try {
    const url = `${BASE_URL_GRAPH}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,venue,externalIds,abstract`;
    const { data } = await axios.get(url, { headers: getHeaders() });
    return data.data || [];
  } catch (error: any) {
    console.error('Semantic Scholar Search Error:', error.response?.data || error.message);
    return [];
  }
}

export async function getPaperDetails(paperId: string) {
  try {
    const fields = 'title,abstract,authors,venue,year,citationCount,referenceCount,openAccessPdf,fieldsOfStudy,s2FieldsOfStudy,publicationTypes,publicationDate,url,externalIds,citations.title,citations.authors,citations.year,citations.venue,citations.citationCount,citations.externalIds,references.title,references.authors,references.year,references.venue,references.citationCount,references.externalIds';
    const url = `${BASE_URL_GRAPH}/paper/${paperId}?fields=${fields}`;
    const { data } = await axios.get(url, { headers: getHeaders() });
    
    // Clean up citations/references to match expected format (map citingPaper/citedPaper)
    if (data.citations) data.citations = data.citations.map((c: any) => c.citingPaper).filter(Boolean);
    if (data.references) data.references = data.references.map((r: any) => r.citedPaper).filter(Boolean);
    
    return data;
  } catch (error: any) {
    console.error('Semantic Scholar Graph Error:', error.response?.data || error.message);
    return null;
  }
}

export async function getCitationsAndReferences(paperId: string) {
  try {
    const fields = 'title,authors,year,venue,citationCount,externalIds';
    const [citationsData, referencesData] = await Promise.all([
      axios.get(`${BASE_URL_GRAPH}/paper/${paperId}/citations?fields=${fields}&limit=50`, { headers: getHeaders() }),
      axios.get(`${BASE_URL_GRAPH}/paper/${paperId}/references?fields=${fields}&limit=50`, { headers: getHeaders() }),
    ]);
    return {
      citations: (citationsData.data.data || []).map((c: any) => c.citingPaper).filter(Boolean),
      references: (referencesData.data.data || []).map((r: any) => r.citedPaper).filter(Boolean)
    };
  } catch (error: any) {
    console.error('Semantic Scholar Citations Error:', error.response?.data || error.message);
    return null;
  }
}

// --- Recommendations API ---

export async function getRecommendedPapers(paperIds: string[], limit: number = 10) {
  try {
    const payload = {
      positivePaperIds: paperIds,
      // negativePaperIds: []
    };
    const { data } = await axios.post(`${BASE_URL_RECOMMENDATIONS}/papers?fields=title,authors,year,venue,externalIds&limit=${limit}`, payload, { headers: getHeaders() });
    return data.recommendedPapers || [];
  } catch (error: any) {
    console.error('Semantic Scholar Recommendations Error:', error.response?.data || error.message);
    return [];
  }
}

// --- Datasets API ---

export async function getDatasetsList() {
  try {
    const { data } = await axios.get(`${BASE_URL_DATASETS}/datasets`, { headers: getHeaders() });
    return data.datasets || [];
  } catch (error: any) {
    console.error('Semantic Scholar Datasets Error:', error.response?.data || error.message);
    return [];
  }
}

export async function getDatasetDetails(datasetName: string) {
  try {
    const { data } = await axios.get(`${BASE_URL_DATASETS}/datasets/${datasetName}`, { headers: getHeaders() });
    return data;
  } catch (error: any) {
    console.error('Semantic Scholar Dataset Detail Error:', error.response?.data || error.message);
    return null;
  }
}
