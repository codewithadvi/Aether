/**
 * TF-IDF Vector Service
 * Computes TF-IDF vectors for papers and stores them in pgvector.
 * This enables cosine similarity search for paper connections — no external API needed.
 */

import { query } from '../db/pool';

const VECTOR_SIZE = 512;

// Simple tokenizer
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

// Compute TF for a document
function computeTF(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  const total = tokens.length || 1;
  freq.forEach((v, k) => freq.set(k, v / total));
  return freq;
}

// Build a fixed-size vector via hashing (locality-sensitive hashing trick)
// Maps each term to a bucket index (0..VECTOR_SIZE-1) via FNV-1a hash
function hashTerm(term: string): number {
  let hash = 2166136261;
  for (let i = 0; i < term.length; i++) {
    hash ^= term.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash % VECTOR_SIZE;
}

export function computeEmbedding(title: string, abstract: string, authors: string[]): number[] {
  const text = [title, abstract, ...authors].join(' ');
  const tokens = tokenize(text);
  const tf = computeTF(tokens);
  const vec = new Float32Array(VECTOR_SIZE).fill(0);

  tf.forEach((weight, term) => {
    const idx = hashTerm(term);
    vec[idx] += weight;
  });

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < VECTOR_SIZE; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec).map(v => v / norm);
}

export async function updatePaperEmbedding(paperId: string): Promise<void> {
  const { rows } = await query('SELECT title, abstract, authors FROM papers WHERE id = $1', [paperId]);
  if (!rows[0]) return;
  const { title, abstract, authors } = rows[0];
  const embedding = computeEmbedding(title || '', abstract || '', authors || []);
  const vectorStr = `[${embedding.join(',')}]`;
  await query('UPDATE papers SET embedding = $1::vector WHERE id = $2', [vectorStr, paperId]);
}

export async function findSimilarPapers(paperId: string, userId: string, limit = 10): Promise<any[]> {
  // Use pgvector cosine similarity to find most similar papers
  const { rows } = await query(`
    SELECT p2.id, p2.title, p2.authors, p2.field, p2.venue, p2.publication_date,
      1 - (p1.embedding <=> p2.embedding) AS similarity_score
    FROM papers p1, papers p2
    WHERE p1.id = $1
      AND p2.id != $1
      AND p2.user_id = $2
      AND p1.embedding IS NOT NULL
      AND p2.embedding IS NOT NULL
    ORDER BY p1.embedding <=> p2.embedding
    LIMIT $3
  `, [paperId, userId, limit]);
  return rows;
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can',
  'could','not','no','nor','so','yet','both','either','neither','this','that',
  'these','those','it','its','they','their','we','our','he','she','him','her',
  'his','my','your','who','which','what','when','where','how','all','each',
  'every','some','any','few','more','most','other','than','then','than','also',
  'into','through','during','before','after','above','below','between','out',
  'off','over','under','again','further','there','here','about','against',
  'study','paper','research','results','show','using','used','based','model',
  'method','approach','data','algorithm','system','performance','analysis',
  'proposed','new','different','number','set','use','can','however','two',
  'between','thus','such','one','first','second','while','may','also','well',
]);
