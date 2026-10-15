import { ALLOWED, extractText } from "./parse.js";
import { chunkText, rank, buildAnswer } from "./engine.js";
import { STOPWORDS } from "./stopwords.js";
import { HttpError, json } from "./http.js";
import { currentUser, handleAuth } from "./auth.js";

const DEFAULT_TITLE = "Study session";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PART_BYTES = 150_000;


function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const toMessage = (r) => ({
  id: r.id,
  role: r.role,
  content: r.content,
  mode: r.mode,
  citations: JSON.parse(r.citations || "[]"),
  created_at: r.created_at,
});


async function listDocuments(env, uid) {
  const { results } = await env.DB.prepare(
    "SELECT id, original_name, chunk_count, created_at FROM documents WHERE user_id = ? ORDER BY id DESC",
  )
    .bind(uid)
    .all();
  return json(results);
}

async function uploadDocument(request, env, uid) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string")
    throw new HttpError(400, "No file uploaded");
  if (file.size > MAX_FILE_BYTES)
    throw new HttpError(413, "File is too large (10 MB max)");

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED.has(ext))
    throw new HttpError(
      400,
      "Unsupported file type. Use PDF, DOCX, TXT or MD.",
    );

  const max = Number(env.MAX_DOCUMENTS || 5);
  const { n } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM documents WHERE user_id = ?",
  )
    .bind(uid)
    .first();
  if (n >= max)
    throw new HttpError(
      400,
      `Source limit reached (${max}). Remove one first.`,
    );

  let text;
  try {
    text = await extractText(await file.arrayBuffer(), ext);
  } catch {
    throw new HttpError(
      422,
      "That file couldn't be read. It may be corrupted or password-protected.",
    );
  }
  if (!text || !text.trim()) {
    throw new HttpError(
      422,
      "No readable text found. Scanned PDFs without a text layer aren't supported yet.",
    );
  }

  const chunks = chunkText(text);
  if (!chunks.length)
    throw new HttpError(422, "No usable passages found in that file.");

  const parts = [];
  let cur = [];
  let start = 0;
  let size = 0;
  chunks.forEach((c, i) => {
    if (cur.length && size + c.length > PART_BYTES) {
      parts.push({ start, data: JSON.stringify(cur) });
      cur = [];
      start = i;
      size = 0;
    }
    cur.push(c);
    size += c.length + 4;
  });
  parts.push({ start, data: JSON.stringify(cur) });

  const doc = await env.DB.prepare(
    "INSERT INTO documents (user_id, original_name, chunk_count) VALUES (?, ?, ?) RETURNING id, original_name, chunk_count, created_at",
  )
    .bind(uid, file.name, chunks.length)
    .first();

  try {
    await env.DB.batch(
      parts.map((p) =>
        env.DB.prepare(
          "INSERT INTO chunk_parts (document_id, start_index, data) VALUES (?, ?, ?)",
        ).bind(doc.id, p.start, p.data),
      ),
    );
  } catch (e) {
    await env.DB.prepare("DELETE FROM documents WHERE id = ?")
      .bind(doc.id)
      .run(); 
    throw e;
  }
  return json(doc, 201);
}

async function deleteOwned(env, table, id, uid, label) {
  const r = await env.DB.prepare(
    `DELETE FROM ${table} WHERE id = ? AND user_id = ?`,
  )
    .bind(id, uid)
    .run();
  if (!r.meta.changes) throw new HttpError(404, `${label} not found`);
  return new Response(null, { status: 204 });
}


async function listSessions(env, uid) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
  )
    .bind(uid)
    .all();
  return json(results);
}

async function createSession(request, env, uid) {
  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || DEFAULT_TITLE).slice(0, 80);
  const row = await env.DB.prepare(
    "INSERT INTO sessions (user_id, title) VALUES (?, ?) RETURNING id, title, created_at, updated_at",
  )
    .bind(uid, title)
    .first();
  return json(row, 201);
}

async function getMessages(env, id, uid) {
  const s = await env.DB.prepare(
    "SELECT 1 AS ok FROM sessions WHERE id = ? AND user_id = ?",
  )
    .bind(id, uid)
    .first();
  if (!s) throw new HttpError(404, "Session not found");
  const { results } = await env.DB.prepare(
    "SELECT * FROM messages WHERE session_id = ? ORDER BY id",
  )
    .bind(id)
    .all();
  return json(results.map(toMessage));
}


async function chat(request, env, uid) {
  const body = await request.json().catch(() => ({}));
  const question = String(body?.question || "").trim();
  if (!question) throw new HttpError(400, "Question is required");
  if (question.length > 2000)
    throw new HttpError(400, "Question is too long (2000 characters max)");

  const session = await env.DB.prepare(
    "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
  )
    .bind(body?.sessionId ?? -1, uid)
    .first();
  if (!session) throw new HttpError(404, "Session not found");

  
  const owned = (
    await env.DB.prepare("SELECT id FROM documents WHERE user_id = ?")
      .bind(uid)
      .all()
  ).results.map((d) => d.id);
  const asked = Array.isArray(body.documentIds)
    ? body.documentIds.map(Number).filter(Number.isInteger)
    : [];
  const ids = asked.length ? asked.filter((id) => owned.includes(id)) : owned;

  let result;
  if (!ids.length) {
    result = {
      content:
        "There are no documents to search yet. File a source on the left, then ask again.",
      mode: "extractive",
      citations: [],
    };
  } else {
    const { results } = await env.DB.prepare(
      `SELECT d.id AS documentId, d.original_name AS documentName, p.start_index AS start, p.data AS data
       FROM chunk_parts p JOIN documents d ON d.id = p.document_id
       WHERE d.id IN (${ids.map(() => "?").join(",")})
       ORDER BY d.id, p.start_index`,
    )
      .bind(...ids)
      .all();
    const chunks = [];
    for (const row of results) {
      JSON.parse(row.data).forEach((text, i) =>
        chunks.push({
          documentId: row.documentId,
          documentName: row.documentName,
          chunkIndex: row.start + i,
          text,
        }),
      );
    }
    result = buildAnswer(question, rank(question, chunks));
  }

  const title = question.length > 48 ? `${question.slice(0, 47)}…` : question;
  const [u, a] = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO messages (session_id, role, content, mode, citations) VALUES (?, 'user', ?, NULL, '[]') RETURNING id",
    ).bind(session.id, question),
    env.DB.prepare(
      "INSERT INTO messages (session_id, role, content, mode, citations) VALUES (?, 'assistant', ?, ?, ?) RETURNING id",
    ).bind(
      session.id,
      result.content,
      result.mode,
      JSON.stringify(result.citations),
    ),
    env.DB.prepare(
      "UPDATE sessions SET title = CASE WHEN title = ? THEN ? ELSE title END, updated_at = datetime('now') WHERE id = ?",
    ).bind(DEFAULT_TITLE, title, session.id),
  ]);
  const ids2 = [u.results[0].id, a.results[0].id];
  const { results: rows } = await env.DB.prepare(
    "SELECT * FROM messages WHERE id IN (?, ?)",
  )
    .bind(...ids2)
    .all();
  const byId = Object.fromEntries(rows.map((r) => [r.id, toMessage(r)]));
  return json({ userMessage: byId[ids2[0]], assistantMessage: byId[ids2[1]] });
}


const FETCH_TIMEOUT_MS = 5000;

async function fetchJson(url, env) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": `StudyCite/1.0 (${env.CONTACT_URL || "https://studycite.pages.dev"})`,
      },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function keywordList(question) {
  const words = (question.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (w) => w.length > 2 && !STOPWORDS.has(w),
  );
  return [...new Set(words)];
}


function keywordQuery(question, variant = 0) {
  const words = keywordList(question);
  if (!variant || words.length < 3) return words.slice(0, 8).join(" ");
  const start = variant % words.length;
  return [...words.slice(start), ...words.slice(0, start)]
    .slice(0, 4)
    .join(" ");
}

const stripHtml = (s) =>
  String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const MAX_PAGE = 10;

async function searchWikipedia(query, env) {
  const terms = query
    .split(" ")
    .filter(Boolean)
    .map((t) => t.slice(0, 5));
  const data = await fetchJson(
    `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=5`,
    env,
  );
  const hit = (data.pages || []).find((p) =>
    terms.some((t) => p.title.toLowerCase().includes(t)),
  );
  if (!hit) return [];
  return [
    {
      kind: "encyclopedia",
      title: hit.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.key)}`,
      source: "Wikipedia",
      snippet: stripHtml(
        hit.description
          ? `${hit.description}. ${hit.excerpt || ""}`
          : hit.excerpt,
      ),
    },
  ];
}


function abstractSnippet(inverted, maxWords = 45) {
  if (!inverted) return "";
  const words = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) if (pos < maxWords) words[pos] = word;
  }
  const text = words.filter(Boolean).join(" ");
  return text ? `${text}…` : "";
}

async function searchOpenAlex(query, env, page) {
  const mail = env.CONTACT_EMAIL
    ? `&mailto=${encodeURIComponent(env.CONTACT_EMAIL)}`
    : "";
  const data = await fetchJson(
    "https://api.openalex.org/works" +
      `?search=${encodeURIComponent(query)}&per-page=12&page=${page}&filter=has_abstract:true` +
      "&select=id,title,publication_year,cited_by_count,doi,authorships,primary_location,open_access,abstract_inverted_index" +
      mail,
    env,
  );
  return (data.results || [])
    .filter((w) => w.title)
    .map((w) => ({
      kind: "scholarly",
      title: stripHtml(w.title),
      url: w.doi || w.primary_location?.landing_page_url || w.id,
      freeUrl: w.open_access?.is_oa ? w.open_access.oa_url || null : null, 
      authors: (w.authorships || [])
        .slice(0, 3)
        .map((a) => a.author?.display_name)
        .filter(Boolean),
      year: w.publication_year,
      source: w.primary_location?.source?.display_name || "OpenAlex",
      citedBy: w.cited_by_count,
      snippet: abstractSnippet(w.abstract_inverted_index),
    }));
}

async function searchBooks(query, env, page) {
  const data = await fetchJson(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6&page=${page}` +
      "&fields=key,title,author_name,first_publish_year,subject",
    env,
  );
  return (data.docs || [])
    .filter((d) => d.title && d.key)
    .map((d) => ({
      kind: "book",
      title: d.title,
      url: `https://openlibrary.org${d.key}`,
      authors: (d.author_name || []).slice(0, 3),
      year: d.first_publish_year,
      source: "Open Library",
      snippet: d.subject?.length
        ? `Topics: ${d.subject.slice(0, 5).join(", ")}`
        : "",
    }));
}

async function related(request, env) {
  // The frontend POSTs { question, page, variant }; GET ?q=...&page=...&variant=... also works.
  const params = new URL(request.url).searchParams;
  let q = params.get("q") || "";
  let page = params.get("page");
  let variant = params.get("variant");
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    q = body?.question ?? body?.q ?? body?.query ?? q;
    page = body?.page ?? page;
    variant = body?.variant ?? variant;
  }
  q = String(q).trim();
  page = Math.min(MAX_PAGE, Math.max(1, parseInt(page, 10) || 1));
  variant = Math.max(0, parseInt(variant, 10) || 0);
  if (!q) throw new HttpError(400, "Question is required");
  if (q.length > 2000)
    throw new HttpError(400, "Question is too long (2000 characters max)");

  const query = keywordQuery(q, variant) || q.slice(0, 120);
  const settled = await Promise.allSettled([
    page === 1 || variant ? searchWikipedia(query, env) : Promise.resolve([]),
    searchOpenAlex(query, env, page),
    searchBooks(query, env, page),
  ]);
  const [wiki, scholar, books] = settled;

  if (settled.every((r) => r.status === "rejected")) {
    console.error(
      "related failed",
      settled.map((r) => String(r.reason)),
    );
    throw new HttpError(
      502,
      "Couldn't reach the outside search sources. Try again in a moment.",
    );
  }

  const seen = new Set();

  const items = [
    ...(scholar.value || []),
    ...(wiki.value || []),
    ...(books.value || []),
  ].filter((it) => {
    if (!it.url || seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });
  return json({
    items,
    page,
    variant,
    hasMore:
      page < MAX_PAGE &&
      ((scholar.value || []).length >= 12 || (books.value || []).length >= 6),
    partial: settled.some((r) => r.status === "rejected"),
  });
}


async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const m = request.method;
  let r;

  if (path === "/api/health" && m === "GET")
    return json({ ok: true, kernel: "wasm" });

  const authRes = await handleAuth(path, m, request, env);
  if (authRes) return authRes;

  
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  const uid = user.id;

  if (path === "/api/documents" && m === "GET") return listDocuments(env, uid);
  if (path === "/api/documents/upload" && m === "POST")
    return uploadDocument(request, env, uid);
  if (path === "/api/sessions" && m === "GET") return listSessions(env, uid);
  if (path === "/api/sessions" && m === "POST")
    return createSession(request, env, uid);
  if (path === "/api/chat" && m === "POST") return chat(request, env, uid);
  if (path === "/api/related" && (m === "GET" || m === "POST"))
    return related(request, env);
  if ((r = path.match(/^\/api\/documents\/(\d+)$/)) && m === "DELETE")
    return deleteOwned(env, "documents", r[1], uid, "Document");
  if ((r = path.match(/^\/api\/sessions\/(\d+)$/)) && m === "DELETE")
    return deleteOwned(env, "sessions", r[1], uid, "Session");
  if ((r = path.match(/^\/api\/sessions\/(\d+)\/messages$/)) && m === "GET")
    return getMessages(env, r[1], uid);

  throw new HttpError(404, "Not found");
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });

    
    const origin = request.headers.get("Origin");
    const safe = request.method === "GET" || request.method === "HEAD";
    if (
      !safe &&
      origin &&
      !cors["Access-Control-Allow-Origin"] &&
      origin !== new URL(request.url).origin
    ) {
      return json({ error: "Origin not allowed." }, 403);
    }

    let res;
    try {
      res = await route(request, env);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status >= 500) console.error(e);
      res = json(
        {
          error:
            status >= 500 ? "Something went wrong on the server." : e.message,
        },
        status,
      );
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};