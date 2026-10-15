import { createScorer } from "./kernel.js";
import { STOPWORDS } from "./stopwords.js";

const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s|e)$/, "") : w);

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

const SENT = /(?<=[.!?])\s+/;

export const splitSentences = (text) =>
  text
    .replace(/\s+/g, " ")
    .split(SENT)
    .map((s) => s.trim())
    .filter(Boolean);

function pieces(text, target) {
  const out = [];
  for (const rawPara of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const para = rawPara.replace(/\s+/g, " ").trim();
    if (!para) continue;
    for (let s of para.split(SENT)) {
      while (s.length > target * 1.5) {
        let cut = s.lastIndexOf(" ", target);
        if (cut <= 0) cut = target;
        out.push(s.slice(0, cut));
        s = s.slice(cut).trimStart();
      }
      if (s) out.push(s);
    }
  }
  return out;
}

/** Overlapping passages built from whole sentences (~target chars each). */
export function chunkText(text, target = 800, overlap = 160) {
  const chunks = [];
  let cur = [];
  let size = 0;
  for (const piece of pieces(text, target)) {
    if (cur.length && size + piece.length > target) {
      chunks.push(cur.join(" "));
      const keep = [];
      let k = 0;
      for (let i = cur.length - 1; i >= 0; i--) {
        if (k + cur[i].length > overlap) break;
        keep.unshift(cur[i]);
        k += cur[i].length + 1;
      }
      cur = keep;
      size = k;
    }
    cur.push(piece);
    size += piece.length + 1;
  }
  if (cur.length) chunks.push(cur.join(" "));
  return chunks.filter((c) => tokenize(c).length > 0);
}

/* ---------------- retrieval ---------------- */

const weight = (tf, idf) => (1 + Math.log(tf)) * idf; // sublinear tf

const counts = (tokens) => {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
};

/**
 * Confidence in [0,1]. Coverage (do the passage's words answer the question's words?) dominates;
 * cosine rewards focused passages. Tuned against the UI's 0.35 / 0.15 tiers.
 */
export const combine = (cosine, coverage) =>
  Math.pow(0.75 * coverage + 0.25 * Math.min(1, cosine * 2.5), 1.5);

const EXTRA_TERMS = 512; // room for query words that appear in no chunk

/** Builds the sparse tf-idf matrix once and uploads it to the C++ kernel. Reuse it for many queries. */
export function buildIndex(chunks) {
  const docs = chunks.map((c) => counts(tokenize(c.text)));
  const vocab = new Map();
  const df = new Map();
  for (const tf of docs) {
    for (const t of tf.keys()) {
      if (!vocab.has(t)) vocab.set(t, vocab.size);
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const n = chunks.length;
  const idf = (t) => Math.log((n + 1) / ((df.get(t) || 0) + 1)) + 1;

  const indptr = [0];
  const indices = [];
  const values = [];
  for (const tf of docs) {
    for (const [t, c] of tf) {
      indices.push(vocab.get(t));
      values.push(weight(c, idf(t)));
    }
    indptr.push(indices.length);
  }

  const v0 = vocab.size;
  const scorer = n
    ? createScorer(
        Int32Array.from(indptr),
        Int32Array.from(indices),
        Float32Array.from(values),
        v0 + EXTRA_TERMS,
      )
    : null;
  return { chunks, vocab, idf, v0, n, scorer };
}

/** Ranks the indexed chunks for one question -> top_k [{...chunk, score, cosine}]. */
export function searchIndex(index, question, topK = 5) {
  const qTokens = tokenize(question);
  if (!index.n || !qTokens.length) return [];

  let extra = 0;
  const ids = new Map();
  for (const t of counts(qTokens).keys()) {
    let id = index.vocab.get(t);
    if (id === undefined) {
      if (extra >= EXTRA_TERMS) continue;
      id = index.v0 + extra++; // unseen terms still count against the score
    }
    ids.set(t, id);
  }
  const query = new Float32Array(index.v0 + extra);
  for (const [t, c] of counts(qTokens))
    if (ids.has(t)) query[ids.get(t)] = weight(c, index.idf(t));

  const { cosine, coverage } = index.scorer.score(query);
  const ranked = [];
  index.chunks.forEach((chunk, i) => {
    if (coverage[i] <= 0) return;
    ranked.push({
      ...chunk,
      score: Math.round(combine(cosine[i], coverage[i]) * 10000) / 10000,
      cosine: cosine[i],
    });
  });
  ranked.sort((x, y) => y.score - x.score || y.cosine - x.cosine);
  return ranked.slice(0, topK);
}

/** chunks: [{documentId, documentName, chunkIndex, text}] -> top_k with a `score`. */
export const rank = (question, chunks, topK = 5) =>
  searchIndex(buildIndex(chunks), question, topK);

/* ---------------- answer building ---------------- */

const MIN_SCORE = 0.05; // below this a passage is noise
const MID = 0.15; // the UI's "low confidence" tier
const MAX_SOURCES = 3;
const MAX_EXCERPT = 700;

export function bestSentence(text, qTerms, used) {
  let best = null;
  let bestKey = [-1, 0];
  for (const s of splitSentences(text)) {
    if (used.has(s.toLowerCase()) || s.length < 20) continue;
    const stems = new Set(tokenize(s));
    let hits = 0;
    for (const t of qTerms) if (stems.has(t)) hits++;
    const key = [hits, -Math.abs(s.length - 140)];
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
      best = s;
      bestKey = key;
    }
  }
  return bestKey[0] > 0 ? best : null;
}

function citation(r) {
  let text = r.text;
  if (text.length > MAX_EXCERPT)
    text = text.slice(0, MAX_EXCERPT).replace(/\s+\S*$/, "") + "…";
  return {
    documentId: r.documentId,
    documentName: r.documentName,
    chunkIndex: r.chunkIndex,
    excerpt: text,
    score: r.score,
  };
}

/** Every sentence is lifted from a source, so nothing in the answer exists outside the user's documents. */
export function buildAnswer(question, rankedIn) {
  const ranked = rankedIn.filter((r) => r.score >= MIN_SCORE);
  if (!ranked.length) {
    return {
      content:
        "I couldn't find anything in the selected documents that overlaps with that question. " +
        "Try rewording it, or select different documents.",
      mode: "extractive",
      citations: [],
    };
  }

  const qTerms = new Set(tokenize(question));
  const used = new Set();
  const picked = [];
  for (const r of ranked) {
    if (picked.length >= MAX_SOURCES) break;
    const sentence = bestSentence(r.text, qTerms, used);
    if (!sentence) continue;
    used.add(sentence.toLowerCase());
    picked.push({ sentence, score: r.score, cite: citation(r) });
  }

  if (!picked.length) {
    return {
      content: "The closest passage I found is in the source panel. [1]",
      mode: "extractive",
      citations: [citation(ranked[0])],
    };
  }

  const strong = picked.filter((p) => p.score >= MID);
  const chosen = strong.length >= 2 ? strong : [picked[0]];
  return {
    content: chosen.map((p, i) => `${p.sentence} [${i + 1}]`).join(" "),
    mode: chosen.length >= 2 ? "generated" : "extractive",
    citations: chosen.map((p) => p.cite),
  };
}
